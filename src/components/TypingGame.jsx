import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, Heart, RotateCcw, Volume2, VolumeX, Trophy, 
  Flame, Shield, Zap, Sparkles, Play, Keyboard, Activity
} from 'lucide-react';
import { soundFX } from '../utils/soundFX';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

// Dictionary pools by word length
const WORD_POOLS = {
  1: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
  2: ['GO','HI','ON','UP','NO','MY','BE','WE','AM','DO','ME','IT','SO','IN','AT','TO','HE','IS','OR','IF'],
  3: ['SKY','SUN','RUN','FLY','RED','ICE','JET','TOP','WIN','BOX','GEM','ACE','FOX','KEY','RAY','ZIP'],
  4: ['NEON','PONG','ROCK','FIRE','MINT','STAR','MOON','GLOW','DARK','ZERO','FAST','WAVE','CITY','BOLD','JUMP','CODE'],
  5: ['SPEED','PULSE','LASER','LIGHT','SHIELD','CYBER','ARCADE','MATRIX','PLANET','ORBIT','FUTURE','VALLEY','COMET'],
  6: ['GALAXY','ROCKET','SHADOW','SHINE','ACTION','DRAGON','HEROES','METEOR','ENERGY','PLAYER'],
  7: ['DEFENSE','PHANTOM','INFINITY','THUNDER','CRYSTAL','SPECTRA','TACTICAL']
};

// Procedural Level Generator
const getProceduralLevelConfig = (lvl) => {
  const levelNumber = Math.max(1, lvl);
  let wordLength = 1;
  if (levelNumber === 2) wordLength = 2;
  else if (levelNumber === 3) wordLength = 3;
  else if (levelNumber >= 4 && levelNumber <= 6) wordLength = 4;
  else if (levelNumber >= 7 && levelNumber <= 10) wordLength = 5;
  else if (levelNumber >= 11 && levelNumber <= 15) wordLength = 6;
  else if (levelNumber >= 16) wordLength = 7;

  const pool = WORD_POOLS[wordLength] || WORD_POOLS[5];
  const fallSpeed = Math.min(4.5, 0.9 + (levelNumber * 0.15));
  const spawnInterval = Math.max(500, 1500 - (levelNumber * 45));
  const wordsToClear = 12 + (levelNumber * 3);

  return {
    level: levelNumber,
    title: `Level ${levelNumber}: Sky Wave`,
    wordsToClear,
    fallSpeed,
    spawnInterval,
    pool
  };
};

