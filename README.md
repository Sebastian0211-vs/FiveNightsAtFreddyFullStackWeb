<div align="center">

![Five Nights at Freddy's](readme-assets/img.png)

# Five Nights at Freddy's: Full-Stack Web Edition

*"Hello? Hello, hello? Uh, I wanted to record a message for you to help you get settled in on your first night..."*

</div>

---

A full-stack web recreation of **Five Nights at Freddy's 1**. The game runs entirely in the browser on HTML5 Canvas, while a Node/Express + GraphQL backend handles accounts, a live leaderboard, persistent progress, and email-based password reset. Built for the FSWD 2026 full-stack project.

> **Asset notice:** Game assets (sprites, audio, fonts, models) are **not** included in this repository and must be sourced separately. See [Assets](#assets).

---

## Screenshots

<div align="center">

| Menu | Warning screen |
|:---:|:---:|
| ![Menu](readme-assets/img_1.png) | ![Warning](readme-assets/img_2.png) |
| **Security office** | **Leaderboard** |
| ![Office](readme-assets/img_3.png) | ![Leaderboard](readme-assets/img_4.png) |

</div>

---

## Stack

| Layer | Tech |
|---|---|
| Game engine | Vanilla JS · HTML5 Canvas · Three.js |
| Frontend SPA | React 18 · React Router v6 · Vite 6 |
| API | Apollo GraphQL (`@apollo/server` + `expressMiddleware`) on Express |
| Auth | Passport.js (JWT strategy) · JWT in an HttpOnly cookie · bcryptjs |
| Database | MongoDB + Mongoose (schema validation) |
| Email | Resend SDK |
| External APIs | ip-api.com (geolocation) · purgomalum.com (profanity filter) |
| Tests | Vitest · Supertest · React Testing Library · jsdom |

---

## Features

**Game**

- Nights 1–6 plus a fully configurable Custom Night (each animatronic 0–20).
- All four animatronics with faithful AI movement and per-hour aggression scaling.
- Power system, door/light controls, tablet camera with full minimap.
- Golden Freddy easter egg and complete jumpscare sequences.
- Per-session stat tracking: camera flicks, door closes, and power remaining at 6 AM.

**Progress & unlocks**

- `furthestNight` tracks the active campaign; `bestNight` is the highest night ever completed and survives a "New Game", so unlocks are never lost.
- Custom Night unlocks once you've beaten Night 5; menu stars reflect progress.
- Beating Custom Night on **4/20 mode** (all AI at level 20) sets `customNightBeaten` (the third menu star).

**Auth & accounts**

- Register / login / logout with a JWT stored in an HttpOnly, SameSite cookie (Secure in production).
- Passwords hashed with bcrypt; usernames validated and run through a profanity check (purgomalum.com).
- Forgot password → time-limited email link via Resend → reset form.

**Leaderboard**

- Records outcome, night, survival time, country flag (IP geolocation), and in-game stats per run.
- Filterable by night (N1–N6) and Custom Night; sortable by any column.
- The React `/leaderboard` uses Apollo `useQuery` with polling for live updates, so no refresh is needed.

**Anti-cheat**

- A score can only be submitted against a server-issued, single-use **night session token**. `startNight` opens a session; `submitScore` consumes it. This bounds how fast a "win" can be claimed and ties the 4/20 unlock to a real, server-initiated run. Stale sessions auto-expire after 2 hours.

---

## Animatronics

<div align="center">

| <img src="readme-assets/freddy.png" width="80"/><br>**Freddy** | <img src="readme-assets/bonnie.png" width="80"/><br>**Bonnie** | <img src="readme-assets/chica.png" width="80"/><br>**Chica** | <img src="readme-assets/foxy.png" width="80"/><br>**Foxy** |
|:---:|:---:|:---:|:---:|
| Show Stage | Show Stage | Show Stage | Pirate's Cove |
| Stage → Dining → Restrooms → Kitchen → East Hall → Corner | Stage → Backstage → West Hall → Corner | Stage → Dining → Restrooms → East Hall → Corner | Cove (4 stages) → sprint West Hall |
| Right door | Left door | Right door | Left door |

</div>

AI levels scale with night and hour. Custom Night lets you set each animatronic's level (0–20) manually.

---

## Architecture

```
Browser (React SPA + Canvas game)
  │  Apollo Client  ── GraphQL ──▶  Apollo Server  ─┐
  │  fetch          ── REST  ────▶  Express auth    ─┤──▶ MongoDB (Mongoose)
  │                                                   │
  └─ JWT in HttpOnly cookie ◀── Passport JWT strategy ┘
                                   │
                       ip-api.com · purgomalum.com · Resend
```

The React app fetches all game/leaderboard data through GraphQL. Authentication is handled by REST routes (`/auth/*`) that set the cookie; every GraphQL resolver receives the authenticated user via Apollo `context`.

---

## Project structure

```
.
├── index.html                        React SPA entry point
├── vite.config.js                    Vite + SPA route rewrites
├── vitest.config.js
├── server/
│   └── src/
│       ├── index.js                  MongoDB connect + server listen
│       ├── app.js                    Express + Apollo setup (exported for tests)
│       ├── auth/
│       │   ├── passport.js           JWT Passport strategy
│       │   └── cookie.js             Cookie helpers
│       ├── routes/
│       │   └── auth.js               register / login / logout / me / forgot- & reset-password
│       ├── models/
│       │   ├── User.js               account + progress (furthestNight, bestNight, ...)
│       │   ├── Score.js              leaderboard entry
│       │   └── NightSession.js       single-use anti-cheat session token
│       ├── graphql/
│       │   ├── typeDefs.js
│       │   ├── resolvers.js
│       │   └── context.js
│       ├── scripts/
│       │   └── seedDebugUser.js
│       └── tests/
│           ├── unit.password.test.js
│           ├── unit.resolver.test.js
│           └── integration.auth.test.js
└── src/
    ├── react/                        React SPA
    │   ├── main.jsx · App.jsx · styles.css
    │   ├── pages/                    Warning · Menu · Home · Login · Register ·
    │   │                             ResetPassword · Play · CustomNight ·
    │   │                             Leaderboard · Unauthorized · FearDetector
    │   ├── components/               Navbar · Layout · ProtectedRoute
    │   ├── auth/AuthContext.jsx
    │   ├── lib/                      apollo · api · fnafFx · menuAssets
    │   └── __tests__/                AuthFlow · Navbar
    ├── pages/                        MainRoom.html · CustomNight.html (gameplay scenes)
    ├── engine/                       Game logic (vanilla JS)
    │   ├── gameState.js              time, power, stat tracking, score submission
    │   ├── jumpscare.js
    │   └── animatronics/             Animatronic (base) · Freddy · Bonnie · Chica · Foxy
    ├── camera/minimap.js
    ├── data/                         animations.js · rooms.js
    ├── constants/nightConfig.js
    └── hooks/useJumpscareCapture.jsx
```

---

## Getting started

### Prerequisites

- Node.js ≥ 18
- A MongoDB database: local (`mongodb://localhost:27017/fnaf`) or MongoDB Atlas
- A [Resend](https://resend.com) API key with a verified sending domain (for password reset)
- The game assets folder (`Assets/`) at the project root (**not included**, see [Assets](#assets))

### Setup

```bash
git clone https://github.com/Sebastian0211-vs/FiveNightsAtFreddyFullStackWeb.git
cd FiveNightsAtFreddyFullStackWeb
npm install
```

Create a `.env` file at the project root:

```env
# Backend
PORT=3002
MONGO_URI=mongodb://localhost:27017/fnaf
JWT_SECRET=<random 64-char hex string>
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

# Email
RESEND_API_KEY=re_...
FRONTEND_URL=http://localhost:5173

# Frontend (Vite: must be prefixed VITE_)
VITE_API_URL=http://localhost:3002
VITE_GRAPHQL_URL=http://localhost:3002/graphql
```

### Run

```bash
npm run dev:server   # Terminal 1: backend (nodemon)
npm run dev          # Terminal 2: frontend (Vite)
```

Open `http://localhost:5173`, register an account, then head to `/play` to start your shift.

### Test

```bash
npm test
```

5 test files · 12 tests (unit + integration). MongoDB and Resend are mocked, so no live services are needed.

### Build

```bash
npm run build        # production bundle
npm run preview      # preview the build
```

---

## GraphQL API

All data is fetched through GraphQL. Mutations require an authenticated session cookie and operate only on the logged-in user's own data. The server never trusts a user id passed as an argument.

**Queries**

```graphql
me: User
leaderboard(night: Int, limit: Int = 10): [Score!]!
myScores: [Score!]!
```

**Mutations**

```graphql
updateProgress(night: Int!): User!
resetProgress: User!

# Open a server-issued, single-use session for one night attempt.
startNight(
  night: Int!, isCustomNight: Boolean,
  aiFreddy: Int, aiBonnie: Int, aiChica: Int, aiFoxy: Int
): NightSessionToken!

# Consume the session and record the result.
submitScore(
  sessionId: ID!, night: Int!, survivedSeconds: Int!, outcome: Outcome!,
  cameraFlicks: Int, doorCloses: Int, powerRemaining: Float,
  isCustomNight: Boolean,
  aiFreddy: Int, aiBonnie: Int, aiChica: Int, aiFoxy: Int
): Score!
```

When unauthenticated, queries that require a login return empty responses (`null` / `[]`). `startNight` and `submitScore` are called automatically by the game engine at the start and end of each night.

---

## Controls

| Action | Input |
|---|---|
| Look left / right | Click and drag the scene |
| Toggle door | Upper half of door button |
| Toggle hallway light | Lower half of door button |
| Open / close tablet | Move mouse to the bottom edge |
| Select camera | Click a room tile on the minimap |

Headphones recommended. Designed for a 16:9 viewport.

---

## Requirements coverage (FSWD 2026)

| # | Requirement | Where |
|---|---|---|
| 1 | Clean UI, custom title & favicon, responsive nav | `index.html`, `Navbar.jsx`, `styles.css` |
| 2 | React Router with dynamic, no-reload navigation | `App.jsx`, `vite.config.js` |
| 3 | Core feature implemented (playable FNaF) | `src/engine/`, `src/pages/MainRoom.html` |
| 4 | Express server, ES Modules, nodemon | `server/src/`, `package.json` |
| 5 | `.env` config + CORS | `.env`, `server/src/app.js` |
| 6 | MongoDB + schema validation | `server/src/models/` |
| 7 | Auth (Passport, secure HttpOnly cookie, guards) | `auth/`, `routes/auth.js`, `ProtectedRoute.jsx` |
| 8 | Apollo Client/Server, protected & reactive resolvers | `graphql/`, `lib/apollo.js` |
| 9 | External API used back & front (geolocation flags) | `resolvers.js`, `Leaderboard.jsx` |
| 10 | Vitest unit + integration tests, all passing | `**/__tests__/`, `server/src/tests/` |

---

## Assets

All game assets (sprites, audio, character models, and fonts) are the intellectual property of **Scott Cawthon / Steel Wool Studios** and are protected by copyright. They are **not included in this repository** and never will be.

The `Assets/` folder was originally committed, then fully purged from git history with `git filter-repo` and added to `.gitignore`. The public repository contains only original source code.

To run the game locally, supply the assets yourself (e.g. from a legitimate copy of the game) and place an `Assets/` folder at the project root with roughly this structure:

```
Assets/
├── Bonnie/
├── Cam_views/
├── Door_Buttons/
├── End Screen/
├── FNaF 1/
├── FNaF 1 Audio/
├── Fonts/
├── Freddy/
├── Icons/
├── Main Room/
├── Map/
├── Menu/
├── Tablette/
└── …
```

The project will not load without this folder. No download link or copy of the assets is provided here.

---

## Disclaimer

This is an unofficial fan recreation made for educational purposes only, not affiliated with or endorsed by Scott Cawthon or Steel Wool Studios. All original artwork, audio, and characters remain the property of their respective owners. This project is non-commercial and distributes no assets.

---

<div align="center">

![End screen](readme-assets/end-screen.png)

</div>
