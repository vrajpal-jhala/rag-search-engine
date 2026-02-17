import type { Movie } from '../types';
import path from 'path';
import {
  BASIC_VECTOR_CACHE_PATH,
  CHUNKED_VECTOR_CACHE_PATH,
  MOVIES,
} from '../constants';

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

  docMapPath = path.resolve(BASIC_VECTOR_CACHE_PATH, 'doc_map.json');
  embeddingsPath = path.resolve(BASIC_VECTOR_CACHE_PATH, 'embeddings.json');
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
      process.stdout.write(`${Math.floor((i / MOVIES.length) * 100)}%`);
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

  protected _cosineSimilarity(a: number[], b: number[]) {
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

      // since we don't map embeddings to documents IDs, we need to use the index to get the movie
      similarities.push([MOVIES[i]!, cos]);
    }

    return similarities.sort((a, b) => b[1] - a[1]).slice(0, topK);
  }

  async save() {
    await Bun.write(this.docMapPath, JSON.stringify(this.docMap, null, 2));
    await Bun.write(
      this.embeddingsPath,
      JSON.stringify(this.embeddings, null, 2),
    );
  }

  async load() {
    this.docMap = JSON.parse(await Bun.file(this.docMapPath).text());
    this.embeddings = JSON.parse(await Bun.file(this.embeddingsPath).text());
  }
}

class ChunkedVectorIndex extends VectorIndex {
  static chunkSize = 4;
  static overlap = 1;
  static override model = 'all-minilm:l6-v2';

  chunkMetadataPath = path.resolve(
    CHUNKED_VECTOR_CACHE_PATH,
    'chunk_metadata.json',
  );
  override embeddingsPath = path.resolve(
    CHUNKED_VECTOR_CACHE_PATH,
    'embeddings.json',
  );
  override docMapPath = path.resolve(CHUNKED_VECTOR_CACHE_PATH, 'doc_map.json');

  chunkMetadata: {
    id: Movie['id'];
    chunkIndex: number;
    totalChunks: number;
  }[] = [];

  constructor() {
    super();
  }

  private _fixedSizeChunking(text: string, chunkSize: number) {
    const words = text.split(' ');
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }

    return chunks;
  }

  private _overlappingChunking(
    text: string,
    chunkSize: number,
    overlap: number,
  ) {
    const words = text.split(' ');
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize);

      if (chunk.length <= overlap) {
        continue;
      }

      chunks.push(chunk.join(' '));
    }

    return chunks;
  }

  private _semanticChunking(text: string, chunkSize: number, overlap: number) {
    if (!text.trim().length) {
      return [];
    }

    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    const chunks: string[] = [];

    for (let i = 0; i < sentences.length; i += chunkSize - overlap) {
      const chunk = sentences.slice(i, i + chunkSize);

      if (chunks.length && chunk.length <= overlap) {
        continue;
      }

      chunks.push(chunk.join(' '));
    }

    return chunks;
  }

  override async build() {
    console.log('Building chunked vector index...');
    const chunks: string[] = [];

    for (let i = 0; i < MOVIES.length; i++) {
      const movie = MOVIES[i]!;
      const { id, description } = movie;
      const _chunks = this._semanticChunking(
        description,
        ChunkedVectorIndex.chunkSize,
        ChunkedVectorIndex.overlap,
      );

      this.docMap[id] = movie;
      chunks.push(..._chunks);

      this.chunkMetadata.push(
        ..._chunks.map((_, j) => ({
          id,
          chunkIndex: j,
          totalChunks: _chunks.length,
        })),
      );

      if (i === MOVIES.length - 1) {
        process.stdout.write('99%');
        setTimeout(() => {
          process.stdout.write('99% This may take a while...');
        }, 5000);
      } else {
        process.stdout.write(`${Math.floor((i / MOVIES.length) * 100)}%`);
      }

      process.stdout.write('\r');
    }

    this.embeddings = await embed(ChunkedVectorIndex.model, chunks);
    console.log('100%\nChunked vector index built!');
  }

  override async search(query: string, topK: number = 5) {
    const queryEmbedding = await embed(VectorIndex.model, [query]);
    const chunkSimilarities: [Movie['id'], number, number][] = [];
    const similarities: Record<Movie['id'], number> = {};

    for (let i = 0; i < this.embeddings.length; i++) {
      const embedding = this.embeddings[i]!;
      const metadata = this.chunkMetadata[i]!;
      const cos = this._cosineSimilarity(embedding, queryEmbedding[0]!);

      chunkSimilarities.push([metadata.id, metadata.chunkIndex, cos]);
      similarities[metadata.id] = Math.max(similarities[metadata.id] || 0, cos);
    }

    const sortedSimilarities = Object.entries(similarities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK);

    return sortedSimilarities.map(([id, score]): [Movie, number] => [
      this.docMap[parseInt(id)]!,
      score,
    ]);
  }

  override async save() {
    await Bun.write(
      this.chunkMetadataPath,
      JSON.stringify(this.chunkMetadata, null, 2),
    );
    await super.save();
  }

  override async load() {
    this.chunkMetadata = JSON.parse(
      await Bun.file(this.chunkMetadataPath).text(),
    );
    await super.load();
  }
}

export const buildVectorIndex = async () => {
  const vectorIndex = new VectorIndex();
  await vectorIndex.build();
  await vectorIndex.save();
};

export const buildChunkedVectorIndex = async () => {
  const vectorIndex = new ChunkedVectorIndex();
  await vectorIndex.build();
  await vectorIndex.save();
};

export const semanticSearch = async (query: string, topK: number = 5) => {
  const vectorIndex = new VectorIndex();
  await vectorIndex.load();
  const results: [Movie, number][] = (
    await vectorIndex.search(query, topK)
  ).map(([movie, score]) => [
    vectorIndex.docMap[movie.id]!,
    parseFloat(score.toFixed(4)),
  ]);

  return results;
};

export const chunkedSemanticSearch = async (
  query: string,
  topK: number = 5,
) => {
  const vectorIndex = new ChunkedVectorIndex();
  await vectorIndex.load();
  let results: [Movie, number][] = await vectorIndex.search(query, topK);
  results = results.map(([movie, score]) => [
    vectorIndex.docMap[movie.id]!,
    parseFloat(score.toFixed(4)),
  ]);

  return results;
};
