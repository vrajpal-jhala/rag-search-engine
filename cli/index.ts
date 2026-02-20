import { Command, Option } from 'commander';
import pkg from '../package.json';
import {
  getTermFrequency,
  getInverseDocumentFrequency,
  getTfIdf,
  getBM25InverseDocumentFrequency,
  getBM25TermFrequency,
  getBM25TfIdf,
  bm25Search,
  tfIdfSearch,
  basicSearch,
  buildKeywordIndex,
} from './commands/keyword_search';
import {
  buildChunkedVectorIndex,
  buildVectorIndex,
  chunkedSemanticSearch,
  semanticSearch,
} from './commands/semantic_search';
import { hybridSearch, rankedHybridSearch } from './commands/hybrid_search';
import { llmAidedHybridSearch } from './commands/llm_search';
import { rag } from './commands/rag';
import { evaluate } from './commands/evaluation';
import {
  HYBRID_SEARCH_TYPES,
  INDEX_TYPES,
  KEYWORD_SEARCH_TYPES,
  LLM_ENHANCED_TYPES,
  RAG_TYPES,
  RERANK_TYPES,
} from './constants';

const program = new Command();

program.name(pkg.name).description(pkg.description).version(pkg.version);

program
  .command('keyword-search')
  .description('Search using a specific type')
  .argument('<query>', 'Search query')
  .addOption(
    new Option('-t, --type <type>', 'Search type').choices(
      Object.values(KEYWORD_SEARCH_TYPES),
    ),
  )
  .option('-l, --limit <number>', 'Number of results', Number, 5)
  .action(async (query, options) => {
    const { type, limit } = options;

    console.log('Searching for:', query);

    switch (type) {
      case KEYWORD_SEARCH_TYPES.BASIC:
        const results = await basicSearch(query, limit);

        results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.title}`);
        });

        break;
      case KEYWORD_SEARCH_TYPES.TF_IDF:
      case KEYWORD_SEARCH_TYPES.BM25:
        const search =
          type === KEYWORD_SEARCH_TYPES.TF_IDF ? tfIdfSearch : bm25Search;
        const searchResults = await search(query, limit);

        searchResults.forEach(([result, score], index) => {
          console.log(
            `${index + 1}. (${result.id}) ${result.title} - Score: ${score}`,
          );
        });

        break;
      default:
        console.error('Invalid type');
        process.exit(1);
    }
  });

program
  .command('semantic-search')
  .description('Search using semantic search')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Number of results', Number, 5)
  .option('-c, --chunked', 'Use chunked vector index')
  .action(async (query, options) => {
    const { limit, chunked } = options;
    const search = chunked ? chunkedSemanticSearch : semanticSearch;
    const results = await search(query, limit);

    results.forEach(([result, score], index) => {
      console.log(
        `${index + 1}. ${result.title} - Score: ${score}
        ${result.description.slice(0, 100)}...`,
      );
    });
  });

program
  .command('hybrid-search')
  .description('Search using hybrid search')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Number of results', Number, 5)
  .addOption(
    new Option('-t, --type <type>', 'Search type').choices(
      Object.values(HYBRID_SEARCH_TYPES),
    ),
  )
  .option('-a, --alpha <number>', 'Alpha value', Number, 0.5)
  .option('-k, --k <number>', 'K value for ranked hybrid search', Number, 60)
  .action(async (query, options) => {
    const { limit, alpha, type, k } = options;
    const isRanked = type === HYBRID_SEARCH_TYPES.RANKED;

    if (isRanked) {
      const results = await rankedHybridSearch(query, k, limit);

      results.forEach(
        (
          [result, rank, _score, semanticRank, _semanticScore, hybridScore],
          index,
        ) => {
          console.log(
            `${index + 1}. ${result.title}
              RRF Score: ${hybridScore}
              BM25 Rank: ${rank}, Semantic Rank: ${semanticRank}
              ${result.description.slice(0, 100)}...`,
          );
        },
      );
    } else {
      const results = await hybridSearch(query, alpha, limit);

      results.forEach(([result, score, semanticScore, hybridScore], index) => {
        console.log(
          `${index + 1}. ${result.title}
          Hybrid Score: ${hybridScore}
          BM25 Score: ${score}, Semantic Score: ${semanticScore}
          ${result.description.slice(0, 100)}...`,
        );
      });
    }
  });

program
  .command('llm-search')
  .description('LLM aided hybrid search')
  .argument('<query>', 'Search query')
  .option('-k, --k <number>', 'K value for ranked hybrid search', Number, 60)
  .option('-l, --limit <number>', 'Number of results', Number, 5)
  .addOption(
    new Option(
      '-e, --enhanced <type>',
      'Query enhancement type with LLM',
    ).choices(Object.values(LLM_ENHANCED_TYPES)),
  )
  .addOption(
    new Option('-r, --reRank <type>', 'Re-rank the results using LLM').choices(
      Object.values(RERANK_TYPES),
    ),
  )
  .option('-j, --judge', 'Judge the results using LLM')
  .action(async (query, options) => {
    const { k, limit, enhanced, reRank, judge } = options;
    const results = await llmAidedHybridSearch(
      query,
      enhanced,
      reRank,
      judge,
      k,
      limit,
    );

    if (judge) {
      results.forEach(([result, score], index) => {
        console.log(`${index + 1}. ${result.title}: ${score}/3`);
      });
    } else {
      results.forEach(
        (
          [result, rank, , semanticRank, , hybridScore, crossEncoderScore],
          index,
        ) => {
          console.log(
            `${index + 1}. ${result.title}${
              reRank === RERANK_TYPES.CROSS_ENCODER
                ? `
            Cross Encoder Score: ${crossEncoderScore}`
                : ''
            }
          RRF Score: ${hybridScore}
          BM25 Rank: ${rank}, Semantic Rank: ${semanticRank}
          ${result.description.slice(0, 100)}...`,
          );
        },
      );
    }
  });

program
  .command('rag')
  .description('RAG search')
  .argument('<query>', 'Search query')
  .addOption(
    new Option('-t, --type <type>', 'RAG type').choices(
      Object.values(RAG_TYPES),
    ),
  )
  .option('-l, --limit <number>', 'Number of results', Number, 5)
  .action(async (query, options) => {
    const { limit, type } = options;
    const [results, answer] = await rag(query, type, limit);

    console.log('Search Results:')
    results.forEach((result) => {
      console.log(`- ${result.title}`);
    });
    console.log(`Answer: ${answer}`);
  });

program
  .command('evaluate')
  .description('Evaluate the hybrid search')
  .option('-l, --limit <number>', 'Number of results', Number, 5)
  .action(async (options) => {
    const { limit } = options;

    await evaluate(limit);
  });

program
  .command('build')
  .description('Build search index for a specific type')
  .addOption(
    new Option('-t, --type <type>', 'Index type').choices(
      Object.values(INDEX_TYPES),
    ),
  )
  .option('-c, --chunked', 'Build chunked vector index')
  .action(async (options) => {
    const { type, chunked } = options;

    switch (type) {
      case INDEX_TYPES.KEYWORD:
        await buildKeywordIndex();
        break;
      case INDEX_TYPES.VECTOR:
        if (chunked) {
          await buildChunkedVectorIndex();
        } else {
          await buildVectorIndex();
        }

        break;
      default:
        console.error('Invalid type');
        process.exit(1);
    }
  });

program
  .command('get-index')
  .description('Get index of a specific term of an index type')
  .addOption(
    new Option('-t, --type <type>', 'Index type').choices([
      'tf',
      'idf',
      'bm25-tf',
      'tf-idf',
      'bm25-idf',
    ]),
  )
  .option('-d, --docId <docId>', 'Document ID to get index for', Number)
  .option('-k, --k1 <k1>', 'BM25 k1 value', Number)
  .option('-b, --b <b>', 'BM25 b value', Number)
  .argument('<term>', 'Term to get index for')
  .action(async (term, options) => {
    const { type, docId, k1, b } = options;

    if (!docId && ['tf', 'tf-idf', 'bm25-tf'].includes(type)) {
      console.error(`-d, --docId is required for ${type}`);
      process.exit(1);
    }

    switch (type) {
      case 'tf':
        const tf = await getTermFrequency(docId, term);
        console.log(`Term frequency of '${term}': ${tf}`);
        break;
      case 'idf':
        const idf = await getInverseDocumentFrequency(term);
        console.log(`Inverse document frequency of '${term}': ${idf}`);
        break;
      case 'tf-idf':
        const tfIdf = await getTfIdf(docId, term);
        console.log(
          `TF-IDF score for '${term}' in document '${docId}': ${tfIdf}`,
        );
        break;
      case 'bm25-idf':
        const bm25Idf = await getBM25InverseDocumentFrequency(term);
        console.log(`BM25 inverse document frequency of '${term}': ${bm25Idf}`);
        break;
      case 'bm25-tf':
        const bm25Tf = await getBM25TermFrequency(docId, term, k1, b);
        console.log(`BM25 term frequency of '${term}': ${bm25Tf}`);
        break;
      case 'bm25-tf-idf':
        const bm25TfIdf = await getBM25TfIdf(docId, term, k1, b);
        console.log(
          `BM25 TF-IDF score for '${term}' in document '${docId}': ${bm25TfIdf}`,
        );
        break;
      default:
        console.error('Invalid type');
        process.exit(1);
    }
  });

program.parse(process.argv);
