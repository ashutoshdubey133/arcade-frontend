// API client with LocalStorage fallback for seamless offline or standalone operation

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
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
