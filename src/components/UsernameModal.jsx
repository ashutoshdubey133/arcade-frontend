import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, Loader2, Sparkles, Shield, Lock } from 'lucide-react';
import { checkUsernameAvailability } from '../utils/leaderboardApi';

export default function UsernameModal({ isOpen, onSubmitUsername }) {
  const [inputVal, setInputVal] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null); // { available: boolean, reason: string }

  useEffect(() => {
    if (!inputVal.trim()) {
      setCheckResult(null);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    const timer = setTimeout(async () => {
      const res = await checkUsernameAvailability(inputVal);
      setCheckResult(res);
      setIsChecking(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputVal]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (checkResult && checkResult.available && inputVal.trim()) {
      onSubmitUsername(inputVal.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-cyan-950/80 text-center animate-in zoom-in-95 duration-200">
        
        {/* Neon Header Badge */}
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-2xl p-0.5 shadow-lg shadow-cyan-500/30 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 mb-2">
          CLAIM YOUR PLAYER HANDLE
        </h2>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Welcome to Neon Arcade! Please register a unique player username for global leaderboards and game stats.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="text-slate-300 text-xs font-bold mb-1.5 block flex items-center gap-1.5">
              <span>Choose Username</span>
              <span className="text-[10px] text-purple-400 font-mono flex items-center gap-0.5">
                <Lock className="w-3 h-3" /> Locked to Profile
              </span>
            </label>

            <div className="relative">
              <input
                type="text"
                autoFocus
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="e.g. CyberKnight, NeonNinja..."
                maxLength={20}
                className={`w-full bg-slate-950 border-2 rounded-xl px-4 py-3 text-slate-100 text-sm font-semibold focus:outline-none transition-colors ${
                  checkResult && !checkResult.available
                    ? 'border-red-500 focus:border-red-400'
                    : checkResult && checkResult.available
                    ? 'border-emerald-500 focus:border-emerald-400'
                    : 'border-slate-800 focus:border-cyan-500'
                }`}
              />

              {isChecking && (
                <div className="absolute right-3.5 top-3.5">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Real-time Status Message */}
            <div className="mt-2.5 min-h-[24px]">
              {isChecking && (
                <div className="text-xs text-cyan-400 font-mono flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking username availability...
                </div>
              )}

              {!isChecking && checkResult && (
                <div className={`text-xs p-2.5 rounded-xl font-medium flex items-center gap-2 ${
                  checkResult.available 
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300' 
                    : 'bg-red-950/80 border border-red-500/40 text-red-300'
                }`}>
                  {checkResult.available ? (
                    <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <UserX className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{checkResult.reason}</span>
                </div>
              )}

              {!isChecking && !checkResult && inputVal.length === 0 && (
                <div className="text-[11px] text-slate-500 font-mono">
                  Enter 2 to 20 characters (letters, numbers, underscores).
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!checkResult || !checkResult.available || isChecking}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 text-sm sm:text-base transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" /> Claim Handle & Enter Arcade 🔒
          </button>
        </form>

        <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-mono">
          ℹ️ Your username will be permanently locked to this browser profile via cookies. Changing your name requires clearing browser data.
        </p>

      </div>
    </div>
  );
}
