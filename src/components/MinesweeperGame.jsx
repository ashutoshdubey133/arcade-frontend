import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, Flag, Bomb, RefreshCw, Trophy, Volume2, VolumeX, 
  HelpCircle, BookOpen, CheckCircle, Award, Sparkles, Lightbulb, Play
} from 'lucide-react';
import { soundFX } from '../utils/soundFX';

const DIFFICULTY_CONFIG = {
  easy: { rows: 8, cols: 8, mines: 10, label: 'Easy (8x8)' },
  medium: { rows: 12, cols: 12, mines: 22, label: 'Medium (12x12)' },
  hard: { rows: 16, cols: 16, mines: 40, label: 'Hard (16x16)' },
};

// Fixed non-random layout for Tutorial Practice grid (4x4)
const TUTORIAL_MINE_POSITIONS = [[0, 3], [3, 0], [3, 3]];

export default function MinesweeperGame({ 
  onBackToHub, 
  onSaveScore, 
  playerName = 'Player', 
  onResetPlayerName 
}) {
  // Game Setup
  const [difficulty, setDifficulty] = useState('easy'); // 'easy' | 'medium' | 'hard' | 'tutorial'
  const [isTutorial, setIsTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0); // 0..4
  
  // Game Play State
  const [grid, setGrid] = useState([]);
  const [gameStatus, setGameStatus] = useState('idle'); // 'idle' | 'playing' | 'won' | 'lost'
  const [flagMode, setFlagMode] = useState(false); // Mobile / Touch friendly toggle
  const [minesCount, setMinesCount] = useState(10);
  const [flagsLeft, setFlagsLeft] = useState(10);
  const [timer, setTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const timerRef = useRef(null);

  const handleToggleMute = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  // Initialize fresh grid
  const initializeGrid = (diffKey = difficulty) => {
    if (diffKey === 'tutorial') {
      setIsTutorial(true);
      setupTutorialGrid();
      return;
    }

    setIsTutorial(false);
    const config = DIFFICULTY_CONFIG[diffKey] || DIFFICULTY_CONFIG.easy;
    const { rows, cols, mines } = config;

    let newGrid = [];
    for (let r = 0; r < rows; r++) {
      let row = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          row: r,
          col: c,
          isMine: false,
          revealed: false,
          flagged: false,
          count: 0
        });
      }
      newGrid.push(row);
    }

    setGrid(newGrid);
    setMinesCount(mines);
    setFlagsLeft(mines);
    setGameStatus('idle');
    setTimer(0);
    setScoreSubmitted(false);

    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Initialize Tutorial Grid
  const setupTutorialGrid = () => {
    const rows = 4;
    const cols = 4;
    let newGrid = [];

    for (let r = 0; r < rows; r++) {
      let row = [];
      for (let c = 0; c < cols; c++) {
        const isMine = TUTORIAL_MINE_POSITIONS.some(([mr, mc]) => mr === r && mc === c);
        row.push({
          row: r,
          col: c,
          isMine,
          revealed: false,
          flagged: false,
          count: 0
        });
      }
      newGrid.push(row);
    }

    // Calculate counts
    calculateMineCounts(newGrid, rows, cols);

    setGrid(newGrid);
    setMinesCount(TUTORIAL_MINE_POSITIONS.length);
    setFlagsLeft(TUTORIAL_MINE_POSITIONS.length);
    setGameStatus('playing');
    setTutorialStep(0);
  };

  useEffect(() => {
    initializeGrid('easy');
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (gameStatus === 'playing') {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStatus]);

  // Place mines ensuring first click is safe
  const plantMines = (firstRow, firstCol, currentGrid, rows, cols, totalMines) => {
    let minesPlanted = 0;
    while (minesPlanted < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);

      // Don't place mine on or adjacent to first click
      if (Math.abs(r - firstRow) <= 1 && Math.abs(c - firstCol) <= 1) continue;
      if (!currentGrid[r][c].isMine) {
        currentGrid[r][c].isMine = true;
        minesPlanted++;
      }
    }

    calculateMineCounts(currentGrid, rows, cols);
  };

  const calculateMineCounts = (gridObj, rows, cols) => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (gridObj[r][c].isMine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (gridObj[nr][nc].isMine) count++;
            }
          }
        }
        gridObj[r][c].count = count;
      }
    }
  };

  // Long Press for mobile flagging
  const touchTimerRef = useRef(null);

  const handleTouchStart = (r, c) => {
    touchTimerRef.current = setTimeout(() => {
      handleCellRightClick(r, c, null);
      touchTimerRef.current = null;
    }, 350);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  // Reveal Cell
  const handleCellClick = (r, c) => {
    if (gameStatus === 'won' || gameStatus === 'lost') return;

    let currentGrid = [...grid.map(row => [...row.map(cell => ({ ...cell }))])];
    let cell = currentGrid[r][c];

    // If Flag Mode active, handle right click functionality
    if (flagMode) {
      handleCellRightClick(r, c, null);
      return;
    }

    if (cell.revealed || cell.flagged) return;

    // First Click Initialization
    if (gameStatus === 'idle' && !isTutorial) {
      const config = DIFFICULTY_CONFIG[difficulty];
      plantMines(r, c, currentGrid, config.rows, config.cols, config.mines);
      setGameStatus('playing');
    }

    soundFX.playClick();

    // Hit Mine!
    if (cell.isMine) {
      cell.revealed = true;
      revealAllMines(currentGrid);
      setGrid(currentGrid);
      setGameStatus('lost');
      soundFX.playExplosion();
      return;
    }

    // Safe reveal (with flood fill for zeroes)
    revealCellAndNeighbors(currentGrid, r, c);
    setGrid(currentGrid);

    // Check Win
    checkWinCondition(currentGrid);
  };

  // Flood fill reveal for zeroes
  const revealCellAndNeighbors = (gridObj, r, c) => {
    const rows = gridObj.length;
    const cols = gridObj[0].length;
    let stack = [[r, c]];

    while (stack.length > 0) {
      const [currR, currC] = stack.pop();
      let cell = gridObj[currR][currC];

      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true;

      if (cell.count === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = currR + dr;
            const nc = currC + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (!gridObj[nr][nc].revealed && !gridObj[nr][nc].flagged) {
                stack.push([nr, nc]);
              }
            }
          }
        }
      }
    }
  };

  // Flag Cell
  const handleCellRightClick = (r, c, e) => {
    if (e) e.preventDefault();
    if (gameStatus === 'won' || gameStatus === 'lost') return;

    let currentGrid = [...grid.map(row => [...row.map(cell => ({ ...cell }))])];
    let cell = currentGrid[r][c];

    if (cell.revealed) return;

    cell.flagged = !cell.flagged;
    soundFX.playFlag();

    const newFlagsLeft = cell.flagged ? flagsLeft - 1 : flagsLeft + 1;
    setFlagsLeft(newFlagsLeft);
    setGrid(currentGrid);

    checkWinCondition(currentGrid);
  };

  // Reveal all mines on lose
  const revealAllMines = (gridObj) => {
    gridObj.forEach(row => {
      row.forEach(cell => {
        if (cell.isMine) cell.revealed = true;
      });
    });
  };

  // Check Win Condition
  const checkWinCondition = (gridObj) => {
    const rows = gridObj.length;
    const cols = gridObj[0].length;
    let unrevealedNonMines = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!gridObj[r][c].isMine && !gridObj[r][c].revealed) {
          unrevealedNonMines++;
        }
      }
    }

    if (unrevealedNonMines === 0) {
      setGameStatus('won');
      soundFX.playGameOver(true);
      confetti({ particleCount: 100, spread: 70 });
    }
  };

  const latestScoreRef = useRef({ score: 0, playerName, difficulty: 'medium', submitted: false });

  useEffect(() => {
    let currentScore = 0;
    if (grid && grid.length > 0) {
      let revealedCount = 0;
      grid.forEach(row => row.forEach(cell => { if (cell.revealed && !cell.isMine) revealedCount++; }));
      const diffMultiplier = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;
      currentScore = revealedCount * 25 * diffMultiplier;
    }
    if (gameStatus === 'won') {
      const timeBonus = Math.max(0, 1000 - timer * 5);
      const diffMultiplier = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;
      currentScore = (100 * diffMultiplier) + timeBonus;
    }
    latestScoreRef.current.score = currentScore;
    latestScoreRef.current.playerName = playerName;
    latestScoreRef.current.difficulty = difficulty;
  }, [grid, timer, gameStatus, playerName, difficulty]);

  useEffect(() => {
    const autoSaveProgress = () => {
      const { score: s, playerName: p, difficulty: diff, submitted } = latestScoreRef.current;
      if (s > 0 && !submitted && onSaveScore) {
        latestScoreRef.current.submitted = true;
        onSaveScore({
          playerName: p || 'Player 1',
          game: 'Minesweeper',
          score: s,
          mode: `${diff} (Auto-Saved)`,
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

  // Save Score
  const handleSubmitScore = () => {
    if (!latestScoreRef.current.submitted && onSaveScore) {
      latestScoreRef.current.submitted = true;
      const timeBonus = Math.max(0, 1000 - timer * 5);
      const diffMultiplier = difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1;
      const finalScore = (100 * diffMultiplier) + timeBonus;

      onSaveScore({
        playerName: playerName || 'Player 1',
        game: 'Minesweeper',
        score: finalScore,
        mode: difficulty,
        date: new Date().toISOString()
      });
      setScoreSubmitted(true);
    }
  };

  // Helper for cell text color
  const getNumberColor = (count) => {
    switch (count) {
      case 1: return 'text-cyan-400 font-bold';
      case 2: return 'text-emerald-400 font-bold';
      case 3: return 'text-red-400 font-bold';
      case 4: return 'text-purple-400 font-bold';
      case 5: return 'text-amber-400 font-bold';
      case 6: return 'text-teal-400 font-bold';
      default: return 'text-slate-200 font-bold';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4">
      {/* Top Header */}
      <div className="w-full max-w-[700px] flex items-center justify-between mb-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800 backdrop-blur">
        <button
          onClick={onBackToHub}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Arcade Hub
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-purple-500/40 rounded-lg text-xs font-mono">
            <span className="font-bold text-slate-200">{playerName}</span>
            <span className="text-[10px] text-purple-400" title="Locked to Profile">🔒</span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Clearing your handle requires resetting your local player cookies & browser profile. Proceed?")) {
                  onResetPlayerName();
                }
              }}
              className="text-[10px] text-slate-400 hover:text-red-400 ml-1 font-sans"
              title="Clear profile cookies"
            >
              ✕
            </button>
          </div>

          <select
            value={isTutorial ? 'tutorial' : difficulty}
            onChange={(e) => {
              const val = e.target.value;
              setDifficulty(val);
              initializeGrid(val);
            }}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-100 text-xs font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="easy">Easy (8x8, 10 Mines)</option>
            <option value="medium">Medium (12x12, 22 Mines)</option>
            <option value="hard">Hard (16x16, 40 Mines)</option>
            <option value="tutorial">🎓 Tutorial & Guide Mode</option>
          </select>

          <button
            onClick={() => initializeGrid(difficulty)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            title="Restart Game"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleMute}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Tutorial Interactive Walkthrough Header (if tutorial mode) */}
      {isTutorial && (
        <div className="w-full max-w-[700px] mb-4 bg-gradient-to-r from-purple-900/60 via-slate-900 to-cyan-950/60 p-5 rounded-2xl border border-purple-500/30 text-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold text-cyan-400 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              MINESWEEPER TUTORIAL: STEP {tutorialStep + 1} OF 5
            </h2>

            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((stepIdx) => (
                <button
                  key={stepIdx}
                  onClick={() => setTutorialStep(stepIdx)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    tutorialStep === stepIdx ? 'bg-cyan-400 scale-125' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-300 leading-relaxed mb-4">
            {tutorialStep === 0 && (
              <p>
                <strong className="text-cyan-400">1. Objective:</strong> Uncover all safe cells without detonating any hidden mines! Your first click is always guaranteed to be safe.
              </p>
            )}
            {tutorialStep === 1 && (
              <p>
                <strong className="text-cyan-400">2. Clues & Numbers:</strong> When a safe cell opens, it reveals a number. This number tells you <u className="text-amber-300 font-bold">how many mines exist</u> in the 8 adjacent neighboring squares!
              </p>
            )}
            {tutorialStep === 2 && (
              <p>
                <strong className="text-cyan-400">3. Deductive Flagging:</strong> If a '1' touches only 1 remaining unrevealed cell, that cell MUST be a mine! Right-click (or toggle Flag mode 🚩) to flag it.
              </p>
            )}
            {tutorialStep === 3 && (
              <p>
                <strong className="text-cyan-400">4. Safe Clearance:</strong> Once a numbered cell has its correct number of mines flagged around it, all remaining surrounding squares are 100% safe to click!
              </p>
            )}
            {tutorialStep === 4 && (
              <p>
                <strong className="text-emerald-400">5. Practice Time!</strong> Try clearing the 4x4 practice grid below. Place flags on the mines and uncover all safe tiles!
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
            <button
              onClick={() => setTutorialStep(s => Math.max(0, s - 1))}
              disabled={tutorialStep === 0}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded font-semibold text-slate-300"
            >
              Previous Step
            </button>
            <button
              onClick={() => {
                if (tutorialStep < 4) setTutorialStep(s => s + 1);
                else {
                  setDifficulty('easy');
                  initializeGrid('easy');
                }
              }}
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded shadow-sm shadow-cyan-500/20"
            >
              {tutorialStep === 4 ? 'Play Full Game!' : 'Next Step →'}
            </button>
          </div>
        </div>
      )}

      {/* Main Game Dashboard Box */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center">
        
        {/* Status Display Header */}
        <div className="w-full flex items-center justify-between mb-6 bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono">
          <div className="flex items-center gap-2 text-red-400 font-extrabold text-xl px-3 py-1 bg-slate-900 rounded border border-slate-800">
            <Bomb className="w-5 h-5" />
            {String(flagsLeft).padStart(3, '0')}
          </div>

          <button
            onClick={() => initializeGrid(difficulty)}
            className="text-2xl hover:scale-110 active:scale-95 transition-transform"
          >
            {gameStatus === 'won' ? '😎' : gameStatus === 'lost' ? '💥' : '😊'}
          </button>

          <div className="text-cyan-400 font-extrabold text-xl px-3 py-1 bg-slate-900 rounded border border-slate-800">
            ⏱ {String(timer).padStart(3, '0')}
          </div>
        </div>

        {/* Flag Mode Toggle (Mobile / Touch friendly) */}
        <div className="w-full flex items-center justify-between mb-4">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            Left-click: Reveal | Right-click: Flag
          </span>

          <button
            onClick={() => setFlagMode(!flagMode)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              flagMode
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            Flag Mode: {flagMode ? 'ON 🚩' : 'OFF'}
          </button>
        </div>

        {/* The Grid */}
        <div
          className="grid gap-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-auto max-w-full"
          style={{
            gridTemplateColumns: `repeat(${grid[0]?.length || 8}, minmax(0, 1fr))`
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={(e) => handleCellRightClick(r, c, e)}
                  onTouchStart={() => handleTouchStart(r, c)}
                  onTouchEnd={handleTouchEnd}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-mono font-bold text-xs sm:text-sm flex items-center justify-center transition-all ${
                    cell.revealed
                      ? cell.isMine
                        ? 'bg-red-600 text-white shadow-inner'
                        : 'bg-slate-900 text-slate-100 border border-slate-800'
                      : cell.flagged
                      ? 'bg-slate-800/90 text-red-400 border border-red-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 shadow-md border border-slate-700/50 active:scale-95'
                  }`}
                >
                  {cell.revealed ? (
                    cell.isMine ? (
                      <Bomb className="w-5 h-5 text-white animate-pulse" />
                    ) : cell.count > 0 ? (
                      <span className={getNumberColor(cell.count)}>{cell.count}</span>
                    ) : null
                  ) : cell.flagged ? (
                    <Flag className="w-4 h-4 fill-current text-red-400" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {/* Win / Loss Modal */}
        {(gameStatus === 'won' || gameStatus === 'lost') && (
          <div className="mt-6 p-4 rounded-xl border text-center w-full animate-in fade-in duration-200 bg-slate-950 border-slate-800">
            <h3 className={`text-2xl font-extrabold mb-1 ${gameStatus === 'won' ? 'text-emerald-400' : 'text-red-400'}`}>
              {gameStatus === 'won' ? '🎉 YOU CLEARED THE MINEFIELD!' : '💥 BOOM! MINE DETONATED'}
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Time: {timer} seconds | Difficulty: {difficulty}
            </p>

            <div className="flex justify-center gap-3">
              {gameStatus === 'won' && !isTutorial && (
                <button
                  onClick={handleSubmitScore}
                  disabled={scoreSubmitted}
                  className={`px-5 py-2 rounded-lg font-bold text-xs transition-all ${
                    scoreSubmitted
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-md'
                  }`}
                >
                  {scoreSubmitted ? 'Score Saved ✓' : 'Save Score'}
                </button>
              )}

              <button
                onClick={() => initializeGrid(difficulty)}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Play Again
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
