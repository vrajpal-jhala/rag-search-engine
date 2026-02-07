import type { Movie } from "./types";
import path from "path";
import movies from "../dataset/movies.json";
import stop_words from "../dataset/stop_words.json";

export const PROJECT_ROOT = path.resolve(__dirname, "..");
export const CACHE_PATH = path.resolve(PROJECT_ROOT, "cache");
export const MOVIES = (movies as { movies: Movie[] }).movies;
export const STOP_WORDS = stop_words;
