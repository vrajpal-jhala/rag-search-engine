import type { Movie } from '../types';
import { LLM, llmAidedHybridSearch } from './llm_search';
import { RAG_TYPES, RECIPROCAL_RANK_FUSION_K } from '../constants';

export const rag = async (
  query: string,
  type: (typeof RAG_TYPES)[keyof typeof RAG_TYPES],
  limit: number = 5,
) => {
  const results = await llmAidedHybridSearch(
    query,
    undefined,
    undefined,
    undefined,
    RECIPROCAL_RANK_FUSION_K,
    limit,
  );
  const llm = new LLM();
  const answer = await llm.augmentedGeneration(
    results as (
      | [Movie, number, number, number, number, number]
      | [Movie, number, number, number, number, number, number]
    )[],
    query,
    type,
  );

  const summarizedResults = [results.map(([result]) => result), answer];

  return summarizedResults as [Movie[], string];
};
