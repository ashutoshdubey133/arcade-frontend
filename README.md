# 🕹️ Neon Arcade - Frontend Web Application (React + Vite)

> 🤖 **NOTE FOR AI AGENTS**:
> Please refer to [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) for full architectural specs. Whenever you make code modifications in this repository, **you MUST update `PROJECT_CONTEXT.md` and this `README.md`** to keep documentation completely up to date.

A modern, responsive retro-arcade web application featuring lightweight browser games, Web Audio API synthesizer sound effects, desktop sidebars, and full mobile touch controls.

---

## 🎮 Included Games
1. **⌨️ Sky Letters: Type Defense** [FEATURED GAME 🌟] – Parallax mountain landscape aesthetic, laser cannon defense, **wave-based defense progression**, word-length balanced fall speed, 7-combo Hyper Fever Mode (3x score), floating score text, strict typing mode, and native phone soft keyboard auto-focus.
2. **🏓 Ping Pong Arcade** – Single Player AI (Easy, Medium, Hard, Impossible) & Local 2P VS Mode with Arcade Power-Ups, canvas touch drag, and D-Pad.
3. **🧱 Breakout Brick Buster** – Dynamic ball speed acceleration, laser cannons, multi-ball drops, 3 challenge levels, and touch D-Pad.
4. **💣 Minesweeper Retro** – Easy (`8x8`), Medium (`12x12`), Hard (`16x16`), 5-step interactive Guided Tutorial mode, and 350ms touch long-press flagging.

---

## 🛠️ Tech Stack
* **Framework**: React 19 + Vite
* **Styling**: TailwindCSS v4, Lucide React Icons
* **Audio**: Web Audio API Procedural Synthesizer (`soundFX.js`)
* **Effects**: Canvas 2D, Particle Physics, Canvas Confetti

---

## 💻 Local Setup (Without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

* App will run on **`http://localhost:5173`**.

---

## 🐳 Docker Deployment

### **Build & Run Image (Passing Backend API URL)**
```bash
# Build Docker image with custom API URL
docker build --build-arg VITE_API_URL=http://localhost:8080/api -t arcade-frontend .

# Run container on port 3000
docker run -p 3000:80 arcade-frontend
```

### **Run with Docker Compose**
```bash
docker compose up --build
```

---

## 🌐 Free Cloud Deployment (Vercel / Render)

### **Deploy to Vercel (Recommended)**
1. Push this folder to a GitHub repository.
2. Sign up on [Vercel.com](https://vercel.com) (No credit card required).
3. Import your repository and add an Environment Variable:
   * **Key**: `VITE_API_URL`
   * **Value**: `https://your-backend-api.onrender.com/api`
4. Click **Deploy**.
