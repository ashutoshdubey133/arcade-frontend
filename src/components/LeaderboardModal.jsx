import React, { useState, useEffect } from 'react';
import { Trophy, X, RefreshCw, Medal, Calendar, Gamepad2 } from 'lucide-react';
import { getLeaderboard } from '../utils/leaderboardApi';

export default function LeaderboardModal({ isOpen, onClose }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState('All');

  const fetchScores = async () => {
    setLoading(true);
    const data = await getLeaderboard();
    setScores(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchScores();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredScores = selectedGame === 'All'
    ? scores
    : scores.filter(s => s.game === selectedGame);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 text-yellow-400 rounded-xl border border-yellow-500/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Arcade Leaderboard</h2>
              <p className="text-xs text-slate-400">Global High Scores & Champions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchScores}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              title="Refresh Leaderboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Filter:</span>
          {['All', 'Ping Pong', 'Snake', 'Breakout'].map((game) => (
            <button
              key={game}
              onClick={() => setSelectedGame(game)}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedGame === game
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {game}
            </button>
          ))}
        </div>

        {/* Scores Table */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {filteredScores.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No scores recorded yet. Play a game and submit your high score!
            </div>
          ) : (
            <div className="space-y-2">
              {filteredScores.map((entry, idx) => {
                const rank = idx + 1;
                return (
                  <div
                    key={entry.id || idx}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      rank === 1
                        ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border-yellow-500/30 text-yellow-200'
                        : rank === 2
                        ? 'bg-gradient-to-r from-slate-300/10 to-slate-400/5 border-slate-400/30 text-slate-200'
                        : rank === 3
                        ? 'bg-gradient-to-r from-amber-700/10 to-orange-700/5 border-amber-600/30 text-amber-200'
                        : 'bg-slate-800/40 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center font-bold font-mono text-sm">
                        {rank === 1 ? (
                          <Medal className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                        ) : rank === 2 ? (
                          <Medal className="w-5 h-5 text-slate-300" />
                        ) : rank === 3 ? (
                          <Medal className="w-5 h-5 text-amber-600" />
                        ) : (
                          <span className="text-slate-500">#{rank}</span>
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {entry.playerName}
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">
                            {entry.game}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>Mode: {entry.mode || 'Standard'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-extrabold text-lg text-cyan-400">
                        {entry.score} pts
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
