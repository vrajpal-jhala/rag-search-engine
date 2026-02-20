---
marp: true
theme: default
paginate: true
title: From Search to RAG
description: How Modern Retrieval Systems Power Reliable AI
---

# From Search to RAG
## How Modern Retrieval Systems Power Reliable AI

---

# A Real Problem

A user asks:

> "Why is our CI build failing intermittently?"

We have:

```
        Slack Threads
              \
 Docs ---- User Query ---- PR Comments
              /
           Runbooks
```

Information exists.  
Finding the right piece is the challenge.

---

# Why Not Just Use GPT?

Why not do this?

```
        ALL COMPANY DATA
                ↓
               GPT
                ↓
             Answer
```

Problems:

- ❌ Context window limits  
- ❌ Expensive (tokens + latency)  
- ❌ Hallucination risk  
- ❌ No ranking logic  

LLMs don’t replace retrieval.

---

# The Real Solution

Instead:

```
User → Retrieval → GPT → Answer
```

Filter first.  
Generate second.

To understand RAG…  
We must understand search.

---

# Part 1 — The Evolution of Retrieval

Search evolved over decades.

---

# Stage 1 — Naive Text Matching

Early search:

- Match exact words  
- Return documents containing them  

No ranking.  
No notion of relevance.

---

# The Ranking Problem

Query: "build error"

```
Doc A – mentions once
Doc B – mentions 15 times
Doc C – mentions in title
Doc D – huge irrelevant log
```

Which comes first?

We need scoring.

---

# TF-IDF (Intuition)

Two ideas:

**Term Frequency (TF)**  
How often in this document?

**Inverse Document Frequency (IDF)**  
How rare across all documents?

Example:

```
Word: "the"
Appears in 99% documents
→ Low importance

Word: "segmentation fault"
Appears in 2% documents
→ High importance
```

Important words are:
Frequent in doc + Rare overall.

---

# Why TF-IDF Wasn’t Enough

Problems:

- Rare words get extreme scores  
- Common words become useless  
- Long documents dominate  
- Frequency grows linearly  

Search needed refinement.

---

# BM25

Improved ranking function.

Fixes:

- Caps term frequency growth  
- Normalizes document length  
- Smooths rare/common imbalance  

Still keyword-based.  
Still no semantic understanding.

---

# Keyword Search Limitation

Keyword search matches:

"car"

But not:

"automobile"

No understanding of meaning.

Time for semantic search.

---

# Stage 2 — Semantic Search

New idea:

Text → Vector  
Similarity → Mathematical distance

Similar meaning = closer vectors.

---

# Embeddings

```
Text → Embedding Model → Vector
```

Vector space intuition:

```
         automobile
             •
            •
 car   •
                    
                    banana
                      •
```

Car & automobile are close.  
Banana is far.

Meaning becomes geometry.

---

# Similarity Search

How do we compare vectors?

```
Vector A  →
Vector B  →  (small angle = similar)
Vector C  ↑  (large angle = different)
```

Common metrics:

- Dot Product  
- Cosine Similarity  

We compare direction, not just words.

---

# Why We Need Vector Databases

Vectors are high dimensional.

Brute-force comparison is expensive.

```
User Query
     ↓
  Embed
     ↓
  Vector DB
     ↓
  Top K Nearest Neighbors
```

Vector DBs use approximate search for speed.

---

# Chunking — Where Systems Break

We don’t embed entire documents.

We split them.

Example document:

```
[ Header ]
Paragraph 1
Paragraph 2
Table
Paragraph 3
[ Footer ]
```

Naive chunking:

```
Chunk 1: Header + P1
Chunk 2: P2 + Table (cut)
Chunk 3: Table + P3
Chunk 4: Footer
```

Problems:

- Tables split  
- Headers repeated  
- Context lost  

Chunking quality determines retrieval quality.

---

# Chunking Strategies

1. Fixed-size chunks  
2. Overlapping chunks  
3. Semantic chunks  

Tradeoffs:

Too small → lose context  
Too large → dilute relevance  

Requires experimentation.

---

# Beyond Basic Embeddings — ColBERT

Standard (Bi-Encoder):

```
[Chunk] → One Vector
```

ColBERT (Late Interaction):

```
Token1 → Vector
Token2 → Vector
Token3 → Vector
```

At scoring time:
Tokens interact for finer matching.

