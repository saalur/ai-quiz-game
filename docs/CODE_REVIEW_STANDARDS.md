# Code Review Standards
## AI Quiz Game v1.0

**Phase:** Standards (pre-Review)
**Agent:** Standards Agent
**Date:** 2026-05-31
**Applies to:** All code in `server/` and `client/`

---

## 1. Purpose

This document is the authoritative rubric for all code review, QA, and security review agents in this project. Every finding must be traceable to a rule here. Findings not covered by these standards should be flagged as "advisory" not "blocking".

---

## 2. Severity Levels

| Level | Label | Meaning | Must fix before merge? |
|---|---|---|---|
| 🔴 | **CRITICAL** | Security vulnerability, data loss, or game-breaking bug | Yes |
| 🟠 | **HIGH** | Incorrect behaviour, wrong output, broken flow | Yes |
| 🟡 | **MEDIUM** | Performance issue, missing error handling at system boundary | Recommended |
| 🔵 | **LOW** | Style, naming, minor improvement | Optional |
| ⚪ | **ADVISORY** | Observation outside current standards | No action required |

---

## 3. Security Rules

### SR-01 🔴 — Correct answer must never leak during answering phase
The `correct` and `fun_fact` fields on a `Question` must be set to `null` in any `GameState` object returned to clients when `phase === 'answering'`. Exception: host requests (identified by valid `x-host-id` header) may receive the correct answer.

**Check:** Search for any code path where `GameState.currentQuestion.correct` is populated during `answering` phase for non-host players.

### SR-02 🔴 — Anthropic API key must never appear in client code or responses
`ANTHROPIC_API_KEY` must only be read in `server/src/config.ts` and used in `server/src/services/claudeService.ts`. It must never be logged, returned in API responses, or referenced in any `client/` file.

### SR-03 🔴 — Host and player IDs must be validated server-side on every mutating action
All `POST` endpoints that modify game state must verify the `x-host-id` or `x-player-id` header against Redis before proceeding. Validation must not be skipped if the header is present but empty.

### SR-04 🟠 — Answer submission must be idempotent per player per question
A player submitting a second answer for the same question index must be silently ignored (return 200, do not update their score). This prevents double-scoring from network retries.

### SR-05 🟡 — Room codes must not be predictable
The room code generator must use cryptographically random character selection, not `Math.random()`. Use `crypto.randomBytes` or equivalent.

### SR-06 🟡 — No PII in logs
Player display names and room codes may appear in debug logs during development. In production (`NODE_ENV=production`), logs must not include player names. Room codes in logs are acceptable.

---

## 4. Game Logic Rules

### GL-01 🔴 — Points calculated server-side only
Point calculation must happen in `server/src/services/gameService.ts`. The client must never send a score or points value to the server. The server must ignore any score field in request bodies.

### GL-02 🔴 — Timer deadline set by server, not client
`questionDeadline` (Unix ms timestamp) must be set by the server when a question starts (`phase` transitions to `'answering'`). The client uses this value only for display. The server must use its own `questionDeadline` from Redis to evaluate whether a submission is in time.

### GL-03 🟠 — Game state transitions must be strictly ordered
Valid transitions only:
```
lobby → active (on /start)
active + answering → active + revealed (on /reveal)
active + revealed → active + answering (on /next, if questions remain)
active + revealed → finished (on /next, if last question)
any → finished (on host end game)
```
Any other transition must return 400.

### GL-04 🟠 — Minimum player check enforced on /start
`POST /api/game/:code/start` must return 400 if fewer than 2 players are in the room.

### GL-05 🟡 — Leaderboard must be sorted descending by score, then ascending by name for ties
Tied scores must produce a deterministic order (alphabetical by display name). Do not use sort instability to break ties.

---

## 5. API Contract Rules

### AC-01 🟠 — All error responses must follow the standard schema
Every non-2xx response must be `{ "error": "ERROR_CODE", "message": "human readable" }`. No raw Express error objects or stack traces in responses.

### AC-02 🟠 — 404 for missing rooms, not 500
When a room code does not exist in Redis, return 404 `{ error: 'ROOM_NOT_FOUND' }`. A Redis lookup returning `null` must never bubble up as an unhandled exception.

### AC-03 🟡 — Request bodies must be validated before any business logic
Validation (name length, answer option value, question count) must happen at the route level before calling any service. Invalid input returns 400 before touching Redis or Claude.

### AC-04 🔵 — HTTP methods must match intent
All state-changing actions use `POST`. Read operations use `GET`. No `GET` endpoint may modify state.

---

## 6. Claude API Rules

### CA-01 🟠 — System prompt must use cache_control ephemeral
The Claude system prompt in `claudeService.ts` must be sent with `cache_control: { type: 'ephemeral' }` to enable prompt caching. Omitting this increases cost by ~4x on repeated calls.

