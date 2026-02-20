import path from 'path';
import type { Movie } from '../types';
import {
  AutoTokenizer,
  AutoModelForSequenceClassification,
} from '@huggingface/transformers';
import {
  GoogleGenAI,
  createPartFromBase64,
  createPartFromText,
  type ContentListUnion,
} from '@google/genai';
import {
  LLM_MODEL,
  LLM_ENHANCED_TYPES,
  LLM_PROMPT_PATH,
  RERANK_TYPES,
  CROSS_ENCODER_MODEL,
  RECIPROCAL_RANK_FUSION_K,
  RAG_TYPES,
} from '../constants';
import { rankedHybridSearch } from './hybrid_search';

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

export class LLM {
  private _client: GoogleGenAI;

  constructor() {
    this._client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  private async generateContent(prompt: ContentListUnion) {
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

    return this.generateContent(embeddedPrompt);
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
    const response = await this.generateContent(embeddedPrompt);
    const reRankedResults = (JSON.parse(response) as number[])
      .map((id) => results.find(([result]) => result.id === id)!)
      .filter(Boolean);

    return reRankedResults;
  }

  async evaluate(
    results: (
      | [Movie, number, number, number, number, number]
      | [Movie, number, number, number, number, number, number]
      | [Movie, number]
    )[],
    query: string,
  ) {
    const prompt = await Bun.file(
      path.resolve(LLM_PROMPT_PATH, 'llm_judge.md'),
    ).text();
    const movies = results
      .map(
        ([result]) =>
          `<movie id="${result.id}" title="${result.title}">${result.description}</movie>`,
      )
      .join('\n');
    const embeddedPrompt = prompt
      .replace('{results}', movies)
      .replace('{query}', query);
    const response = await this.generateContent(embeddedPrompt);

    return response;
  }

  async augmentedGeneration(
    results: (
      | [Movie, number, number, number, number, number]
      | [Movie, number, number, number, number, number, number]
    )[],
    query: string,
    type: (typeof RAG_TYPES)[keyof typeof RAG_TYPES],
  ) {
    let promptFileName = '';

    switch (type) {
      case RAG_TYPES.CITATION:
        promptFileName = 'answer_with_citations.md';
        break;
      case RAG_TYPES.SUMMARY:
        promptFileName = 'summarization.md';
        break;
      case RAG_TYPES.DETAILED_ANSWER:
        promptFileName = 'answer_question_detailed.md';
        break;
      case RAG_TYPES.ANSWER:
        promptFileName = 'answer_question.md';
        break;
      default:
        throw new Error(`Unsupported RAG type: ${type}`);
    }

    const prompt = await Bun.file(
      path.resolve(LLM_PROMPT_PATH, promptFileName),
    ).text();
    const movies = results
      .map(
        ([result]) =>
          `<movie id="${result.id}" title="${result.title}">${result.description}</movie>`,
      )
      .join('\n');
    const embeddedPrompt = prompt
      .replace('{docs}', movies)
      .replace('{query}', query);
    return this.generateContent(embeddedPrompt);
  }

  async generateImageDescription(query: string, image: string) {
    const prompt = await Bun.file(
      path.resolve(LLM_PROMPT_PATH, 'image_description.md'),
    ).text();
    const imageFile = Bun.file(path.resolve(image));
    const imageBase64 = Buffer.from(await imageFile.arrayBuffer()).toString(
      'base64',
    );
    const imagePart = createPartFromBase64(imageBase64, imageFile.type);
    return this.generateContent({
      parts: [createPartFromText(prompt), imagePart, createPartFromText(query)],
    });
  }

  async search(
    query: string,
    enhanced:
      | (typeof LLM_ENHANCED_TYPES)[keyof typeof LLM_ENHANCED_TYPES]
      | undefined,
    reRank: (typeof RERANK_TYPES)[keyof typeof RERANK_TYPES] | undefined,
    judge: boolean | undefined,
    k: number,
    topK: number,
  ) {
    if (enhanced) {
      const enhancedQuery = await this.enhanced(query, enhanced);
      console.log(
        `Enhanced query (${enhanced}): '${query}' -> '${enhancedQuery}'`,
      );
      query = enhancedQuery;
    }

    // ? not sure about this - multiply by 5 to get more results to re-rank even though we already multiplied by 500
    const hybridResults = await rankedHybridSearch(
      query,
      k,
      reRank ? topK * 5 : topK,
    );
    let results: (
      | [Movie, number, number, number, number, number]
      | [Movie, number, number, number, number, number, number]
      | [Movie, number]
    )[] = hybridResults;

    if (reRank) {
      const isLLM = reRank === RERANK_TYPES.LLM;
      const reRanker = isLLM ? this : new CrossEncoder();

      if (!isLLM) {
        await (reRanker as CrossEncoder).load();
      }

      // slice again as we retrieved 5x results for re-ranking
      const reRankedResults = (
        await reRanker.reRank(hybridResults, query)
      ).slice(0, topK);
      results = reRankedResults;
    }

    if (judge) {
      const evaluation = await this.evaluate(results, query);
      const evaluationResults = (JSON.parse(evaluation) as number[]).map(
        (score, index) => [results[index]![0], score],
      ) as [Movie, number][];
      results = evaluationResults;
    }

    return results;
  }
}

export const llmAidedHybridSearch = async (
  query: string,
  enhanced:
    | (typeof LLM_ENHANCED_TYPES)[keyof typeof LLM_ENHANCED_TYPES]
    | undefined,
  reRank: (typeof RERANK_TYPES)[keyof typeof RERANK_TYPES] | undefined,
  judge: boolean | undefined,
  k: number = RECIPROCAL_RANK_FUSION_K,
  topK: number = 5,
) => {
  const llm = new LLM();
  return await llm.search(query, enhanced, reRank, judge, k, topK);
};
