# RAG Search Engine

A full RAG pipeline with keyword, semantic, hybrid, LLM-aided, multimodal search, and augmented generation capabilities.

## Setup

### Prerequisites
- [Bun](https://bun.sh) installed
- Google Gemini API key (for LLM features)

### Installation

1. Install dependencies:
```bash
bun install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

## Usage

**Important:** Due to native dependencies (ONNX Runtime), the application must be run directly with Bun:

```bash
bun start <command> [options]
# or
bun run cli/index.ts <command> [options]
```

## Commands

### `build` — Build search index

```bash
bun start build -t keyword
bun start build -t vector
bun start build -t vector --chunked
```

Options:
- `-t, --type <type>` — Index type: `keyword`, `vector`
- `-c, --chunked` — Build chunked vector index (for semantic search)

---

### `keyword-search` — Keyword-based search

```bash
bun start keyword-search -t basic "family movie about bears"
bun start keyword-search -t tf-idf "family movie about bears"
bun start keyword-search -t bm25 "family movie about bears"
```

Options:
- `-t, --type <type>` — Search type: `basic`, `tf-idf`, `bm25`
- `-l, --limit <number>` — Number of results (default: 5)

---

### `semantic-search` — Embedding-based semantic search

```bash
bun start semantic-search "family movie about bears"
bun start semantic-search --chunked "family movie about bears"
```

Options:
- `-l, --limit <number>` — Number of results (default: 5)
- `-c, --chunked` — Use chunked vector index

---

### `hybrid-search` — Hybrid search (BM25 + semantic)

```bash
# Weighted combination
bun start hybrid-search -t weighted -a 0.5 "family movie about bears"

# Reciprocal Rank Fusion
bun start hybrid-search -t ranked "family movie about bears"
```

Options:
- `-t, --type <type>` — Search type: `weighted`, `ranked`
- `-a, --alpha <number>` — Alpha weight for BM25 in weighted mode (default: 0.5)
- `-k, --k <number>` — K constant for RRF ranked search (default: 60)
- `-l, --limit <number>` — Number of results (default: 5)

---

### `llm-search` — LLM-aided hybrid search

```bash
# Query enhancement
bun start llm-search -e spell "famly moovie about bares"
bun start llm-search -e rewrite "something heartwarming with animals"
bun start llm-search -e expand "family movie about bears"

# Re-ranking
bun start llm-search -r llm "family movie about bears"
bun start llm-search -r cross-encoder "family movie about bears"

# Judge results
bun start llm-search --judge "family movie about bears"

# Combined
bun start llm-search -e expand -r cross-encoder "family movie about bears"
```

Options:
- `-e, --enhanced <type>` — Query enhancement: `spell`, `rewrite`, `expand`
- `-r, --reRank <type>` — Re-ranking method: `llm`, `cross-encoder`
- `-j, --judge` — Judge and score results using LLM (scores out of 3)
- `-k, --k <number>` — K constant for RRF (default: 60)
- `-l, --limit <number>` — Number of results (default: 5)

---

### `rag` — Retrieval-Augmented Generation

```bash
bun start rag -t answer "What is a good family movie about bears?"
bun start rag -t summary "What is a good family movie about bears?"
bun start rag -t citation "What is a good family movie about bears?"
bun start rag -t detailed_answer "What is a good family movie about bears?"

# With an image (for multimodal RAG)
bun start rag -t answer -i dataset/movie_poster.png "What movie is this?"
```

Options:
- `-t, --type <type>` — RAG type: `answer`, `summary`, `citation`, `detailed_answer`
- `-i, --image <image>` — Path to image (optional, for multimodal RAG)
- `-l, --limit <number>` — Number of results to retrieve (default: 5)

---

### `multimodal-search` — Search by image

```bash
bun start multimodal-search dataset/movie_poster.png
```

Options:
- `-l, --limit <number>` — Number of results (default: 5)

---

### `evaluate` — Evaluate hybrid search with golden dataset

```bash
bun start evaluate
bun start evaluate -l 10
```

Options:
- `-l, --limit <number>` — Number of results per query (default: 5)

---

### `get-index` — Inspect index values for a term

```bash
bun start get-index -t tf -d 1 "bears"
bun start get-index -t idf "bears"
bun start get-index -t tf-idf -d 1 "bears"
bun start get-index -t bm25-idf "bears"
bun start get-index -t bm25-tf -d 1 "bears"
```

Options:
- `-t, --type <type>` — Index type: `tf`, `idf`, `tf-idf`, `bm25-idf`, `bm25-tf`
- `-d, --docId <docId>` — Document ID (required for `tf`, `tf-idf`, `bm25-tf`)
- `-k, --k1 <k1>` — BM25 k1 parameter
- `-b, --b <b>` — BM25 b parameter

## Why Not Compile?

The `bun build --compile` option cannot be used because:
- The cross-encoder re-ranker depends on `@huggingface/transformers`
- This library requires native ONNX Runtime libraries (`.dylib` files)
- Native libraries cannot be bundled into compiled binaries
- For compiled binaries, use the LLM re-ranker instead (`-r llm`)
