# 🧸Five Nights at Freddy's — Web Edition

> *"Hello? Hello, hello? Uh, I wanted to record a message for you to help you get settled in on your first night..."*

---

```
██████╗ ███╗   ██╗ █████╗ ███████╗
██╔════╝████╗  ██║██╔══██╗██╔════╝
█████╗  ██╔██╗ ██║███████║█████╗  
██╔══╝  ██║╚██╗██║██╔══██║██╔══╝  
██║     ██║ ╚████║██║  ██║██║     
╚═╝     ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     
```

**A full-stack web recreation of Five Nights at Freddy's 1 — built with pure HTML, CSS, and JavaScript.**

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Animatronics](#-animatronics)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Controls](#%EF%B8%8F-controls)
- [Game Mechanics](#-game-mechanics)
- [Tech Stack](#-tech-stack)

---

## 🏚️ About

You've just been hired as the new **night security guard** at Freddy Fazbear's Pizza. Your shift runs from **12 AM to 6 AM** — six long hours in a dark office, surrounded by animatronic animals that come to life after closing time.

Use the security cameras, manage your power supply, and keep the doors and lights under control. **Don't let them in.**

> ⚠️ *The animatronics are programmed to roam the facility at night. Management has advised that this is completely normal behavior.*

---

## ✨ Features

- 🎥 **Live security camera system** with a full minimap and room selector
- 🚪 **Animated door controls** with authentic open/close animations
- 💡 **Flickering hallway lights** to check the doors before closing them
- 🔋 **Power management system** — every action drains power; run out and face the consequences
- 🕐 **Time progression** from 12 AM to 6 AM across multiple nights (Nights 1–6)
- 📺 **Tablet/camera overlay** with animated open/close transitions
- 🦊 **Foxy's Pirate Cove** — watch him, or he runs
- 💀 **Full jumpscare sequences** for all four animatronics + Golden Freddy
- 🔌 **Power-out sequence** with Freddy's haunting music box and eye flicker
- 🌅 **6 AM victory animation** with night progression

---

## 🐻 Animatronics

| Name | Starts At | Route | Threat |
|------|-----------|-------|--------|
| 🎩 **Freddy Fazbear** | Show Stage | Stage → Dining → Restrooms → Kitchen → East Hall → Corner | Enters via **right door**; immune to cameras when AI ≥ 10 |
| 🎸 **Bonnie** | Show Stage | Stage → Dining/Backstage → West Hall → Corner/Supply → Office | Attacks the **left door** |
| 🐣 **Chica** | Show Stage | Stage → Dining → Restrooms/Kitchen → East Hall → Corner → Office | Attacks the **right door** |
| 🏴‍☠️ **Foxy** | Pirate's Cove | Cove (4 stages) → West Hall sprint → Office | Attacks the **left door**; watching him slows progression |

> 💡 *Each animatronic has an AI level that scales with the night and the hour. The later it gets, the more aggressive they become.*

---

## 📁 Project Structure

```
FiveNightsAtFreddyFullStackWeb/
├── src/
│   ├── pages/
│   │   ├── Warning.html        — Launch screen
│   │   ├── Menu.html           — Main menu with animations
│   │   └── MainRoom.html       — Core gameplay scene
│   ├── engine/
│   │   ├── gameState.js        — Power, time, night logic
│   │   ├── jumpscare.js        — Jumpscare renderer
│   │   └── animatronics/
│   │       ├── Animatronic.js  — Base class + room helpers
│   │       ├── Freddy.js
│   │       ├── Bonnie.js
│   │       ├── Chica.js
│   │       └── Foxy.js
│   ├── camera/
│   │   └── minimap.js          — Camera minimap overlay
│   ├── data/
│   │   ├── animations.js       — All sprite/frame definitions
│   │   └── rooms.js            — Room graph + camera system
│   └── constants/
│       └── nightConfig.js      — AI levels, timing, intervals
└── assets/                     — Sprites, audio, fonts
```

---

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sebastian0211-vs/FiveNightsAtFreddyFullStackWeb.git
   cd FiveNightsAtFreddyFullStackWeb
   ```

2. **Install dependencies** *(optional — only needed for Three.js tooling)*
   ```bash
   npm install
   ```

3. **Serve the project** — open with a local HTTP server (required for audio and asset loading)
   ```bash
   # Using Python
   python -m http.server 8080

   # Using Node / npx
   npx serve .
   ```

4. **Open in browser**
   ```
   http://localhost:8080/src/pages/Warning.html
   ```

> 🎧 **Headphones strongly recommended.** Press **F11** for fullscreen.

---

## 🕹️ Controls

| Action | Input |
|--------|-------|
| Look left / right | **Click & drag** the scene |
| Toggle door | Click the **top half** of a door button |
| Toggle light | Click the **bottom half** of a door button |
| Open / close tablet | Move mouse to **bottom edge** of screen |
| Select camera | Click a **room tile** on the minimap |
| Toggle animatronic info | Press **M** |
| Debug jumpscare | Press **J** *(dev mode)* |

---

## ⚙️ Game Mechanics

### 🔋 Power
Power drains every second based on your current **usage level** (1–5):

| Active Item | Usage |
|-------------|-------|
| Base (always) | +1 |
| Left door closed | +1 |
| Right door closed | +1 |
| Left light on | +1 |
| Right light on | +1 |
| Tablet open | +1 |

When power hits **0%**, the lights go out, Freddy's music box plays, and you have roughly 20 seconds before he pays you a visit.

### 🕐 Night Progression
Each night lasts **535 seconds** (≈ 8.9 minutes). The clock runs from **12 AM → 6 AM** across 6 hours. Survive all 6 nights to complete the game.

### 🤖 AI System
Every animatronic has a **base AI level** (0–20) that increases with the night. A random roll each movement tick determines whether they move. Higher AI = more frequent, more aggressive behavior.

---

## 🛠️ Tech Stack

- **Vanilla JavaScript** — no frameworks, no build tools required
- **HTML5 Canvas** — all game rendering including jumpscares and 6AM animation
- **CSS3** — HUD layout, transitions, and overlays
- **Web Audio API** — spatial audio, looping ambience, SFX layering
- **Three.js** *(dependency)* — available for future 3D features

---

## 👾 Credits

Fan-made recreation inspired by the original **Five Nights at Freddy's** by Scott Cawthon.  
All original assets and audio belong to their respective owners.

---

*"Good luck."*

```
[ CAMERA OFFLINE ]
```