export default function TypingGame({ onBackToHub, onSaveScore }) {
  // Game state
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'paused' | 'gameover' | 'levelcomplete'
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [levelNumber, setLevelNumber] = useState(1);
  const [combo, setCombo] = useState(0);
  const [clearedCount, setClearedCount] = useState(0);
  const [totalTyped, setTypedTotal] = useState(0);
  const [correctTyped, setCorrectTyped] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playerName, setPlayerName] = useState('Player 1');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const canvasRef = useRef(null);
  const mobileInputRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastSpawnTime = useRef(0);

  // Focus native mobile keyboard on touch / click
  const focusMobileKeyboard = () => {
    if (gameState === 'playing' && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  };

  // Auto-focus mobile keyboard when game starts
  useEffect(() => {
    if (gameState === 'playing') {
      setTimeout(() => {
        if (mobileInputRef.current) {
          mobileInputRef.current.focus();
        }
      }, 100);
    }
  }, [gameState]);

  // Handle native mobile keyboard input
  const handleMobileInputChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const lastChar = val.slice(-1).toUpperCase();
    if (/^[A-Z]$/.test(lastChar)) {
      processKeyPress(lastChar);
    }
    e.target.value = '';
  };

  // Engine State stored in Ref for 60FPS precision
  const engineState = useRef({
    meteors: [], // { id, x, y, text, typedIndex, speed, color }
    lasers: [], // { x1, y1, x2, y2, color, alpha }
    particles: [],
    stars: [],
    screenShake: 0,
    activeTargetId: null,
  });

  const handleToggleMute = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  // Generate aesthetic mountain landscape stars once
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (CANVAS_HEIGHT * 0.6),
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: 0.02 + Math.random() * 0.03
      });
    }
    engineState.current.stars = stars;
  }, []);

  // Core Key Processing Logic (used by Keyboard, Touch Screen, and On-Screen Keyboard)
  const processKeyPress = (typedChar) => {
    if (gameState !== 'playing') return;

    setTypedTotal(t => t + 1);

    const engine = engineState.current;
    let target = null;

    // 1. If currently targeting a meteor, continue typing that one
    if (engine.activeTargetId) {
      target = engine.meteors.find(m => m.id === engine.activeTargetId);
    }

    // 2. Otherwise find lowest meteor starting with typed character
    if (!target) {
      const matching = engine.meteors
        .filter(m => m.text[m.typedIndex] === typedChar)
        .sort((a, b) => b.y - a.y); // Lowest meteor on screen first

      if (matching.length > 0) {
        target = matching[0];
        engine.activeTargetId = target.id;
      }
    }

    // 3. Process key press against target
    if (target && target.text[target.typedIndex] === typedChar) {
      target.typedIndex++;
      setCorrectTyped(c => c + 1);
      soundFX.playTypePop();

      // Fire Laser beam from ground cannon (bottom center) to meteor
      engine.lasers.push({
        x1: CANVAS_WIDTH / 2,
        y1: CANVAS_HEIGHT - 20,
        x2: target.x,
        y2: target.y,
        color: '#38bdf8',
        alpha: 1.0
      });

      // If target completely typed!
      if (target.typedIndex >= target.text.length) {
        // Detonate meteor!
        addParticles(target.x, target.y, target.color, 16);
        soundFX.playPowerUp();

        // Remove meteor
        engine.meteors = engine.meteors.filter(m => m.id !== target.id);
        engine.activeTargetId = null;

        setCombo(c => {
          const nextCombo = c + 1;
          setScore(s => s + (target.text.length * 20) + (nextCombo * 5));
          return nextCombo;
        });

        setClearedCount(cnt => cnt + 1);
      }
    } else {
      // Missed key!
      soundFX.playTypeMiss();
      setCombo(0);
      engine.activeTargetId = null;
    }
  };

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      if (e.key.length !== 1) return; // Only process printable single keys

      const typedChar = e.key.toUpperCase();
      if (!/^[A-Z]$/.test(typedChar)) return;

      processKeyPress(typedChar);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Start / Restart Game
  const startGame = () => {
    setLevelNumber(1);
    setScore(0);
    setHealth(100);
    setCombo(0);
    setClearedCount(0);
    setTypedTotal(0);
    setCorrectTyped(0);
    setScoreSubmitted(false);

    const engine = engineState.current;
    engine.meteors = [];
    engine.lasers = [];
    engine.particles = [];
    engine.screenShake = 0;
    engine.activeTargetId = null;

    lastSpawnTime.current = Date.now();
    setGameState('playing');
  };

  // Next procedural level
  const handleNextLevel = () => {
    setLevelNumber(l => l + 1);
    setClearedCount(0);
    setHealth(h => Math.min(100, h + 25)); // Bonus +25 HP on level up!

    const engine = engineState.current;
    engine.meteors = [];
    engine.lasers = [];
    engine.particles = [];
    engine.activeTargetId = null;

    lastSpawnTime.current = Date.now();
    setGameState('playing');
  };

  // Add Explosion Particles
  const addParticles = (x, y, color, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 5;
      engineState.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        alpha: 1,
        color
      });
    }
  };

  // Main 60FPS Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const config = getProceduralLevelConfig(levelNumber);

    const updateAndDraw = () => {
      const engine = engineState.current;
      const now = Date.now();

      // 1. Spawn Meteors
      if (now - lastSpawnTime.current > config.spawnInterval) {
        lastSpawnTime.current = now;

        const randomWord = config.pool[Math.floor(Math.random() * config.pool.length)];
        const colors = ['#06b6d4', '#a855f7', '#f43f5e', '#f59e0b', '#10b981'];
        const chosenColor = colors[Math.floor(Math.random() * colors.length)];

        engine.meteors.push({
          id: Math.random().toString(),
          x: 60 + Math.random() * (CANVAS_WIDTH - 120),
          y: -20,
          text: randomWord,
          typedIndex: 0,
          speed: config.fallSpeed + (Math.random() * 0.3 - 0.15),
          color: chosenColor
        });
      }

      // 2. Move Meteors & Check Mountain Impact
      for (let i = engine.meteors.length - 1; i >= 0; i--) {
        const m = engine.meteors[i];
        m.y += m.speed;

        // Tail trail particles
        if (Math.random() < 0.3) {
          engine.particles.push({
            x: m.x + (Math.random() * 20 - 10),
            y: m.y - 10,
            vx: Math.random() * 0.8 - 0.4,
            vy: -1 - Math.random(),
            radius: 2,
            alpha: 0.6,
            color: m.color
          });
        }

        // Impact on Mountain Defense (Y >= 430)
        if (m.y >= CANVAS_HEIGHT - 70) {
          soundFX.playExplosion();
          addParticles(m.x, CANVAS_HEIGHT - 60, '#ef4444', 18);

          engine.screenShake = 12;
          if (engine.activeTargetId === m.id) {
            engine.activeTargetId = null;
          }

          engine.meteors.splice(i, 1);
          setCombo(0);

          setHealth(h => {
            const nextH = Math.max(0, h - 15);
            if (nextH <= 0) {
              soundFX.playGameOver(false);
              setGameState('gameover');
            }
            return nextH;
          });
        }
      }

      // Check Level Clear (Infinite Procedural Progression)
      if (clearedCount >= config.wordsToClear) {
        soundFX.playGameOver(true);
        confetti({ particleCount: 90, spread: 70 });
        setGameState('levelcomplete');
      }

      // 3. Render Canvas (With Parallax Mountains Aesthetic)
      ctx.save();

      // Screen Shake FX
      if (engine.screenShake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * engine.screenShake,
          (Math.random() - 0.5) * engine.screenShake
        );
        engine.screenShake *= 0.85;
      }

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // --- Sky Gradient ---
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGrad.addColorStop(0, '#0a0a1a');
      skyGrad.addColorStop(0.5, '#1e112a');
      skyGrad.addColorStop(1, '#2d123d');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // --- Twinkling Stars ---
      engine.stars.forEach(st => {
        st.alpha += st.twinkleSpeed;
        if (st.alpha > 1 || st.alpha < 0.2) st.twinkleSpeed = -st.twinkleSpeed;

        ctx.save();
        ctx.globalAlpha = Math.max(0.1, st.alpha);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // --- Glowing Cosmic Moon ---
      ctx.save();
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 25;
      ctx.fillStyle = '#f3e8ff';
      ctx.beginPath();
      ctx.arc(680, 80, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- Layer 1: Distant Mountain Silhouettes ---
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT);
      ctx.lineTo(0, 320);
      ctx.lineTo(120, 240);
      ctx.lineTo(250, 340);
      ctx.lineTo(400, 220);
      ctx.lineTo(550, 330);
      ctx.lineTo(700, 210);
      ctx.lineTo(CANVAS_WIDTH, 310);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // --- Layer 2: Midground Sharp Mountains ---
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT);
      ctx.lineTo(0, 380);
      ctx.lineTo(180, 290);
      ctx.lineTo(320, 390);
      ctx.lineTo(480, 280);
      ctx.lineTo(620, 380);
      ctx.lineTo(CANVAS_WIDTH, 300);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // --- Layer 3: Foreground Defense Ridge & Laser Cannon ---
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT);
      ctx.lineTo(0, 440);
      ctx.lineTo(CANVAS_WIDTH, 440);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Laser Defense Base (Bottom Center)
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10, 24, Math.PI, 0, false);
      ctx.fill();
      ctx.restore();

      // --- Render Lasers ---
      for (let i = engine.lasers.length - 1; i >= 0; i--) {
        const l = engine.lasers[i];
        l.alpha -= 0.08;

        if (l.alpha <= 0) {
          engine.lasers.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = l.alpha;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 4;
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
        ctx.restore();
      }

      // --- Render Particles ---
      for (let i = engine.particles.length - 1; i >= 0; i--) {
        const pt = engine.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.03;

        if (pt.alpha <= 0) {
          engine.particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // --- Render Falling Meteors ---
      for (let m of engine.meteors) {
        ctx.save();

        const isTarget = engine.activeTargetId === m.id;

        // Glowing Pod
        ctx.shadowColor = isTarget ? '#22c55e' : m.color;
        ctx.shadowBlur = isTarget ? 20 : 12;
        ctx.fillStyle = isTarget ? '#052e16' : '#0f172a';
        ctx.strokeStyle = isTarget ? '#22c55e' : m.color;
        ctx.lineWidth = isTarget ? 3 : 2;

        const boxWidth = Math.max(48, m.text.length * 18 + 20);
        const boxHeight = 36;
        const boxX = m.x - boxWidth / 2;
        const boxY = m.y - boxHeight / 2;

        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
        ctx.fill();
        ctx.stroke();

        // Text formatting
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const typedPart = m.text.substring(0, m.typedIndex);
        const remainingPart = m.text.substring(m.typedIndex);

        const totalWidth = ctx.measureText(m.text).width;
        let startX = m.x - totalWidth / 2;

        // Render typed part (emerald green)
        if (typedPart) {
          ctx.fillStyle = '#4ade80';
          ctx.fillText(typedPart, startX, m.y);
          startX += ctx.measureText(typedPart).width;
        }

        // Render remaining part (white / cyan)
        if (remainingPart) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(remainingPart, startX, m.y);
        }

        ctx.restore();
      }

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    };

    animationFrameRef.current = requestAnimationFrame(updateAndDraw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, levelIdx, clearedCount]);

  const accuracy = totalTyped > 0 ? Math.round((correctTyped / totalTyped) * 100) : 100;
  const currentConfig = getProceduralLevelConfig(levelNumber);

  const handleSubmitScore = () => {
    if (!scoreSubmitted && onSaveScore) {
      onSaveScore({
        playerName: playerName || 'Player 1',
        game: 'Sky Letters',
        score: score,
        mode: `Level ${levelNumber} (${accuracy}% Acc)`,
        date: new Date().toISOString()
      });
      setScoreSubmitted(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4">
      {/* Top Controls Header */}
      <div className="w-full max-w-[800px] flex items-center justify-between mb-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800 backdrop-blur">
        <button
          onClick={onBackToHub}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Arcade Hub
        </button>

        <div className="flex items-center gap-6 font-mono font-bold text-sm">
          <div className="text-cyan-400">Score: {score}</div>
          <div className="text-purple-400">Cleared: {clearedCount}/{currentConfig.wordsToClear}</div>
          <div className="text-emerald-400">Acc: {accuracy}%</div>
          {combo > 1 && (
            <div className="text-amber-400 flex items-center gap-1 animate-bounce">
              <Flame className="w-4 h-4" /> {combo}x Combo
            </div>
          )}
        </div>

        <button
          onClick={handleToggleMute}
          className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
        </button>
      </div>

      {/* Main Viewport */}
      <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-950/40 bg-slate-950 w-full max-w-[800px] min-h-[420px] flex items-center justify-center">
        
        {/* Health Shield Bar Overlay */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur">
            <Shield className="w-4 h-4 text-cyan-400" />
            <div className="w-32 bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  health > 50 ? 'bg-emerald-500' : health > 25 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-slate-200">{health}%</span>
          </div>

          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono font-bold text-purple-400 backdrop-blur">
            {currentConfig.title}
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={focusMobileKeyboard}
          onTouchStart={focusMobileKeyboard}
          className="block w-full h-auto cursor-pointer"
        />

        {/* Hidden Input to summon Native Soft Keyboard on Phones */}
        <input
          ref={mobileInputRef}
          type="text"
          onChange={handleMobileInputChange}
          className="opacity-0 absolute top-0 left-0 w-1 h-1 pointer-events-none"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
        />

        {/* Start / Menu Overlay */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 text-center overflow-y-auto z-30">
            <div className="w-full max-w-sm mx-auto flex flex-col items-center">
              <Keyboard className="w-8 h-8 text-cyan-400 mb-1 animate-bounce" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 neon-title mb-1">
                SKY LETTERS: TYPE DEFENSE
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mb-4 max-w-md">
                Protect the mountain valley! Type keys or tap falling letter meteors.
              </p>

              <div className="mb-4 w-full text-left bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <label className="text-slate-400 text-xs mb-1 block font-semibold">Player Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value || 'Player 1')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              onClick={() => startGame(0)}
              className="w-full max-w-sm py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-cyan-500/30 text-base sm:text-lg transition-transform hover:scale-102 active:scale-95 flex items-center justify-center gap-2 my-1 shrink-0"
            >
              <Play className="w-5 h-5 fill-current" /> START DEFENSE
            </button>
          </div>
        )}

        {/* Level Complete Overlay */}
        {gameState === 'levelcomplete' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <Trophy className="w-12 h-12 text-yellow-400 mb-2 animate-bounce" />
            <h2 className="text-3xl font-extrabold text-white mb-1">LEVEL {levelNumber} CLEARED! 🎉</h2>
            <p className="text-emerald-400 font-bold text-xs mb-2">+25 Shield HP Bonus Restored!</p>
            <p className="text-slate-400 mb-6 font-mono text-sm">
              Current Score: {score} | Accuracy: {accuracy}%
            </p>
            <button
              onClick={handleNextLevel}
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:from-emerald-600 active:to-teal-500 text-slate-950 font-extrabold rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" /> CONTINUE TO LEVEL {levelNumber + 1} →
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <h2 className="text-3xl font-extrabold text-red-500 mb-1">
              💥 MOUNTAIN BASE DESTROYED
            </h2>
            <p className="text-slate-300 font-bold text-sm mb-1">
              Survived Up To Level {levelNumber}
            </p>
            <p className="text-slate-400 mb-6 font-mono text-xs">
              Final Score: {score} | Accuracy: {accuracy}%
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSubmitScore}
                disabled={scoreSubmitted}
                className={`px-6 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                  scoreSubmitted
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-500/20'
                }`}
              >
                {scoreSubmitted ? 'Score Saved ✓' : 'Save High Score'}
              </button>

              <button
                onClick={startGame}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Mobile Keyboard Trigger Helper Button */}
      {gameState === 'playing' && (
        <div className="w-full max-w-[800px] mt-3">
          <button
            onClick={focusMobileKeyboard}
            onTouchStart={(e) => { e.preventDefault(); focusMobileKeyboard(); }}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 text-white font-bold rounded-xl text-sm border border-purple-400/40 shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 select-none"
          >
            <Keyboard className="w-5 h-5 text-cyan-300" />
            TAP TO OPEN PHONE KEYBOARD 📱
          </button>
        </div>
      )}

      {/* Control Instructions */}
      <div className="w-full max-w-[800px] mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div>
          <strong className="text-cyan-400">Controls:</strong> Type the matching keys on your keyboard to shoot laser defense beams!
        </div>
        <div>
          <strong className="text-purple-400">Levels:</strong> Single Letters → Dual Combos → Cosmic Words → Hyper Storm
        </div>
      </div>
    </div>
  );
}
