# Folder Structure
## AI Quiz Game v1.0

**Phase:** Architecture  
**Agent:** Architect Agent  
**Date:** 2026-05-31

---

```
ai-quiz-game/
│
├── docs/                          # All SDLC artifacts (this folder)
│   ├── PRD.md
│   ├── USER_STORIES.md
│   ├── CLAUDE_API_SPEC.md
│   ├── ARCHITECTURE.md
│   └── FOLDER_STRUCTURE.md
│
├── server/                        # Express API (Node.js + TypeScript)
│   ├── src/
│   │   ├── index.ts               # App entry point
│   │   ├── config.ts              # Env vars, constants
│   │   ├── types.ts               # Shared TypeScript interfaces
│   │   │
│   │   ├── routes/
│   │   │   ├── rooms.ts           # POST /api/rooms, GET /api/rooms/:code, etc.
│   │   │   └── game.ts            # POST /api/game/:code/start, /next, /reveal, etc.
│   │   │
│   │   ├── services/
│   │   │   ├── roomService.ts     # Room CRUD against Redis
│   │   │   ├── gameService.ts     # Game flow logic, points calculation
│   │   │   └── claudeService.ts   # Claude API call + fallback logic
│   │   │
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts  # Validates hostId / playerId headers
│   │   │   └── errorHandler.ts    # Global Express error handler
│   │   │
│   │   └── utils/
│   │       ├── roomCode.ts        # 6-char code generator
│   │       └── validate.ts        # Request body validators
│   │
│   ├── data/
│   │   └── fallback_questions.json  # 250 pre-written questions (5 topics × 3 difficulties × ~17 Qs)
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── client/                        # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── main.tsx               # Vite entry point
│   │   ├── App.tsx                # Router + screen switcher
│   │   ├── types.ts               # Shared TypeScript interfaces (mirrors server/types.ts)
│   │   │
│   │   ├── screens/
│   │   │   ├── HomeScreen.tsx     # Create / Join buttons
│   │   │   ├── HostLobbyScreen.tsx  # Room code display, config, player list, Start
│   │   │   ├── PlayerLobbyScreen.tsx  # "Waiting for host..." screen
│   │   │   ├── HostQuestionScreen.tsx  # Question view for host (can see answer)
│   │   │   ├── PlayerQuestionScreen.tsx  # Question view for player (answer buttons)
│   │   │   ├── RevealScreen.tsx   # Answer reveal + fun fact + mini leaderboard
│   │   │   └── FinalScreen.tsx    # Podium + full leaderboard + Play Again
│   │   │
│   │   ├── components/
│   │   │   ├── RoomCodeDisplay.tsx
│   │   │   ├── CountdownTimer.tsx
│   │   │   ├── AnswerButton.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── Podium.tsx
│   │   │   ├── FunFact.tsx
│   │   │   └── PlayerList.tsx
│   │   │
│   │   ├── store/
│   │   │   └── gameStore.ts       # Zustand store — game session state
│   │   │
│   │   ├── hooks/
│   │   │   ├── useGameState.ts    # Polling hook (calls /api/game/:code/state every 2s)
│   │   │   └── useCountdown.ts    # Countdown timer hook
│   │   │
│   │   └── api/
│   │       └── client.ts          # Axios instance + typed API call functions
│   │
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml                 # On PR: lint + type-check + test
│       └── deploy.yml             # On merge to main: build + push to Azure Container Apps
│
├── docker-compose.yml             # Local dev: server + client + Redis
├── .env.example                   # Required env vars (ANTHROPIC_API_KEY, REDIS_URL, etc.)
├── .gitignore
└── README.md
```

---

## Key Design Principles

1. **Server is source of truth** — all game state lives in Redis on the server. The client only renders what it receives from `/state` polls. No client-side game logic.

2. **Correct answer never sent early** — `GameState` strips `correct` and `fun_fact` while `phase === 'answering'`. Only exposed after host calls `/reveal`.

3. **Services are thin and testable** — routes just validate and delegate. Business logic lives entirely in `gameService.ts` and `claudeService.ts`.

4. **Single shared types.ts** — client and server both import from their own `types.ts` but they are kept in sync. The server's types are the authoritative definition.

5. **Fallback is always available** — `claudeService.ts` wraps every Claude call in try/catch and falls back to `fallback_questions.json` transparently.
