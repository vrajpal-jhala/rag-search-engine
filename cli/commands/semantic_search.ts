import type { Movie } from '../types';
import path from 'path';
import { CACHE_PATH, MOVIES } from '../constants';

async function embed(model: string, input: string[]) {
  const res = await fetch('http://10.40.0.20:11434/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input,
      keepAlive: '5m',
    }),
  });
  const response = await res.json();

  const data = response as { embeddings: number[][] } | { error: string };

  if ('error' in data) {
    throw new Error(data.error);
  }

  return data.embeddings;
}

class VectorIndex {
  static model = 'all-minilm:l6-v2';
  static docMapPath = path.resolve(CACHE_PATH, 'doc_map.json');
  static embeddingsPath = path.resolve(CACHE_PATH, 'embeddings.json');

  docMap: Record<Movie['id'], Movie>;
  embeddings: number[][];

  constructor() {
    this.docMap = {};
    this.embeddings = [];
  }

  async build() {
    console.log('Building vector index...');

    for (let i = 0; i < MOVIES.length; i++) {
      const movie = MOVIES[i]!;
      const { id, title, description } = movie;
      const text: string = `${title}: ${description}`;
      const embeddings = await embed(VectorIndex.model, [text]);

      this.embeddings.push(...embeddings);
      this.docMap[id] = movie;
      process.stdout.write(`${Math.round((i / MOVIES.length) * 100)}%`);
      process.stdout.write('\r');

      if (i === MOVIES.length - 1) {
        console.log('100%\nVector index built!');
      }
    }
  }

  private _dotProduct(a: number[], b: number[]) {
    return a.reduce((acc, curr, index) => acc + curr * b[index]!, 0);
  }

  private _magnitude(a: number[]) {
    return Math.sqrt(a.reduce((acc, curr) => acc + curr * curr, 0));
  }

  private _cosineSimilarity(a: number[], b: number[]) {
    if (a.length !== b.length) {
      throw new Error('Vectors must be the same length');
    }

    return this._dotProduct(a, b) / (this._magnitude(a) * this._magnitude(b));
  }

  async search(query: string, topK: number = 5) {
    const queryEmbedding = await embed(VectorIndex.model, [query]);
    const similarities: [Movie, number][] = [];

    for (let i = 0; i < this.embeddings.length; i++) {
      const embedding = this.embeddings[i]!;
      const cos = this._cosineSimilarity(embedding, queryEmbedding[0]!);
      similarities.push([MOVIES[i]!, cos]);
    }

    return similarities.sort((a, b) => b[1] - a[1]).slice(0, topK);
  }

  async save() {
    await Bun.write(
      VectorIndex.docMapPath,
      JSON.stringify(this.docMap, null, 2),
    );
    await Bun.write(
      VectorIndex.embeddingsPath,
      JSON.stringify(this.embeddings, null, 2),
    );
  }

  async load() {
    this.docMap = JSON.parse(await Bun.file(VectorIndex.docMapPath).text());
    this.embeddings = JSON.parse(
      await Bun.file(VectorIndex.embeddingsPath).text(),
    );

    if (Object.keys(this.docMap).length !== this.embeddings.length) {
      throw new Error('Document map and embeddings length mismatch');
    }
  }
}

export const buildVectorIndex = async () => {
  const vectorIndex = new VectorIndex();
  await vectorIndex.build();
  await vectorIndex.save();
};

export const semanticSearch = async (query: string, topK: number = 5) => {
  const vectorIndex = new VectorIndex();
  await vectorIndex.load();
  const results: [Movie, number][] = (await vectorIndex.search(query, topK)).map(([movie, score]) => [
    vectorIndex.docMap[movie.id]!,
    score,
  ]);

  return results;
};
