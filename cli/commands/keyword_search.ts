import type { Movie } from '../types';
import path from 'path';
import { partialMatch, sanitizeText, tokenizeText } from '../utils';
import { BM25_B, BM25_K1, KEYWORD_CACHE_PATH, MOVIES } from '../constants';

class Counter {
  map: Map<string, number>;

  constructor() {
    this.map = new Map<string, number>();
  }

  update(tokens: string[]) {
    for (const token of tokens) {
      this.map.set(token, (this.map.get(token) || 0) + 1);
    }
  }

  get(token: string) {
    return this.map.get(token) || 0;
  }

  toJSON() {
    return Object.fromEntries(this.map);
  }

  static fromJSON(json: Record<string, number>) {
    const counter = new Counter();

    for (const [token, count] of Object.entries(json)) {
      counter.map.set(token, count);
    }

    return counter;
  }
}

export class InvertedIndex {
  static indexPath = path.resolve(KEYWORD_CACHE_PATH, 'index.json');
  static termFrequencyPath = path.resolve(
    KEYWORD_CACHE_PATH,
    'term_frequency.json',
  );
  static documentLengthPath = path.resolve(
    KEYWORD_CACHE_PATH,
    'document_length.json',
  );
  static docMapPath = path.resolve(KEYWORD_CACHE_PATH, 'doc_map.json');

  docMap: Record<Movie['id'], Movie>;
  index: Record<string, Movie['id'][]>;
  termFrequency: Record<Movie['id'], Counter>;
  documentLength: Record<Movie['id'], number>;

  constructor() {
    this.docMap = {};
    this.index = {};
    this.termFrequency = {} as Record<Movie['id'], Counter>;
    this.documentLength = {};
  }

  private _addDocument(docId: Movie['id'], text: Movie['title']) {
    const tokens = tokenizeText(sanitizeText(text));

    for (const token of new Set(tokens)) {
      if (!Array.isArray(this.index[token])) {
        this.index[token] = [];
      }

      this.index[token].push(docId);
    }

    if (!this.termFrequency[docId]) {
      this.termFrequency[docId] = new Counter();
    }

    this.termFrequency[docId].update(Array.from(tokens));
    this.documentLength[docId] = tokens.length;
  }

  private _getAverageDocumentLength() {
    const lengths = Object.values(this.documentLength);

    if (lengths.length === 0) {
      return 0;
    }

    return lengths.reduce((acc, length) => acc + length, 0) / lengths.length;
  }

  getDocuments(term: string) {
    return (this.index[term] || []).sort((a, b) => (a > b ? 1 : -1));
  }

  getInverseDocumentFrequency(term: string) {
    const token = tokenizeText(term)[0];

    if (!token) {
      throw new Error('Can only have 1 token');
    }

    const documentFrequency = this.index[token]?.length ?? 0;

    // +1 to avoid division by zero
    return Math.log(
      (Object.keys(this.docMap).length + 1) / (documentFrequency + 1),
    ).toFixed(2);
  }

  getBM25InverseDocumentFrequency(term: string) {
    const token = tokenizeText(term)[0];
    if (!token) {
      throw new Error('Can only have 1 token');
    }

    const totalDocuments = Object.keys(this.docMap).length;
    const documentFrequency = this.index[token]?.length ?? 0;

    // +0.5 to avoid division by zero
    return Math.log(
      (totalDocuments - documentFrequency + 0.5) / (documentFrequency + 0.5) +
        1, // +1 to prevent negative scores
    ).toFixed(2);
  }

  getTermFrequency(docId: Movie['id'], term: string) {
    const token = tokenizeText(term)[0];
    if (!token) {
      throw new Error('Can only have 1 token');
    }

    return this.termFrequency[docId]?.get(token) ?? 0;
  }

