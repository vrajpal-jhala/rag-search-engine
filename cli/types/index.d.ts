export type Movie = {
  id: number;
  title: string;
  description: string;
};

export type TestCases = {
  test_cases: {
    query: string;
    relevant_docs: string[];
  }[];
};

export type KeywordResult = {
  movie: Movie;
  score: number;
};

export type SemanticResult = {
  movie: Movie;
  score: number;
};

export type HybridResult = {
  movie: Movie;
  bm25Score: number;
  semanticScore: number;
  hybridScore: number;
};

export type RankedHybridResult = {
  movie: Movie;
  bm25Rank: number;
  bm25Score: number;
  semanticRank: number;
  semanticScore: number;
  hybridScore: number;
};

export type RankedHybridResultWithCrossEncoder = RankedHybridResult & {
  crossEncoderScore: number;
};

export type JudgedResult = {
  movie: Movie;
  score: number;
};
