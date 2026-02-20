import type { Movie, HybridResult, RankedHybridResult } from '../types';
import { InvertedIndex } from './keyword_search';
import { ChunkedVectorIndex } from './semantic_search';
import { HYBRID_SEARCH_ALPHA, RECIPROCAL_RANK_FUSION_K } from '../constants';

export class HybridSearch {
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
    results: { movie: Movie; score: number }[],
  ): { movie: Movie; score: number; normalizedScore: number }[] {
    const scores = results.map(({ score }) => score);
    const normalizedScores = this._normalizeScores(scores);

    return results.map(({ movie, score }, index) => ({
      movie,
      score,
      normalizedScore: normalizedScores[index]!,
    }));
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
    const combinedResults: Record<
      Movie['id'],
      { movie: Movie; bm25Score: number; semanticScore: number }
    > = {};

    normalizedResults.forEach(({ movie, normalizedScore }) => {
      combinedResults[movie.id] = {
        movie,
        bm25Score: normalizedScore,
        semanticScore: 0,
      };
    });

    normalizedSemanticResults.forEach(({ movie, normalizedScore }) => {
      if (!combinedResults[movie.id]) {
        combinedResults[movie.id] = { movie, bm25Score: 0, semanticScore: 0 };
      }

      combinedResults[movie.id]!.semanticScore = normalizedScore;
    });

    const hybridResults: HybridResult[] = Object.values(combinedResults).map(
      ({ movie, bm25Score, semanticScore }) => ({
        movie,
        bm25Score,
        semanticScore,
        hybridScore: this._hybridScore(bm25Score, semanticScore, alpha),
      }),
    );

    return hybridResults
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, topK);
  }

  private _rrfScore(rank: number, k: number) {
    return 1 / (rank + k);
  }

  async search(query: string, k: number, topK: number) {
    const results = await this.invertedIndex.search(query, topK * 500);
    const semanticResults = await this.vectorIndex.search(query, topK * 500);
    const combinedResults: Record<
      Movie['id'],
      {
        movie: Movie;
        bm25Rank: number;
        bm25Score: number;
        semanticRank: number;
        semanticScore: number;
      }
    > = {};

    results.forEach(({ movie }, rank) => {
      combinedResults[movie.id] = {
        movie,
        bm25Rank: rank + 1,
        bm25Score: this._rrfScore(rank + 1, k),
        semanticRank: 0,
        semanticScore: 0,
      };
    });

    semanticResults.forEach(({ movie }, rank) => {
      if (!combinedResults[movie.id]) {
        combinedResults[movie.id] = {
          movie,
          bm25Rank: 0,
          bm25Score: 0,
          semanticRank: 0,
          semanticScore: 0,
        };
      }

      combinedResults[movie.id]!.semanticRank = rank + 1;
      combinedResults[movie.id]!.semanticScore = this._rrfScore(rank + 1, k);
    });

    const hybridResults: RankedHybridResult[] = Object.values(
      combinedResults,
    ).map(({ movie, bm25Rank, bm25Score, semanticRank, semanticScore }) => ({
      movie,
      bm25Rank,
      bm25Score,
      semanticRank,
      semanticScore,
      hybridScore:
        bm25Rank && semanticRank
          ? this._rrfScore(bm25Rank, k) + this._rrfScore(semanticRank, k)
          : 0,
    }));

    return hybridResults
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, topK);
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