  getBM25TermFrequency(
    docId: Movie['id'],
    term: string,
    k1: number = BM25_K1,
    b: number = BM25_B,
  ) {
    const token = tokenizeText(term)[0];
    if (!token) {
      throw new Error('Can only have 1 token');
    }

    const tf = this.termFrequency[docId]?.get(token) ?? 0;
    const averageDocumentLength = this._getAverageDocumentLength();
    const lengthNormalization =
      averageDocumentLength > 0
        ? 1 -
          b +
          b * ((this.documentLength[docId] ?? 0) / averageDocumentLength)
        : 1;

    return (tf * (k1 + 1)) / (tf + k1 * lengthNormalization);
  }

  getTfIdf(docId: Movie['id'], term: string) {
    const tf = this.getTermFrequency(docId, term);
    const idf = this.getInverseDocumentFrequency(term);
    return tf * parseFloat(idf);
  }

  getBM25TfIdf(
    docId: Movie['id'],
    term: string,
    k1: number = BM25_K1,
    b: number = BM25_B,
  ) {
    const tf = this.getBM25TermFrequency(docId, term, k1, b);
    const idf = this.getBM25InverseDocumentFrequency(term);
    return tf * parseFloat(idf);
  }

  build() {
    console.log('Building indices...');
    for (const [index, movie] of MOVIES.entries()) {
      this._addDocument(movie.id, `${movie.title} ${movie.description}`);
      this.docMap[movie.id] = movie;

      process.stdout.write(`${Math.floor((index / MOVIES.length) * 100)}%`);
      process.stdout.write('\r');

      if (index === MOVIES.length - 1) {
        console.log('100%\nKeyword indices built!');
      }
    }
  }

  async _search(query: string, topK: number) {
    const results: Movie[] = [];
    const sanitizedQueryTokens = tokenizeText(sanitizeText(query));

    for (const token of sanitizedQueryTokens) {
      const documentIds = this.getDocuments(token);
      for (const documentId of documentIds) {
        if (results.some((result) => result.id === documentId)) {
          continue;
        }

        const movie = this.docMap[documentId];

        results.push(movie!);

        if (results.length >= topK) {
          break;
        }
      }
    }

    // Without caching
    // for (const movie of MOVIES) {
    //   const sanitizedTitleTokens = tokenizeText(sanitizeText(movie.title));

    //   if (partialMatch(sanitizedQueryTokens, sanitizedTitleTokens)) {
    //     results.push(movie);

    //     if (results.length >= topK) {
    //       break;
    //     }
    //   }
    // }

    return results;
  }

  async search(query: string, topK: number) {
    const results: [Movie, number][] = [];
    const scores: Record<Movie['id'], number> = {};
    const sanitizedQueryTokens = tokenizeText(sanitizeText(query));

    // Only get documents that contain at least one query term
    const candidateDocIds = new Set<number>();
    for (const token of sanitizedQueryTokens) {
      const docIds = this.getDocuments(token);
      docIds.forEach((id) => candidateDocIds.add(id));
    }

    // Score only candidate documents
    for (const docId of candidateDocIds) {
      let score = 0;

      for (const token of sanitizedQueryTokens) {
        score += this.getBM25TfIdf(docId, token);
      }

      scores[docId] = score;
    }

    const sortedScores = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK);

    for (const [docId, score] of sortedScores) {
      results.push([
        this.docMap[parseInt(docId)]!,
        parseFloat(score.toFixed(2)),
      ]);
    }

    return results;
  }

  async save() {
    await Bun.write(
      InvertedIndex.docMapPath,
      JSON.stringify(this.docMap, null, 2),
    );
    await Bun.write(
      InvertedIndex.indexPath,
      JSON.stringify(this.index, null, 2),
    );
    await Bun.write(
      InvertedIndex.termFrequencyPath,
      JSON.stringify(this.termFrequency, null, 2),
    );
    await Bun.write(
      InvertedIndex.documentLengthPath,
      JSON.stringify(this.documentLength, null, 2),
    );
  }

  async load() {
    this.docMap = JSON.parse(await Bun.file(InvertedIndex.docMapPath).text());
    this.index = JSON.parse(await Bun.file(InvertedIndex.indexPath).text());
    const termFrequency = JSON.parse(
      await Bun.file(InvertedIndex.termFrequencyPath).text(),
    ) as Record<Movie['id'], Record<string, number>>;
    this.termFrequency = Object.entries(termFrequency).reduce(
      (acc, [id, map]) => {
        acc[parseInt(id)] = Counter.fromJSON(map);
        return acc;
      },
      {} as Record<Movie['id'], Counter>,
    );
    this.documentLength = JSON.parse(
      await Bun.file(InvertedIndex.documentLengthPath).text(),
    ) as Record<Movie['id'], number>;
  }
}

