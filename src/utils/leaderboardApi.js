// API client with LocalStorage fallback for seamless offline or standalone operation

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://arcade-backend-gtgl.onrender.com/api';
const LOCAL_STORAGE_KEY = 'arcade_scores_v1';
const HANDLE_ACTIVITY_KEY = 'arcade_handle_last_active_v1';
const PLAYER_NAME_KEY = 'arcade_player_name_v1';
const PLAYER_LOCKED_KEY = 'arcade_name_locked_v1';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Helper: Prune scores older than 7 days
export const pruneExpiredLocalScores = (scoresList) => {
  if (!Array.isArray(scoresList)) return [];
  const now = Date.now();
  return scoresList.filter(entry => {
    if (!entry.date) return true;
    const entryTime = new Date(entry.date).getTime();
    if (isNaN(entryTime)) return true;
    return (now - entryTime) <= SEVEN_DAYS_MS;
  });
};

// Touch handle last active timestamp to keep it active for 7 days
export const touchHandleActivity = () => {
  try {
    localStorage.setItem(HANDLE_ACTIVITY_KEY, Date.now().toString());
  } catch (e) {
    // Ignore error
  }
};

// Check if current user handle has expired due to 7 days of inactivity
export const checkHandleExpiration = () => {
  try {
    const lastActive = localStorage.getItem(HANDLE_ACTIVITY_KEY);
    if (lastActive) {
      const diff = Date.now() - Number(lastActive);
      if (diff > SEVEN_DAYS_MS) {
        // Expired after 7 days! Release handle
        localStorage.removeItem(PLAYER_NAME_KEY);
        localStorage.removeItem(PLAYER_LOCKED_KEY);
        localStorage.removeItem(HANDLE_ACTIVITY_KEY);
        return true; // Handle was expired and cleared
      }
    }
  } catch (e) {
    // Ignore error
  }
  return false;
};

export const getLeaderboard = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/scores`, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      return pruneExpiredLocalScores(data);
    }
  } catch (err) {
    console.warn("Backend API unavailable, using LocalStorage scores:", err.message);
  }

  // Fallback to LocalStorage
  const local = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (local) {
    const parsed = JSON.parse(local);
    const pruned = pruneExpiredLocalScores(parsed);
    if (pruned.length !== parsed.length) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pruned));
    }
    return pruned;
  }
  
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
  return [];
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
  touchHandleActivity();
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

  // Fallback save to LocalStorage
  const scores = await getLeaderboard();
  const newEntry = {
    id: Date.now(),
    playerName: scoreEntry.playerName.trim(),
    game: scoreEntry.game.trim(),
    score: Number(scoreEntry.score),
    mode: scoreEntry.mode || 'Standard',
    date: scoreEntry.date || new Date().toISOString()
  };

  scores.unshift(newEntry);
  const pruned = pruneExpiredLocalScores(scores);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pruned));
  return newEntry;
};

export const autoSaveScore = (scoreEntry) => {
  touchHandleActivity();
  const data = JSON.stringify(scoreEntry);
  if (navigator.sendBeacon) {
    const blob = new Blob([data], { type: 'application/json' });
    navigator.sendBeacon(`${API_BASE_URL}/scores`, blob);
  }
  saveScore(scoreEntry);
};

export const checkBackendHealth = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    const rootUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    const res = await fetch(rootUrl, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      return { isOnline: true, url: API_BASE_URL };
    }
  } catch (err) {
    // Offline or network error
  }
  return { isOnline: false, url: API_BASE_URL };
};
