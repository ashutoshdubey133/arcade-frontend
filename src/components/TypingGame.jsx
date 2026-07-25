import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, RotateCcw, Volume2, VolumeX,
  Flame, Shield, Play, Keyboard, Zap, Trophy, Star, Sparkles, Award
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
  { id: 'shield', label: 'HEAL',    color: '#10b981', description: '+30 Shield HP',   duration: 0,     badgeLabel: 'HEAL +30HP'  },
  { id: 'slow',   label: 'SLOW',    color: '#38bdf8', description: 'Slow Wave (8s)',  duration: 8000,  badgeLabel: 'SLOW WAVE'   },
  { id: 'blast',  label: 'BLAST',   color: '#f59e0b', description: 'Clear Screen',    duration: 0,     badgeLabel: 'BLAST CLEAR' },
  { id: 'double', label: '2x RUSH', color: '#a855f7', description: '2x Score (10s)', duration: 10000, badgeLabel: '2x SCORE'    },
  { id: 'freeze', label: 'FREEZE',  color: '#06b6d4', description: 'Freeze All (5s)', duration: 5000,  badgeLabel: 'FROZEN'      },
];

const POWERUP_CANVAS_ICON = { shield: '[+]', slow: '[~]', blast: '[!]', double: '[2x]', freeze: '[||]' };

const getWaveConfig = (wave) => {
  const targetCount = 7 + wave * 3; // Wave 1: 10, Wave 2: 13, Wave 3: 16...
  // Smooth, controllable speed curve that peaks gently around 2.2 max
  const baseSpeed = Math.min(2.3, 1.05 + (wave - 1) * 0.08);
  // Ensure comfortable typing rhythm between spawns
  const spawnInterval = Math.max(1200, 2400 - (wave - 1) * 80);

  let lengthWeights;
  if (wave === 1) {
    lengthWeights = { 1: 0.6, 2: 0.4 };
  } else if (wave === 2) {
    lengthWeights = { 1: 0.3, 2: 0.5, 3: 0.2 };
  } else if (wave === 3) {
    lengthWeights = { 2: 0.4, 3: 0.4, 4: 0.2 };
  } else if (wave === 4) {
    lengthWeights = { 2: 0.2, 3: 0.4, 4: 0.3, 5: 0.1 };
  } else if (wave === 5) {
    lengthWeights = { 3: 0.3, 4: 0.4, 5: 0.2, 6: 0.1 };
  } else {
    lengthWeights = { 3: 0.15, 4: 0.35, 5: 0.3, 6: 0.15, 7: 0.05 };
  }

  return { targetCount, baseSpeed, spawnInterval, lengthWeights };
};

