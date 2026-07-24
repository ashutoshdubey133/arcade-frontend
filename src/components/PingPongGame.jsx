import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Trophy, 
  Settings, ArrowLeft, Zap, Users, User, Shield, HelpCircle
} from 'lucide-react';
import { soundFX } from '../utils/soundFX';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 12;
const INITIAL_PADDLE_HEIGHT = 80;
const BALL_RADIUS = 8;
const INITIAL_BALL_SPEED = 6;
const MAX_BALL_SPEED = 14;

export default function PingPongGame({ onBackToHub, onSaveScore }) {
  // Game Configuration State
  const [gameMode, setGameMode] = useState('single'); // 'single' | 'twoPlayer'
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard' | 'impossible'
  const [winningScore, setWinningScore] = useState(7);
  const [enablePowerUps, setEnablePowerUps] = useState(true);
  
  // Game Play State
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'paused' | 'gameover'
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [playerName, setPlayerName] = useState('Player 1');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  // Canvas & Engine References
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const keysPressed = useRef({});

  // Physics Engine State stored in Ref to avoid re-render stutter during 60FPS loop
  const engineState = useRef({
    p1Y: CANVAS_HEIGHT / 2 - INITIAL_PADDLE_HEIGHT / 2,
    p2Y: CANVAS_HEIGHT / 2 - INITIAL_PADDLE_HEIGHT / 2,
    p1Height: INITIAL_PADDLE_HEIGHT,
    p2Height: INITIAL_PADDLE_HEIGHT,
    p1Speed: 8,
    p2Speed: 8,
    ballX: CANVAS_WIDTH / 2,
    ballY: CANVAS_HEIGHT / 2,
    ballSpeedX: INITIAL_BALL_SPEED,
    ballSpeedY: 3,
    ballSpeed: INITIAL_BALL_SPEED,
    particles: [],
    powerUp: null, // { x, y, type, radius }
    activeEffects: {
      p1SpeedTimer: 0,
      p2SpeedTimer: 0,
      p1FreezeTimer: 0,
      p2FreezeTimer: 0,
    },
    extraBall: null, // For multi-ball power-up
  });

  // Handle Mute
  const handleToggleMute = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
        // Prevent page scrolling when playing
        if (gameState === 'playing' || gameState === 'paused') {
          e.preventDefault();
        }
      }

      keysPressed.current[e.code] = true;

      if (e.code === 'Space' && (gameState === 'playing' || gameState === 'paused')) {
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

  // Reset Ball
  const resetBall = (direction = 1) => {
    const engine = engineState.current;
    engine.ballX = CANVAS_WIDTH / 2;
    engine.ballY = CANVAS_HEIGHT / 2;
    engine.ballSpeed = INITIAL_BALL_SPEED;
    
    // Random angle between -30deg and +30deg
    const angle = (Math.random() * 60 - 30) * (Math.PI / 180);
    engine.ballSpeedX = direction * INITIAL_BALL_SPEED * Math.cos(angle);
    engine.ballSpeedY = INITIAL_BALL_SPEED * Math.sin(angle);
  };

  // Start New Game
  const startGame = () => {
    const engine = engineState.current;
    engine.p1Y = CANVAS_HEIGHT / 2 - INITIAL_PADDLE_HEIGHT / 2;
    engine.p2Y = CANVAS_HEIGHT / 2 - INITIAL_PADDLE_HEIGHT / 2;
    engine.p1Height = INITIAL_PADDLE_HEIGHT;
    engine.p2Height = INITIAL_PADDLE_HEIGHT;
    engine.particles = [];
    engine.powerUp = null;
    engine.extraBall = null;
    engine.activeEffects = { p1SpeedTimer: 0, p2SpeedTimer: 0, p1FreezeTimer: 0, p2FreezeTimer: 0 };

    setScore({ p1: 0, p2: 0 });
    setWinner(null);
    setScoreSubmitted(false);
    resetBall(Math.random() > 0.5 ? 1 : -1);
    setGameState('playing');
  };

  // Spawn Power-Up periodically
  const maybeSpawnPowerUp = () => {
    if (!enablePowerUps) return;
    const engine = engineState.current;

    if (!engine.powerUp && Math.random() < 0.003) { // ~Every 5-10 seconds
      const types = ['speed', 'extend', 'freeze', 'multiball'];
      const chosenType = types[Math.floor(Math.random() * types.length)];
      
      // Spawn in center area
      engine.powerUp = {
        x: CANVAS_WIDTH / 4 + Math.random() * (CANVAS_WIDTH / 2),
        y: 60 + Math.random() * (CANVAS_HEIGHT - 120),
        type: chosenType,
        radius: 14,
        pulse: 0
      };
    }
  };

  // AI Logic for Player 2 (Single Player)
  const updateAI = () => {
    if (gameMode !== 'single') return;
    const engine = engineState.current;
    const paddleCenter = engine.p2Y + engine.p2Height / 2;
    
    // Determine AI target based on difficulty
    let targetY = engine.ballY;
    let speedFactor = 0.85;

    if (difficulty === 'easy') {
      speedFactor = 0.45;
      // Add error/lag
      targetY += (Math.sin(Date.now() / 300) * 45);
    } else if (difficulty === 'medium') {
      speedFactor = 0.70;
      targetY += (Math.sin(Date.now() / 200) * 20);
    } else if (difficulty === 'hard') {
      speedFactor = 0.90;
    } else if (difficulty === 'impossible') {
      speedFactor = 1.0; // Near perfect tracking
    }

    // Freeze effect check
    if (engine.activeEffects.p2FreezeTimer > 0) return;

    const diff = targetY - paddleCenter;
    const moveStep = engine.p2Speed * speedFactor;

    if (Math.abs(diff) > 10) {
      if (diff > 0) {
        engine.p2Y = Math.min(CANVAS_HEIGHT - engine.p2Height, engine.p2Y + moveStep);
      } else {
        engine.p2Y = Math.max(0, engine.p2Y - moveStep);
      }
    }
  };

  // Add impact particle particles
  const addParticles = (x, y, color, count = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
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

  // Main Physics Update & Render Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updateAndDraw = () => {
      const engine = engineState.current;

      // 1. Process Power-up Timers
      if (engine.activeEffects.p1SpeedTimer > 0) engine.activeEffects.p1SpeedTimer--;
      if (engine.activeEffects.p2SpeedTimer > 0) engine.activeEffects.p2SpeedTimer--;
      if (engine.activeEffects.p1FreezeTimer > 0) engine.activeEffects.p1FreezeTimer--;
      if (engine.activeEffects.p2FreezeTimer > 0) engine.activeEffects.p2FreezeTimer--;

      const p1Speed = engine.activeEffects.p1SpeedTimer > 0 ? 13 : 8;
      const p2Speed = engine.activeEffects.p2SpeedTimer > 0 ? 13 : 8;

      // 2. Handle Player Inputs
      // P1 Controls (W/S)
      if (engine.activeEffects.p1FreezeTimer <= 0) {
        if (keysPressed.current['KeyW'] || keysPressed.current['KeyA']) {
          engine.p1Y = Math.max(0, engine.p1Y - p1Speed);
        }
        if (keysPressed.current['KeyS'] || keysPressed.current['KeyD']) {
          engine.p1Y = Math.min(CANVAS_HEIGHT - engine.p1Height, engine.p1Y + p1Speed);
        }
      }

      // P2 Controls (Up/Down) if Two Player
      if (gameMode === 'twoPlayer' && engine.activeEffects.p2FreezeTimer <= 0) {
        if (keysPressed.current['ArrowUp']) {
          engine.p2Y = Math.max(0, engine.p2Y - p2Speed);
        }
        if (keysPressed.current['ArrowDown']) {
          engine.p2Y = Math.min(CANVAS_HEIGHT - engine.p2Height, engine.p2Y + p2Speed);
        }
      } else {
        updateAI();
      }

      // 3. Move Main Ball
      engine.ballX += engine.ballSpeedX;
      engine.ballY += engine.ballSpeedY;

      // Ball Wall Collisions (Top & Bottom)
      if (engine.ballY - BALL_RADIUS <= 0) {
        engine.ballY = BALL_RADIUS;
        engine.ballSpeedY = -engine.ballSpeedY;
        soundFX.playWallHit();
        addParticles(engine.ballX, 0, '#06b6d4', 5);
      } else if (engine.ballY + BALL_RADIUS >= CANVAS_HEIGHT) {
        engine.ballY = CANVAS_HEIGHT - BALL_RADIUS;
        engine.ballSpeedY = -engine.ballSpeedY;
        soundFX.playWallHit();
        addParticles(engine.ballX, CANVAS_HEIGHT, '#06b6d4', 5);
      }

      // 4. Paddle Collisions
      // Player 1 Paddle (Left)
      if (
        engine.ballX - BALL_RADIUS <= 20 + PADDLE_WIDTH &&
        engine.ballX - BALL_RADIUS >= 20 &&
        engine.ballY >= engine.p1Y &&
        engine.ballY <= engine.p1Y + engine.p1Height
      ) {
        engine.ballX = 20 + PADDLE_WIDTH + BALL_RADIUS;
        
        // Angle calculation based on hit location
        const relativeHit = (engine.ballY - (engine.p1Y + engine.p1Height / 2)) / (engine.p1Height / 2);
        const bounceAngle = relativeHit * (Math.PI / 4); // max 45 deg

        engine.ballSpeed = Math.min(MAX_BALL_SPEED, engine.ballSpeed + 0.3);
        engine.ballSpeedX = engine.ballSpeed * Math.cos(bounceAngle);
        engine.ballSpeedY = engine.ballSpeed * Math.sin(bounceAngle);

        soundFX.playPaddleHit();
        addParticles(20 + PADDLE_WIDTH, engine.ballY, '#22c55e', 10);
      }

      // Player 2 Paddle (Right)
      if (
        engine.ballX + BALL_RADIUS >= CANVAS_WIDTH - 20 - PADDLE_WIDTH &&
        engine.ballX + BALL_RADIUS <= CANVAS_WIDTH - 20 &&
        engine.ballY >= engine.p2Y &&
        engine.ballY <= engine.p2Y + engine.p2Height
      ) {
        engine.ballX = CANVAS_WIDTH - 20 - PADDLE_WIDTH - BALL_RADIUS;
        
        const relativeHit = (engine.ballY - (engine.p2Y + engine.p2Height / 2)) / (engine.p2Height / 2);
        const bounceAngle = relativeHit * (Math.PI / 4);

        engine.ballSpeed = Math.min(MAX_BALL_SPEED, engine.ballSpeed + 0.3);
        engine.ballSpeedX = -engine.ballSpeed * Math.cos(bounceAngle);
        engine.ballSpeedY = engine.ballSpeed * Math.sin(bounceAngle);

        soundFX.playPaddleHit();
        addParticles(CANVAS_WIDTH - 20 - PADDLE_WIDTH, engine.ballY, '#a855f7', 10);
      }

      // 5. Power-Up Mechanics
      maybeSpawnPowerUp();
      if (engine.powerUp) {
        const p = engine.powerUp;
        p.pulse += 0.05;
        
        // Distance check from ball to powerup
        const dx = engine.ballX - p.x;
        const dy = engine.ballY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < BALL_RADIUS + p.radius) {
          // Trigger Power-up!
          soundFX.playPowerUp();
          addParticles(p.x, p.y, '#f59e0b', 16);

          const hitterIsP1 = engine.ballSpeedX > 0;
          if (p.type === 'speed') {
            if (hitterIsP1) engine.activeEffects.p1SpeedTimer = 300;
            else engine.activeEffects.p2SpeedTimer = 300;
          } else if (p.type === 'extend') {
            if (hitterIsP1) engine.p1Height = Math.min(140, engine.p1Height + 30);
            else engine.p2Height = Math.min(140, engine.p2Height + 30);
          } else if (p.type === 'freeze') {
            if (hitterIsP1) engine.activeEffects.p2FreezeTimer = 120; // Freeze opponent
            else engine.activeEffects.p1FreezeTimer = 120;
          } else if (p.type === 'multiball') {
            engine.extraBall = {
              x: p.x,
              y: p.y,
              speedX: -engine.ballSpeedX,
              speedY: -engine.ballSpeedY
            };
          }

          engine.powerUp = null;
        }
      }

      // 6. Check Scoring
      let scored = false;
      if (engine.ballX < 0) {
        // P2 Scores
        soundFX.playScore();
        setScore(prev => {
          const nextP2 = prev.p2 + 1;
          if (nextP2 >= winningScore) {
            handleGameOver(gameMode === 'twoPlayer' ? 'Player 2 Wins!' : 'AI Wins!');
          } else {
            resetBall(1);
          }
          return { ...prev, p2: nextP2 };
        });
        scored = true;
      } else if (engine.ballX > CANVAS_WIDTH) {
        // P1 Scores
        soundFX.playScore();
        setScore(prev => {
          const nextP1 = prev.p1 + 1;
          if (nextP1 >= winningScore) {
            handleGameOver(`${playerName} Wins!`);
          } else {
            resetBall(-1);
          }
          return { ...prev, p1: nextP1 };
        });
        scored = true;
      }

      if (scored) return;

      // ---------------- RENDER CANVAS ----------------
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Dark retro background grid
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Center dotted line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 12]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

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

      // Render Power-Up if active
      if (engine.powerUp) {
        const p = engine.powerUp;
        const scale = 1 + Math.sin(p.pulse) * 0.15;
        
        ctx.save();
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.fillStyle = p.type === 'speed' ? '#eab308' : 
                        p.type === 'extend' ? '#10b981' : 
                        p.type === 'freeze' ? '#3b82f6' : '#ec4899';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * scale, 0, Math.PI * 2);
        ctx.fill();

        // Icon text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = p.type === 'speed' ? '⚡' : 
                      p.type === 'extend' ? '⇕' : 
                      p.type === 'freeze' ? '❄' : '2x';
        ctx.fillText(label, p.x, p.y);
        ctx.restore();
      }

      // Render Paddles
      // Player 1 (Green / Cyan)
      ctx.save();
      ctx.shadowColor = engine.activeEffects.p1FreezeTimer > 0 ? '#3b82f6' : '#22c55e';
      ctx.shadowBlur = 12;
      ctx.fillStyle = engine.activeEffects.p1FreezeTimer > 0 ? '#60a5fa' : '#22c55e';
      ctx.fillRect(20, engine.p1Y, PADDLE_WIDTH, engine.p1Height);
      ctx.restore();

      // Player 2 (Purple)
      ctx.save();
      ctx.shadowColor = engine.activeEffects.p2FreezeTimer > 0 ? '#3b82f6' : '#a855f7';
      ctx.shadowBlur = 12;
      ctx.fillStyle = engine.activeEffects.p2FreezeTimer > 0 ? '#60a5fa' : '#a855f7';
      ctx.fillRect(CANVAS_WIDTH - 20 - PADDLE_WIDTH, engine.p2Y, PADDLE_WIDTH, engine.p2Height);
      ctx.restore();

      // Render Ball
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(engine.ballX, engine.ballY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Ball Speed Particle Trail
      if (Math.abs(engine.ballSpeedX) > 8) {
        addParticles(
          engine.ballX - engine.ballSpeedX * 0.5, 
          engine.ballY - engine.ballSpeedY * 0.5, 
          '#38bdf8', 
          2
        );
      }

      animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    };

    animationFrameRef.current = requestAnimationFrame(updateAndDraw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameMode, difficulty, winningScore, enablePowerUps, playerName]);

  // Handle Game Over
  const handleGameOver = (winnerText) => {
    setWinner(winnerText);
    setGameState('gameover');
    
    const isWin = winnerText.includes(playerName);
    soundFX.playGameOver(isWin);

    if (isWin) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  // Submit Score Handler
  const handleSubmitScore = () => {
    if (!scoreSubmitted && onSaveScore) {
      onSaveScore({
        playerName: playerName || 'Player 1',
        game: 'Ping Pong',
        score: score.p1,
        mode: `${gameMode} (${difficulty})`,
        date: new Date().toISOString()
      });
      setScoreSubmitted(true);
    }
  };

  // Touch / Drag Paddles on Screen for Mobile / Mouse Support
  const handleCanvasTouchMove = (e) => {
    if (gameState !== 'playing') return;
    if (e.touches && e.touches.length > 0) {
      const rect = canvasRef.current.getBoundingClientRect();
      const touchY = e.touches[0].clientY - rect.top;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const canvasY = touchY * scaleY;

      engineState.current.p1Y = Math.max(
        0, 
        Math.min(CANVAS_HEIGHT - engineState.current.p1Height, canvasY - engineState.current.p1Height / 2)
      );
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (gameState !== 'playing') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    // Scale for canvas aspect ratio
    const scaleY = CANVAS_HEIGHT / rect.height;
    const canvasY = mouseY * scaleY;

    engineState.current.p1Y = Math.max(
      0, 
      Math.min(CANVAS_HEIGHT - engineState.current.p1Height, canvasY - engineState.current.p1Height / 2)
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4">
      {/* Top Header Controls */}
      <div className="w-full max-w-[800px] flex items-center justify-between mb-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800 backdrop-blur">
        <button
          onClick={onBackToHub}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Arcade Hub
        </button>

        <div className="flex items-center gap-6 font-mono text-2xl font-bold tracking-widest">
          <span className="text-emerald-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">
            {playerName}: {score.p1}
          </span>
          <span className="text-slate-600">:</span>
          <span className="text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
            {gameMode === 'twoPlayer' ? 'P2' : 'AI'}: {score.p2}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-cyan-950/40 bg-slate-950 w-full max-w-[800px] min-h-[420px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleCanvasMouseMove}
          onTouchStart={handleCanvasTouchMove}
          onTouchMove={handleCanvasTouchMove}
          className="block w-full h-auto touch-none cursor-pointer"
        />

        {/* Start / Main Menu Overlay */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 text-center overflow-y-auto z-30">
            <div className="w-full max-w-md mx-auto flex flex-col items-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="w-6 h-6 text-cyan-400 animate-bounce" />
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-500 neon-title">
                  PING PONG ARCADE
                </h1>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mb-3">
                Classic table tennis with power-ups, AI & 2-Player modes
              </p>

              {/* Config Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full bg-slate-900/90 p-3 sm:p-4 rounded-xl border border-slate-800 text-left text-xs mb-3">
                <div>
                  <label className="text-slate-400 mb-1 block font-semibold flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-cyan-400" /> Player Name
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value || 'Player 1')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1 block font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-400" /> Game Mode
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGameMode('single')}
                      className={`flex-1 py-1.5 rounded-lg text-xs text-center transition-all ${
                        gameMode === 'single'
                          ? 'bg-cyan-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      VS AI
                    </button>
                    <button
                      type="button"
                      onClick={() => setGameMode('twoPlayer')}
                      className={`flex-1 py-1.5 rounded-lg text-xs text-center transition-all ${
                        gameMode === 'twoPlayer'
                          ? 'bg-purple-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      2 Players
                    </button>
                  </div>
                </div>

                {gameMode === 'single' && (
                  <div>
                    <label className="text-slate-400 mb-1 block font-semibold flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-400" /> AI Difficulty
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="easy">Easy (Casual)</option>
                      <option value="medium">Medium (Balanced)</option>
                      <option value="hard">Hard (Challenging)</option>
                      <option value="impossible">Impossible (Master)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-slate-400 mb-1 block font-semibold flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Winning Score
                  </label>
                  <select
                    value={winningScore}
                    onChange={(e) => setWinningScore(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-yellow-500"
                  >
                    <option value={5}>First to 5</option>
                    <option value={7}>First to 7</option>
                    <option value={10}>First to 10</option>
                    <option value={15}>First to 15</option>
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-2 flex items-center justify-between pt-1">
                  <span className="text-slate-300 text-xs flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" /> Arcade Power-Ups
                  </span>
                  <input
                    type="checkbox"
                    checked={enablePowerUps}
                    onChange={(e) => setEnablePowerUps(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={startGame}
              className="w-full max-w-md py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 active:from-cyan-600 active:to-teal-600 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-cyan-500/30 text-base sm:text-lg transition-transform hover:scale-102 active:scale-95 flex items-center justify-center gap-2 my-1 shrink-0"
            >
              <Play className="w-5 h-5 fill-current" /> PLAY NOW
            </button>
          </div>
        )}

        {/* Pause Overlay */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-3xl font-extrabold text-cyan-400 mb-4 tracking-wider">GAME PAUSED</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setGameState('playing')}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" /> Resume
              </button>
              <button
                onClick={startGame}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Restart
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <Trophy className="w-16 h-16 text-yellow-400 mb-2 animate-bounce" />
            <h2 className="text-3xl font-extrabold text-white mb-1">{winner}</h2>
            <p className="text-slate-400 mb-6 font-mono">
              Final Score: {score.p1} - {score.p2}
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
                {scoreSubmitted ? 'Score Submitted ✓' : 'Save Score to Leaderboard'}
              </button>

              <button
                onClick={startGame}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile On-Screen Touch Controls */}
      {gameState === 'playing' && (
        <div className="w-full max-w-[800px] mt-3 grid grid-cols-2 gap-4">
          {/* P1 Controls */}
          <div className="flex gap-2">
            <button
              onMouseDown={() => { keysPressed.current['KeyW'] = true; }}
              onMouseUp={() => { keysPressed.current['KeyW'] = false; }}
              onTouchStart={(e) => { e.preventDefault(); keysPressed.current['KeyW'] = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['KeyW'] = false; }}
              className="flex-1 py-3 bg-emerald-600/80 active:bg-emerald-500 text-white font-bold rounded-xl text-lg select-none shadow-lg border border-emerald-500/40 active:scale-95 transition-transform flex items-center justify-center gap-1"
            >
              ▲ P1 UP
            </button>
            <button
              onMouseDown={() => { keysPressed.current['KeyS'] = true; }}
              onMouseUp={() => { keysPressed.current['KeyS'] = false; }}
              onTouchStart={(e) => { e.preventDefault(); keysPressed.current['KeyS'] = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['KeyS'] = false; }}
              className="flex-1 py-3 bg-emerald-600/80 active:bg-emerald-500 text-white font-bold rounded-xl text-lg select-none shadow-lg border border-emerald-500/40 active:scale-95 transition-transform flex items-center justify-center gap-1"
            >
              ▼ P1 DOWN
            </button>
          </div>

          {/* P2 Controls or Pause */}
          {gameMode === 'twoPlayer' ? (
            <div className="flex gap-2">
              <button
                onMouseDown={() => { keysPressed.current['ArrowUp'] = true; }}
                onMouseUp={() => { keysPressed.current['ArrowUp'] = false; }}
                onTouchStart={(e) => { e.preventDefault(); keysPressed.current['ArrowUp'] = true; }}
                onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['ArrowUp'] = false; }}
                className="flex-1 py-3 bg-purple-600/80 active:bg-purple-500 text-white font-bold rounded-xl text-lg select-none shadow-lg border border-purple-500/40 active:scale-95 transition-transform flex items-center justify-center gap-1"
              >
                ▲ P2 UP
              </button>
              <button
                onMouseDown={() => { keysPressed.current['ArrowDown'] = true; }}
                onMouseUp={() => { keysPressed.current['ArrowDown'] = false; }}
                onTouchStart={(e) => { e.preventDefault(); keysPressed.current['ArrowDown'] = true; }}
                onTouchEnd={(e) => { e.preventDefault(); keysPressed.current['ArrowDown'] = false; }}
                className="flex-1 py-3 bg-purple-600/80 active:bg-purple-500 text-white font-bold rounded-xl text-lg select-none shadow-lg border border-purple-500/40 active:scale-95 transition-transform flex items-center justify-center gap-1"
              >
                ▼ P2 DOWN
              </button>
            </div>
          ) : (
            <button
              onClick={() => setGameState(prev => prev === 'playing' ? 'paused' : 'playing')}
              className="py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-xl text-sm border border-slate-700 active:scale-95 transition-transform flex items-center justify-center gap-1"
            >
              <Pause className="w-4 h-4" /> Pause Game
            </button>
          )}
        </div>
      )}

      {/* Controls Hint Footer */}
      <div className="w-full max-w-[800px] mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span><strong className="text-cyan-400">P1 Controls:</strong> W / S keys or Mouse Drag</span>
          {gameMode === 'twoPlayer' && (
            <span><strong className="text-purple-400">P2 Controls:</strong> Up / Down Arrows</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span><strong className="text-slate-200">Space:</strong> Pause</span>
          <span className="flex items-center gap-1 text-amber-400">
            <Zap className="w-3 h-3" /> Power-Ups: Speed, Extend, Freeze, Multi-ball
          </span>
        </div>
      </div>
    </div>
  );
}
