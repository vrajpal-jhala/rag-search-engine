import type { Movie } from '../types';
import path from 'path';
import { fuzzyMatch, sanitizeText, tokenizeText } from '../utils';
import { CACHE_PATH, MOVIES } from '../constants';

class InvertedIndex {
  static indexPath = path.resolve(CACHE_PATH, 'inverted_index.json');
  static docMapPath = path.resolve(CACHE_PATH, 'docmap.json');
  private index: Record<string, Movie['id'][]>;
  docMap: Record<Movie['id'], Movie>;

  constructor() {
    this.index = {};
    this.docMap = {};
  }

  private _addDocument(docId: Movie['id'], text: Movie['title']) {
    const tokens = new Set(tokenizeText(sanitizeText(text)));

    for (const token of tokens) {
      if (!Array.isArray(this.index[token])) {
        this.index[token] = [];
      }
      this.index[token].push(docId);
    }
  }

  getDocuments(term: string) {
    return (this.index[term] || []).sort((a, b) => (a > b ? 1 : -1));
  }

  build() {
    console.log('Building inverted index...');
    for (const [index, movie] of MOVIES.entries()) {
      process.stdout.write(`${Math.round((index / MOVIES.length) * 100)}%`);
      process.stdout.write('\r');
      this._addDocument(movie.id, `${movie.title} ${movie.description}`);
      this.docMap[movie.id] = movie;

      if (index === MOVIES.length - 1) {
        console.log('100%\nBuilding inverted index completed!');
      }
    }
  }

  async save() {
    await Bun.write(
      InvertedIndex.indexPath,
      JSON.stringify(this.index, null, 2),
    );
    await Bun.write(
      InvertedIndex.docMapPath,
      JSON.stringify(this.docMap, null, 2),
    );
  }

  async load() {
    this.index = JSON.parse(await Bun.file(InvertedIndex.indexPath).text());
    this.docMap = JSON.parse(await Bun.file(InvertedIndex.docMapPath).text());
  }
}

export const keywordSearch = async (
  query: string,
  topK: number,
): Promise<Movie[]> => {
  const results: Movie[] = [];
  const sanitizedQueryTokens = tokenizeText(sanitizeText(query));
  const invertedIndex = new InvertedIndex();
  await invertedIndex.load();

  for (const token of sanitizedQueryTokens) {
    const documentIds = invertedIndex.getDocuments(token);
    for (const documentId of documentIds) {
      if (results.some((result) => result.id === documentId)) {
        continue;
      }

      const movie = invertedIndex.docMap[documentId];

      results.push(movie!);

      if (results.length >= topK) {
        break;
      }
    }
  }

  // Without caching
  // for (const movie of MOVIES) {
  //   const sanitizedTitleTokens = tokenizeText(sanitizeText(movie.title));

  //   if (fuzzyMatch(sanitizedQueryTokens, sanitizedTitleTokens)) {
  //     results.push(movie);

  //     if (results.length >= topK) {
  //       break;
  //     }
  //   }
  // }

  return results;
};

export const buildInvertedIndex = async () => {
  const invertedIndex = new InvertedIndex();
  invertedIndex.build();
  invertedIndex.save();
};