const pickWordForWave = (lengthWeights) => {
  const entries = Object.entries(lengthWeights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [len, w] of entries) {
    r -= w;
    if (r <= 0) {
      const pool = WORD_POOLS[+len] || WORD_POOLS[3];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }
  return WORD_POOLS[2][Math.floor(Math.random() * WORD_POOLS[2].length)];
};

import PlayerHandleWidget from './PlayerHandleWidget';

export default function TypingGame({ 
  onBackToHub, 
  onSaveScore, 
  playerName = 'Player', 
  onResetPlayerName 
}) {
  const [gameState,      setGameState]      = useState('menu'); // 'menu', 'playing', 'wave_clear', 'gameover'
  const [wave,           setWave]           = useState(1);
  const [waveProgress,   setWaveProgress]   = useState(0);
  const [waveTarget,     setWaveTarget]     = useState(10);
  const [score,          setScore]          = useState(0);
  const [health,         setHealth]         = useState(100);
  const [combo,          setCombo]          = useState(0);
  const [totalWords,     setTotalWords]     = useState(0);
  const [isMuted,        setIsMuted]        = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [activePowerups, setActivePowerups] = useState([]);
  const [survivalTime,   setSurvivalTime]   = useState(0);
  const [hasDouble,      setHasDouble]      = useState(false);
  const [isFever,        setIsFever]        = useState(false);
  const [liveAccuracy,   setLiveAccuracy]   = useState(100);
  const [finalAccuracy,  setFinalAccuracy]  = useState(100);
  const [viewportHeight, setViewportHeight] = useState(() => {
    return window.visualViewport ? window.visualViewport.height : window.innerHeight;
  });

  useEffect(() => {
    const handleViewport = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      } else {
        setViewportHeight(window.innerHeight);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewport);
      window.visualViewport.addEventListener('scroll', handleViewport);
    }
    window.addEventListener('resize', handleViewport);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewport);
        window.visualViewport.removeEventListener('scroll', handleViewport);
      }
      window.removeEventListener('resize', handleViewport);
    };
  }, []);

  const lettersAttempted = useRef(0);
  const lettersCorrect   = useRef(0);

  const canvasRef         = useRef(null);
  const mobileInputRef    = useRef(null);
  const animationFrameRef = useRef(null);
  const lastSpawnTime     = useRef(0);
  const gameStartTime     = useRef(0);
  const wordsSpawnedInWave = useRef(0);
  const wordsDestroyedInWave = useRef(0);
  const feverExpiry       = useRef(0);
  const scoreMultRef      = useRef(1);
  const multiplierExpiry  = useRef(0);
  const slowExpiry        = useRef(0);
  const freezeExpiry      = useRef(0);
  const waveClearTimer    = useRef(null);

  const engineState = useRef({
    meteors: [],
    lasers: [],
    particles: [],
    floaters: [],
    stars: [],
    screenShake: 0,
    activeTargetId: null,
    pendingPowerup: null
  });

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

  const focusMobileKeyboard = () => {
    if (gameState === 'playing' && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
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

  const addParticles = (x, y, color, count = 14) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 5;
      engineState.current.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        alpha: 1,
        color
      });
    }
  };

  const addFloater = (x, y, text, color = '#38bdf8') => {
    engineState.current.floaters.push({
      x, y, text, color, alpha: 1.0, vy: -1.2
    });
  };

  const triggerFeverMode = () => {
    const now = Date.now();
    feverExpiry.current = now + 6000;
    setIsFever(true);
    soundFX.playPowerUp();
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.4 } });
    setActivePowerups(p => [
      ...p.filter(x => x.id !== 'fever'),
      { id: 'fever', badgeLabel: '🔥 HYPER FEVER (3x)', color: '#ec4899', expiresAt: now + 6000 }
    ]);
  };

  const applyPowerup = (powerupId) => {
    const now = Date.now();
    const engine = engineState.current;
    soundFX.playPowerUp();
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 }, zIndex: 9999 });

    switch (powerupId) {
      case 'shield':
        setHealth(h => Math.min(100, h + 30));
        addFloater(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 100, '+30 SHIELD HP!', '#10b981');
        break;
      case 'slow':
        slowExpiry.current = now + 8000;
        setActivePowerups(p => [...p.filter(x => x.id !== 'slow'), { id: 'slow', badgeLabel: 'SLOW WAVE', color: '#38bdf8', expiresAt: now + 8000 }]);
        break;
      case 'blast':
        engine.meteors.forEach(m => addParticles(m.x, m.y, m.color, 12));
        const count = engine.meteors.length;
        engine.meteors = [];
        engine.activeTargetId = null;
        wordsDestroyedInWave.current += count;
        setWaveProgress(wordsDestroyedInWave.current);
        setScore(s => s + count * 150 * scoreMultRef.current);
        addFloater(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, `BLAST! +${count * 150} PTS`, '#f59e0b');
        confetti({ particleCount: 90, spread: 110, origin: { y: 0.5 } });
        break;
      case 'double':
        scoreMultRef.current = 2;
        multiplierExpiry.current = now + 10000;
        setHasDouble(true);
        setActivePowerups(p => [...p.filter(x => x.id !== 'double'), { id: 'double', badgeLabel: '2x SCORE', color: '#a855f7', expiresAt: now + 10000 }]);
        break;
      case 'freeze':
        freezeExpiry.current = now + 5000;
        setActivePowerups(p => [...p.filter(x => x.id !== 'freeze'), { id: 'freeze', badgeLabel: 'FROZEN', color: '#06b6d4', expiresAt: now + 5000 }]);
        break;
      default:
        break;
    }
  };

  const processKeyPress = (typedChar) => {
    if (gameState !== 'playing') return;
    const engine = engineState.current;
    let target = null;

    // 1. Check if current active target meteor matches the typed character at its current typedIndex
    if (engine.activeTargetId) {
      const active = engine.meteors.find(m => m.id === engine.activeTargetId);
      if (active && active.text[active.typedIndex] === typedChar) {
        target = active;
      }
    }

    // 2. If active target didn't match, check if typedChar matches any meteor on screen (prefer lowest)
    if (!target) {
      const matching = engine.meteors
        .filter(m => m.text[m.typedIndex] === typedChar || m.text[0] === typedChar)
        .sort((a, b) => b.y - a.y);

      if (matching.length > 0) {
        const selected = matching[0];
        // If switching from another active target, reset old target's typedIndex
        if (engine.activeTargetId && engine.activeTargetId !== selected.id) {
          const prev = engine.meteors.find(m => m.id === engine.activeTargetId);
          if (prev) prev.typedIndex = 0;
        }

        // If matching at text[0] due to a target switch, ensure typedIndex points to start
        if (selected.text[selected.typedIndex] !== typedChar && selected.text[0] === typedChar) {
          selected.typedIndex = 0;
        }

        target = selected;
        engine.activeTargetId = selected.id;
      }
    }

    // 3. Process keypress result
    if (target) {
      lettersAttempted.current++;
      lettersCorrect.current++;
      target.typedIndex++;
      soundFX.playTypePop();

      const now = Date.now();
      const inFever = feverExpiry.current > now;
      const laserColor = inFever ? '#ec4899' : '#38bdf8';
      engine.lasers.push({
        x1: CANVAS_WIDTH / 2,
        y1: CANVAS_HEIGHT - 20,
        x2: target.x,
        y2: target.y,
        color: laserColor,
        alpha: 1.0
      });

      // Word completed!
      if (target.typedIndex >= target.text.length) {
        addParticles(target.x, target.y, target.color, 16);
        soundFX.playPowerUp();

        if (target.isPowerup) applyPowerup(target.powerupId);

        engine.meteors = engine.meteors.filter(m => m.id !== target.id);
        engine.activeTargetId = null;

        wordsDestroyedInWave.current++;
        setTotalWords(w => w + 1);
        setWaveProgress(wordsDestroyedInWave.current);

        setCombo(c => {
          const nextCombo = c + 1;
          const feverMultiplier = feverExpiry.current > Date.now() ? (nextCombo >= 20 ? 5 : 3) : 1;
          const pts = (target.text.length * 25 + nextCombo * 10) * scoreMultRef.current * feverMultiplier;
          setScore(s => s + pts);

          addFloater(
            target.x,
            target.y - 15,
            `+${pts}${nextCombo > 3 ? ` (${nextCombo}x)` : ''}`,
            inFever ? '#ec4899' : nextCombo > 5 ? '#f59e0b' : '#4ade80'
          );

          // Escalating Streak Milestones & Rewards:
          // 7x: Hyper Fever (3x Score)
          // 10x: Streak Boost +500 PTS + 15 Shield HP + Instant Powerup Spawn
          // 15x: EMP Plasma Wave (clears lowest 3 meteors) + 1,000 PTS + 20 Shield HP
          // 20x: Mega Godlike Fever (5x Score for 8s) + 2,500 PTS + Full Shield Repair
          // 30x, 40x, 50x...: Legendary EMP Blast + 3,000 PTS + Full Shield Repair
          if (nextCombo === 7 && feverExpiry.current <= Date.now()) {
            triggerFeverMode();
          } else if (nextCombo === 10) {
            soundFX.playPowerUp();
            confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
            setHealth(h => Math.min(100, h + 15));
            setScore(s => s + 500);
            addFloater(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, '🔥 10x STREAK BOOST! +500 PTS & REPAIR!', '#f59e0b');
            if (!engine.pendingPowerup) {
              engine.pendingPowerup = POWERUP_DEFS[Math.floor(Math.random() * POWERUP_DEFS.length)];
            }
          } else if (nextCombo === 15) {
            soundFX.playPowerUp();
            confetti({ particleCount: 90, spread: 100, origin: { y: 0.4 } });
            setHealth(h => Math.min(100, h + 20));
            setScore(s => s + 1000);
            addFloater(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, '⚡ 15x EMP PLASMA STORM! +1,000 PTS!', '#38bdf8');
            
            const lowestMeteors = [...engine.meteors].sort((a, b) => b.y - a.y).slice(0, 3);
            lowestMeteors.forEach(m => {
              addParticles(m.x, m.y, '#38bdf8', 20);
              addFloater(m.x, m.y, 'EMP BLAST!', '#06b6d4');
            });
            const clearedIds = new Set(lowestMeteors.map(m => m.id));
            engine.meteors = engine.meteors.filter(m => !clearedIds.has(m.id));
            wordsDestroyedInWave.current += clearedIds.size;
            setTotalWords(w => w + clearedIds.size);
            setWaveProgress(wordsDestroyedInWave.current);
            engine.activeTargetId = null;
          } else if (nextCombo === 20) {
            const nowTime = Date.now();
            feverExpiry.current = nowTime + 8000;
            setIsFever(true);
            soundFX.playPowerUp();
            confetti({ particleCount: 120, spread: 120, origin: { y: 0.3 } });
            setHealth(100);
            setScore(s => s + 2500);
            addFloater(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, '👑 20x GODLIKE STREAK! 5x FEVER + 2,500 PTS!', '#ec4899');
            setActivePowerups(p => [
              ...p.filter(x => x.id !== 'fever'),
              { id: 'fever', badgeLabel: '👑 MEGA FEVER (5x)', color: '#a855f7', expiresAt: nowTime + 8000 }
            ]);
          } else if (nextCombo >= 30 && nextCombo % 10 === 0) {
            soundFX.playPowerUp();
            confetti({ particleCount: 150, spread: 140, origin: { y: 0.3 } });
            setHealth(100);
            setScore(s => s + 3000);
            addFloater(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, `🏆 ${nextCombo}x LEGENDARY STREAK! +3,000 PTS!`, '#eab308');
            
            const lowestMeteors = [...engine.meteors].sort((a, b) => b.y - a.y).slice(0, 4);
            lowestMeteors.forEach(m => {
              addParticles(m.x, m.y, '#eab308', 20);
              addFloater(m.x, m.y, 'EMP BLAST!', '#eab308');
            });
            const clearedIds = new Set(lowestMeteors.map(m => m.id));
            engine.meteors = engine.meteors.filter(m => !clearedIds.has(m.id));
            wordsDestroyedInWave.current += clearedIds.size;
            setTotalWords(w => w + clearedIds.size);
            setWaveProgress(wordsDestroyedInWave.current);
            engine.activeTargetId = null;
          } else if (nextCombo === 5 && !engine.pendingPowerup) {
            engine.pendingPowerup = POWERUP_DEFS[Math.floor(Math.random() * POWERUP_DEFS.length)];
          }

          return nextCombo;
        });
      }
    } else {
      // Genuine Miss: typed character matched no meteor on screen
      lettersAttempted.current++;
      soundFX.playTypeMiss();
      setCombo(0);
    }

    if (lettersAttempted.current > 0) {
      setLiveAccuracy(Math.round((lettersCorrect.current / lettersAttempted.current) * 100));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      if (e.key.length !== 1) return;
      const c = e.key.toUpperCase();
      if (!/^[A-Z]$/.test(c)) return;

      // Prevent default to avoid double-processing via mobileInputRef onChange on desktop!
      e.preventDefault();
      processKeyPress(c);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps // eslint-disable-line react-hooks/exhaustive-deps

  const startWave = (waveNum) => {
    setWave(waveNum);
    const cfg = getWaveConfig(waveNum);
    setWaveTarget(cfg.targetCount);
    setWaveProgress(0);
    wordsSpawnedInWave.current = 0;
    wordsDestroyedInWave.current = 0;
    lastSpawnTime.current = Date.now();
    setGameState('playing');
  };

  const startGame = () => {
    setScore(0);
    setHealth(100);
    setCombo(0);
    setTotalWords(0);
    setScoreSubmitted(false);
    setActivePowerups([]);
    setSurvivalTime(0);
    setHasDouble(false);
    setIsFever(false);
    setLiveAccuracy(100);
    setFinalAccuracy(100);

    lettersAttempted.current = 0;
    lettersCorrect.current = 0;
    scoreMultRef.current = 1;
    multiplierExpiry.current = 0;
    slowExpiry.current = 0;
    freezeExpiry.current = 0;
    feverExpiry.current = 0;

    const engine = engineState.current;
    engine.meteors = [];
    engine.lasers = [];
    engine.particles = [];
    engine.floaters = [];
    engine.screenShake = 0;
    engine.activeTargetId = null;
    engine.pendingPowerup = null;

    gameStartTime.current = Date.now();
    startWave(1);
  };

  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'wave_clear') return;
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

      if (multiplierExpiry.current > 0 && now > multiplierExpiry.current) {
        scoreMultRef.current = 1;
        multiplierExpiry.current = 0;
        setHasDouble(false);
        setActivePowerups(p => p.filter(x => x.id !== 'double'));
      }
      if (slowExpiry.current > 0 && now > slowExpiry.current) {
        slowExpiry.current = 0;
        setActivePowerups(p => p.filter(x => x.id !== 'slow'));
      }
      if (freezeExpiry.current > 0 && now > freezeExpiry.current) {
        freezeExpiry.current = 0;
        setActivePowerups(p => p.filter(x => x.id !== 'freeze'));
      }
      if (feverExpiry.current > 0 && now > feverExpiry.current) {
        feverExpiry.current = 0;
        setIsFever(false);
        setActivePowerups(p => p.filter(x => x.id !== 'fever'));
      }

      const isFrozen = freezeExpiry.current > now;
      const slowFactor = slowExpiry.current > now ? 0.45 : 1.0;
      const inFever = feverExpiry.current > now;

      const waveConfig = getWaveConfig(wave);

      // Spawning Logic for Wave
      if (!isFrozen && wordsSpawnedInWave.current < waveConfig.targetCount) {
        if (now - lastSpawnTime.current > waveConfig.spawnInterval) {
          lastSpawnTime.current = now;
          wordsSpawnedInWave.current++;

          if (engine.pendingPowerup) {
            const pu = engine.pendingPowerup;
            engine.pendingPowerup = null;
            const word = POWERUP_WORD_POOL[Math.floor(Math.random() * POWERUP_WORD_POOL.length)];
            engine.meteors.push({
              id: Math.random().toString(),
              x: 90 + Math.random() * (CANVAS_WIDTH - 180),
              y: -20,
              text: word,
              typedIndex: 0,
              speed: waveConfig.baseSpeed * 0.7,
              color: pu.color,
              isPowerup: true,
              powerupId: pu.id,
              powerupIcon: POWERUP_CANVAS_ICON[pu.id] || '[P]'
            });
          } else {
            const word = pickWordForWave(waveConfig.lengthWeights);
            const colors = ['#06b6d4', '#a855f7', '#f43f5e', '#f59e0b', '#10b981'];

            // Long words fall slower so player has time to type them out!
            const lengthSpeedFactor = Math.max(0.55, 1.0 - (word.length - 1) * 0.08);
            const speed = waveConfig.baseSpeed * lengthSpeedFactor + (Math.random() * 0.15 - 0.075);

            engine.meteors.push({
              id: Math.random().toString(),
              x: 70 + Math.random() * (CANVAS_WIDTH - 140),
              y: -20,
              text: word,
              typedIndex: 0,
              speed,
              color: colors[Math.floor(Math.random() * colors.length)],
              isPowerup: false
            });
          }
        }
      } else if (isFrozen) {
        // Keep spawn timer updated so when freeze ends, full spawn interval is respected!
        lastSpawnTime.current = now;
      }

      // Check Wave Completion
      if (
        wordsSpawnedInWave.current >= waveConfig.targetCount &&
        engine.meteors.length === 0 &&
        gameState === 'playing'
      ) {
        soundFX.playScore();
        confetti({ particleCount: 75, spread: 80, origin: { y: 0.5 } });
        setHealth(h => Math.min(100, h + 15)); // Wave clear bonus shield
        setScore(s => s + wave * 300); // Wave clear bonus points
        setGameState('wave_clear');

        waveClearTimer.current = setTimeout(() => {
          startWave(wave + 1);
        }, 2200);
      }

      // Update positions
      if (!isFrozen && gameState === 'playing') {
        for (let i = engine.meteors.length - 1; i >= 0; i--) {
          const m = engine.meteors[i];
          m.y += m.speed * slowFactor;

          if (Math.random() < 0.2) {
            engine.particles.push({
              x: m.x + (Math.random() * 16 - 8),
              y: m.y - 8,
              vx: Math.random() * 0.6 - 0.3,
              vy: -1 - Math.random() * 0.6,
              radius: 2,
              alpha: 0.5,
              color: m.color
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
              const dmg = m.isPowerup ? 5 : Math.min(25, 8 + m.text.length * 2);
              const nextH = Math.max(0, h - dmg);
              if (nextH <= 0) {
                soundFX.playGameOver(false);
                const fa = lettersAttempted.current > 0
                  ? Math.round((lettersCorrect.current / lettersAttempted.current) * 100)
                  : 100;
                setFinalAccuracy(fa);
                setGameState('gameover');
              }
              return nextH;
            });
          }
        }
      }

      // Drawing
      ctx.save();
      if (engine.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * engine.screenShake, (Math.random() - 0.5) * engine.screenShake);
        engine.screenShake *= 0.83;
        if (engine.screenShake < 0.5) engine.screenShake = 0;
      }
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Sky Background Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      if (inFever) {
        skyGrad.addColorStop(0, '#2a0828');
        skyGrad.addColorStop(0.5, '#3b0764');
        skyGrad.addColorStop(1, '#581c87');
      } else {
        skyGrad.addColorStop(0, '#0a0a1a');
        skyGrad.addColorStop(0.5, '#1e112a');
        skyGrad.addColorStop(1, '#2d123d');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (isFrozen) {
        ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#38bdf8'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); ctx.restore();
      }
      if (slowFactor < 1) {
        ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#38bdf8'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); ctx.restore();
      }

      // Stars
      engine.stars.forEach(st => {
        st.alpha += st.twinkleSpeed;
        if (st.alpha > 1 || st.alpha < 0.2) st.twinkleSpeed = -st.twinkleSpeed;
        ctx.save();
        ctx.globalAlpha = Math.max(0.1, st.alpha);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Glowing Moon
      ctx.save();
      ctx.shadowColor = inFever ? '#f472b6' : '#c084fc';
      ctx.shadowBlur = 25;
      ctx.fillStyle = inFever ? '#fbcfe8' : '#f3e8ff';
      ctx.beginPath();
      ctx.arc(680, 80, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Parallax Mountains
      ctx.fillStyle = '#1e1b4b'; ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT); ctx.lineTo(0, 320); ctx.lineTo(120, 240); ctx.lineTo(250, 340); ctx.lineTo(400, 220); ctx.lineTo(550, 330); ctx.lineTo(700, 210); ctx.lineTo(CANVAS_WIDTH, 310); ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT); ctx.lineTo(0, 380); ctx.lineTo(180, 290); ctx.lineTo(320, 390); ctx.lineTo(480, 280); ctx.lineTo(620, 380); ctx.lineTo(CANVAS_WIDTH, 300); ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#020617'; ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT); ctx.lineTo(0, 440); ctx.lineTo(CANVAS_WIDTH, 440); ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT); ctx.closePath(); ctx.fill();

      // Laser Cannon Base
      ctx.save();
      ctx.shadowColor = inFever ? '#ec4899' : '#38bdf8';
      ctx.shadowBlur = 18;
      ctx.fillStyle = inFever ? '#db2777' : '#0284c7';
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10, 24, Math.PI, 0, false);
      ctx.fill();
      ctx.restore();

      // Lasers
      for (let i = engine.lasers.length - 1; i >= 0; i--) {
        const l = engine.lasers[i];
        l.alpha -= 0.08;
        if (l.alpha <= 0) { engine.lasers.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = l.alpha;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = inFever ? 6 : 4;
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
        ctx.restore();
      }

      // Particles
      for (let i = engine.particles.length - 1; i >= 0; i--) {
        const pt = engine.particles[i];
        pt.x += pt.vx; pt.y += pt.vy; pt.alpha -= 0.03;
        if (pt.alpha <= 0) { engine.particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Floating Score Text
      for (let i = engine.floaters.length - 1; i >= 0; i--) {
        const fl = engine.floaters[i];
        fl.y += fl.vy;
        fl.alpha -= 0.02;
        if (fl.alpha <= 0) { engine.floaters.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = fl.alpha;
        ctx.font = 'bold 15px monospace';
        ctx.fillStyle = fl.color;
        ctx.shadowColor = fl.color;
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText(fl.text, fl.x, fl.y);
        ctx.restore();
      }

      // Meteors / Words
      for (const m of engine.meteors) {
        ctx.save();
        const isTarget = engine.activeTargetId === m.id;

        if (m.isPowerup) {
          const pulse = Math.sin(now / 220) * 0.45 + 0.55;
          ctx.shadowColor = isFrozen ? '#06b6d4' : m.color;
          ctx.shadowBlur = 18 + pulse * 18;
          ctx.fillStyle = '#0d1f14';
          ctx.strokeStyle = isFrozen ? '#38bdf8' : m.color;
          ctx.lineWidth = 2.5;
        } else if (isFrozen) {
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = isTarget ? 24 : 16;
          ctx.fillStyle = isTarget ? '#083344' : '#0c4a6e';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = isTarget ? 3 : 2;
        } else {
          ctx.shadowColor = isTarget ? '#22c55e' : m.color;
          ctx.shadowBlur = isTarget ? 22 : 12;
          ctx.fillStyle = isTarget ? '#052e16' : '#0f172a';
          ctx.strokeStyle = isTarget ? '#22c55e' : m.color;
          ctx.lineWidth = isTarget ? 3 : 2;
        }

        const iconPad = m.isPowerup ? 30 : 0;
        const boxWidth = Math.max(64, m.text.length * 20 + 24 + iconPad);
        const boxHeight = m.isPowerup ? 48 : 40;

        ctx.beginPath();
        ctx.roundRect(m.x - boxWidth / 2, m.y - boxHeight / 2, boxWidth, boxHeight, 10);
        ctx.fill();
        ctx.stroke();

        if (m.isPowerup) {
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = m.color;
          ctx.shadowBlur = 0;
          ctx.fillText(m.powerupIcon, m.x - boxWidth / 2 + 5, m.y);
        }

        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const typed = m.text.substring(0, m.typedIndex);
        const remaining = m.text.substring(m.typedIndex);
        const totalW = ctx.measureText(m.text).width;
        let startX = m.x - totalW / 2 + (m.isPowerup ? iconPad / 2 : 0);

        if (typed) {
          ctx.fillStyle = '#4ade80';
          ctx.fillText(typed, startX, m.y);
          startX += ctx.measureText(typed).width;
        }
        if (remaining) {
          ctx.fillStyle = m.isPowerup ? m.color : '#f8fafc';
          ctx.fillText(remaining, startX, m.y);
        }
        ctx.restore();
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    };

    animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, wave]); // eslint-disable-line react-hooks/exhaustive-deps

  const latestScoreRef = useRef({ score: 0, playerName, wave: 1, survivalTime: 0, totalWords: 0, liveAccuracy: 100, submitted: false });

  useEffect(() => {
    latestScoreRef.current.score = score;
    latestScoreRef.current.playerName = playerName;
    latestScoreRef.current.wave = wave;
    latestScoreRef.current.survivalTime = survivalTime;
    latestScoreRef.current.totalWords = totalWords;
    latestScoreRef.current.liveAccuracy = liveAccuracy;
  }, [score, playerName, wave, survivalTime, totalWords, liveAccuracy]);

  useEffect(() => {
    const autoSaveProgress = () => {
      const { score: s, playerName: p, wave: w, survivalTime: st, totalWords: tw, liveAccuracy: acc, submitted } = latestScoreRef.current;
      if (s > 0 && !submitted && onSaveScore) {
        latestScoreRef.current.submitted = true;
        onSaveScore({
          playerName: p || 'Player 1',
          game: 'Sky Letters',
          score: s,
          mode: `Wave ${w} | ${st}s | ${tw} words | ${acc}% acc (Auto-Saved)`,
          date: new Date().toISOString()
        });
      }
    };

    const handleUnload = () => autoSaveProgress();
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      autoSaveProgress();
    };
  }, [onSaveScore]);

  const handleSubmitScore = () => {
    if (!latestScoreRef.current.submitted && onSaveScore) {
      latestScoreRef.current.submitted = true;
      onSaveScore({
        playerName: playerName || 'Player 1',
        game: 'Sky Letters',
        score,
        mode: `Wave ${wave} | ${survivalTime}s | ${totalWords} words | ${finalAccuracy}% acc`,
        date: new Date().toISOString()
      });
      setScoreSubmitted(true);
    }
  };

  const accColor = liveAccuracy >= 90 ? 'text-emerald-400' : liveAccuracy >= 70 ? 'text-amber-400' : 'text-red-400';
  const finalAccColor = finalAccuracy >= 90 ? 'text-emerald-400' : finalAccuracy >= 70 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex flex-col items-center justify-start sm:justify-center w-full min-h-[100dvh] sm:min-h-[85vh] p-0 sm:p-4 select-none">
      
      {/* Mobile Ultra-Compact Top Bar (Shown only on small screens < 640px) */}
      <div className="w-full flex sm:hidden items-center justify-between px-2.5 py-2 bg-slate-950/95 border-b border-slate-800 backdrop-blur z-20 text-xs font-mono font-black shrink-0">
        <button onClick={onBackToHub} className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold">
          <ArrowLeft className="w-4 h-4" /> Hub
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-purple-400 font-extrabold">W{wave} ({waveProgress}/{waveTarget})</span>
          <span className="text-cyan-400 font-extrabold">⭐{score}</span>
          <span className={health > 50 ? 'text-emerald-400' : 'text-red-400'}>❤️{health}%</span>
          {combo > 1 && <span className="text-amber-400 animate-pulse">🔥{combo}x</span>}
        </div>

        <button onClick={handleToggleMute} className="p-1.5 text-slate-300 bg-slate-800 rounded-lg">
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>

      {/* Desktop Top Bar Navigation & Stats (Hidden on mobile < 640px) */}
      <div className="hidden sm:flex w-full max-w-[800px] items-center justify-between mb-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 backdrop-blur">
        <button onClick={onBackToHub} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" /> Arcade Hub
        </button>
        <div className="flex items-center gap-4 font-mono font-bold text-sm">
          <div className="flex items-center gap-1.5 text-purple-400 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-800/50">
            <Award className="w-4 h-4" /> WAVE {wave}
          </div>
          <div className="flex items-center gap-1 text-cyan-400"><Star className="w-3.5 h-3.5 fill-cyan-400" />{score.toLocaleString()}</div>
          {hasDouble && <div className="text-yellow-300 animate-pulse text-xs px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded-full font-bold">2x ON</div>}
          <div className="text-slate-400 text-xs hidden sm:block">Words: {totalWords}</div>
          <div className={"text-xs font-bold " + accColor}>Acc: {liveAccuracy}%</div>
          {combo > 1 && (
            <div className="text-amber-400 flex items-center gap-1 animate-bounce text-xs bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/40">
              <Flame className="w-3.5 h-3.5 fill-amber-400" /> {combo}x
            </div>
          )}
        </div>
        <button onClick={handleToggleMute} className="p-2 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
        </button>
      </div>

      {/* Active Powerups Banner */}
      {activePowerups.length > 0 && (
        <div className="w-full max-w-[800px] flex gap-2 px-2 sm:px-0 mb-2 flex-wrap shrink-0">
          {activePowerups.map(pu => {
            const remaining = Math.max(0, Math.ceil((pu.expiresAt - Date.now()) / 1000));
            return (
              <div key={pu.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold font-mono animate-pulse"
                style={{ backgroundColor: pu.color + '22', borderColor: pu.color + '66', color: pu.color }}>
                <Zap className="w-3 h-3" />{pu.badgeLabel}<span className="text-white opacity-70">{remaining}s</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Game Canvas Container (Full-size proportional canvas) */}
      <div className="relative border-0 sm:border-4 border-slate-800 rounded-none sm:rounded-2xl overflow-hidden shadow-2xl shadow-indigo-950/40 bg-slate-950 w-full max-w-[900px] flex-1 flex items-center justify-center min-h-[420px] sm:min-h-[450px]">
        {/* Desktop Canvas HUD Bar (Shield & Wave Progress - Hidden on Mobile to maximize canvas space) */}
        <div className="hidden sm:flex absolute top-4 left-4 right-4 z-20 items-center justify-between pointer-events-none">
          {/* Health Shield */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur">
            <Shield className="w-4 h-4 text-cyan-400" />
            <div className="w-28 bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div className={"h-full transition-all duration-300 " + (health > 50 ? 'bg-emerald-500' : health > 25 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: health + '%' }} />
            </div>
            <span className="text-xs font-mono font-bold text-slate-200">{health}%</span>
          </div>

          {/* Wave Meter */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur">
            <span className="text-xs font-mono text-purple-400 font-bold">WAVE {wave}</span>
            <div className="w-24 bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300" style={{ width: Math.min(100, Math.round((waveProgress / waveTarget) * 100)) + '%' }} />
            </div>
            <span className="text-xs font-mono text-slate-300 font-bold">{waveProgress}/{waveTarget}</span>
          </div>
        </div>

        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} onClick={focusMobileKeyboard} onTouchStart={focusMobileKeyboard} className="block w-full h-full sm:h-auto cursor-pointer object-contain" />
        <input ref={mobileInputRef} type="text" onChange={handleMobileInputChange} className="opacity-0 absolute top-0 left-0 w-1 h-1 pointer-events-none" autoCapitalize="characters" autoCorrect="off" autoComplete="off" />

        {/* Wave Clear Transition Modal */}
        {gameState === 'wave_clear' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-fade-in">
            <Sparkles className="w-12 h-12 text-yellow-400 animate-spin mb-2" />
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 tracking-wider">
              WAVE {wave} CLEARED!
            </h2>
            <p className="text-slate-300 text-sm mt-1">Base Shield Repaired (+15 HP) • Bonus +{wave * 300} PTS</p>
            <div className="mt-4 px-4 py-1.5 bg-purple-900/40 border border-purple-500/50 text-purple-300 font-mono text-xs font-bold rounded-full animate-pulse">
              GET READY FOR WAVE {wave + 1}...
            </div>
          </div>
        )}

        {/* Menu Screen */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 text-center overflow-y-auto z-30">
            <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-3 pt-2">
              <Keyboard className="w-8 h-8 text-cyan-400 animate-bounce" />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500">SKY LETTERS</h1>
              <p className="text-slate-400 text-xs sm:text-sm max-w-xs">Defend your base in progressive waves! Maintain combos to trigger Hyper Fever Mode.</p>

              <div className="w-full bg-slate-900/80 rounded-xl border border-slate-800 p-3 text-left">
                <p className="text-[10px] font-bold text-purple-400 mb-2 uppercase tracking-widest">Escalating Streak Milestones & Powerups</p>
                <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-pink-400 shrink-0" /><strong className="text-pink-400">7x Streak:</strong> 6s 3x Hyper Fever Mode</div>
                  <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" /><strong className="text-amber-400">10x Streak:</strong> +500 PTS + 15 HP Repair & Powerup</div>
                  <div className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" /><strong className="text-cyan-400">15x Streak:</strong> ⚡ EMP Plasma Wave + 1,000 PTS</div>
                  <div className="flex items-center gap-2"><Award className="w-3.5 h-3.5 text-purple-400 shrink-0" /><strong className="text-purple-400">20x Streak:</strong> 👑 5x Godlike Fever + Full Repair</div>
                  {POWERUP_DEFS.map(pu => (
                    <div key={pu.id} className="flex items-center gap-2">
                      <span className="font-bold w-14 shrink-0" style={{ color: pu.color }}>{pu.label}</span>
                      <span className="text-slate-400">{pu.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <PlayerHandleWidget
                playerName={playerName}
                onResetPlayerName={onResetPlayerName}
                accentColor="cyan"
              />
            </div>

            <button onClick={startGame} className="w-full max-w-sm py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-cyan-500/30 text-base transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 mt-4 shrink-0">
              <Play className="w-5 h-5 fill-current" /> START WAVE DEFENSE
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <h2 className="text-2xl font-extrabold text-red-400 mb-1 tracking-wide">MOUNTAIN BASE DESTROYED</h2>
            <p className="text-slate-400 text-xs mb-5">Reached Wave {wave} • High-score summary:</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 w-full max-w-md">
              <div className="bg-slate-900 border border-purple-900/50 rounded-xl py-3 px-2 text-center">
                <div className="text-2xl font-extrabold text-purple-400 font-mono">WAVE {wave}</div>
                <div className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-widest">Reached</div>
              </div>
              <div className="bg-slate-900 border border-cyan-900/50 rounded-xl py-3 px-2 text-center">
                <div className="text-2xl font-extrabold text-cyan-400 font-mono">{score.toLocaleString()}</div>
                <div className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-widest">Score</div>
              </div>
              <div className="bg-slate-900 border border-emerald-900/50 rounded-xl py-3 px-2 text-center">
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">{totalWords}</div>
                <div className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-widest">Words</div>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-xl py-3 px-2 text-center">
                <div className={"text-2xl font-extrabold font-mono " + finalAccColor}>{finalAccuracy}%</div>
                <div className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-widest">Accuracy</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleSubmitScore} disabled={scoreSubmitted} className={"px-6 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 " + (scoreSubmitted ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-500/20')}>
                <Trophy className="w-4 h-4" />{scoreSubmitted ? 'Score Saved' : 'Save High Score'}
              </button>
              <button onClick={startGame} className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Keyboard Trigger */}
      {gameState === 'playing' && (
        <div className="w-full max-w-[800px] mt-3">
          <button onClick={focusMobileKeyboard} onTouchStart={(e) => { e.preventDefault(); focusMobileKeyboard(); }} className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm border border-purple-400/40 shadow-lg transition-all flex items-center justify-center gap-2 select-none">
            <Keyboard className="w-5 h-5 text-cyan-300" /> TAP TO OPEN PHONE KEYBOARD
          </button>
        </div>
      )}

      {/* Controls Footer */}
      <div className="w-full max-w-[800px] mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div><strong className="text-cyan-400">Controls:</strong> Type matching letters to fire lasers</div>
        <div><strong className="text-amber-400">Streaks (2x, 3x...):</strong> Clear consecutive words without typos or meteor hits</div>
        <div><strong className="text-pink-400">Fever Mode:</strong> Hit a 7x streak to trigger 3x score & hyper lasers!</div>
      </div>
    </div>
  );
}

