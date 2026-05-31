# AI Quiz Game 🤖

A multiplayer turn-based quiz game that teaches school children (grades 6–10) about Artificial Intelligence. Questions are generated dynamically by Claude. No accounts required — join with a room code.

**Built with Agentic SDLC** — every phase (requirements → architecture → code → review → QA → security → deploy) was produced by a Claude Code agent.

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- An Anthropic API key → [console.anthropic.com](https://console.anthropic.com)

### Run locally

```bash
# 1. Clone
git clone https://github.com/saalur/ai-quiz-game.git
cd ai-quiz-game

# 2. Set your API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY

# 3. Start everything (Redis + Server + Client)
docker-compose up

# Server: http://localhost:3001
# Client: http://localhost:5173
```

### Run without Docker

```bash
# Terminal 1 — Redis
docker run -p 6379:6379 redis:7-alpine

# Terminal 2 — Server
cd server
cp ../.env.example .env   # edit ANTHROPIC_API_KEY
npm install
npm run dev

# Terminal 3 — Client
cd client
npm install
npm run dev
```

---

## How to Play

1. **Teacher** opens the app → clicks **Create Game**
2. A 6-character room code appears — share it with students
3. **Students** enter the code + their display name → join the lobby
4. Teacher selects **topic**, **difficulty**, **question count** → clicks **Start Game**
5. Claude generates all questions — game begins
6. Each question: 30-second timer, 4 options, fastest correct answer scores highest
7. Leaderboard shown after every question — final podium at the end

**Topics:** What is AI · Machine Learning · Neural Networks · AI in Daily Life · AI Ethics  
**Difficulties:** Beginner (Gr 6–7) · Intermediate (Gr 8–9) · Advanced (Gr 10)

---

## Architecture

```
React (Vite + Tailwind)  →  Express API (Node.js + TypeScript)
                                  ↓                    ↓
                               Redis             Claude API
                           (game state)      (question generation)
```

- **Turn-based** with 2-second polling (no WebSockets)
- **Server is source of truth** — correct answers never sent to clients before reveal
- **Azure Container Apps** deployment with GitHub Actions CI/CD
- **54 automated tests** covering all critical game paths

See [`docs/`](docs/) for full SDLC artifacts.

---

## GitHub Actions

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Every push / PR | Type-check + test (server), type-check + build (client) |
| `deploy.yml` | Merge to `main` | Build Docker image → push to ACR → deploy Container App |

---

## Required GitHub Secrets

| Secret | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `AZURE_CREDENTIALS` | `az ad sp create-for-rbac --sdk-auth` |
| `ACR_USERNAME` | `az acr credential show --name aiquizgameacr` |
| `ACR_PASSWORD` | Same as above |
| `REDIS_URL` | Azure Cache for Redis connection string (TLS: `rediss://`) |
| `CORS_ORIGIN` | Your deployed client URL (e.g. `https://yourapp.azurestaticapps.net`) |

---

## Azure Infrastructure

| Resource | Name | Notes |
|---|---|---|
| Resource Group | `rg-ai-quiz-game` | Sweden Central |
| Container Registry | `aiquizgameacr` | Basic SKU |
| Container Apps Env | `cae-ai-quiz-game` | Sweden Central |
| Container App | `ca-ai-quiz-game-server` | Created on first deploy |
| Redis | Provide via `REDIS_URL` secret | Azure Cache for Redis or Upstash |

### Set up Azure credentials for GitHub Actions

```bash
az ad sp create-for-rbac \
  --name "sp-ai-quiz-game-ghactions" \
  --role contributor \
  --scopes /subscriptions/3d0abfe2-529f-4aaa-b05e-d697846751cf/resourceGroups/rg-ai-quiz-game \
  --sdk-auth
```

Copy the JSON output → paste into GitHub secret `AZURE_CREDENTIALS`.

---

## Agentic SDLC — What Each Agent Built

| Phase | Agent | Output |
|---|---|---|
| 1 | Requirements Agent | PRD, 11 user stories, Claude API spec |
| 2 | Architect Agent | System design, data models, API contract |
| 3 | Code Agents (×2) | 44 files, 3,807 lines — backend + frontend in parallel |
| S | Standards Agent | 32 code review rules across 11 categories |
| 4 | Review Agent | 10 findings → 8 fixes (CRITICAL answer-leak, wrong min-player check) |
| 5 | QA Agent | 54 tests across 4 suites, all passing |
| 6 | Security Agent | 10 findings → 8 fixes (rate limiting, error sanitisation, input validation) |
| 7 | DevOps Agent | CI/CD pipeline, Docker, Azure Container Apps |
