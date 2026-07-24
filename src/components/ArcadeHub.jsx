import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, Play, Trophy, Sparkles, Volume2, VolumeX, 
  Flame, Zap, Shield, Compass, Star, ChevronRight
} from 'lucide-react';
import { soundFX } from '../utils/soundFX';
import { checkBackendHealth } from '../utils/leaderboardApi';

export default function ArcadeHub({ onSelectGame, onOpenLeaderboard, isMuted, onToggleMute }) {
  const [serverStatus, setServerStatus] = useState({ isOnline: false, url: '...', isChecking: true });

  useEffect(() => {
    let mounted = true;
    checkBackendHealth().then(status => {
      if (mounted) setServerStatus({ ...status, isChecking: false });
    });
    return () => { mounted = false; };
  }, []);
  const gamesList = [
    {
      id: 'typing',
      title: 'Sky Letters: Type Defense',
      category: 'Skill / Speed',
      description: 'Defend the mountain valley from falling meteor waves by typing matching characters to fire ground laser cannons! Features 7x Hyper Fever Mode, length-balanced fall speed, and power-up words.',
      badge: 'FEATURED 🌟',
      badgeColor: 'bg-purple-500 text-white font-bold',
      active: true,
      color: 'from-purple-500 to-pink-500',
      icon: '⌨️',
      players: '1 Player',
      features: ['Wave Defense Engine', '7x Hyper Fever Mode (3x Score)', 'Length-Balanced Fall Speed', 'Mobile Soft Keyboard Support']
    },
    {
      id: 'ping-pong',
      title: 'Ping Pong Arcade',
      category: 'Retro Sports',
      description: 'Classic 2D table tennis featuring AI single-player mode, 2-player local multiplayer, floating power-ups, and particle trail FX.',
      badge: 'POPULAR',
      badgeColor: 'bg-cyan-500 text-slate-950 font-bold',
      active: true,
      color: 'from-cyan-500 to-emerald-500',
      icon: '🏓',
      players: '1 - 2 Players',
      features: ['AI Difficulty Modes', 'Local 2P VS', 'Arcade Power-Ups', 'Synthesizer Audio']
    },
    {
      id: 'breakout',
      title: 'Breakout Brick Buster',
      category: 'Action / Puzzle',
      description: 'Smash colourful brick layers with precision paddle bounces, laser blasts, multi-ball spawns, and power drops.',
      badge: 'POPULAR',
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
      active: true,
      color: 'from-amber-500 to-red-500',
      icon: '🧱',
      players: '1 Player',
      features: ['Keyboard / Mouse Controls', 'Laser Blaster Upgrade', 'Multi-ball & Power Drops', '3 Challenge Levels']
    },
    {
      id: 'minesweeper',
      title: 'Minesweeper Retro',
      category: 'Logic / Strategy',
      description: 'Uncover safe cells and flag hidden mines across Easy, Medium, and Hard grids, or learn using the step-by-step interactive Tutorial!',
      badge: 'POPULAR',
      badgeColor: 'bg-emerald-500 text-slate-950 font-bold',
      active: true,
      color: 'from-emerald-500 to-teal-500',
      icon: '💣',
      players: '1 Player',
      features: ['Interactive Tutorial Mode', 'Easy / Medium / Hard Levels', 'Touch / Mobile Flagging', 'Global High Scores']
    },
    {
      id: 'snake',
      title: 'Snake Neon Edition',
      category: 'Classic Arcade',
      description: 'Navigate the glowing neon grid, eat power apples, avoid wall hits, and achieve the longest tail length.',
      badge: 'NEXT UP',
      badgeColor: 'bg-purple-500 text-white',
      active: false,
      color: 'from-purple-500 to-pink-500',
      icon: '🐍',
      players: '1 Player',
      features: ['Speed Levels', 'Special Golden Apples', 'Neon Glow Styling']
    },
    {
      id: 'space-invaders',
      title: 'Galaxy Defender',
      category: 'Space Shooter',
      description: 'Defend planet Earth against waves of alien invaders in this fast-paced retro space shooter.',
      badge: 'COMING SOON',
      badgeColor: 'bg-slate-800 text-slate-400',
      active: false,
      color: 'from-indigo-500 to-blue-600',
      icon: '🚀',
      players: '1 Player',
      features: ['Alien Wave Engine', 'Shield Defense', 'Weapon Upgrades']
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Bar */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-2xl shadow-lg shadow-purple-500/20">
            <Gamepad2 className="w-8 h-8 text-slate-950" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              NEON ARCADE <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-mono">v1.0</span>
            </h1>
            <p className="text-xs text-slate-400">Lightweight, instant-play browser games</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-yellow-400 font-semibold rounded-xl transition-all shadow-md hover:border-yellow-500/40 text-sm"
          >
            <Trophy className="w-4 h-4" /> Global Leaderboard
          </button>

          <button
            onClick={onToggleMute}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-all text-sm"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* Hero Showcase Card - Featured Game #1 */}
      <div className="relative mb-12 rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Featured Game #1
            </div>

            <h2 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
              SKY LETTERS: TYPE DEFENSE
            </h2>

            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Defend the mountain valley from falling meteor waves! Type matching letters to fire ground laser cannons, build streaks to activate 7x Hyper Fever Mode (3x Score!), and collect power-up words.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-8 text-xs text-slate-300">
              <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-purple-400" /> Wave Defense Engine
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-pink-400" /> 7x Hyper Fever (3x Score)
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" /> Length-Balanced Speed
              </span>
            </div>

            <button
              onClick={() => onSelectGame('typing')}
              className="px-8 py-3.5 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 hover:from-purple-400 hover:to-cyan-300 text-slate-950 font-extrabold rounded-2xl shadow-xl shadow-purple-500/25 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 text-base"
            >
              <Play className="w-5 h-5 fill-current" /> PLAY SKY LETTERS NOW
            </button>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div 
              onClick={() => onSelectGame('typing')}
              className="group relative w-full aspect-video bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl cursor-pointer arcade-card-glow flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="text-6xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
                ⌨️
              </div>
              <div className="text-lg font-bold text-slate-100 group-hover:text-purple-400 transition-colors">
                Start Defense Run
              </div>
              <p className="text-xs text-slate-500 mt-1">Click to launch Canvas Engine</p>
            </div>
          </div>
        </div>
      </div>

      {/* Game Library Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-cyan-400" /> Game Catalog
          </h2>
          <p className="text-xs text-slate-400">Select a game to start playing immediately</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {gamesList.map((game) => (
          <div
            key={game.id}
            className={`relative rounded-2xl border p-6 flex flex-col justify-between transition-all duration-300 ${
              game.active
                ? 'bg-slate-900/90 border-cyan-500/30 hover:border-cyan-500/60 arcade-card-glow cursor-pointer'
                : 'bg-slate-900/40 border-slate-800/60 opacity-75'
            }`}
            onClick={() => game.active && onSelectGame(game.id)}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">{game.icon}</span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${game.badgeColor}`}>
                  {game.badge}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-100 mb-1 flex items-center gap-2">
                {game.title}
              </h3>
              <p className="text-xs font-medium text-cyan-400/80 mb-3">{game.category} • {game.players}</p>

              <p className="text-slate-400 text-xs mb-6 line-clamp-3 leading-relaxed">
                {game.description}
              </p>
            </div>

            <div>
              <div className="space-y-1 mb-6 border-t border-slate-800 pt-3">
                {game.features.map((feat, idx) => (
                  <div key={idx} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-cyan-400 shrink-0" /> {feat}
                  </div>
                ))}
              </div>

              <button
                disabled={!game.active}
                onClick={(e) => {
                  e.stopPropagation();
                  if (game.active) onSelectGame(game.id);
                }}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  game.active
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
                }`}
              >
                {game.active ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> PLAY NOW
                  </>
                ) : (
                  'COMING SOON'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="pt-8 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          Neon Arcade Platform • Built with React & Node.js
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${serverStatus.isChecking ? 'bg-cyan-400 animate-ping' : serverStatus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-slate-400 font-mono text-[11px]">
            {serverStatus.isChecking ? 'Checking status...' : serverStatus.isOnline ? 'Global Leaderboard Online' : 'Offline Leaderboard (Local)'}
          </span>
        </div>
      </footer>
    </div>
  );
}
