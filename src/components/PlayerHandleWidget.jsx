import React from 'react';
import { User, Lock, Trash2, Check } from 'lucide-react';

export default function PlayerHandleWidget({ 
  playerName, 
  isNameLocked, 
  onUpdatePlayerName, 
  onLockPlayerName, 
  onResetPlayerName,
  accentColor = 'cyan'
}) {
  const borderColor = accentColor === 'amber' ? 'border-amber-500/40' : accentColor === 'purple' ? 'border-purple-500/40' : accentColor === 'emerald' ? 'border-emerald-500/40' : 'border-cyan-500/40';
  const textColor = accentColor === 'amber' ? 'text-amber-400' : accentColor === 'purple' ? 'text-purple-400' : accentColor === 'emerald' ? 'text-emerald-400' : 'text-cyan-400';

  if (isNameLocked) {
    return (
      <div className="w-full bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <User className={`w-4 h-4 ${textColor}`} />
          <span className="text-slate-400">Playing as:</span>
          <span className="font-bold text-slate-100 text-sm font-mono px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
            {playerName || 'Player 1'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono flex items-center gap-1">
            <Lock className="w-3 h-3 text-purple-400" /> Locked to Profile
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (window.confirm("Changing your handle requires clearing your local player profile cookies & data. Proceed?")) {
              onResetPlayerName();
            }
          }}
          className="text-[10px] text-slate-400 hover:text-red-400 underline font-mono flex items-center gap-1 shrink-0"
          title="Clear cookies & browser profile to change handle"
        >
          <Trash2 className="w-3 h-3" /> Clear Profile
        </button>
      </div>
    );
  }

  return (
    <div className="w-full text-left bg-slate-900/90 p-3 rounded-xl border border-slate-800">
      <label className="text-slate-400 text-xs mb-1 block font-semibold flex items-center justify-between">
        <span>Set Player Handle</span>
        <span className="text-[10px] text-slate-500 font-mono">Will lock to browser profile</span>
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={playerName}
          onChange={(e) => onUpdatePlayerName(e.target.value)}
          placeholder="Enter Player Handle"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
        />
        <button
          type="button"
          onClick={() => onLockPlayerName(playerName)}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow transition-transform active:scale-95 shrink-0"
        >
          <Lock className="w-3.5 h-3.5" /> Save Handle
        </button>
      </div>
    </div>
  );
}
