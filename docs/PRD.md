# Product Requirements Document
## AI Quiz Game — Multiplayer Learning App for Grades 6–10

**Version:** 1.0  
**Phase:** Requirements  
**Agent:** Requirements Agent  
**Date:** 2026-05-31  
**Status:** Approved

---

## 1. Problem Statement

Students in grades 6–10 have limited exposure to AI concepts in structured, engaging formats. Existing resources are either too academic or too shallow. Teachers need a low-friction tool that can be dropped into a classroom without accounts, logins, or setup time.

---

## 2. Product Vision

A browser-based, turn-based multiplayer quiz game where students join a game room with a code, answer AI-themed questions generated dynamically by Claude, and compete for points in real time — no accounts, no downloads, no friction.

---

## 3. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Engagement | ≥ 80% of players complete a full game session |
| Learning | Players improve score on repeat sessions (tracked per session) |
| Accessibility | Game joinable in < 30 seconds from receiving a room code |
| Reliability | Question generation latency < 3 seconds per question |
| Scalability | Support up to 30 concurrent players per room |

---

## 4. User Personas

### Persona A — The Student (Primary)
- **Age:** 11–16 (Grades 6–10)
- **Tech comfort:** Moderate — uses phones/tablets daily
- **Goal:** Have fun, compete with classmates, learn something without realising it
- **Pain points:** Boring textbook content, complex jargon, slow-loading apps

### Persona B — The Teacher (Secondary)
- **Age:** 25–55
- **Tech comfort:** Low-moderate
- **Goal:** Launch a quick engaging activity with zero setup overhead
- **Pain points:** Tools that require student accounts, IT approval, or complex setup

---

## 5. Scope

### In Scope (v1.0)
- Game room creation with a shareable 6-character code
- Turn-based multiplayer (up to 30 players)
- Dynamic question generation via Claude API
- 3 difficulty levels: Beginner, Intermediate, Advanced (mapped to grade bands)
- 5 AI topic categories: What is AI, Machine Learning, Neural Networks, AI in Daily Life, AI Ethics
- Timed answers (30 seconds per question)
- Live leaderboard visible after each round
- Game host controls (start game, next question, end game)
- Mobile-responsive UI

### Out of Scope (v1.0)
- User accounts or persistent profiles
- Teacher dashboard with historical analytics
- Custom question upload
- Real-time WebSocket sync (turn-based polling used instead)
- Offline mode

---

## 6. Functional Requirements

### FR-01: Room Management
- Host creates a room → receives a unique 6-character alphanumeric code
- Players enter the code on the home screen to join
- Room supports 2–30 players
- Room expires 2 hours after creation or when host ends the game

### FR-02: Game Configuration (Host)
- Host selects: difficulty level, topic category, number of questions (5 / 10 / 15)
- Host sees a lobby with live player list before starting

### FR-03: Question Generation (Claude API)
- On game start, Claude generates the full question set based on difficulty + topic
- Each question: multiple-choice, 4 options, exactly 1 correct answer
- Questions are grade-appropriate in vocabulary and complexity
- Claude also generates a 1-sentence "fun fact" explanation shown after each answer

### FR-04: Turn-Based Game Flow
- Host advances to each question manually ("Next Question" button)
- All players see the same question simultaneously
- 30-second countdown timer per question
- Players submit one answer; cannot change it
- After timer expires or all players answer → reveal correct answer + fun fact
- Points awarded: 100 pts base + time bonus (up to 50 pts for fastest correct answer)

### FR-05: Leaderboard
- Live leaderboard shown after every question
- Final leaderboard shown at game end with top 3 podium display
- Scores reset when a new game starts in the same room

### FR-06: Player Experience
- Player enters display name (no account required)
- Display name must be 2–20 characters, no profanity filter needed in v1
- Player sees their own rank and score throughout the game

---

## 7. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Performance | Page load < 2s on 4G connection |
| Question generation | < 3s per Claude API call |
| Polling interval | 2-second poll for game state updates |
| Browser support | Chrome, Edge, Safari, Firefox (latest 2 versions) |
| Mobile support | iOS 15+, Android 10+ |
| Availability | 99.5% uptime during school hours (8am–4pm local) |
| Security | No PII collected; room codes expire; no auth tokens stored |

---

## 8. Claude API — Question Generation Spec

See [`docs/CLAUDE_API_SPEC.md`](./CLAUDE_API_SPEC.md) for full prompt design and response schema.

**Summary:**
- Model: `claude-sonnet-4-6`
- Prompt caching enabled on system prompt (static category + difficulty context)
- Response format: structured JSON array of question objects
- Retry policy: 1 retry on timeout, fallback to pre-seeded question bank if both fail

---

## 9. Information Architecture

```
Home Screen
├── [Create Game] → Host Lobby
│   ├── Configure (topic, difficulty, question count)
│   ├── Share room code
│   └── [Start Game] → Question View (Host)
└── [Join Game] → Enter Code → Enter Name → Player Waiting Room
                                              └── Question View (Player)

Question View
├── Question + 4 options
├── 30s countdown
├── Submit answer
└── Answer reveal + fun fact + mini leaderboard

Final Screen
└── Top 3 podium + full leaderboard + [Play Again]
```

---

## 10. Open Questions / Decisions Log

| # | Question | Decision | Date |
|---|---|---|---|
| 1 | Real-time vs turn-based? | Turn-based (polling) — simpler, lower infra cost | 2026-05-31 |
| 2 | Auth required? | No — room codes only | 2026-05-31 |
| 3 | Question source? | Claude API (dynamic) with static fallback | 2026-05-31 |
| 4 | Deploy target? | Azure (Container Apps preferred over App Service due to sub quota) | 2026-05-31 |
