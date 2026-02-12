import { MOVIES } from "../constants";

async function embed(text: string) {
  const response = await fetch("http://10.40.0.20:11434/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text
    })
  });

  const data = await response.json() as { embedding: number[] };
  return data.embedding;
}

export const buildVectorIndex = async () => {
  console.log('Building vector index...');
  for (const movie of MOVIES) {
    const vector = await embed(`${movie.title} ${movie.description}`);
    console.log(vector.length);
  }
  console.log('Vector index built!');
};
