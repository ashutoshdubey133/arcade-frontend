import React from 'react';
import { User, Lock, Trash2 } from 'lucide-react';

export default function PlayerHandleWidget({ 
  playerName, 
  onResetPlayerName,
  accentColor = 'cyan'
}) {
  const textColor = accentColor === 'amber' ? 'text-amber-400' : accentColor === 'purple' ? 'text-purple-400' : accentColor === 'emerald' ? 'text-emerald-400' : 'text-cyan-400';

  return (
    <div className="w-full bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        <User className={`w-4 h-4 ${textColor}`} />
        <span className="text-slate-400">Playing as:</span>
        <span className="font-bold text-slate-100 text-sm font-mono px-2.5 py-0.5 bg-slate-950 rounded border border-slate-800">
          {playerName || 'Player'}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono flex items-center gap-1">
          <Lock className="w-3 h-3 text-purple-400" /> Locked to Profile
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          if (window.confirm("Clearing your handle requires resetting your local player cookies & browser profile. Proceed?")) {
            onResetPlayerName();
          }
        }}
        className="text-[10px] text-slate-500 hover:text-red-400 underline font-mono flex items-center gap-1 shrink-0 transition-colors"
        title="Clear cookies & browser profile to register new handle"
      >
        <Trash2 className="w-3 h-3" /> Reset Profile
      </button>
    </div>
  );
}
