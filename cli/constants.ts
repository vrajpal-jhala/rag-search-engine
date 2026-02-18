import type { Movie } from "./types";
import path from "path";
import movies from "../dataset/movies.json";
import stop_words from "../dataset/stop_words.json";

export const PROJECT_ROOT = path.resolve(__dirname, "..");
export const CACHE_PATH = path.resolve(PROJECT_ROOT, "cache");
export const KEYWORD_CACHE_PATH = path.resolve(CACHE_PATH, "keyword");
export const VECTOR_CACHE_PATH = path.resolve(CACHE_PATH, "vector");
export const BASIC_VECTOR_CACHE_PATH = path.resolve(VECTOR_CACHE_PATH, "basic");
export const CHUNKED_VECTOR_CACHE_PATH = path.resolve(VECTOR_CACHE_PATH, "chunked");
export const MOVIES = (movies as { movies: Movie[] }).movies;
export const STOP_WORDS = stop_words;
export const KEYWORD_SEARCH_TYPES = {
  BASIC: 'basic',
  TF_IDF: 'tf-idf',
  BM25: 'bm25',
} as const;
export const HYBRID_SEARCH_TYPES = {
  WEIGHTED: 'weighted',
  RANKED: 'ranked',
} as const;
export const INDEX_TYPES = {
  KEYWORD: 'keyword',
  VECTOR: 'vector',
} as const;
export const BM25_K1 = 1.5;
export const BM25_B = 0.75;
export const HYBRID_SEARCH_ALPHA = 0.5;
export const RECIPROCAL_RANK_FUSION_K = 60;
export const LLM_MODEL = 'gemini-flash-latest';
export const LLM_PROMPT_PATH = path.resolve(PROJECT_ROOT, "cli", "prompts");
export const LLM_ENHANCED_TYPES = {
  SPELL: 'spell',
  REWRITE: 'rewrite',
  EXPAND: 'expand',
} as const;
export const CROSS_ENCODER_MODEL = 'Xenova/ms-marco-TinyBERT-L-2-v2';
export const RERANK_TYPES = {
  LLM: 'llm',
  CROSS_ENCODER: 'cross-encoder',
} as const;
