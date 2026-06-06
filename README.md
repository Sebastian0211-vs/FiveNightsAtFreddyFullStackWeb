<div align="center">

![Five Nights at Freddy's](readme-assets/img.png)

# Five Nights at Freddy's — Full-Stack Web Edition

*"Hello? Hello, hello? Uh, I wanted to record a message for you to help you get settled in on your first night..."*

</div>

---

A full-stack web recreation of Five Nights at Freddy's 1. The game runs entirely in the browser; the backend handles user accounts, a live leaderboard, and email-based password reset.

> **Asset notice:** Game assets (sprites, audio, models) are not included in this repository and must be sourced separately. See [Assets](#assets).

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
| Game engine | Vanilla JS + HTML5 Canvas |
| Frontend SPA | React 18 · React Router v6 · Vite |
| API | Apollo GraphQL (`@apollo/server` + `expressMiddleware`) |
| Auth | Passport.js · JWT stored as HttpOnly cookie |
| Database | MongoDB + Mongoose |
| Email | Resend SDK |
| External APIs | ip-api.com (geolocation) · purgomalum.com (profanity filter) |
| Tests | Vitest · Supertest · Testing Library |

---

## Features

**Game**
- Nights 1–6 plus a fully configurable Custom Night
- All four animatronics with faithful AI movement and per-hour aggression scaling
- Power system, door/light controls, tablet camera with full minimap
- Golden Freddy easter egg and complete jumpscare sequences
- Per-session stat tracking: camera flicks, door closes, power remaining at 6 AM

**Auth & accounts**
- Register / login / logout with HttpOnly cookie JWT
- Username profanity check on registration via purgomalum.com
- Forgot password → email link via Resend → reset form

**Leaderboard**
- Records outcome, night, survival time, country flag (IP geolocation), and in-game stats per run
- Filterable by night (N1–N6) and Custom Night; sortable by any column
- React `/leaderboard` uses Apollo `useQuery` with 10-second polling for live updates
- Standalone in-game `Leaderboard.html` with the same data in FNAF styling

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

## Project structure

```
.
├── index.html                        React SPA entry point
├── vite.config.js
├── vitest.config.js
├── server/
│   └── src/
│       ├── index.js                  MongoDB connect + server listen
│       ├── app.js                    Express + Apollo setup (exported for tests)
│       ├── auth/
│       │   ├── passport.js           JWT Passport strategy
│       │   └── cookie.js             Cookie helpers
│       ├── routes/
│       │   └── auth.js               POST register / login / logout / forgot-password / reset-password
│       ├── models/
│       │   ├── User.js
│       │   └── Score.js
│       ├── graphql/
│       │   ├── typeDefs.js
│       │   ├── resolvers.js
│       │   └── context.js
│       └── tests/
│           ├── unit.password.test.js
│           ├── unit.resolver.test.js
│           └── integration.auth.test.js
└── src/
    ├── react/                        React SPA
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── styles.css
    │   ├── pages/
    │   │   ├── Warning.jsx
    │   │   ├── Menu.jsx
    │   │   ├── Home.jsx
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── ResetPassword.jsx
    │   │   ├── Play.jsx
    │   │   ├── CustomNight.jsx
    │   │   ├── Leaderboard.jsx
    │   │   ├── Unauthorized.jsx
    │   │   └── FearDetector.jsx
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Layout.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── auth/
    │   │   └── AuthContext.jsx
    │   ├── lib/
    │   │   ├── apollo.js
    │   │   ├── api.js
    │   │   ├── fnafFx.jsx
    │   │   └── menuAssets.js
    │   └── __tests__/
    │       ├── AuthFlow.test.jsx
    │       └── Navbar.test.jsx
    ├── pages/                        Remaining standalone HTML pages
    │   ├── MainRoom.html             Core gameplay scene
    │   └── CustomNight.html          Custom night config screen (legacy)
    ├── engine/                       Game logic (vanilla JS)
    │   ├── gameState.js              Time, power, stat tracking, score submission
    │   ├── jumpscare.js
    │   └── animatronics/
    │       ├── Animatronic.js        Base class
    │       ├── Freddy.js
    │       ├── Bonnie.js
    │       ├── Chica.js
    │       └── Foxy.js
    ├── camera/
    │   └── minimap.js
    ├── data/
    │   ├── animations.js
    │   └── rooms.js
    ├── constants/
    │   └── nightConfig.js
    └── hooks/
        └── useJumpscareCapture.jsx
```

---

## Getting started

### Prerequisites

- Node.js ≥ 18
- MongoDB running locally on `mongodb://localhost:27017/fnaf`
- A [Resend](https://resend.com) API key with a verified sending domain
- Game assets folder (`Assets/`) — not included, must be sourced separately and placed at the project root

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

# Frontend (Vite — must be prefixed VITE_)
VITE_API_URL=http://localhost:3002
VITE_GRAPHQL_URL=http://localhost:3002/graphql
```

### Run

```bash
# Terminal 1 — backend
npm run dev:server

# Terminal 2 — frontend
npm run dev
```

Open `http://localhost:5173`, register an account, then go to `/play` to start your shift.

### Test

```bash
npm test
```

5 test files · 12 tests · MongoDB and Resend are mocked, no live services needed.

### Build

```bash
npm run build
```

---

## GraphQL API

**Queries**
```graphql
me: User
leaderboard(night: Int, limit: Int): [Score!]!
myScores: [Score!]!
```

**Mutations**
```graphql
updateProgress(night: Int!): User!
resetProgress: User!
submitScore(
  night: Int!, survivedSeconds: Int!, outcome: Outcome!,
  cameraFlicks: Int, doorCloses: Int, powerRemaining: Float,
  isCustomNight: Boolean,
  aiFreddy: Int, aiBonnie: Int, aiChica: Int, aiFoxy: Int
): Score!
```

All mutations require an authenticated session cookie. `submitScore` is called automatically by the game engine at the end of each night.

---

## Controls

| Action | Input |
|---|---|
| Look left / right | Click and drag the scene |
| Toggle door | Upper half of door button |
| Toggle hallway light | Lower half of door button |
| Open / close tablet | Move mouse to bottom edge |
| Select camera | Click a room tile on the minimap |

Headphones recommended. Designed for a 16:9 viewport.

---

## Assets

All game assets (sprites, audio files, character models, and fonts) are the intellectual property of **Scott Cawthon / Steel Wool Studios** and are protected by copyright. They are **not included in this repository** and never will be.

### Why they were removed

The `Assets/` folder was originally committed to this repo. It has since been fully purged from the git history using `git filter-repo` and is now listed in `.gitignore`. The public repository contains only original source code.

### How to run the project locally

To run the game you need to supply the assets yourself — for example by extracting them from a legitimate copy of the game — and place the resulting `Assets/` folder at the project root. The expected structure is:

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

This is an unofficial fan recreation made for educational purposes only, not affiliated with or endorsed by Scott Cawthon or Steel Wool Studios. All original artwork, audio, and characters remain the property of their respective owners. This project is non-commercial and no assets are distributed with this repository.

---

<div align="center">

![End screen](readme-assets/end-screen.png)

</div>