### CA-02 🟠 — Response must be validated before use
After parsing Claude's JSON response, validate that:
- It is an array
- Length matches the requested count
- Each item has `id`, `question`, `options` (A/B/C/D), `correct` (one of A/B/C/D), `fun_fact`
- No two questions have identical `question` text

Failing validation must trigger the fallback path, not a 500 error.

### CA-03 🟠 — Fallback must be silent to players
When the fallback question bank is used, the API response to the host must be identical in shape to a Claude-generated response. No error flag or message should indicate a fallback occurred (log it server-side only).

### CA-04 🟡 — Claude must not be called during answering phase
The Claude API is called once on `/start`. No subsequent game actions should trigger Claude calls. If a Claude call is found inside `/next`, `/reveal`, or `/answer` handlers, it is a bug.

### CA-05 🟡 — Age-appropriate content guardrail in system prompt
The system prompt must instruct Claude that the audience is ages 11-16 and content must be school-appropriate. The words "school-appropriate", "ages 11-16", or "grades 6-10" must appear in the system prompt sent to Claude.

---

## 7. TypeScript Rules

### TS-01 🟠 — No `any` types in production code
`any` is banned in all `server/src/` and `client/src/` files. Use `unknown` + type narrowing, or define a proper interface. Exception: third-party library interop where the type is genuinely unavailable.

### TS-02 🟠 — Shared types must not diverge between client and server
`client/src/types.ts` and `server/src/types.ts` must define `GameState`, `QuestionForClient`, and `LeaderboardEntry` identically. Any divergence is a contract violation.

### TS-03 🟡 — No non-null assertions (`!`) on Redis-sourced data
Data retrieved from Redis must be null-checked before use. Using `!` on a Redis `.get()` result is a 🔴 if it could cause a crash in a real game session.

### TS-04 🔵 — Prefer `interface` over `type` for object shapes
Use `type` only for unions and aliases. All object shapes use `interface`.

---

## 8. React / Frontend Rules

### RF-01 🟠 — Polling must stop when game is finished
`useGameState.ts` must clear its interval when `gameState.status === 'finished'`. Leaving an interval running after game end causes unnecessary API load and potential state corruption.

### RF-02 🟠 — Answer buttons must be disabled after submission
Once a player submits an answer, all four `AnswerButton` components must enter a `disabled` state and remain disabled for the rest of that question. A second tap must not trigger another API call.

### RF-03 🟡 — No game state logic in components
Components must only render. All game logic (calculating points, determining correct/wrong, advancing state) must live in hooks or the Zustand store, not in JSX or component functions.

### RF-04 🟡 — Countdown timer must derive from server deadline, not client start time
`useCountdown.ts` must use `gameState.questionDeadline` (server-issued Unix timestamp) as its source of truth. Do not start a client-side 30-second timer from when the question renders — this drifts across players.

### RF-05 🔵 — Touch targets minimum 44×44px
All interactive elements (answer buttons, nav buttons) must have a minimum rendered size of 44×44px on mobile. Use Tailwind `min-h-[44px] min-w-[44px]` or equivalent.

---

## 9. Performance Rules

### PR-01 🟡 — Polling interval must be exactly 2000ms
`useGameState.ts` must poll every 2000ms. Shorter intervals increase server load; longer intervals make the game feel unresponsive. The interval value must be a named constant, not a magic number.

### PR-02 🟡 — Redis operations must not be awaited serially when parallelisable
If multiple independent Redis reads are needed in a single request handler, use `Promise.all()`. Serial awaits on independent operations add unnecessary latency.

### PR-03 🔵 — No console.log in production client code
`console.log` statements in `client/src/` files are acceptable during development but must not appear in final committed code. `console.error` for genuine errors is acceptable.

---

## 10. Kid-Safety Rules

### KS-01 🟠 — Claude system prompt must specify school-appropriate content
The system prompt must explicitly state the audience is school children ages 11-16 and that all content must be classroom-appropriate. This is a non-negotiable guardrail.

### KS-02 🟡 — Display names are not sanitised for profanity in v1
Per PRD decision, profanity filtering is out of scope for v1. This is a known accepted risk. Do not flag absence of profanity filtering as a bug — flag it as ADVISORY only.

### KS-03 🔵 — UI language must be friendly and encouraging
Error messages shown to players (e.g. "Room not found", "Game already started") must use friendly, non-technical language. Technical error codes (`ROOM_NOT_FOUND`) must never be shown in the UI.

---

## 11. What Review Agents Must NOT Flag

- Absence of profanity filtering (accepted v1 decision — KS-02)
- No user authentication (accepted v1 decision — out of scope)
- No persistent database (Redis-only is intentional — ephemeral by design)
- No real-time WebSockets (turn-based polling is intentional — AC in PRD)
- Missing analytics or logging dashboards (out of scope v1)
- Test coverage below 100% (target is critical path coverage, not 100%)
