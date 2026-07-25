import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { getDailyStreakInfo } from '../utils/leaderboardApi';

export default function UserGreetingHeader({ playerName }) {
  const [streakInfo, setStreakInfo] = useState({ streak: 0, playedToday: false });

  useEffect(() => {
    const info = getDailyStreakInfo();
    setStreakInfo(info);
    
    // Listen for storage events to update streak in real time
    const handleStorage = () => {
      setStreakInfo(getDailyStreakInfo());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (!playerName) return null;

  return (
    <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800/90 rounded-2xl px-3.5 py-1.5 shadow-lg backdrop-blur text-xs transition-all">
      <div className="flex items-center gap-1.5 font-sans">
        <span className="text-slate-400 font-medium">Hi,</span>
        <span className="font-extrabold text-cyan-400 font-mono text-sm tracking-wide">{playerName}</span>
      </div>

      <div className="h-4 w-px bg-slate-800/90" />

      <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/15 border border-amber-500/30 rounded-xl text-amber-400 font-bold font-mono">
        <Flame className={`w-4 h-4 text-amber-400 fill-amber-400 ${streakInfo.streak > 0 ? 'animate-bounce' : 'opacity-40'}`} />
        <span>{streakInfo.streak} {streakInfo.streak === 1 ? 'Day' : 'Days'} Streak 🔥</span>
        {!streakInfo.playedToday && streakInfo.streak > 0 && (
          <span className="text-[10px] text-amber-300/80 font-sans ml-0.5">(Play today!)</span>
        )}
      </div>
    </div>
  );
}
