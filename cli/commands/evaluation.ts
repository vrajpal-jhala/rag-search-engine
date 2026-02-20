import { HybridSearch } from './hybrid_search';
import { GOLDEN_DATASET, RECIPROCAL_RANK_FUSION_K } from '../constants';

export const evaluate = async (limit: number) => {
  const hybridSearch = new HybridSearch();
  await hybridSearch.load();

  for (const testCase of GOLDEN_DATASET) {
    const { query, relevant_docs } = testCase;
    const results = await hybridSearch.search(
      query,
      RECIPROCAL_RANK_FUSION_K,
      limit,
    );
    const relevantResults = results.filter(({ movie }) =>
      relevant_docs.includes(movie.title),
    );
    const precision = relevantResults.length / results.length;
    const recall = relevantResults.length / relevant_docs.length;
    const f1Score = (2 * (precision * recall)) / (precision + recall);

    console.log(`${query}`);
    console.log(`- Precision@${limit}: ${precision.toFixed(4)}`);
    console.log(`- Recall@${limit}: ${recall.toFixed(4)}`);
    console.log(`- F1 Score: ${f1Score.toFixed(4)}`);
    console.log(
      `- Retrieved: ${results.map(({ movie }) => movie.title).join(', ')}`,
    );
    console.log(`- Relevant: ${relevant_docs.join(', ')}`);
  }
};
