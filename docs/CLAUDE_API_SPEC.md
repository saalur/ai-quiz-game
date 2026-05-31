# Claude API — Question Generation Spec
## AI Quiz Game v1.0

**Phase:** Requirements  
**Agent:** Requirements Agent  
**Date:** 2026-05-31

---

## Overview

The quiz game uses Claude to dynamically generate question sets at the start of each game. This document specifies the prompt design, request/response schema, caching strategy, and fallback behaviour.

---

## Model

```
claude-sonnet-4-6
```

Rationale: best balance of speed, cost, and quality for structured JSON generation. Prompt caching reduces cost on repeated system prompts.

---

## Difficulty → Grade Band Mapping

| Difficulty | Grade Band | Vocabulary Level | Concept Depth |
|---|---|---|---|
| Beginner | Grades 6–7 | Simple, everyday language | Surface-level definitions |
| Intermediate | Grades 8–9 | Some technical terms explained inline | Applied concepts |
| Advanced | Grade 10 | Technical vocabulary acceptable | Analytical reasoning |

---

## Topic Definitions

| Topic Key | Description | Example Concepts |
|---|---|---|
| `what_is_ai` | Foundations of AI | Turing test, definitions, history |
| `machine_learning` | How machines learn | Training data, models, predictions |
| `neural_networks` | Brain-inspired computing | Neurons, layers, deep learning |
| `ai_in_daily_life` | AI we use every day | Recommendations, voice assistants, spam filters |
| `ai_ethics` | Responsible AI | Bias, privacy, fairness, job impact |

---

## System Prompt (Cached)

```
You are an educational quiz question generator for a school AI literacy game.
Your audience is students aged 11-16 (grades 6-10).

Rules:
- Questions must be factually accurate and age-appropriate
- Avoid jargon unless it is the subject of the question
- Each question must have exactly 4 answer options
- Exactly one option must be correct
- Wrong options (distractors) should be plausible, not obviously silly
- Fun facts must be engaging and conversational — imagine a friendly teacher explaining it
- Return ONLY valid JSON — no markdown, no commentary
```

The system prompt is sent with `cache_control: {"type": "ephemeral"}` to enable prompt caching across calls with the same topic/difficulty context.

---

## User Prompt Template

```
Generate {count} multiple-choice quiz questions about the topic: "{topic_label}".

Difficulty level: {difficulty} (targeting {grade_band}).

Return a JSON array with this exact structure:
[
  {
    "id": 1,
    "question": "string — the question text",
    "options": {
      "A": "string",
      "B": "string",
      "C": "string",
      "D": "string"
    },
    "correct": "A",
    "fun_fact": "string — 1-2 sentences explaining the correct answer in a fun, friendly way"
  }
]

Requirements:
- Questions must be unique within this set
- Do not repeat the correct answer letter pattern (vary A/B/C/D as the answer)
- All questions must relate to: {topic_label}
- Vocabulary and complexity must match: {difficulty} level for {grade_band}
```

---

## Request Example

```python
import anthropic

client = anthropic.Anthropic()

system_prompt = """You are an educational quiz question generator..."""  # full text above

user_prompt = """Generate 10 multiple-choice quiz questions about the topic: "AI in Daily Life".
Difficulty level: Beginner (targeting Grades 6-7)..."""

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=4096,
    system=[
        {
            "type": "text",
            "text": system_prompt,
            "cache_control": {"type": "ephemeral"}
        }
    ],
    messages=[
        {"role": "user", "content": user_prompt}
    ]
)

questions = json.loads(response.content[0].text)
```

---

## Response Schema

```json
[
  {
    "id": 1,
    "question": "Which of the following is an example of AI helping you every day?",
    "options": {
      "A": "A calculator adding numbers",
      "B": "Netflix recommending a show you might like",
      "C": "A light switch turning on",
      "D": "A clock showing the time"
    },
    "correct": "B",
    "fun_fact": "Netflix uses AI to analyse what millions of people watch to predict what YOU might enjoy — it processes billions of data points every day to make that recommendation!"
  }
]
```

---

## Caching Strategy

| Prompt Part | Cached? | Rationale |
|---|---|---|
| System prompt | Yes (`ephemeral`) | Same for all calls; saves ~400 tokens per request |
| User prompt | No | Varies by topic, difficulty, count |

Expected cache hit rate: ~90% during a single class session (same topic/difficulty).  
Estimated cost saving: ~75% on system prompt tokens.

---

## Error Handling & Fallback

```
1. Primary: Call Claude API with 10-second timeout
2. On timeout or rate limit: Retry once after 2 seconds
3. On second failure: Load from static fallback question bank (JSON file bundled with app)
4. Log all fallback events for monitoring
```

The fallback question bank contains 50 pre-written questions per topic/difficulty combination (250 total), stored in `server/data/fallback_questions.json`.

---

## Validation

Before serving questions to the game, the server validates:
- Response is valid JSON
- Array length matches requested count
- Each item has: `id`, `question`, `options` (A/B/C/D), `correct` (one of A/B/C/D), `fun_fact`
- No duplicate questions (by question text)

If validation fails → use fallback bank.
