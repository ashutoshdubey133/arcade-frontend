// API client with LocalStorage fallback for seamless offline or standalone operation

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://arcade-backend-gtgl.onrender.com/api';
const LOCAL_STORAGE_KEY = 'arcade_scores_v1';

// Initial sample scores if none exist locally
const SAMPLE_SCORES = [
  { id: 1, playerName: 'CyberKnight', game: 'Ping Pong', score: 15, mode: 'single (hard)', date: new Date().toISOString() },
  { id: 2, playerName: 'PixelMaster', game: 'Ping Pong', score: 12, mode: 'single (medium)', date: new Date().toISOString() },
  { id: 3, playerName: 'RetroKing', game: 'Ping Pong', score: 10, mode: 'twoPlayer', date: new Date().toISOString() },
  { id: 4, playerName: 'NeonRider', game: 'Ping Pong', score: 8, mode: 'single (easy)', date: new Date().toISOString() },
];

export const getLeaderboard = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/scores`, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn("Backend API unavailable, using LocalStorage scores:", err.message);
  }

  // Fallback to LocalStorage
  const local = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (local) {
    return JSON.parse(local);
  }
  
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SAMPLE_SCORES));
  return SAMPLE_SCORES;
};

export const checkUsernameAvailability = async (username) => {
  if (!username || !username.trim()) return { available: false, reason: 'Username cannot be empty' };
  const cleaned = username.trim().toLowerCase();
  
  if (cleaned === 'player 1' || cleaned === 'player1' || cleaned === 'guest' || cleaned === 'admin') {
    return { available: false, reason: 'This username is reserved. Please pick another handle.' };
  }

  const scores = await getLeaderboard();
  if (Array.isArray(scores)) {
    const isTaken = scores.some(s => s.playerName && s.playerName.trim().toLowerCase() === cleaned);
    if (isTaken) {
      return { available: false, reason: `Username "${username.trim()}" is taken on the leaderboard.` };
    }
  }

  return { available: true, reason: `Username "${username.trim()}" is available!` };
};

export const saveScore = async (scoreEntry) => {
  try {
    const res = await fetch(`${API_BASE_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scoreEntry)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend API unavailable, saving score locally:", err.message);
  }

  // Save locally
  const localScores = await getLeaderboard();
  const newEntry = {
    ...scoreEntry,
    id: Date.now()
  };

  const updated = [newEntry, ...localScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 50); // Keep top 50

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return newEntry;
};

export const checkBackendHealth = async () => {
  try {
    const healthUrl = API_BASE_URL.replace(/\/api\/?$/, '') || API_BASE_URL;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return { isOnline: true, url: API_BASE_URL, label: 'Render REST API Live' };
    }
  } catch (err) {
    console.warn("Backend health check offline:", err.message);
  }
  return { isOnline: false, url: 'LocalStorage', label: 'LocalStorage (Offline Mode)' };
};

// Auto-Save helper for mid-game leaving, switching games, or page refresh/unload
export const autoSaveScore = async (scoreEntry) => {
  if (!scoreEntry || !scoreEntry.score || scoreEntry.score <= 0) return null;
  
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(scoreEntry)], { type: 'application/json' });
      navigator.sendBeacon(`${API_BASE_URL}/scores`, blob);
    }
  } catch (e) {
    // Ignore error
  }

  return await saveScore(scoreEntry);
};
