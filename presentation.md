---
marp: true
theme: default
paginate: true
title: Retrieval-Augmented Generation
description: How Modern Retrieval Systems Power Reliable AI - https://youtu.be/9c48sMot1gA
---

<!--
# Speaker Notes

Total Target Time: ~60 minutes  
Audience: Mixed (Junior + Senior Engineers)

---

# Outline

- Overview
  - Talk on Search Engines + RAG
  - Search Engines
    - Why? - Can't scroll, Used everywhere
    - Why not dump into GPT? - Context Overflow + AI is expensive (time + resources)
  - RAG
    - Why? - Accurate + Enhance + Maybe simplify + Better Understanding
- Search Algorithms
  - Preprocessing
    - Exact match use cases (not semantic)
    - Casing, punctuations
    - Tokenizing, fuzzy, stop words (meaningless - the = the - domain specific)
      - searching "const"
  - Full Text Search
    - We search the entire document for the query
    - We return the documents that contain the query (or a subset of the query)
    - Without ranking, we return the documents in the order they appear in the documents
    - Random token can appear in many documents, so we need to rank them
  - TF-IDF
    - We create indexes to make things fast (caching)
    - TF: Term Frequency - How many times does the term appear in the document?
    - IDF: Inverse Document Frequency - How rare is the term in the set (excluding stop words)?
    - Used to rank documents based on the importance of the terms in the query
    - TF-IDF = TF * (IDF = Number of documents / Number of documents containing the term)
    - TF-IDF is a measure of the importance of a term in all documents
    - The higher the TF-IDF, the more important the term is and vice versa
    - We can use TF-IDF to rank documents based on the importance of the terms in the query
    - We would want the documents having frequent terms from the query but also rare in the set to be ranked higher
  - BM25 TF-IDF
    - The problems with normal IDF
      - Very rare terms will have a very high IDF score
      - Very common terms will have a very low IDF score
      - log((N - Tf + 0.5) / (Tf + 0.5) + 1)
    - The problems with normal TF
      - Linear scaling
      - Very common terms will have a very high TF score (irrelevant keywords)
      - Very rare terms will have a very low TF score (It might be important, but not common)
      - (Tf * (k1 + 1)) / (Tf + k1)
      - Mean vs Median example
      - Document Length Normalization
        - We want to normalize the document length to the average length of the documents
        - 1 - b + b * (dl / avgdl)
  - Semantic Search
    - Problems with keyword search
      - Only exact matches are considered
      - No search with context, synonyms, antonyms, or related words
    - Selecting a model (based on use case, cost, performance, etc.)
      - Multilingual models
      - Domain specific models
    - Dimensions
      - Vector operations
    - Similarity search
      - Dot product (dp = a1 * b1 + a2 * b2 + ... + an * bn = direction similarity and don't consider magnitude/length)
      - Cosine similarity (cos(theta) = dp / (sqrt(a1^2 + a2^2 + ... + an^2) * sqrt(b1^2 + b2^2 + ... + bn^2)) = direction similarity and consider magnitude/length)
      - Similarity depends on the model used
      - Tokenization (static doesn't work as model is not trained on static tokens)
      - Vector DBs - specialized for vector storage and retrieval
      - Hot and cold game on Reddit
    - LSH (Locality Sensitive Hashing)
      - Hashing the vectors to a smaller space
      - May miss some similar vectors
    - Chunking
      - Fixed size chunking
      - Overlapping chunks
      - Semantic chunks
      - Needs lots of debugging and testing to cover edge cases and get the best results
        - Tables, multi page paragraphs, etc.
        - Headers, footers - repeated content across chunks
        - Image captions getting mixed up with text content
        - Column layouts, weird spacing/fonts, missing line breaks
        - Markdown formats
      - ColBERT - created embeddings per token
      - Late chunking - chunking after the embedding is created - summarization, etc. (pronouns, etc.)
      - Try using third party services to see if there's any improvements before implementing your own
  - Hybrid Search
    - Normalizing the scores from the different search algorithms
    - Basic - Weighted combination of the scores
      - Weighted - alpha (0.5 or 0.3 whatever works best for the use case)
      - Combination - balanced - not really well for one but really bad for the other - outer join
      - formula: alpha * bm25Score + (1 - alpha) * semanticScore
    - Reciprocal Rank Fusion
      - Basic hybrid search can penalize one algorithm over the other - hard to normalize the scores
      - Reciprocal Rank Fusion would boost results which are good in both algorithms - only cares about ranks and not the scores
      - formula: 1 / (rank + k)
  - LLM
    - Query Enhancement
      - User query can be noisy, incomplete, or misspelled
      - Spell Correction - correct spelling errors
      - Query rewriting - semantic meanings to keywords using model knowledge
      - Query expansion - related terms/keywords, synonyms, antonyms, etc.
    - Re-ranking
      - Narrowed results from hybrid search -> re-rank results based on user query for best results
      - LLM based - risk of hallucination
      - Cross-encoder - more accurate than the LLM based
  - Evaluation
    - Manual evaluation
      - Difficult to automate tests due to many factors (query, docs quality, number of results), check what user wants
        - No fixed criteria
        - LLMs can hallucinate
    - Golden dataset
      - Real queries from users
      - Quality documents - verified by domain experts
      - Data annotation
      - Evaluation metrics
    - Precision metrics
      - Like test cases
      - Precision = relevant_retrieved / total_retrieved
        - Of what we retrieved, how much is relevant?
        - Of the things in your net, how many are fish?
      - Recall = relevant_retrieved / total_relevant
        - Of all correct relevant results, how many did we find?
        - Of all fish in the lake, how many did you catch?
      - F1 Score = 2 * (precision * recall) / (precision + recall)
       - Balanced between precision and recall
       - Penalizes imbalances
       - Useful when precision and recall are both important
       - Ranking is ignored
    - Error analysis
      - These metrics are like stack traces
      - Instead of tweaking the parameters or retrieving more results, we can try to understand the data and the queries to improve the retrieval of results
      - We need to debug each step of the pipeline to understand the problems
      - Test different queries and see how the results change
    - LLM Evaluation
      - Engineer prompt according to the use case (by experts)
  - Augmented Generation
    - Q&A
    - Summary
    - Citation
  - Agentic RAG
    - Recursive retrieval
    - LLM controlled
    - Tool calls in a loop
    - Slower and expensive
  - Multi-modal RAG
    - Text, images, videos, audio, etc.
    - With multi-modal LLM
    - Comparable
      - Convert image to text using LLM to make them comparable
      - Use image alt text (to minimize the distance between the image and the text embeddings)
      - Text surrounded by image

-->

# Retrieval-Augmented Generation
## How Modern Retrieval Systems Power Reliable AI
> Why Search Matters More Than You Think

---

# Quick Question

How many of you have used  
ChatGPT or Gemini  
in the last week?

---

# One More Question

How many of you  
**completely trust**  
the answers?

---

# The Real Problem

Imagine your company has:

- 8 years of documentation  
- Confluence pages  
- Slack threads  
- PDFs  
- PR discussions  
- Notion / Google Docs  

Now you ask:

> "When and why did we add this feature?"
> "What's the origin of this bug?"

You don't want the internet's answer.  
You want **your company's answer.**

---

<!--
# Speaker Notes — The Real Problem
⏱ 4 minutes

Goal: Hook the audience.

Say:

- Start with a real internal example (CI build failure, production issue, onboarding confusion).
- Emphasize scale of data.
- Ask: "How would you find the answer?"

Pause for 5 seconds. Let them think.

Key line:
> The problem is not lack of information. It's discoverability.
-->

# What Happens Today?

The model gives you:

- A confident answer  
- Clean formatting  
- Strong language  
- Possibly wrong information  

It might be:

- Outdated  
- Incomplete  
- Or completely fabricated  

And it won't say  
"I don't know."

---

<!--
# Speaker Notes — What Happens Today?
⏱ 3 minutes

Explain:

- Many teams try "dump everything into GPT."
- Context window is finite.
- Token cost increases quickly.
- LLMs hallucinate without grounding.

Important framing:
> LLMs are powerful, but they are not retrieval engines.

Transition:
> So we need filtering before generation.
-->

# This Is NOT an LLM Problem

It's a **retrieval problem.**

---

# The Core Question

## How do we make LLMs  
## answer using  
## OUR knowledge?

---

# Enter: RAG

Retrieval-Augmented Generation

RAG is simply:

- Search  
- + Context  
- + Generation  

---

<!--
# Speaker Notes — Enter: RAG
⏱ 2 minutes

Explain the simple pipeline:

User → Retrieval → GPT → Answer

Emphasize:
Retrieval reduces noise.
LLM explains results.

This sets up the structure of the talk.
-->

# But Here's the Catch

If your **search is bad**  
your **RAG is bad.**

Before we talk about RAG…

We need to talk about  
**how search evolved.**

---

# Part 1 — The Evolution of Retrieval

Search evolved over decades.

---

<!--
# Speaker Notes — The Evolution of Retrieval
⏱ 1 minute

Quick transition slide.

Say:
> Before RAG, search evolved for decades.

Now begin timeline journey.
-->

# Stage 1 — Naive Text Matching

Early search:

- Match exact words  
- Return documents containing them  

No ranking.  
No notion of relevance.

---

<!--
# Speaker Notes — Stage 1 — Naive Text Matching
⏱ 3 minutes

Explain:

- Early systems just matched words.
- No ranking logic.
- Order often arbitrary.

Ask:
> If 1000 documents match, which one should come first?

Engage audience.
-->

# Preprocessing

Before matching, text must be normalized.

- Lowercase: `Build` → `build`  
- Strip punctuation: `error!` → `error`  
- Tokenize: split into individual terms  
- Stop words: remove meaningless terms (`the`, `a`, `is`)  
- Fuzzy matching: handle typos and variants  

Example:

```
Query: "searching const"
Stop word "searching" removed → "const"
```

Domain matters: `const` is meaningful in code.  
Generic stop word lists don't always apply.

---

<!--
# Speaker Notes — Preprocessing
⏱ 3 minutes

Explain:

- Raw text is messy — casing, punctuation, filler words all affect matching.
- Preprocessing normalizes text before any algorithm runs.

Walk through each step briefly.

On stop words:
> Stop words are context-dependent. "The" is noise in English prose but a library name in JavaScript.

On fuzzy matching:
> Handles typos and slight variations — useful for keyword search, not needed for semantic.

Key message:
> Garbage in, garbage out. Preprocessing is the first line of defense.
-->

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

<!--
# Speaker Notes — The Ranking Problem
⏱ 3 minutes

Walk through example.

Explain:

- Frequency matters.
- Position matters.
- Context matters.

Key takeaway:
> Relevance needs scoring.
-->

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

<!--
# Speaker Notes — TF-IDF
⏱ 4 minutes

Explain intuitively.

Do NOT write formulas.

Use examples:

- "the" vs "segmentation fault"

Say:
> Important words are frequent locally, rare globally.

Pause and check:
"Does this make intuitive sense?"
-->

# Why TF-IDF Wasn't Enough

Problems:

- Rare words get extreme scores  
- Common words become useless  
- Long documents dominate  
- Frequency grows linearly  

Search needed refinement.

---

<!--
# Speaker Notes — Why TF-IDF Wasn't Enough
⏱ 3 minutes

Explain limitations:

- Rare word explosion.
- Long document bias.

Say:
> Retrieval is not just about counting words.

Transition to BM25.
-->

# BM25

Improved ranking function.

Fixes:

- Caps term frequency growth  
- Normalizes document length  
- Smooths rare/common imbalance  

Still keyword-based.  
Still no semantic understanding.

---

<!--
# Speaker Notes — BM25
⏱ 3 minutes

Keep high-level.

Explain:

- Caps frequency growth.
- Normalizes document length.

Important:
Do not go mathematical for mixed audience.

Key line:
> This is still keyword-based. No meaning involved.
-->

# Keyword Search Limitation

Keyword search matches:

"car"

But not:

"automobile"

No understanding of meaning.

Time for semantic search.

---

<!--
# Speaker Notes — Keyword Search Limitation
⏱ 2 minutes

Use car vs automobile.

Ask:
> Should these match?

Say:
Keyword search doesn't understand meaning.

Transition to embeddings.
-->

# Stage 2 — Semantic Search

New idea:

Text → Vector  
Similarity → Mathematical distance

Similar meaning = closer vectors.

---

<!--
# Speaker Notes — Stage 2 — Semantic Search
⏱ 1 minute

Short transition.

Say:
> Instead of matching words, we match meaning.
-->

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

<!--
# Speaker Notes — Embeddings
⏱ 4 minutes

Spend time here.

Explain vector space visually.

Say:
- Words become numbers.
- Meaning becomes geometry.

Important:
Pause and ensure everyone understands.

Ask:
> Has anyone used embeddings before?
-->

# Choosing an Embedding Model

Not all models are equal.

Key considerations:

- **Use case** — general vs domain-specific  
- **Language** — multilingual models for non-English content  
- **Dimensions** — more dimensions = richer representation, more cost  
- **Performance vs cost** — larger models are more accurate but slower  

Examples:

```
General purpose:  OpenAI text-embedding-3
Multilingual:     multilingual-e5
Code-specific:    specialized code embeddings
```

Match the model to your data and query types.

---

<!--
# Speaker Notes — Choosing an Embedding Model
⏱ 3 minutes

Explain:

- Using a general model for code search is a mismatch.
- Multilingual models needed if documents/queries are in multiple languages.
- Dimensions affect storage, speed, and quality — not always "more is better."

Key message:
> The embedding model is a foundational decision. Changing it later requires re-embedding everything.

Ask:
> What kind of data would your team need to search?
-->

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

<!--
# Speaker Notes — Similarity Search
⏱ 3 minutes

Explain cosine similarity intuitively.

Say:
Smaller angle = more similar.

Avoid math.

Reinforce:
> We are comparing meaning, not text.
-->

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

<!--
# Speaker Notes — Vector Databases
⏱ 3 minutes

Explain:

- High dimensional vectors.
- Approximate search.

Emphasize tradeoff:
Speed vs perfect accuracy.

Important line:
> 98% recall is often good enough in production.
-->

# Chunking — Where Systems Break

We don't embed entire documents.

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

<!--
# Speaker Notes — Chunking — Where Systems Break
⏱ 5 minutes

This is critical.

Explain real-world issues:

- Tables splitting.
- Headers duplication.
- Context loss.

Tell a short failure story if possible.

Key message:
> Most RAG failures are chunking failures.
-->

# Chunking Strategies

1. Fixed-size chunks  
2. Overlapping chunks  
3. Semantic chunks  

Tradeoffs:

Too small → lose context  
Too large → dilute relevance  

Requires experimentation.

---

<!--
# Speaker Notes — Chunking Strategies
⏱ 3 minutes

Compare:

- Fixed
- Overlap
- Semantic

Explain tradeoffs.

Say:
> There is no perfect chunk size.

Practical advice:
> Before building your own chunking pipeline, try third-party services (e.g. Unstructured, LlamaParse). Benchmark them against your data first — you may get 80% of the way there without writing custom code.
-->

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

<!--
# Speaker Notes — ColBERT
⏱ 3 minutes

Explain simply:

- Standard = one vector per chunk.
- ColBERT = token-level vectors.

Say:
> More precise, more expensive.

Don't overcomplicate.
-->

# Late Chunking

A different approach: embed first, chunk later.

Standard pipeline:

```
Chunk → Embed → Store
```

Late chunking:

```
Embed entire document → Chunk embeddings
```

Why it helps:

- Pronouns resolved in full context (`"it"`, `"they"` → correct referent)  
- Summaries capture surrounding meaning  
- No context lost at chunk boundaries  

Tradeoff:

✔ Better contextual embeddings  
✖ More compute upfront  

---

<!--
# Speaker Notes — Late Chunking
⏱ 3 minutes

Contrast with ColBERT:
- ColBERT = token-level vectors at query time.
- Late chunking = full document context baked into chunk embeddings at index time.

Use pronoun example:
> "The server crashed. It was caused by a memory leak."
> If "it" is in a separate chunk, you lose the referent.

Say:
> Late chunking is especially useful for narrative documents, long reports, and anything with cross-sentence dependencies.

Don't overcomplicate — keep it as "embed before you split."
-->

# Stage 3 — Hybrid Search

Keyword search:
✔ Exact matches  
✖ No meaning  

Semantic search:
✔ Contextual  
✖ May miss exact keywords  

Best practice: Combine both.

---

<!--
# Speaker Notes — Hybrid Search
⏱ 4 minutes

Explain why hybrid is powerful.

Say:
Keyword ensures precision.
Semantic ensures recall.

Key line:
> Most production systems are hybrid.
-->

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

<!--
# Speaker Notes — Hybrid Fusion
⏱ 3 minutes

Explain weighted vs rank-based.

Keep simple.

Emphasize:
Score normalization is hard.

RRF is practical.
-->

# Key Insight

Modern retrieval systems are:

Keyword  
+ Semantic  
+ Good chunking  
+ Smart ranking  

Retrieval quality determines everything that follows.

---

<!--
# Speaker Notes — Key Insight
⏱ 1 minute

Pause and summarize:

> Retrieval quality determines everything that follows.

Let that land.
-->

# Part 2 — Measuring Retrieval

Before adding LLMs…

How do we know it works?

---

<!--
# Speaker Notes — Measuring Retrieval
⏱ 1 minute

Transition:

> Before adding LLMs, we need evaluation.
-->

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

<!--
# Speaker Notes — Precision
⏱ 3 minutes

Use fishing analogy.

Engage audience:

> If we retrieve 10 documents and 8 are relevant — what's precision?

Let someone answer.
-->

# Recall

Of all fish in the lake:

How many did we catch?

Recall = Fish caught / Total fish in lake

Tradeoff exists between precision and recall.

---

<!--
# Speaker Notes — Recall
⏱ 3 minutes

Explain tradeoff.

Say:
High precision systems may have low recall.

Important:
Product teams must choose tradeoff consciously.
-->

# F1 Score

Balances both.

Useful when:

- Missing answers is bad  
- Wrong answers is also bad  

But it ignores ranking order.

---

<!--
# Speaker Notes — F1 Score
⏱ 2 minutes

Brief explanation.

Don't stay long.

Mention ranking-aware metrics exist.
-->

# Golden Dataset

You need:

- Real user queries  
- Verified relevant documents  
- Human annotation  

Without this, improvements are guesswork.

---

<!--
# Speaker Notes — Golden Dataset
⏱ 3 minutes

Explain:

- Real queries.
- Human labeling.

Key message:
> Without evaluation, tuning is guesswork.
-->

# Error Analysis

Metrics are like stack traces.

When retrieval fails:

- Inspect queries  
- Inspect chunks  
- Inspect embeddings  
- Inspect ranking  

Retrieval is a pipeline problem.

---

<!--
# Speaker Notes — Error Analysis
⏱ 3 minutes

Explain debugging mindset.

Say:
Treat retrieval like a system.
Not a magic black box.
-->

# LLM-based Evaluation

Use an LLM as a judge.

```
Retrieved chunks + Query
         ↓
    LLM Evaluator
    (expert prompt)
         ↓
  Relevance score / Pass / Fail
```

Requirements:

- Prompt engineered by domain experts  
- Instructions must be explicit and unambiguous  

Risks:

- ❌ LLM can hallucinate judgments  
- ❌ Expensive at scale  
- ❌ Inconsistent without a stable prompt  

Best used alongside golden datasets, not instead of them.

---

<!--
# Speaker Notes — LLM-based Evaluation
⏱ 3 minutes

Explain:

- Useful when human annotation is too slow or expensive to scale.
- The prompt is everything — vague prompts produce unreliable scores.

Caution:
> You're using an LLM to evaluate an LLM. The evaluator can be wrong too.

Say:
> Treat LLM evaluation as a fast signal, not ground truth. Always validate a sample manually.

Mention:
Frameworks like RAGAs automate this — worth exploring for teams building production RAG.
-->

# Part 3 — Building RAG

Now we add generation.

---

<!--
# Speaker Notes — Building RAG
⏱ 1 minute

Transition:

> Now we layer generation on top.
-->

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

<!--
# Speaker Notes — What is RAG?
⏱ 3 minutes

Walk through pipeline slowly.

Explain each step in one sentence.

Do not rush this slide.
-->

# Why RAG Works

LLM alone:

- Hallucinates  
- Lacks private data  

With retrieval:

- Grounded  
- Context-aware  
- Reliable  

---

<!--
# Speaker Notes — Why RAG Works
⏱ 2 minutes

Contrast LLM alone vs LLM + retrieval.

Key message:
Grounding reduces hallucination.
-->

# Query Enhancement

Users write messy queries.

LLMs can:

- Correct spelling  
- Rewrite queries  
- Expand context  
- Clarify intent  

Better query → better retrieval.

---

<!--
# Speaker Notes — Query Enhancement
⏱ 3 minutes

Explain:

- Spell correction
- Rewriting
- Expansion

Say:
Small improvements here can dramatically affect retrieval.
-->

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

<!--
# Speaker Notes — Re-Ranking
⏱ 3 minutes

Explain top 50 → top 5 refinement.

Say:
Re-ranking increases precision.

Mention cost tradeoff.
-->

# Retrieval vs Generation

```
Retrieval:
Find relevant information

Generation:
Explain clearly
```

Keep responsibilities separate.

---

<!--
# Speaker Notes — Retrieval vs Generation
⏱ 2 minutes

Important conceptual separation.

Say:
Do not let LLM replace retrieval.

Keep architecture clean.
-->

# Context Construction

Before sending to LLM:

- Select top chunks  
- Remove duplicates  
- Order logically  
- Respect token limits  

Garbage context → Garbage output.

---

<!--
# Speaker Notes — Context Construction
⏱ 2 minutes

Explain ordering, deduplication, token limits.

Key message:
Context quality determines answer quality.
-->

# Augmented Generation

RAG enables:

- Q&A  
- Summaries  
- Citation-based answers  
- Internal knowledge assistants  

Grounded AI systems.

---

<!--
# Speaker Notes — Augmented Generation
⏱ 2 minutes

Explain use cases.

Keep high-level.
-->

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

<!--
# Speaker Notes — Agentic RAG
⏱ 3 minutes

Explain recursive loop.

Important warning:
Hard to debug.
Expensive.

Say:
Do not start here.
-->

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

<!--
# Speaker Notes — Multi-Modal RAG
⏱ 2 minutes

Explain conceptually.

Keep short.
-->

# Big Picture

Reliable AI systems require:

- Strong retrieval  
- Good ranking  
- Proper evaluation  
- Careful orchestration  

Not just embeddings + GPT.

---

<!--
# Speaker Notes — Big Picture
⏱ 2 minutes

Summarize:

- Retrieval is foundation.
- RAG is orchestration.

Reinforce central thesis.
-->

# Final Takeaways

1. Search evolved over decades  
2. Keyword search still matters  
3. Semantic search adds meaning  
4. Hybrid is practical  
5. Retrieval quality determines RAG quality  
6. Evaluation is essential  

---

<!--
# Speaker Notes — Final Takeaways
⏱ 2 minutes

Slow down.

Repeat:

> Retrieval quality determines RAG quality.

Then pause.
-->

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

<!--
# Speaker Notes — Q&A
⏱ Remaining 5–8 minutes

Encourage questions.

If no questions:
Ask:
- "Where do you think most RAG systems fail?"
- "Would you start with semantic-only or hybrid?"

Spark discussion.
-->

---

<!--
# Timing Summary

Problem & Motivation: ~10 min  
Retrieval Evolution: ~25 min  
Evaluation: ~10 min  
RAG Pipeline: ~10 min  
Advanced + Wrap: ~5 min  

Total: ~60 minutes
-->
