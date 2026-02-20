import type {
  Movie,
  RankedHybridResult,
  RankedHybridResultWithCrossEncoder,
} from '../types';
import { LLM, llmAidedHybridSearch } from './llm_search';
import { RAG_TYPES, RECIPROCAL_RANK_FUSION_K } from '../constants';

export const rag = async (
  query: string,
  type: (typeof RAG_TYPES)[keyof typeof RAG_TYPES],
  image: string | undefined,
  limit: number = 5,
) => {
  const llm = new LLM();

  if (image) {
    query = await llm.generateImageDescription(query, image);
    console.log(`Image query: ${query}`);
  }

  const results = (await llmAidedHybridSearch(
    query,
    undefined,
    undefined,
    undefined,
    RECIPROCAL_RANK_FUSION_K,
    limit,
  )) as (RankedHybridResult | RankedHybridResultWithCrossEncoder)[];

  const answer = await llm.augmentedGeneration(results, query, type);

  return [results.map(({ movie }) => movie), answer] as [Movie[], string];
};