export const buildKeywordIndex = async () => {
  const invertedIndex = new InvertedIndex();
  invertedIndex.build();
  invertedIndex.save();
};

export const getInverseDocumentFrequency = async (term: string) => {
  const invertedIndex = new InvertedIndex();
  await invertedIndex.load();
  return invertedIndex.getInverseDocumentFrequency(term);
};

export const getBM25InverseDocumentFrequency = async (term: string) => {
  const invertedIndex = new InvertedIndex();
  await invertedIndex.load();
  const bm25Idf = parseFloat(
    invertedIndex.getBM25InverseDocumentFrequency(term),
  );
  return bm25Idf.toFixed(2);
};

export const getTermFrequency = async (docId: Movie['id'], term: string) => {
  const invertedIndex = new InvertedIndex();
  await invertedIndex.load();
  return invertedIndex.getTermFrequency(docId, term);
};

export const getBM25TermFrequency = async (
  docId: Movie['id'],
  term: string,
  k1: number = BM25_K1,
  b: number = BM25_B,
) => {
  const invertedIndex = new InvertedIndex();
  await invertedIndex.load();
  const tf = invertedIndex.getBM25TermFrequency(docId, term, k1);
  return tf.toFixed(2);
};

export const getTfIdf = async (docId: Movie['id'], term: string) => {
  const invertedIndex = new InvertedIndex();
  await invertedIndex.load();
  const tfIdf = invertedIndex.getTfIdf(docId, term);
  return tfIdf.toFixed(2);
};

export const getBM25TfIdf = async (
  docId: Movie['id'],
  term: string,
  k1: number = BM25_K1,
  b: number = BM25_B,
) => {
  const invertedIndex = new InvertedIndex();
  await invertedIndex.load();
  const tfIdf = invertedIndex.getBM25TfIdf(docId, term, k1, b);
  return tfIdf.toFixed(2);
};

export const basicSearch = async (
  query: string,
  topK: number = 5,
): Promise<Movie[]> => {
  const invertedIndex = new InvertedIndex();
  await invertedIndex.load();
  return invertedIndex._search(query, topK);
};

export const tfIdfSearch = async (query: string, topK: number = 5) => {
  const results: [Movie, number][] = [];
  const scores: Record<Movie['id'], number> = {};
  const sanitizedQueryTokens = tokenizeText(sanitizeText(query));
  const invertedIndex = new InvertedIndex();
  await invertedIndex.load();

  // Only get documents that contain at least one query term
  const candidateDocIds = new Set<number>();
  for (const token of sanitizedQueryTokens) {
    const docIds = invertedIndex.getDocuments(token);
    docIds.forEach((id) => candidateDocIds.add(id));
  }

  // Score only candidate documents
  for (const docId of candidateDocIds) {
    let score = 0;

    for (const token of sanitizedQueryTokens) {
      const tf = invertedIndex.getTfIdf(docId, token);
      score += tf;
    }

    scores[docId] = score;
  }

  const sortedScores = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK);

  for (const [docId, score] of sortedScores) {
    results.push([
      invertedIndex.docMap[parseInt(docId)]!,
      parseFloat(score.toFixed(2)),
    ]);
  }

  return results;
};

export const bm25Search = async (query: string, topK: number = 5) => {
  const invertedIndex = new InvertedIndex();
  await invertedIndex.load();
  return invertedIndex.search(query, topK);
};
