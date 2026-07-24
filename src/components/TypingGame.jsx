import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, RotateCcw, Volume2, VolumeX,
  Flame, Shield, Play, Keyboard, Zap
} from 'lucide-react';
import { soundFX } from '../utils/soundFX';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

const WORD_POOLS = {
  1: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
  2: ['GO','HI','ON','UP','NO','MY','BE','WE','AM','DO','ME','IT','SO','IN','AT','TO','HE','IS','OR','IF'],
  3: ['SKY','SUN','RUN','FLY','RED','ICE','JET','TOP','WIN','BOX','GEM','ACE','FOX','KEY','RAY','ZIP'],
  4: ['NEON','PONG','ROCK','FIRE','MINT','STAR','MOON','GLOW','DARK','ZERO','FAST','WAVE','CITY','BOLD','JUMP','CODE'],
  5: ['SPEED','PULSE','LASER','LIGHT','CYBER','ORBIT','COMET','DRIFT','BLAST','HYPER','SLASH','STORM'],
  6: ['GALAXY','ROCKET','SHADOW','ACTION','DRAGON','METEOR','ENERGY','PLAYER','SHIELD','HUNTER'],
  7: ['DEFENSE','PHANTOM','THUNDER','CRYSTAL','SPECTRA','TACTICAL','OVERDRIVE'],
};

const POWERUP_WORD_POOL = ['ZAP','ACE','GEM','WIN','ICE','KEY','FLY','RAY','TOP','BOX'];

const POWERUP_DEFS = [
  { id: 'shield', icon: '💊', label: 'HEAL',    color: '#10b981', description: '+30 Shield HP',   duration: 0     },
  { id: 'slow',   icon: '❄️',   label: 'SLOW',    color: '#38bdf8', description: 'Slow Wave (8s)',  duration: 8000  },
  { id: 'blast',  icon: '💥',  label: 'BLAST',   color: '#f59e0b', description: 'Clear Screen',     duration: 0     },
  { id: 'double', icon: '🌟', label: '2x RUSH', color: '#a855f7', description: '2x Score (10s)',  duration: 10000 },
  { id: 'freeze', icon: '⏸️',  label: 'FREEZE',  color: '#06b6d4', description: 'Freeze All (5s)', duration: 5000  },
];

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

const getDifficultyParams = (elapsed, wordsDestroyed) => {
  const fallSpeed = Math.min(5.0,
    0.85 + Math.log(elapsed / 12 + 1) * 1.1 + wordsDestroyed * 0.012
  );
  const spawnInterval = Math.max(550, 2300 - elapsed * 7.5 - wordsDestroyed * 4);

  let weights;
  if (elapsed < 25) {
    const t = elapsed / 25;
    weights = { 1: lerp(1.0, 0.55, t), 2: lerp(0, 0.40, t), 3: lerp(0, 0.05, t) };
  } else if (elapsed < 60) {
    const t = (elapsed - 25) / 35;
    weights = { 1: lerp(0.55,0.15,t), 2: lerp(0.40,0.45,t), 3: lerp(0.05,0.30,t), 4: lerp(0,0.10,t) };
  } else if (elapsed < 120) {
    const t = (elapsed - 60) / 60;
    weights = { 1: lerp(0.15,0.03,t), 2: lerp(0.45,0.12,t), 3: lerp(0.30,0.38,t), 4: lerp(0.10,0.32,t), 5: lerp(0,0.15,t) };
  } else if (elapsed < 240) {
    const t = (elapsed - 120) / 120;
    weights = { 2: lerp(0.12,0.03,t), 3: lerp(0.38,0.12,t), 4: lerp(0.32,0.28,t), 5: lerp(0.15,0.30,t), 6: lerp(0,0.20,t), 7: lerp(0,0.07,t) };
  } else {
    const t = Math.min(1, (elapsed - 240) / 240);
    weights = { 3: lerp(0.12,0.05,t), 4: lerp(0.28,0.18,t), 5: lerp(0.30,0.28,t), 6: lerp(0.20,0.28,t), 7: lerp(0.07,0.21,t) };
  }

  return { fallSpeed, spawnInterval, weights };
};

const pickWord = (weights) => {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [len, w] of entries) {
    r -= w;
    if (r <= 0) {
      const pool = WORD_POOLS[+len] || WORD_POOLS[3];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }
  return WORD_POOLS[1][Math.floor(Math.random() * WORD_POOLS[1].length)];
};

