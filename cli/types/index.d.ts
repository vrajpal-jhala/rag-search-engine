export type Movie = {
  id: number;
  title: string;
  description: string;
}

export type TestCases = {
  test_cases: {
    query: string;
    relevant_docs: string[];
  }[];
}
