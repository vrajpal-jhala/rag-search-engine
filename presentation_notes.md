---
marp: true
theme: default
paginate: true
title: From Search to RAG — Speaker Notes
description: 60-Minute Delivery Guide
---

# From Search to RAG  
## Speaker Notes Guide

Total Target Time: ~60 minutes  
Audience: Mixed (Junior + Senior Engineers)

---

# A Real Problem  
⏱ 4 minutes

Goal: Hook the audience.

Say:

- Start with a real internal example (CI build failure, production issue, onboarding confusion).
- Emphasize scale of data.
- Ask: “How would you find the answer?”

Pause for 5 seconds. Let them think.

Key line:
> The problem is not lack of information. It’s discoverability.

---

# Why Not Just Use GPT?  
⏱ 3 minutes

Explain:

- Many teams try “dump everything into GPT.”
- Context window is finite.
- Token cost increases quickly.
- LLMs hallucinate without grounding.

Important framing:
> LLMs are powerful, but they are not retrieval engines.

Transition:
> So we need filtering before generation.

---

# The Real Solution  
⏱ 2 minutes

Explain the simple pipeline:

User → Retrieval → GPT → Answer

Emphasize:
Retrieval reduces noise.
LLM explains results.

This sets up the structure of the talk.

---

# The Evolution of Retrieval  
⏱ 1 minute

Quick transition slide.

Say:
> Before RAG, search evolved for decades.

Now begin timeline journey.

---

# Stage 1 — Naive Text Matching  
⏱ 3 minutes

Explain:

- Early systems just matched words.
- No ranking logic.
- Order often arbitrary.

Ask:
> If 1000 documents match, which one should come first?

Engage audience.

---

# The Ranking Problem  
⏱ 3 minutes

Walk through example.

Explain:

- Frequency matters.
- Position matters.
- Context matters.

Key takeaway:
> Relevance needs scoring.

---

# TF-IDF  
⏱ 4 minutes

Explain intuitively.

Do NOT write formulas.

Use examples:

- “the” vs “segmentation fault”

Say:
> Important words are frequent locally, rare globally.

Pause and check:
“Does this make intuitive sense?”

---

# Why TF-IDF Wasn’t Enough  
⏱ 3 minutes

Explain limitations:

- Rare word explosion.
- Long document bias.

Say:
> Retrieval is not just about counting words.

Transition to BM25.

---

# BM25  
⏱ 3 minutes

Keep high-level.

Explain:

- Caps frequency growth.
- Normalizes document length.

Important:
Do not go mathematical for mixed audience.

Key line:
> This is still keyword-based. No meaning involved.

---

# Keyword Search Limitation  
⏱ 2 minutes

Use car vs automobile.

Ask:
> Should these match?

Say:
Keyword search doesn’t understand meaning.

Transition to embeddings.

---

# Stage 2 — Semantic Search  
⏱ 1 minute

Short transition.

Say:
> Instead of matching words, we match meaning.

---

# Embeddings  
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

---

# Similarity Search  
⏱ 3 minutes

Explain cosine similarity intuitively.

Say:
Smaller angle = more similar.

Avoid math.

Reinforce:
> We are comparing meaning, not text.

---

# Vector Databases  
⏱ 3 minutes

Explain:

- High dimensional vectors.
- Approximate search.

Emphasize tradeoff:
Speed vs perfect accuracy.

Important line:
> 98% recall is often good enough in production.

---

# Chunking — Where Systems Break  
⏱ 5 minutes

This is critical.

Explain real-world issues:

- Tables splitting.
- Headers duplication.
- Context loss.

Tell a short failure story if possible.

Key message:
> Most RAG failures are chunking failures.

---

# Chunking Strategies  
⏱ 3 minutes

Compare:

- Fixed
- Overlap
- Semantic

Explain tradeoffs.

Say:
> There is no perfect chunk size.

---

# ColBERT  
⏱ 3 minutes

Explain simply:

- Standard = one vector per chunk.
- ColBERT = token-level vectors.

Say:
> More precise, more expensive.

Don’t overcomplicate.

---

# Hybrid Search  
⏱ 4 minutes

Explain why hybrid is powerful.

Say:
Keyword ensures precision.
Semantic ensures recall.

Key line:
> Most production systems are hybrid.

---

# Hybrid Fusion  
⏱ 3 minutes

Explain weighted vs rank-based.

Keep simple.

Emphasize:
Score normalization is hard.

RRF is practical.

---

# Key Insight  
⏱ 1 minute

Pause and summarize:

> Retrieval quality determines everything that follows.

Let that land.

---

# Measuring Retrieval  
⏱ 1 minute

Transition:

> Before adding LLMs, we need evaluation.

---

# Precision  
⏱ 3 minutes

Use fishing analogy.

Engage audience:

> If we retrieve 10 documents and 8 are relevant — what’s precision?

Let someone answer.

---

# Recall  
⏱ 3 minutes

Explain tradeoff.

Say:
High precision systems may have low recall.

Important:
Product teams must choose tradeoff consciously.

---

# F1 Score  
⏱ 2 minutes

Brief explanation.

Don’t stay long.

Mention ranking-aware metrics exist.

---

# Golden Dataset  
⏱ 3 minutes

Explain:

- Real queries.
- Human labeling.

Key message:
> Without evaluation, tuning is guesswork.

---

# Error Analysis  
⏱ 3 minutes

Explain debugging mindset.

Say:
Treat retrieval like a system.
Not a magic black box.

---

# Building RAG  
⏱ 1 minute

Transition:

> Now we layer generation on top.

---

# What is RAG?  
⏱ 3 minutes

Walk through pipeline slowly.

Explain each step in one sentence.

Do not rush this slide.

---

# Why RAG Works  
⏱ 2 minutes

Contrast LLM alone vs LLM + retrieval.

Key message:
Grounding reduces hallucination.

---

# Query Enhancement  
⏱ 3 minutes

Explain:

- Spell correction
- Rewriting
- Expansion

Say:
Small improvements here can dramatically affect retrieval.

---

# Re-Ranking  
⏱ 3 minutes

Explain top 50 → top 5 refinement.

Say:
Re-ranking increases precision.

Mention cost tradeoff.

---

# Retrieval vs Generation  
⏱ 2 minutes

Important conceptual separation.

Say:
Do not let LLM replace retrieval.

Keep architecture clean.

---

# Context Construction  
⏱ 2 minutes

Explain ordering, deduplication, token limits.

Key message:
Context quality determines answer quality.

---

# Augmented Generation  
⏱ 2 minutes

Explain use cases.

Keep high-level.

---

# Agentic RAG  
⏱ 3 minutes

Explain recursive loop.

Important warning:
Hard to debug.
Expensive.

Say:
Do not start here.

---

# Multi-Modal RAG  
⏱ 2 minutes

Explain conceptually.

Keep short.

---

# Big Picture  
⏱ 2 minutes

Summarize:

- Retrieval is foundation.
- RAG is orchestration.

Reinforce central thesis.

---

# Final Takeaways  
⏱ 2 minutes

Slow down.

Repeat:

> Retrieval quality determines RAG quality.

Then pause.

---

# Q&A  
⏱ Remaining 5–8 minutes

Encourage questions.

If no questions:
Ask:
- “Where do you think most RAG systems fail?”
- “Would you start with semantic-only or hybrid?”

Spark discussion.

---

# Timing Summary

Problem & Motivation: ~10 min  
Retrieval Evolution: ~25 min  
Evaluation: ~10 min  
RAG Pipeline: ~10 min  
Advanced + Wrap: ~5 min  

Total: ~60 minutes
