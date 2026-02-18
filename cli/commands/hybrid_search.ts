import type { Movie } from '../types';
import { InvertedIndex } from './keyword_search';
import { ChunkedVectorIndex } from './semantic_search';
import { HYBRID_SEARCH_ALPHA, RECIPROCAL_RANK_FUSION_K } from '../constants';

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
  k: number = RECIPROCAL_RANK_FUSION_K,
  topK: number = 5,
) => {
  const hybridSearch = new HybridSearch();
  await hybridSearch.load();
  const results = await hybridSearch.search(query, k, topK);
  return results;
};
