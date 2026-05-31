# Architecture Decision Record
## AI Quiz Game v1.0

**Phase:** Architecture  
**Agent:** Architect Agent  
**Date:** 2026-05-31  
**Status:** Approved

---

## 1. Tech Stack Decisions

### Backend
| Concern | Choice | Rationale |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Fast I/O for polling, huge ecosystem, same language as frontend |
| Framework | **Express.js** | Lightweight, well-understood, minimal overhead for REST API |
| Language | **TypeScript** | Type safety across client/server, better Claude API response typing |
| Game State Store | **Redis** | Fast in-memory store for ephemeral room/game state; TTL-based expiry fits our 2hr room lifecycle |
| Fallback Questions | **JSON flat files** | Simple, no DB dependency for static content |

### Frontend
| Concern | Choice | Rationale |
|---|---|---|
| Framework | **React 18** | Component model maps cleanly to game screens; large ecosystem |
| Build tool | **Vite** | Fast HMR, small bundles, native ESM |
| Styling | **Tailwind CSS** | Rapid responsive UI, no CSS file sprawl |
| State | **Zustand** | Lightweight global state for game session; no Redux overhead |
| HTTP Client | **axios** | Consistent API with interceptors for polling |

### Infrastructure
| Concern | Choice | Rationale |
|---|---|---|
| Containerisation | **Docker** | Consistent across local dev and Azure |
| Cloud | **Azure Container Apps** | Serverless containers; avoids App Service quota limits on this sub |
| CI/CD | **GitHub Actions** | Native GitHub integration; free tier sufficient |
| Secrets | **Azure Key Vault** | Anthropic API key stored securely, injected at runtime |

### Polling Strategy
Turn-based state is synchronised via **short polling** (client polls `/api/game/:roomCode/state` every 2 seconds). Chosen over WebSockets because:
- Simpler to implement, test, and debug
- No persistent connections = easier horizontal scaling
- Acceptable latency for turn-based gameplay

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│                                                              │
│   ┌──────────────┐          ┌──────────────────────────┐   │
│   │  Host UI     │          │  Player UI               │   │
│   │  (React)     │          │  (React)                 │   │
│   └──────┬───────┘          └────────────┬─────────────┘   │
│          │  REST + 2s poll               │  REST + 2s poll  │
└──────────┼───────────────────────────────┼─────────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    EXPRESS API SERVER                         │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Room Router │  │ Game Router  │  │  Claude Router   │   │
│  │ /api/rooms  │  │ /api/game    │  │  /api/questions  │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                    │              │
│         └────────────────┼────────────────────┘             │
│                          │                                   │
│              ┌───────────▼───────────┐                      │
│              │   Game State Service  │                      │
│              │   (business logic)    │                      │
│              └───────────┬───────────┘                      │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐      │
│  │    Redis    │  │ Claude API   │  │  Fallback     │      │
│  │  (game      │  │  (question   │  │  Questions    │      │
│  │   state)    │  │   gen)       │  │  (JSON files) │      │
│  └─────────────┘  └──────────────┘  └───────────────┘      │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Azure Container Apps │
│  + Azure Key Vault    │
│  + Azure Cache for    │
│    Redis              │
└──────────────────────┘
```

---

## 3. Data Models

### Room
```typescript
interface Room {
  code: string;           // "AB3X7K" — 6-char alphanumeric
  hostId: string;         // UUID generated for host session
  status: 'lobby' | 'active' | 'finished';
  config: GameConfig;
  players: Record<string, Player>;  // keyed by playerId
  questions: Question[];            // populated on game start
  currentQuestionIndex: number;     // -1 = not started
  createdAt: number;                // Unix timestamp
  expiresAt: number;                // createdAt + 7200s
}
```

### GameConfig
```typescript
interface GameConfig {
  topic: 'what_is_ai' | 'machine_learning' | 'neural_networks' | 'ai_in_daily_life' | 'ai_ethics';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questionCount: 5 | 10 | 15;
}
```

### Player
```typescript
interface Player {
  id: string;             // UUID
  name: string;           // display name, 2-20 chars
  score: number;          // cumulative
  answers: Record<number, PlayerAnswer>;  // keyed by question index
  joinedAt: number;
  isHost: boolean;
}
```

### PlayerAnswer
```typescript
interface PlayerAnswer {
  selected: 'A' | 'B' | 'C' | 'D' | null;
  submittedAt: number;    // Unix timestamp ms — for speed bonus calc
  pointsEarned: number;
}
```

### Question
```typescript
interface Question {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: 'A' | 'B' | 'C' | 'D';
  fun_fact: string;
}
```

### GameState (what clients receive on poll)
```typescript
interface GameState {
  roomCode: string;
  status: 'lobby' | 'active' | 'finished';
  currentQuestionIndex: number;
  totalQuestions: number;
  phase: 'answering' | 'revealed' | 'finished';
  questionDeadline: number | null;      // Unix timestamp ms
  currentQuestion: QuestionForClient | null;
  leaderboard: LeaderboardEntry[];
  playerCount: number;
}

