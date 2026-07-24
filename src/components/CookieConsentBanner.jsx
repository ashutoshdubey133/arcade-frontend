import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, Trash2, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'arcade_cookie_consent_v1';

export default function CookieConsentBanner({ playerName, onResetProfile }) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        setShowBanner(true);
      }
    } catch (e) {
      // Ignore error
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    } catch (e) {
      // Ignore error
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 max-w-lg z-50 bg-slate-900/95 border border-purple-500/40 backdrop-blur-md rounded-2xl p-4 shadow-2xl shadow-purple-950/60 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-purple-400 font-extrabold text-sm">
          <Cookie className="w-5 h-5 text-amber-400 animate-bounce" />
          Cookie & Local Storage Notice
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
        Neon Arcade uses local cookies and storage to save your player handle 
        {playerName && <strong className="text-cyan-300"> ({playerName})</strong>}, game progress, and global high score entries across sessions.
      </p>

      <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-800/80">
        <button
          onClick={handleAccept}
          className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Accept & Remember Me
        </button>
      </div>
    </div>
  );
}