Tradeoff:

✔ Higher precision  
✖ More compute  

---

# Stage 3 — Hybrid Search

Keyword search:
✔ Exact matches  
✖ No meaning  

Semantic search:
✔ Contextual  
✖ May miss exact keywords  

Best practice: Combine both.

---

# Hybrid Fusion

Two ranked lists:

```
Keyword Search → Rank List A
Semantic Search → Rank List B

              ↓
        Fusion Layer
              ↓
        Final Ranking
```

Methods:

- Weighted score combination  
- Reciprocal Rank Fusion (rank-based)  

Hybrid is practical and robust.

---

# Key Insight

Modern retrieval systems are:

Keyword  
+ Semantic  
+ Good chunking  
+ Smart ranking  

Retrieval quality determines everything that follows.

---

# Part 2 — Measuring Retrieval

Before adding LLMs…

How do we know it works?

---

# Precision

Of what we retrieved:

How much is relevant?

Fishing analogy:

```
Lake = All Relevant Documents
Net  = Retrieved Documents

Fish inside net = Relevant retrieved
```

Precision = Fish in net / Net size

---

# Recall

Of all fish in the lake:

How many did we catch?

Recall = Fish caught / Total fish in lake

Tradeoff exists between precision and recall.

---

# F1 Score

Balances both.

Useful when:

- Missing answers is bad  
- Wrong answers is also bad  

But it ignores ranking order.

---

# Golden Dataset

You need:

- Real user queries  
- Verified relevant documents  
- Human annotation  

Without this, improvements are guesswork.

---

# Error Analysis

Metrics are like stack traces.

When retrieval fails:

- Inspect queries  
- Inspect chunks  
- Inspect embeddings  
- Inspect ranking  

Retrieval is a pipeline problem.

---

# Part 3 — Building RAG

Now we add generation.

---

# What is RAG?

Retrieval Augmented Generation.

```
User Query
     ↓
Query Enhancement
     ↓
Hybrid Retrieval
     ↓
Re-ranking
     ↓
Context Builder
     ↓
LLM
     ↓
Answer
```

RAG = Retrieval + Generation.

---

# Why RAG Works

LLM alone:

- Hallucinates  
- Lacks private data  

With retrieval:

- Grounded  
- Context-aware  
- Reliable  

---

# Query Enhancement

Users write messy queries.

LLMs can:

- Correct spelling  
- Rewrite queries  
- Expand context  
- Clarify intent  

Better query → better retrieval.

---

# Re-Ranking

After retrieval (Top 50):

```
Top 50 → Re-ranker → Top 5
```

Options:

- Cross-encoder  
- LLM-based reranker  

Improves final context.

---

# Retrieval vs Generation

```
Retrieval:
Find relevant information

Generation:
Explain clearly
```

Keep responsibilities separate.

---

# Context Construction

Before sending to LLM:

- Select top chunks  
- Remove duplicates  
- Order logically  
- Respect token limits  

Garbage context → Garbage output.

---

# Augmented Generation

RAG enables:

- Q&A  
- Summaries  
- Citation-based answers  
- Internal knowledge assistants  

Grounded AI systems.

---

# Part 4 — Advanced RAG

Only after fundamentals are strong.

---

# Agentic RAG

LLM controls retrieval loop.

```
LLM
  ↓
Retrieve
  ↓
More Context
  ↓
LLM
  ↓
Answer
```

Powerful but:

- Slower  
- Expensive  
- Harder to debug  

---

# Multi-Modal RAG

Beyond text:

```
[Image]
    ↘
     Embedding Space
    ↗
[Text]
```

Approaches:

- Convert image to text  
- Multimodal embeddings  
- Align image & text representations  

---

# Big Picture

Reliable AI systems require:

- Strong retrieval  
- Good ranking  
- Proper evaluation  
- Careful orchestration  

Not just embeddings + GPT.

---

# Final Takeaways

1. Search evolved over decades  
2. Keyword search still matters  
3. Semantic search adds meaning  
4. Hybrid is practical  
5. Retrieval quality determines RAG quality  
6. Evaluation is essential  

---

# Closing Thought

RAG is not magic.

It is:

Information Retrieval  
+ Ranking  
+ Engineering Discipline  
+ LLM Orchestration  

When done well →  
Accurate, scalable, trustworthy AI systems.

---

# Q&A