// Strips correct answer — only sent after reveal
interface QuestionForClient {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: 'A' | 'B' | 'C' | 'D' | null;  // null during answering phase
  fun_fact: string | null;                  // null during answering phase
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  lastPoints: number;
}
```

---

## 4. API Contract

### Room Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/rooms` | None | Create a new room — returns room code + hostId |
| `GET` | `/api/rooms/:code` | None | Check if room exists and is joinable |
| `POST` | `/api/rooms/:code/join` | None | Join a room as a player |
| `DELETE` | `/api/rooms/:code` | hostId header | End the game and close the room |

### Game Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/game/:code/start` | hostId header | Start the game (triggers Claude question gen) |
| `POST` | `/api/game/:code/next` | hostId header | Advance to next question |
| `POST` | `/api/game/:code/reveal` | hostId header | Reveal answer for current question |
| `GET` | `/api/game/:code/state` | playerId header | Poll current game state (2s interval) |
| `POST` | `/api/game/:code/answer` | playerId header | Submit an answer for current question |

### Request/Response Examples

**POST /api/rooms**
```json
// Response 201
{
  "roomCode": "AB3X7K",
  "hostId": "uuid-host-token",
  "expiresAt": 1748727600000
}
```

**POST /api/rooms/:code/join**
```json
// Request
{ "name": "Aisha" }

// Response 200
{
  "playerId": "uuid-player-token",
  "roomCode": "AB3X7K",
  "playerCount": 5
}
```

**GET /api/game/:code/state**
```json
// Response 200
{
  "roomCode": "AB3X7K",
  "status": "active",
  "currentQuestionIndex": 2,
  "totalQuestions": 10,
  "phase": "answering",
  "questionDeadline": 1748720430000,
  "currentQuestion": {
    "id": 3,
    "question": "Which of the following is an example of AI?",
    "options": { "A": "A calculator", "B": "Netflix recommendations", "C": "A light switch", "D": "A clock" },
    "correct": null,
    "fun_fact": null
  },
  "leaderboard": [
    { "rank": 1, "name": "Priya", "score": 285, "lastPoints": 145 },
    { "rank": 2, "name": "Aisha", "score": 200, "lastPoints": 100 }
  ],
  "playerCount": 8
}
```

**Error Responses**
```json
// 404 Room not found
{ "error": "ROOM_NOT_FOUND", "message": "Room AB3X7K does not exist or has expired" }

// 400 Validation error
{ "error": "VALIDATION_ERROR", "message": "Name must be between 2 and 20 characters" }

// 403 Not authorised
{ "error": "FORBIDDEN", "message": "Only the host can perform this action" }
```

---

## 5. Points Calculation

```typescript
function calculatePoints(
  isCorrect: boolean,
  submittedAt: number,
  questionDeadline: number,
  questionStartedAt: number
): number {
  if (!isCorrect) return 0;
  const totalTime = questionDeadline - questionStartedAt;  // 30,000ms
  const timeUsed = submittedAt - questionStartedAt;
  const timeRatio = Math.max(0, 1 - timeUsed / totalTime);
  const speedBonus = Math.round(timeRatio * 50);
  return 100 + speedBonus;
}
```

---

## 6. Security Considerations

| Risk | Mitigation |
|---|---|
| Answer leaking before reveal | `correct` and `fun_fact` stripped from `GameState` during `answering` phase |
| Host impersonation | `hostId` UUID checked server-side on all host actions |
| Player impersonation | `playerId` UUID checked server-side on answer submission |
| Claude API key exposure | Stored in Azure Key Vault; never sent to client |
| Room squatting / abuse | Rooms expire in 2 hours; no persistent storage |
| Answer replay | Server ignores duplicate answer submissions for same question |

---

## 7. Folder Structure

See [`docs/FOLDER_STRUCTURE.md`](./FOLDER_STRUCTURE.md)
