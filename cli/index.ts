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
import { buildVectorIndex, semanticSearch } from './commands/semantic_search';
import { INDEX_TYPES, KEYWORD_SEARCH_TYPES } from './constants';

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
  .option('-k, --topK <number>', 'Number of results', parseInt, 5)
  .action(async (query, options) => {
    const { type, topK } = options;

    console.log('Searching for:', query);

    switch (type) {
      case KEYWORD_SEARCH_TYPES.BASIC:
        const results = await basicSearch(query, topK);

        results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.title}`);
        });

        break;
      case KEYWORD_SEARCH_TYPES.TF_IDF:
      case KEYWORD_SEARCH_TYPES.BM25:
        const search =
          type === KEYWORD_SEARCH_TYPES.TF_IDF ? tfIdfSearch : bm25Search;
        const searchResults = await search(query, topK);

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
  .option('-k, --topK <number>', 'Number of results', parseInt, 5)
  .action(async (query, options) => {
    const { topK } = options;
    const results = await semanticSearch(query, topK);

    results.forEach(([result, score], index) => {
      console.log(
        `${index + 1}. ${result.title} - Score: ${score}
        ${result.description.slice(0, 100)}...`,
      );
    });
  });

program
  .command('build')
  .description('Build search index for a specific type')
  .addOption(
    new Option('-t, --type <type>', 'Index type').choices(
      Object.values(INDEX_TYPES),
    ),
  )
  .action(async (options) => {
    const { type } = options;

    switch (type) {
      case INDEX_TYPES.KEYWORD:
        await buildKeywordIndex();
        break;
      case INDEX_TYPES.VECTOR:
        await buildVectorIndex();
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
  .option('-d, --docId <docId>', 'Document ID to get index for', parseInt)
  .option('-k, --k1 <k1>', 'BM25 k1 value', parseFloat)
  .option('-b, --b <b>', 'BM25 b value', parseFloat)
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
