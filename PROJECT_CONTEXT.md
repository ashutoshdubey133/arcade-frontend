# 🤖 FRONTEND PROJECT_CONTEXT.md — Agent Specification

> **MANDATORY AI AGENT INSTRUCTION**:
> 1. Whenever an AI agent modifies code in `frontend/`, **THE AGENT MUST IMMEDIATELY UPDATE THIS `PROJECT_CONTEXT.md` AND `README.md`** so future AI sessions remain 100% synchronized with the project state.
> 2. **ALWAYS COMMIT AND PUSH**: At the end of every task execution, the agent MUST automatically stage, commit, and push all frontend changes to origin main (`git add . && git commit -m "..." && git push origin main`).

---

## 📌 Frontend Architecture Map
* **Framework**: React 19 + Vite (`base: './'`)
* **Styling**: TailwindCSS v4 + Lucide React Icons
* **Analytics**: `@vercel/speed-insights` & `@vercel/analytics`

---

## 🎮 Game Components Overview

1. **`TypingGame.jsx` (Sky Letters: Type Defense)** [FEATURED GAME 🌟]:
   * Aesthetic mountain parallax landscape with glowing moon, twinkling stars, and laser cannon.
   * **Wave Defense Progression**: Escalating waves, word-length balanced speed scaling (longer words fall slower), 7-combo Hyper Fever Mode (3x score), floating score text, and wave clear shield repairs (+15 HP).
   * **Strict Typing Only**: Direct meteor tap/click is disabled.
   * **Native Mobile Soft Keyboard**: Automatically focuses phone keyboard with `TAP TO OPEN PHONE KEYBOARD 📱` helper trigger.

2. **`PingPongGame.jsx`**:
   * Canvas 2D engine with AI (Easy, Medium, Hard, Impossible) and Local 2-Player modes.
   * Floating Arcade Power-ups (Speed, Extend, Freeze, Multi-ball).
   * Touch drag & on-screen D-Pad controls for mobile screens.

3. **`BreakoutGame.jsx`**:
   * Dynamic ball speed physics (starts at gentle `3.5` and accelerates on bounces/brick hits up to `10.0`).
   * Power-ups (Paddle Extend, Laser Blaster, Multi-Ball, Extra Life).
   * On-screen touch D-Pad and `🚀 LAUNCH/LASER` touch button.

4. **`MinesweeperGame.jsx`**:
   * Easy (`8x8`), Medium (`12x12`), Hard (`16x16`).
   * 5-Step Interactive Guided Tutorial Mode with a 4x4 practice grid.
   * Long-press touch hold (350ms) to flag cells and `Flag Mode: ON/OFF` toggle button.

---

## 🔊 Audio & API Utilities
* **`utils/soundFX.js`**: Web Audio API procedural synthesizer for zero-latency retro sound effects.
* **`utils/leaderboardApi.js`**: Fetches from Node.js Express API (`import.meta.env.VITE_API_URL` or `https://arcade-backend-gtgl.onrender.com/api`) with automatic LocalStorage fallback.

---

## 🛠️ Build & Verification
```bash
npm run build
```
Generates production build in `dist/`.
