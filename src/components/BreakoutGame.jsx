import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Trophy, 
  ArrowLeft, Heart, Zap, Shield, Sparkles
} from 'lucide-react';
import { soundFX } from '../utils/soundFX';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const INITIAL_PADDLE_WIDTH = 105;
const PADDLE_HEIGHT = 14;
const BALL_RADIUS = 7;
const INITIAL_BALL_SPEED = 3.5;
const MAX_BALL_SPEED = 10;
const BRICK_ROWS = 5;
const BRICK_COLS = 9;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 8;
const BRICK_OFFSET_TOP = 50;
const BRICK_OFFSET_LEFT = 35;

export default function BreakoutGame({ onBackToHub, onSaveScore }) {
  // Game state
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'paused' | 'gameover' | 'levelcomplete'
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playerName, setPlayerName] = useState('Player 1');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  // Canvas & Physics Refs
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const keysPressed = useRef({});

  // Engine Physics State in Ref for 60FPS precision
  const engineState = useRef({
    paddleX: CANVAS_WIDTH / 2 - INITIAL_PADDLE_WIDTH / 2,
    paddleWidth: INITIAL_PADDLE_WIDTH,
    paddleSpeed: 9,
    balls: [{ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 35, vx: 0, vy: 0, attached: true }],
    bricks: [],
    particles: [],
    powerUps: [], // { x, y, type, radius }
    lasers: [], // { x, y, vy }
    hasLaserCapability: false,
    laserTimer: 0,
    stickyPaddle: false,
  });

  const handleToggleMute = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  // Build Bricks for current level
  const createBricksForLevel = (lvl) => {
    const bricks = [];
    const brickWidth = (CANVAS_WIDTH - BRICK_OFFSET_LEFT * 2 - (BRICK_COLS - 1) * BRICK_PADDING) / BRICK_COLS;

    for (let c = 0; c < BRICK_COLS; c++) {
      for (let r = 0; r < BRICK_ROWS; r++) {
        const x = BRICK_OFFSET_LEFT + c * (brickWidth + BRICK_PADDING);
        const y = BRICK_OFFSET_TOP + r * (BRICK_HEIGHT + BRICK_PADDING);

        let hits = 1;
        let color = '#06b6d4'; // Cyan
        let points = 10;

        if (r === 0) {
          hits = lvl >= 2 ? 3 : 2;
          color = '#f43f5e'; // Pink/Red
          points = 50;
        } else if (r === 1) {
          hits = lvl >= 2 ? 2 : 1;
          color = '#f97316'; // Orange
          points = 30;
        } else if (r === 2) {
          hits = 1;
          color = '#eab308'; // Yellow
          points = 20;
        } else if (r === 3) {
          hits = 1;
          color = '#10b981'; // Green
          points = 15;
        }

        // Level 2 & 3 special bricks layout
        if (lvl === 2 && (c + r) % 2 === 0) {
          hits += 1;
        }

        if (lvl >= 3 && (r === 2 && (c === 2 || c === 6))) {
          // Metal brick (unbreakable until level finish)
          hits = 99;
          color = '#94a3b8';
          points = 0;
        }

        bricks.push({
          x,
          y,
          width: brickWidth,
          height: BRICK_HEIGHT,
          hits,
          maxHits: hits,
          color,
          points,
          alive: true
        });
      }
    }
    return bricks;
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyW'].includes(e.code)) {
        if (gameState === 'playing' || gameState === 'paused') {
          e.preventDefault();
        }
      }

      keysPressed.current[e.code] = true;

      // Space to launch ball or shoot lasers
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        const engine = engineState.current;
        
        // Launch attached balls
        engine.balls.forEach(b => {
          if (b.attached) {
            b.attached = false;
            b.vx = (Math.random() > 0.5 ? 1 : -1) * (INITIAL_BALL_SPEED * 0.7);
            b.vy = -INITIAL_BALL_SPEED;
          }
        });

        // Shoot laser if capability active
        if (engine.hasLaserCapability && gameState === 'playing') {
          soundFX.playLaser();
          engine.lasers.push({
            x: engine.paddleX + 15,
            y: CANVAS_HEIGHT - PADDLE_HEIGHT - 10,
            vy: -10
          });
          engine.lasers.push({
            x: engine.paddleX + engine.paddleWidth - 15,
            y: CANVAS_HEIGHT - PADDLE_HEIGHT - 10,
            vy: -10
          });
        }
      }

      if (e.code === 'KeyP' && (gameState === 'playing' || gameState === 'paused')) {
        setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
      }
    };

    const handleKeyUp = (e) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Start new game
  const startGame = () => {
    const engine = engineState.current;
    engine.paddleWidth = INITIAL_PADDLE_WIDTH;
    engine.paddleX = CANVAS_WIDTH / 2 - INITIAL_PADDLE_WIDTH / 2;
    engine.balls = [{ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 35, vx: 0, vy: 0, attached: true }];
    engine.bricks = createBricksForLevel(1);
    engine.particles = [];
    engine.powerUps = [];
    engine.lasers = [];
    engine.hasLaserCapability = false;
    engine.laserTimer = 0;

    setScore(0);
    setLives(3);
    setLevel(1);
    setScoreSubmitted(false);
    setGameState('playing');
  };

  // Add Particle Explosion
  const addParticles = (x, y, color, count = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 5;
      engineState.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
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

    const updateAndDraw = () => {
      const engine = engineState.current;

      // 1. Paddle Movement
      if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) {
        engine.paddleX = Math.max(0, engine.paddleX - engine.paddleSpeed);
      }
      if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) {
        engine.paddleX = Math.min(CANVAS_WIDTH - engine.paddleWidth, engine.paddleX + engine.paddleSpeed);
      }

      // Laser timer decay
      if (engine.laserTimer > 0) {
        engine.laserTimer--;
        if (engine.laserTimer <= 0) {
          engine.hasLaserCapability = false;
        }
      }

      // 2. Lasers Movement & Collision
      for (let i = engine.lasers.length - 1; i >= 0; i--) {
        const l = engine.lasers[i];
        l.y += l.vy;

        if (l.y < 0) {
          engine.lasers.splice(i, 1);
          continue;
        }

        // Check laser collision with bricks
        let laserDestroyed = false;
        for (let b of engine.bricks) {
          if (!b.alive) continue;
          if (
            l.x >= b.x &&
            l.x <= b.x + b.width &&
            l.y >= b.y &&
            l.y <= b.y + b.height
          ) {
            laserDestroyed = true;
            if (b.hits !== 99) { // Not metal
              b.hits--;
              addParticles(l.x, l.y, b.color, 6);
              if (b.hits <= 0) {
                b.alive = false;
                soundFX.playBrickBreak();
                setScore(s => s + b.points);
              }
            }
            break;
          }
        }

        if (laserDestroyed) {
          engine.lasers.splice(i, 1);
        }
      }

      // 3. Power-Ups Movement & Catching
      for (let i = engine.powerUps.length - 1; i >= 0; i--) {
        const p = engine.powerUps[i];
        p.y += 2.5;

        // Catch power-up with paddle
        if (
          p.y + p.radius >= CANVAS_HEIGHT - PADDLE_HEIGHT &&
          p.x >= engine.paddleX &&
          p.x <= engine.paddleX + engine.paddleWidth
        ) {
          soundFX.playPowerUp();
          addParticles(p.x, p.y, '#f59e0b', 12);

          if (p.type === 'extend') {
            engine.paddleWidth = Math.min(180, engine.paddleWidth + 30);
          } else if (p.type === 'laser') {
            engine.hasLaserCapability = true;
            engine.laserTimer = 400;
          } else if (p.type === 'multiball') {
            const b = engine.balls[0] || { x: engine.paddleX + 30, y: CANVAS_HEIGHT - 35 };
            engine.balls.push({ x: b.x, y: b.y, vx: -4, vy: -5, attached: false });
            engine.balls.push({ x: b.x, y: b.y, vx: 4, vy: -5, attached: false });
          } else if (p.type === 'life') {
            setLives(l => l + 1);
          }

          engine.powerUps.splice(i, 1);
          continue;
        }

        if (p.y > CANVAS_HEIGHT) {
          engine.powerUps.splice(i, 1);
        }
      }

      // 4. Balls Physics & Collision
      let activeBallsCount = 0;

      for (let b of engine.balls) {
        if (b.attached) {
          b.x = engine.paddleX + engine.paddleWidth / 2;
          b.y = CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 2;
          activeBallsCount++;
          continue;
        }

        // Move ball
        b.x += b.vx;
        b.y += b.vy;

        // Wall collisions
        if (b.x - BALL_RADIUS <= 0) {
          b.x = BALL_RADIUS;
          b.vx = -b.vx;
          soundFX.playWallHit();
        } else if (b.x + BALL_RADIUS >= CANVAS_WIDTH) {
          b.x = CANVAS_WIDTH - BALL_RADIUS;
          b.vx = -b.vx;
          soundFX.playWallHit();
        }

        if (b.y - BALL_RADIUS <= 0) {
          b.y = BALL_RADIUS;
          b.vy = -b.vy;
          soundFX.playWallHit();
        }

        // Paddle Collision
        if (
          b.vy > 0 &&
          b.y + BALL_RADIUS >= CANVAS_HEIGHT - PADDLE_HEIGHT &&
          b.x >= engine.paddleX - 5 &&
          b.x <= engine.paddleX + engine.paddleWidth + 5
        ) {
          b.y = CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS;

          // Bounce angle depends on where on the paddle the ball lands
          const hitPos = (b.x - (engine.paddleX + engine.paddleWidth / 2)) / (engine.paddleWidth / 2);
          const bounceAngle = hitPos * (Math.PI / 3); // Max 60 deg angle
          const currentSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);

          // Gradually increase speed as the game progresses
          const newSpeed = Math.min(MAX_BALL_SPEED, currentSpeed + 0.18);

          b.vx = newSpeed * Math.sin(bounceAngle);
          b.vy = -newSpeed * Math.cos(bounceAngle);

          soundFX.playPaddleHit();
          addParticles(b.x, CANVAS_HEIGHT - PADDLE_HEIGHT, '#06b6d4', 6);
        }

        // Brick Collision
        for (let brick of engine.bricks) {
          if (!brick.alive) continue;

          if (
            b.x + BALL_RADIUS >= brick.x &&
            b.x - BALL_RADIUS <= brick.x + brick.width &&
            b.y + BALL_RADIUS >= brick.y &&
            b.y - BALL_RADIUS <= brick.y + brick.height
          ) {
            // Reflect ball
            b.vy = -b.vy;

            // Slight speedup on brick hit
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            const nextSpeed = Math.min(MAX_BALL_SPEED, speed + 0.05);
            if (speed > 0) {
              b.vx = (b.vx / speed) * nextSpeed;
              b.vy = (b.vy / speed) * nextSpeed;
            }

            if (brick.hits !== 99) { // Destroyable
              brick.hits--;
              addParticles(b.x, b.y, brick.color, 12);

              if (brick.hits <= 0) {
                brick.alive = false;
                soundFX.playBrickBreak();
                setScore(s => s + brick.points);

                // Spawn Power-Up chance (~15%)
                if (Math.random() < 0.15) {
                  const types = ['extend', 'laser', 'multiball', 'life'];
                  const chosenType = types[Math.floor(Math.random() * types.length)];
                  engine.powerUps.push({
                    x: brick.x + brick.width / 2,
                    y: brick.y + brick.height / 2,
                    type: chosenType,
                    radius: 12
                  });
                }
              } else {
                soundFX.playWallHit();
              }
            } else {
              soundFX.playWallHit();
            }

            break; // Handle one brick hit per frame
          }
        }

        if (b.y <= CANVAS_HEIGHT) {
          activeBallsCount++;
        }
      }

      // Check Ball Lost below screen
      if (activeBallsCount === 0) {
        soundFX.playLifeLost();
        setLives(l => {
          const nextLives = l - 1;
          if (nextLives <= 0) {
            soundFX.playGameOver(false);
            setWinner(`Game Over! Final Score: ${score}`);
            setGameState('gameover');
          } else {
            // Reset ball onto paddle
            engine.balls = [{
              x: engine.paddleX + engine.paddleWidth / 2,
              y: CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 2,
              vx: 0,
              vy: 0,
              attached: true
            }];
          }
          return nextLives;
        });
      }

      // Check Level Clear condition (All destroyable bricks gone)
      const remainingBreakableBricks = engine.bricks.filter(b => b.alive && b.hits !== 99).length;
      if (remainingBreakableBricks === 0 && engine.bricks.length > 0) {
        soundFX.playGameOver(true);
        confetti({ particleCount: 80, spread: 60 });

        if (level >= 3) {
          setWinner(`VICTORY! All Levels Cleared!`);
          setGameState('gameover');
        } else {
          setGameState('levelcomplete');
        }
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Dark background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Render Particles
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

      // Render Bricks
      for (let brick of engine.bricks) {
        if (!brick.alive) continue;

        ctx.save();
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = brick.hits === 99 ? 0 : 8;
        ctx.fillStyle = brick.color;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
        ctx.fill();

        // Overlay line for multi-hit indicator
        if (brick.hits > 1 && brick.hits !== 99) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Render Power-Ups
      for (let p of engine.powerUps) {
        ctx.save();
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.fillStyle = p.type === 'extend' ? '#10b981' : 
                        p.type === 'laser' ? '#f43f5e' : 
                        p.type === 'multiball' ? '#ec4899' : '#eab308';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = p.type === 'extend' ? '⇕' : 
                      p.type === 'laser' ? '🔫' : 
                      p.type === 'multiball' ? '3x' : '❤️';
        ctx.fillText(label, p.x, p.y);
        ctx.restore();
      }

      // Render Lasers
      ctx.fillStyle = '#f43f5e';
      for (let l of engine.lasers) {
        ctx.fillRect(l.x - 2, l.y, 4, 12);
      }

      // Render Paddle
      ctx.save();
      ctx.shadowColor = engine.hasLaserCapability ? '#f43f5e' : '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.fillStyle = engine.hasLaserCapability ? '#f43f5e' : '#06b6d4';
      ctx.beginPath();
      ctx.roundRect(engine.paddleX, CANVAS_HEIGHT - PADDLE_HEIGHT, engine.paddleWidth, PADDLE_HEIGHT, 6);
      ctx.fill();
      ctx.restore();

      // Render Balls
      for (let b of engine.balls) {
        if (b.y > CANVAS_HEIGHT) continue;
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    };

    animationFrameRef.current = requestAnimationFrame(updateAndDraw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, level, score]);

  const [winner, setWinner] = useState('');

  // Next level handler
  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    
    const engine = engineState.current;
    engine.balls = [{
      x: engine.paddleX + engine.paddleWidth / 2,
      y: CANVAS_HEIGHT - PADDLE_HEIGHT - BALL_RADIUS - 2,
      vx: 0,
      vy: 0,
      attached: true
    }];
    engine.bricks = createBricksForLevel(nextLvl);
    engine.powerUps = [];
    engine.lasers = [];

    setGameState('playing');
  };

  const handleSubmitScore = () => {
    if (!scoreSubmitted && onSaveScore) {
      onSaveScore({
        playerName: playerName || 'Player 1',
        game: 'Breakout',
        score: score,
        mode: `Level ${level}`,
        date: new Date().toISOString()
      });
      setScoreSubmitted(true);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (gameState !== 'playing') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaleX = CANVAS_WIDTH / rect.width;
    const canvasX = mouseX * scaleX;

    engineState.current.paddleX = Math.max(
      0, 
      Math.min(CANVAS_WIDTH - engineState.current.paddleWidth, canvasX - engineState.current.paddleWidth / 2)
    );
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

        <div className="flex items-center gap-6 font-mono font-bold text-lg">
          <div className="text-cyan-400">Score: {score}</div>
          <div className="text-purple-400">Level: {level}</div>
          <div className="flex gap-1 text-red-500">
            {Array.from({ length: lives }).map((_, i) => (
              <Heart key={i} className="w-5 h-5 fill-current" />
            ))}
          </div>
        </div>

        <button
          onClick={handleToggleMute}
          className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
        </button>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-purple-950/40 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleCanvasMouseMove}
          className="block touch-none cursor-pointer"
        />

        {/* Menu Overlay */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <Sparkles className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
            <h1 className="text-4xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 neon-title mb-2">
              BREAKOUT BRICK BUSTER
            </h1>
            <p className="text-slate-400 text-sm mb-6 max-w-md">
              Smash brick layers, catch lasers, extra balls, and paddle extensions using Left/Right arrows or mouse movement!
            </p>

            <div className="mb-6 w-full max-w-xs text-left">
              <label className="text-slate-400 text-xs mb-1 block font-semibold">Player Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value || 'Player 1')}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-400 hover:to-pink-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/30 text-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" /> START GAME
            </button>
          </div>
        )}

        {/* Level Complete Overlay */}
        {gameState === 'levelcomplete' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <Trophy className="w-12 h-12 text-yellow-400 mb-2 animate-bounce" />
            <h2 className="text-3xl font-extrabold text-white mb-2">LEVEL {level} CLEARED!</h2>
            <p className="text-slate-400 mb-6 font-mono text-sm">Score so far: {score}</p>
            <button
              onClick={handleNextLevel}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-lg transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" /> NEXT LEVEL
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-3xl font-extrabold text-white mb-2">{winner}</h2>
            <p className="text-slate-400 mb-6 font-mono">Final Score: {score}</p>

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

      {/* Control Instructions */}
      <div className="w-full max-w-[800px] mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div>
          <strong className="text-amber-400">Controls:</strong> Left / Right Arrow or A / D keys (or Mouse Movement). <strong className="text-cyan-400">Space:</strong> Launch Ball / Fire Laser.
        </div>
        <div>
          <strong className="text-purple-400">P key:</strong> Pause Game
        </div>
      </div>
    </div>
  );
}