export default function TypingGame({ onBackToHub, onSaveScore }) {
  const [gameState,      setGameState]      = useState('menu');
  const [score,          setScore]          = useState(0);
  const [health,         setHealth]         = useState(100);
  const [combo,          setCombo]          = useState(0);
  const [totalWords,     setTotalWords]     = useState(0);
  const [totalTyped,     setTypedTotal]     = useState(0);
  const [correctTyped,   setCorrectTyped]   = useState(0);
  const [isMuted,        setIsMuted]        = useState(false);
  const [playerName,     setPlayerName]     = useState('Player 1');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [activePowerups, setActivePowerups] = useState([]);
  const [survivalTime,   setSurvivalTime]   = useState(0);
  const [hasDouble,      setHasDouble]      = useState(false);

  const canvasRef         = useRef(null);
  const mobileInputRef    = useRef(null);
  const animationFrameRef = useRef(null);
  const lastSpawnTime     = useRef(0);
  const gameStartTime     = useRef(0);
  const wordsDestroyedRef = useRef(0);
  const nextPowerupAt     = useRef(7);
  const scoreMultRef      = useRef(1);
  const multiplierExpiry  = useRef(0);
  const slowExpiry        = useRef(0);
  const freezeExpiry      = useRef(0);

  const engineState = useRef({
    meteors: [], lasers: [], particles: [], stars: [],
    screenShake: 0, activeTargetId: null, pendingPowerup: null,
  });

  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (CANVAS_HEIGHT * 0.6),
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: 0.02 + Math.random() * 0.03,
      });
    }
    engineState.current.stars = stars;
  }, []);

  const focusMobileKeyboard = () => {
    if (gameState === 'playing' && mobileInputRef.current) mobileInputRef.current.focus();
  };
  useEffect(() => {
    if (gameState === 'playing') setTimeout(() => mobileInputRef.current?.focus(), 100);
  }, [gameState]);
  const handleMobileInputChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const lastChar = val.slice(-1).toUpperCase();
    if (/^[A-Z]$/.test(lastChar)) processKeyPress(lastChar);
    e.target.value = '';
  };

  const handleToggleMute = () => setIsMuted(soundFX.toggleMute());

  const addParticles = (x, y, color, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 5;
      engineState.current.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4, alpha: 1, color,
      });
    }
  };

  const applyPowerup = (powerupId) => {
    const now = Date.now();
    const engine = engineState.current;
    soundFX.playPowerUp();
    confetti({ particleCount: 35, spread: 55, origin: { y: 0.6 }, zIndex: 9999 });

    switch (powerupId) {
      case 'shield':
        setHealth(h => Math.min(100, h + 30));
        break;
      case 'slow':
        slowExpiry.current = now + 8000;
        setActivePowerups(p => [...p.filter(x => x.id !== 'slow'), { id: 'slow', icon: '❄️', label: 'SLOW WAVE', expiresAt: now + 8000 }]);
        break;
      case 'blast':
        engine.meteors.forEach(m => addParticles(m.x, m.y, m.color, 10));
        engine.meteors = [];
        engine.activeTargetId = null;
        setScore(s => s + 150 * scoreMultRef.current);
        confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } });
        break;
      case 'double':
        scoreMultRef.current = 2;
        multiplierExpiry.current = now + 10000;
        setHasDouble(true);
        setActivePowerups(p => [...p.filter(x => x.id !== 'double'), { id: 'double', icon: '🌟', label: '2× SCORE', expiresAt: now + 10000 }]);
        break;
      case 'freeze':
        freezeExpiry.current = now + 5000;
        setActivePowerups(p => [...p.filter(x => x.id !== 'freeze'), { id: 'freeze', icon: '⏸️', label: 'FROZEN', expiresAt: now + 5000 }]);
        break;
      default: break;
    }
  };

  const processKeyPress = (typedChar) => {
    if (gameState !== 'playing') return;
    setTypedTotal(t => t + 1);

    const engine = engineState.current;
    let target = null;

    if (engine.activeTargetId) target = engine.meteors.find(m => m.id === engine.activeTargetId);

    if (!target) {
      const matching = engine.meteors
        .filter(m => m.text[m.typedIndex] === typedChar)
        .sort((a, b) => b.y - a.y);
      if (matching.length > 0) { target = matching[0]; engine.activeTargetId = target.id; }
    }

    if (target && target.text[target.typedIndex] === typedChar) {
      target.typedIndex++;
      setCorrectTyped(c => c + 1);
      soundFX.playTypePop();
      engine.lasers.push({ x1: CANVAS_WIDTH / 2, y1: CANVAS_HEIGHT - 20, x2: target.x, y2: target.y, color: '#38bdf8', alpha: 1.0 });

      if (target.typedIndex >= target.text.length) {
        addParticles(target.x, target.y, target.color, 16);
        soundFX.playPowerUp();
        if (target.isPowerup) applyPowerup(target.powerupId);
        engine.meteors = engine.meteors.filter(m => m.id !== target.id);
        engine.activeTargetId = null;
        wordsDestroyedRef.current++;
        setTotalWords(w => w + 1);
        setCombo(c => {
          const next = c + 1;
          setScore(s => s + (target.text.length * 20 + next * 5) * scoreMultRef.current);
          return next;
        });
        if (wordsDestroyedRef.current >= nextPowerupAt.current) {
          nextPowerupAt.current = wordsDestroyedRef.current + 5 + Math.floor(Math.random() * 8);
          engine.pendingPowerup = POWERUP_DEFS[Math.floor(Math.random() * POWERUP_DEFS.length)];
        }
      }
    } else {
      soundFX.playTypeMiss();
      setCombo(0);
      engine.activeTargetId = null;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      if (e.key.length !== 1) return;
      const typedChar = e.key.toUpperCase();
      if (!/^[A-Z]$/.test(typedChar)) return;
      processKeyPress(typedChar);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

  const startGame = () => {
    setScore(0); setHealth(100); setCombo(0); setTotalWords(0);
    setTypedTotal(0); setCorrectTyped(0); setScoreSubmitted(false);
    setActivePowerups([]); setSurvivalTime(0); setHasDouble(false);
    wordsDestroyedRef.current = 0;
    nextPowerupAt.current = 5 + Math.floor(Math.random() * 5);
    scoreMultRef.current = 1; multiplierExpiry.current = 0;
    slowExpiry.current = 0; freezeExpiry.current = 0;
    const engine = engineState.current;
    engine.meteors = []; engine.lasers = []; engine.particles = [];
    engine.screenShake = 0; engine.activeTargetId = null; engine.pendingPowerup = null;
    gameStartTime.current = Date.now();
    lastSpawnTime.current = Date.now();
    setGameState('playing');
  };

  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => setSurvivalTime(Math.floor((Date.now() - gameStartTime.current) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updateAndDraw = () => {
      const engine = engineState.current;
      const now = Date.now();
      const elapsed = (now - gameStartTime.current) / 1000;

      // Expire powerups
      if (multiplierExpiry.current > 0 && now > multiplierExpiry.current) {
        scoreMultRef.current = 1; multiplierExpiry.current = 0;
        setHasDouble(false); setActivePowerups(p => p.filter(x => x.id !== 'double'));
      }
      if (slowExpiry.current > 0 && now > slowExpiry.current) {
        slowExpiry.current = 0; setActivePowerups(p => p.filter(x => x.id !== 'slow'));
      }
      if (freezeExpiry.current > 0 && now > freezeExpiry.current) {
        freezeExpiry.current = 0; setActivePowerups(p => p.filter(x => x.id !== 'freeze'));
      }

      const isFrozen = freezeExpiry.current > now;
      const slowFactor = slowExpiry.current > now ? 0.38 : 1.0;
      const params = getDifficultyParams(elapsed, wordsDestroyedRef.current);

      // Spawn
      if (now - lastSpawnTime.current > params.spawnInterval) {
        lastSpawnTime.current = now;
        if (engine.pendingPowerup) {
          const pu = engine.pendingPowerup; engine.pendingPowerup = null;
          const word = POWERUP_WORD_POOL[Math.floor(Math.random() * POWERUP_WORD_POOL.length)];
          engine.meteors.push({
            id: Math.random().toString(),
            x: 80 + Math.random() * (CANVAS_WIDTH - 160), y: -20,
            text: word, typedIndex: 0,
            speed: Math.max(0.55, params.fallSpeed * 0.55),
            color: pu.color, isPowerup: true, powerupId: pu.id, powerupIcon: pu.icon,
          });
        } else {
          const word = pickWord(params.weights);
          const colors = ['#06b6d4','#a855f7','#f43f5e','#f59e0b','#10b981'];
          engine.meteors.push({
            id: Math.random().toString(),
            x: 60 + Math.random() * (CANVAS_WIDTH - 120), y: -20,
            text: word, typedIndex: 0,
            speed: params.fallSpeed + (Math.random() * 0.28 - 0.14),
            color: colors[Math.floor(Math.random() * colors.length)], isPowerup: false,
          });
        }
      }

      // Move meteors
      if (!isFrozen) {
        for (let i = engine.meteors.length - 1; i >= 0; i--) {
          const m = engine.meteors[i];
          m.y += m.speed * slowFactor;
          if (Math.random() < 0.28) {
            engine.particles.push({
              x: m.x + (Math.random() * 16 - 8), y: m.y - 8,
              vx: Math.random() * 0.7 - 0.35, vy: -1 - Math.random() * 0.8,
              radius: 2, alpha: 0.55, color: m.color,
            });
          }
          if (m.y >= CANVAS_HEIGHT - 70) {
            soundFX.playExplosion();
            addParticles(m.x, CANVAS_HEIGHT - 60, '#ef4444', 18);
            engine.screenShake = 12;
            if (engine.activeTargetId === m.id) engine.activeTargetId = null;
            engine.meteors.splice(i, 1);
            setCombo(0);
            setHealth(h => {
              const dmg = m.isPowerup ? 5 : 15;
              const nextH = Math.max(0, h - dmg);
              if (nextH <= 0) { soundFX.playGameOver(false); setGameState('gameover'); }
              return nextH;
            });
          }
        }
      }

      // === RENDER ===
      ctx.save();
      if (engine.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * engine.screenShake, (Math.random() - 0.5) * engine.screenShake);
        engine.screenShake *= 0.83;
        if (engine.screenShake < 0.5) engine.screenShake = 0;
      }
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGrad.addColorStop(0, '#0a0a1a'); skyGrad.addColorStop(0.5, '#1e112a'); skyGrad.addColorStop(1, '#2d123d');
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (isFrozen) { ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = '#38bdf8'; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT); ctx.restore(); }
      if (slowFactor < 1) { ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#38bdf8'; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT); ctx.restore(); }

      // Stars
      engine.stars.forEach(st => {
        st.alpha += st.twinkleSpeed;
        if (st.alpha > 1 || st.alpha < 0.2) st.twinkleSpeed = -st.twinkleSpeed;
        ctx.save(); ctx.globalAlpha = Math.max(0.1, st.alpha);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });

      // Moon
      ctx.save(); ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 25; ctx.fillStyle = '#f3e8ff';
      ctx.beginPath(); ctx.arc(680, 80, 35, 0, Math.PI * 2); ctx.fill(); ctx.restore();

      // Mountain L1
      ctx.fillStyle = '#1e1b4b'; ctx.beginPath();
      ctx.moveTo(0,CANVAS_HEIGHT); ctx.lineTo(0,320); ctx.lineTo(120,240); ctx.lineTo(250,340);
      ctx.lineTo(400,220); ctx.lineTo(550,330); ctx.lineTo(700,210); ctx.lineTo(CANVAS_WIDTH,310); ctx.lineTo(CANVAS_WIDTH,CANVAS_HEIGHT);
      ctx.closePath(); ctx.fill();

      // Mountain L2
      ctx.fillStyle = '#0f172a'; ctx.beginPath();
      ctx.moveTo(0,CANVAS_HEIGHT); ctx.lineTo(0,380); ctx.lineTo(180,290); ctx.lineTo(320,390);
      ctx.lineTo(480,280); ctx.lineTo(620,380); ctx.lineTo(CANVAS_WIDTH,300); ctx.lineTo(CANVAS_WIDTH,CANVAS_HEIGHT);
      ctx.closePath(); ctx.fill();

      // Foreground
      ctx.fillStyle = '#020617'; ctx.beginPath();
      ctx.moveTo(0,CANVAS_HEIGHT); ctx.lineTo(0,440); ctx.lineTo(CANVAS_WIDTH,440); ctx.lineTo(CANVAS_WIDTH,CANVAS_HEIGHT);
      ctx.closePath(); ctx.fill();

      // Cannon
      ctx.save(); ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 15; ctx.fillStyle = '#0284c7';
      ctx.beginPath(); ctx.arc(CANVAS_WIDTH/2, CANVAS_HEIGHT-10, 24, Math.PI, 0, false); ctx.fill(); ctx.restore();

      // Time watermark
      ctx.save(); ctx.globalAlpha = 0.4; ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(`? ${Math.floor(elapsed)}s`, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 6); ctx.restore();

      // Lasers
      for (let i = engine.lasers.length - 1; i >= 0; i--) {
        const l = engine.lasers[i]; l.alpha -= 0.08;
        if (l.alpha <= 0) { engine.lasers.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = l.alpha; ctx.strokeStyle = l.color; ctx.lineWidth = 4;
        ctx.shadowColor = l.color; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke(); ctx.restore();
      }

      // Particles
      for (let i = engine.particles.length - 1; i >= 0; i--) {
        const pt = engine.particles[i];
        pt.x += pt.vx; pt.y += pt.vy; pt.alpha -= 0.03;
        if (pt.alpha <= 0) { engine.particles.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = pt.alpha; ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }

      // Meteors
      for (const m of engine.meteors) {
        ctx.save();
        const isTarget = engine.activeTargetId === m.id;
        if (m.isPowerup) {
          const pulse = Math.sin(now / 220) * 0.45 + 0.55;
          ctx.shadowColor = m.color; ctx.shadowBlur = 18 + pulse * 18;
          ctx.fillStyle = '#0d1f14'; ctx.strokeStyle = m.color; ctx.lineWidth = 2.5;
        } else {
          ctx.shadowColor = isTarget ? '#22c55e' : m.color; ctx.shadowBlur = isTarget ? 22 : 12;
          ctx.fillStyle = isTarget ? '#052e16' : '#0f172a';
          ctx.strokeStyle = isTarget ? '#22c55e' : m.color; ctx.lineWidth = isTarget ? 3 : 2;
        }
        const iconPad  = m.isPowerup ? 24 : 0;
        const boxWidth = Math.max(48, m.text.length * 18 + 20 + iconPad);
        const boxHeight = m.isPowerup ? 44 : 36;
        ctx.beginPath(); ctx.roundRect(m.x - boxWidth/2, m.y - boxHeight/2, boxWidth, boxHeight, 10); ctx.fill(); ctx.stroke();

        if (m.isPowerup) {
          ctx.font = '16px serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.shadowBlur = 0;
          ctx.fillText(m.powerupIcon, m.x - boxWidth/2 + 5, m.y);
        }
        ctx.font = 'bold 18px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const typed = m.text.substring(0, m.typedIndex);
        const remaining = m.text.substring(m.typedIndex);
        const totalW = ctx.measureText(m.text).width;
        let startX = m.x - totalW/2 + (m.isPowerup ? iconPad/2 : 0);
        if (typed) { ctx.fillStyle = '#4ade80'; ctx.fillText(typed, startX, m.y); startX += ctx.measureText(typed).width; }
        if (remaining) { ctx.fillStyle = m.isPowerup ? m.color : '#f8fafc'; ctx.fillText(remaining, startX, m.y); }
        ctx.restore();
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    };

    animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

  const accuracy = totalTyped > 0 ? Math.round((correctTyped / totalTyped) * 100) : 100;

  const handleSubmitScore = () => {
    if (!scoreSubmitted && onSaveScore) {
      onSaveScore({ playerName: playerName || 'Player 1', game: 'Sky Letters', score, mode: `${survivalTime}s · ${totalWords} words · ${accuracy}% acc`, date: new Date().toISOString() });
      setScoreSubmitted(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4">
      <div className="w-full max-w-[800px] flex items-center justify-between mb-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 backdrop-blur">
        <button onClick={onBackToHub} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" /> Arcade Hub
        </button>
        <div className="flex items-center gap-4 font-mono font-bold text-sm">
          <div className="text-cyan-400">? {score.toLocaleString()}</div>
          {hasDouble && <div className="text-yellow-300 animate-pulse text-xs px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded-full">?? 2×</div>}
          <div className="text-slate-400 text-xs">Words: {totalWords}</div>
          <div className="text-emerald-400 text-xs">Acc: {accuracy}%</div>
          {combo > 1 && <div className="text-amber-400 flex items-center gap-1 animate-bounce text-xs"><Flame className="w-3.5 h-3.5" /> {combo}×</div>}
        </div>
        <button onClick={handleToggleMute} className="p-2 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
        </button>
      </div>

      {activePowerups.length > 0 && (
        <div className="w-full max-w-[800px] flex gap-2 mb-2 flex-wrap">
          {activePowerups.map(pu => {
            const remaining = Math.max(0, Math.ceil((pu.expiresAt - Date.now()) / 1000));
            return (
              <div key={pu.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 rounded-lg border border-slate-700 text-xs font-bold font-mono animate-pulse">
                <span>{pu.icon}</span><span className="text-slate-200">{pu.label}</span><span className="text-cyan-400">{remaining}s</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-950/40 bg-slate-950 w-full max-w-[800px] min-h-[420px] flex items-center justify-center">
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur">
            <Shield className="w-4 h-4 text-cyan-400" />
            <div className="w-32 bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-300 ${health > 50 ? 'bg-emerald-500' : health > 25 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${health}%` }} />
            </div>
            <span className="text-xs font-mono font-bold text-slate-200">{health}%</span>
          </div>
          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono font-bold text-purple-400 backdrop-blur flex items-center gap-1">
            <Zap className="w-3 h-3" /> {survivalTime}s
          </div>
        </div>

        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} onClick={focusMobileKeyboard} onTouchStart={focusMobileKeyboard} className="block w-full h-auto cursor-pointer" />
        <input ref={mobileInputRef} type="text" onChange={handleMobileInputChange} className="opacity-0 absolute top-0 left-0 w-1 h-1 pointer-events-none" autoCapitalize="characters" autoCorrect="off" autoComplete="off" />

        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 text-center overflow-y-auto z-30">
            <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-3 pt-2">
              <Keyboard className="w-8 h-8 text-cyan-400 animate-bounce" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500">SKY LETTERS</h1>
              <p className="text-slate-400 text-xs sm:text-sm max-w-xs">One endless run. Type faster. Survive longer. Collect powerups.</p>
              <div className="w-full bg-slate-900/80 rounded-xl border border-slate-800 p-3 text-left">
                <p className="text-[10px] font-bold text-purple-400 mb-2 uppercase tracking-widest">? Powerup Words</p>
                <div className="grid grid-cols-1 gap-1">
                  {POWERUP_DEFS.map(pu => (
                    <div key={pu.id} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-base">{pu.icon}</span>
                      <span className="font-bold w-16" style={{ color: pu.color }}>{pu.label}</span>
                      <span>{pu.description}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full text-left bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <label className="text-slate-400 text-xs mb-1 block font-semibold">Player Name</label>
                <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value || 'Player 1')} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
            <button onClick={startGame} className="w-full max-w-sm py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-cyan-500/30 text-base transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 mt-4 shrink-0">
              <Play className="w-5 h-5 fill-current" /> START ENDLESS RUN
            </button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <h2 className="text-3xl font-extrabold text-red-500 mb-4">?? MOUNTAIN BASE DESTROYED</h2>
            <div className="flex items-center gap-5 mb-4 font-mono">
              <div className="text-center"><div className="text-3xl font-extrabold text-cyan-400">{survivalTime}s</div><div className="text-slate-500 text-xs">survived</div></div>
              <div className="text-center"><div className="text-3xl font-extrabold text-purple-400">{score.toLocaleString()}</div><div className="text-slate-500 text-xs">score</div></div>
              <div className="text-center"><div className="text-3xl font-extrabold text-emerald-400">{totalWords}</div><div className="text-slate-500 text-xs">words</div></div>
              <div className="text-center"><div className="text-3xl font-extrabold text-amber-400">{accuracy}%</div><div className="text-slate-500 text-xs">accuracy</div></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleSubmitScore} disabled={scoreSubmitted} className={`px-6 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${scoreSubmitted ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-500/20'}`}>
                {scoreSubmitted ? 'Score Saved ?' : '?? Save Score'}
              </button>
              <button onClick={startGame} className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {gameState === 'playing' && (
        <div className="w-full max-w-[800px] mt-3">
          <button onClick={focusMobileKeyboard} onTouchStart={(e) => { e.preventDefault(); focusMobileKeyboard(); }} className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 text-white font-bold rounded-xl text-sm border border-purple-400/40 shadow-lg transition-all flex items-center justify-center gap-2 select-none">
            <Keyboard className="w-5 h-5 text-cyan-300" /> TAP TO OPEN PHONE KEYBOARD ??
          </button>
        </div>
      )}

      <div className="w-full max-w-[800px] mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div><strong className="text-cyan-400">Controls:</strong> Type matching letters to fire laser beams at falling meteors</div>
        <div><strong className="text-purple-400">Powerups:</strong> Glowing meteors grant abilities  type them fast!</div>
      </div>
    </div>
  );
}
