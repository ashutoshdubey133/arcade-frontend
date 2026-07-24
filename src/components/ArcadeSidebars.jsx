import React, { useState, useEffect } from 'react';
import { 
  Trophy, Volume2, VolumeX, Gamepad2, Server, 
  HelpCircle, Zap, Medal, Star, Flame, Sparkles, Clock
} from 'lucide-react';
import { checkBackendHealth, getLeaderboard } from '../utils/leaderboardApi';

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  if (isNaN(diffMs) || diffMs < 0) return '';
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export function LeftSidebar({ isMuted, onToggleMute, onOpenLeaderboard, currentView }) {
  const [apiStatus, setApiStatus] = useState({ isOnline: false, url: '...', isChecking: true });
  const [topChampions, setTopChampions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    checkBackendHealth().then(status => {
      if (mounted) setApiStatus({ ...status, isChecking: false });
    });
    return () => { mounted = false; };
  }, []);

  const loadTopChampions = async () => {
    setLoading(true);
    const data = await getLeaderboard();
    if (data && Array.isArray(data)) {
      const sorted = [...data].sort((a, b) => b.score - a.score).slice(0, 3);
      setTopChampions(sorted);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTopChampions();
    const interval = setInterval(loadTopChampions, 15000);
    return () => clearInterval(interval);
  }, [currentView]);

  return (
    <aside className="hidden xl:flex flex-col w-72 shrink-0 space-y-5 p-4 sticky top-6 self-start">
      
      {/* Sound & Audio Control Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-cyan-400" /> Audio Synthesizer
          </span>
          <button
            onClick={onToggleMute}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors text-xs flex items-center gap-1"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            {isMuted ? 'Muted' : 'Sound ON'}
          </button>
        </div>

        {/* Animated Sound Equalizer Bars */}
        <div className="flex items-end justify-center gap-1.5 h-10 bg-slate-950/80 rounded-xl p-2 border border-slate-800">
          {!isMuted ? (
            <>
              <div className="w-2 bg-cyan-400 rounded-full eq-bar-1" />
              <div className="w-2 bg-purple-400 rounded-full eq-bar-2" />
              <div className="w-2 bg-emerald-400 rounded-full eq-bar-3" />
              <div className="w-2 bg-amber-400 rounded-full eq-bar-4" />
              <div className="w-2 bg-cyan-400 rounded-full eq-bar-2" />
            </>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono">AUDIO MUTED</span>
          )}
        </div>
      </div>

      {/* Hall of Fame Spotlight */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
            <Trophy className="w-4 h-4" /> Top Champions
          </span>
          <button
            onClick={onOpenLeaderboard}
            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline"
          >
            View All
          </button>
        </div>

        <div className="space-y-2.5">
          {topChampions.length === 0 ? (
            <div className="text-[11px] text-slate-500 text-center py-3">
              {loading ? 'Loading champions...' : 'No scores yet'}
            </div>
          ) : (
            topChampions.map((player, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
              const relTime = formatRelativeTime(player.date);
              return (
                <div
                  key={player.id || idx}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                    idx === 0
                      ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border-yellow-500/30'
                      : idx === 1
                      ? 'bg-slate-950/70 border-slate-700/60'
                      : 'bg-slate-950/50 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{medal}</span>
                    <div className="truncate">
                      <div className="font-bold text-slate-200 truncate">{player.playerName}</div>
                      <div className="text-[10px] text-cyan-400/90 font-mono truncate flex items-center gap-1">
                        <span>{player.game}</span>
                        {relTime && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400 font-sans flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-slate-500" />{relTime}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-yellow-400 text-xs shrink-0 pl-1">
                    {player.score} pts
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Leaderboard Status Widget */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-bold mb-2">
          <Server className={`w-4 h-4 ${apiStatus.isOnline ? 'text-emerald-400' : 'text-amber-400'}`} /> Leaderboard Status
        </div>
        <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
          <span className={`w-2.5 h-2.5 rounded-full ${apiStatus.isChecking ? 'bg-cyan-400 animate-ping' : apiStatus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <div className="text-[11px] overflow-hidden">
            <div className="font-semibold text-slate-200">
              {apiStatus.isChecking ? 'Checking status...' : apiStatus.isOnline ? 'Global Leaderboard Online' : 'Offline Mode'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {apiStatus.isChecking ? 'Connecting to network...' : apiStatus.isOnline ? 'Cloud Sync Active' : 'Local Storage Active'}
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
}

export function RightSidebar({ currentView, onSelectGame }) {
  const games = [
    { id: 'ping-pong', title: 'Ping Pong Arcade', icon: '🏓', color: 'border-cyan-500/40 text-cyan-400' },
    { id: 'breakout', title: 'Breakout Buster', icon: '🧱', color: 'border-amber-500/40 text-amber-400' },
    { id: 'minesweeper', title: 'Minesweeper Retro', icon: '💣', color: 'border-emerald-500/40 text-emerald-400' },
    { id: 'typing', title: 'Sky Letters Defense', icon: '⌨️', color: 'border-purple-500/40 text-purple-400' },
  ];

  return (
    <aside className="hidden xl:flex flex-col w-72 shrink-0 space-y-5 p-4 sticky top-6 self-start">
      
      {/* Quick Game Switcher */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur">
        <div className="text-xs font-bold text-slate-300 mb-3 pb-2 border-b border-slate-800 flex items-center gap-1.5">
          <Gamepad2 className="w-4 h-4 text-purple-400" /> Quick Game Switcher
        </div>

        <div className="space-y-2">
          {games.map((g) => {
            const isActive = currentView === g.id;
            return (
              <button
                key={g.id}
                onClick={() => onSelectGame(g.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs font-bold text-left ${
                  isActive
                    ? 'bg-cyan-500/10 border-cyan-500/60 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{g.icon}</span> {g.title}
                </span>
                {isActive && <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hotkeys & Controls Cheat-sheet */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur text-xs">
        <div className="text-xs font-bold text-slate-300 mb-3 pb-2 border-b border-slate-800 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-yellow-400" /> Control Cheat-sheet
        </div>

        <div className="space-y-2 text-[11px] text-slate-400">
          <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
            <span>Move Paddle:</span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold">W / S or Arrows</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
            <span>Launch / Laser:</span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-bold">Space / Up</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
            <span>Flag Mine:</span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-red-400 font-bold">Right Click</span>
          </div>

          <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
            <span>Sky Defense:</span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-purple-400 font-bold">A - Z Keys</span>
          </div>
        </div>
      </div>

    </aside>
  );
}
