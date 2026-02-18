import type { Movie } from '../types';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import {
  AutoTokenizer,
  AutoModelForSequenceClassification,
} from '@huggingface/transformers';
import { InvertedIndex } from './keyword_search';
import { ChunkedVectorIndex } from './semantic_search';
import {
  CROSS_ENCODER_MODEL,
  HYBRID_SEARCH_ALPHA,
  LLM_ENHANCED_TYPES,
  LLM_MODEL,
  LLM_PROMPT_PATH,
  RECIPROCAL_RANK_FUSION_K,
  RERANK_TYPES,
} from '../constants';

class LLM {
  private _client: GoogleGenAI;

  constructor() {
    this._client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  private async generateContent(prompt: string, query: string) {
    const response = await this._client.models.generateContent({
      model: LLM_MODEL,
      contents: prompt,
    });
    return response?.text ?? '';
  }

  async enhanced(
    query: string,
    type: (typeof LLM_ENHANCED_TYPES)[keyof typeof LLM_ENHANCED_TYPES],
  ) {
    let promptFileName = '';

    if (type === LLM_ENHANCED_TYPES.SPELL) {
      promptFileName = 'spelling.md';
    } else if (type === LLM_ENHANCED_TYPES.REWRITE) {
      promptFileName = 'rewrite.md';
    } else if (type === LLM_ENHANCED_TYPES.EXPAND) {
      promptFileName = 'expand.md';
    }

    const prompt = await Bun.file(
      path.resolve(LLM_PROMPT_PATH, promptFileName),
    ).text();
    const embeddedPrompt = prompt.replace('{query}', query);

    return this.generateContent(embeddedPrompt, query);
  }

  async reRank(
    results: [Movie, number, number, number, number, number][],
    query: string,
  ) {
    const prompt = await Bun.file(
      path.resolve(LLM_PROMPT_PATH, 'rerank.md'),
    ).text();
    const movies = results
      .map(
        ([result]) =>
          `<movie id="${result.id}" title="${result.title}">${result.description}</movie>`,
      )
      .join('\n');
    let embeddedPrompt = prompt.replace('{movies}', movies);
    embeddedPrompt = embeddedPrompt.replace('{query}', query);
    const response = await this.generateContent(embeddedPrompt, query);
    const reRankedResults = (JSON.parse(response) as number[])
      .map((id) => results.find(([result]) => result.id === id)!)
      .filter(Boolean);

    return reRankedResults;
  }
}

class CrossEncoder {
  static model = CROSS_ENCODER_MODEL;
  private _model: any = null;
  private _tokenizer: any = null;

  async load() {
    this._tokenizer = await AutoTokenizer.from_pretrained(CrossEncoder.model);
    this._model = await AutoModelForSequenceClassification.from_pretrained(
      CrossEncoder.model,
    );
  }

  async reRank(
    results: [Movie, number, number, number, number, number][],
    query: string,
  ) {
    if (!this._model || !this._tokenizer) {
      throw new Error('Cross encoder not loaded');
    }

    const reRankedResults: [
      Movie,
      number,
      number,
      number,
      number,
      number,
      number,
    ][] = [];

    for (const result of results) {
      const text = `${result[0].title} - ${result[0].description}`;

      // Tokenize query and text as a pair
      const inputs = await this._tokenizer(query, {
        text_pair: text,
        padding: true,
        truncation: true,
      });

      const output = await this._model(inputs);

      // Use raw logit as the relevance score (can be positive or negative)
      // Higher scores = more relevant
      const score = output.logits.data[0];

      reRankedResults.push([...result, score]);
    }

    return reRankedResults.sort((a, b) => b[6] - a[6]).slice(0, results.length);
  }
}

class HybridSearch {
  invertedIndex: InvertedIndex;
  vectorIndex: ChunkedVectorIndex;

  constructor() {
    this.invertedIndex = new InvertedIndex();
    this.vectorIndex = new ChunkedVectorIndex();
  }

  private _normalizeScores(scores: number[]) {
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    if (minScore === maxScore) {
      return scores.map(() => 1);
    }

    return scores.map((score) => (score - minScore) / (maxScore - minScore));
  }

  private _normalizeSearchResults(
    results: [Movie, number][],
  ): [Movie, number, number][] {
    const scores = results.map(([, score]) => score);
    const normalizedScores = this._normalizeScores(scores);

    return results.map(([result, score], index) => [
      result,
      score,
      normalizedScores[index]!,
    ]);
  }

