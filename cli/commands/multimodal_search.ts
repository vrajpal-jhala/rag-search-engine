import type { Movie } from '../types';
import path from 'path';
import {
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  AutoTokenizer,
  AutoProcessor,
  RawImage,
  cos_sim,
} from '@huggingface/transformers';
import { MOVIES, MULTIMODAL_EMBEDDING_MODEL } from '../constants';

class MultimodalSearch {
  static model = MULTIMODAL_EMBEDDING_MODEL;

  private textModel: any = null;
  private visionModel: any = null;
  private tokenizer: any = null;
  private processor: any = null;
  private embeddings: number[][];

  constructor() {
    this.embeddings = [];
  }

  async load() {
    this.textModel = await CLIPTextModelWithProjection.from_pretrained(
      MultimodalSearch.model,
    );
    this.visionModel = await CLIPVisionModelWithProjection.from_pretrained(
      MultimodalSearch.model,
    );
    this.tokenizer = await AutoTokenizer.from_pretrained(
      MultimodalSearch.model,
    );
    this.processor = await AutoProcessor.from_pretrained(
      MultimodalSearch.model,
    );

    const batchSize = 32;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < MOVIES.length; i += batchSize) {
      const batch = MOVIES.slice(i, Math.min(i + batchSize, MOVIES.length));
      // ? for some reason, adding the description to the title makes the embeddings worse
      const texts = batch.map((movie) => `${movie.title}`);
      const textInputs = await this.tokenizer(texts, {
        padding: true,
        truncation: true,
      });
      const { text_embeds } = await this.textModel(textInputs);
      allEmbeddings.push(...text_embeds.tolist());

      if (i % 500 === 0 || i + batchSize >= MOVIES.length) {
        process.stdout.write(
          `\rLoading embeddings: ${Math.min(i + batchSize, MOVIES.length)}/${MOVIES.length}`,
        );
      }
    }
    console.log();

    this.embeddings = allEmbeddings;
  }

  async search(image: string, topK: number) {
    const imagePath = path.resolve(image);
    const rawImage = await RawImage.read(imagePath);
    const imageInputs = await this.processor(rawImage);
    const { image_embeds } = await this.visionModel(imageInputs);
    const imageEmbedding = image_embeds.tolist()[0];

    const similarities: [Movie, number][] = this.embeddings.map(
      (embedding, index) => [
        MOVIES[index]!,
        cos_sim(embedding, imageEmbedding),
      ],
    );
    const sortedSimilarities = similarities.sort((a, b) => b[1] - a[1]);
    return sortedSimilarities.slice(0, topK);
  }
}

export const multimodalSearch = async (image: string, limit: number = 5) => {
  const multimodalSearch = new MultimodalSearch();
  await multimodalSearch.load();
  return (await multimodalSearch.search(image, limit)).map(
    ([result, score]) => [result, parseFloat(score.toFixed(3))],
  ) as [Movie, number][];
};