  private _hybridScore(
    bm25Score: number,
    semanticScore: number,
    alpha: number,
  ) {
    return alpha * bm25Score + (1 - alpha) * semanticScore;
  }

  async _search(query: string, alpha: number, topK: number) {
    const results = await this.invertedIndex.search(query, topK * 500);
    const semanticResults = await this.vectorIndex.search(query, topK * 500);
    const normalizedResults = this._normalizeSearchResults(results);
    const normalizedSemanticResults =
      this._normalizeSearchResults(semanticResults);
    const combinedResults: Record<Movie['id'], [Movie, number, number]> = {};

    normalizedResults.forEach(([result, _score, normalizedScore]) => {
      combinedResults[result.id] = [result, normalizedScore, 0];
    });

    normalizedSemanticResults.forEach(([result, _score, normalizedScore]) => {
      if (!combinedResults[result.id]) {
        combinedResults[result.id] = [result, 0, 0];
      }

      combinedResults[result.id]![2] = normalizedScore;
    });

    const hybridResults: [Movie, number, number, number][] = Object.values(
      combinedResults,
    ).map(([result, score, semanticScore]) => {
      return [
        result,
        score,
        semanticScore,
        this._hybridScore(score, semanticScore, alpha),
      ];
    });

    return hybridResults.sort((a, b) => b[3] - a[3]).slice(0, topK);
  }

  private _rrfScore(rank: number, k: number) {
    return 1 / (rank + k);
  }

  async search(query: string, k: number, topK: number) {
    const results = await this.invertedIndex.search(query, topK * 500);
    const semanticResults = await this.vectorIndex.search(query, topK * 500);
    const combinedResults: Record<
      Movie['id'],
      [Movie, number, number, number, number]
    > = {};

    results.forEach(([result], rank) => {
      combinedResults[result.id] = [
        result,
        rank + 1,
        this._rrfScore(rank + 1, k),
        0,
        0,
      ];
    });

    semanticResults.forEach(([result], rank) => {
      if (!combinedResults[result.id]) {
        combinedResults[result.id] = [result, 0, 0, 0, 0];
      }

      combinedResults[result.id]![3] = rank + 1;
      combinedResults[result.id]![4] = this._rrfScore(rank + 1, k);
    });

    const hybridResults: [Movie, number, number, number, number, number][] =
      Object.values(combinedResults).map(
        ([result, rank, score, semanticRank, semanticScore]) => {
          return [
            result,
            rank,
            score,
            semanticRank,
            semanticScore,
            rank && semanticRank
              ? this._rrfScore(rank, k) + this._rrfScore(semanticRank, k)
              : 0,
          ];
        },
      );

    return hybridResults.sort((a, b) => b[5] - a[5]).slice(0, topK);
  }

  async load() {
    await this.invertedIndex.load();
    await this.vectorIndex.load();
  }
}

export const hybridSearch = async (
  query: string,
  alpha: number = HYBRID_SEARCH_ALPHA,
  topK: number = 5,
) => {
  const hybridSearch = new HybridSearch();
  await hybridSearch.load();
  const results = await hybridSearch._search(query, alpha, topK);
  return results;
};

export const rankedHybridSearch = async (
  query: string,
  enhanced:
    | (typeof LLM_ENHANCED_TYPES)[keyof typeof LLM_ENHANCED_TYPES]
    | undefined = undefined,
  reRank:
    | (typeof RERANK_TYPES)[keyof typeof RERANK_TYPES]
    | undefined = undefined,
  k: number = RECIPROCAL_RANK_FUSION_K,
  topK: number = 5,
) => {
  const hybridSearch = new HybridSearch();

  await hybridSearch.load();

  if (enhanced) {
    const enhancedQuery = await new LLM().enhanced(query, enhanced);
    console.log(
      `Enhanced query (${enhanced}): '${query}' -> '${enhancedQuery}'`,
    );
    query = enhancedQuery;
  }

  const results = await hybridSearch.search(query, k, reRank ? topK * 5 : topK);

  if (reRank) {
    const isLLM = reRank === RERANK_TYPES.LLM;
    const reRanker = isLLM ? new LLM() : new CrossEncoder();

    if (!isLLM) {
      await (reRanker as CrossEncoder).load();
    }

    const reRankedResults = await reRanker.reRank(results, query);
    return reRankedResults.slice(0, topK);
  }

  return results;
};
