import React, { useState } from 'react';
import ArcadeHub from './components/ArcadeHub';
import PingPongGame from './components/PingPongGame';
import BreakoutGame from './components/BreakoutGame';
import MinesweeperGame from './components/MinesweeperGame';
import TypingGame from './components/TypingGame';
import LeaderboardModal from './components/LeaderboardModal';
import { LeftSidebar, RightSidebar } from './components/ArcadeSidebars';
import { saveScore } from './utils/leaderboardApi';
import { soundFX } from './utils/soundFX';

const PLAYER_NAME_KEY = 'arcade_player_name_v1';

export default function App() {
  const [currentView, setCurrentView] = useState('hub'); // 'hub' | 'ping-pong' | 'breakout' | 'minesweeper' | 'typing'
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playerName, setPlayerNameState] = useState(() => {
    try {
      return localStorage.getItem(PLAYER_NAME_KEY) || 'Player 1';
    } catch (e) {
      return 'Player 1';
    }
  });

  const handleUpdatePlayerName = (name) => {
    setPlayerNameState(name);
    try {
      localStorage.setItem(PLAYER_NAME_KEY, name || 'Player 1');
    } catch (e) {
      // Ignore error
    }
  };

  const handleToggleMute = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  const handleSaveScore = async (scoreEntry) => {
    await saveScore(scoreEntry);
    setIsLeaderboardOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-black">
      
      {/* Responsive Main Layout with Left & Right Sidebars on Desktop */}
      <div className="max-w-[1700px] mx-auto px-2 sm:px-4 py-4 flex gap-6 justify-between items-start">
        
        {/* Left Side Desktop Widget */}
        <LeftSidebar
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          currentView={currentView}
        />

        {/* Center Primary View */}
        <main className="flex-1 w-full min-w-0">
          {currentView === 'hub' && (
            <ArcadeHub
              onSelectGame={(gameId) => setCurrentView(gameId)}
              onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
            />
          )}

          {currentView === 'ping-pong' && (
            <PingPongGame
              playerName={playerName}
              onUpdatePlayerName={handleUpdatePlayerName}
              onBackToHub={() => setCurrentView('hub')}
              onSaveScore={handleSaveScore}
            />
          )}

          {currentView === 'breakout' && (
            <BreakoutGame
              playerName={playerName}
              onUpdatePlayerName={handleUpdatePlayerName}
              onBackToHub={() => setCurrentView('hub')}
              onSaveScore={handleSaveScore}
            />
          )}

          {currentView === 'minesweeper' && (
            <MinesweeperGame
              playerName={playerName}
              onUpdatePlayerName={handleUpdatePlayerName}
              onBackToHub={() => setCurrentView('hub')}
              onSaveScore={handleSaveScore}
            />
          )}

          {currentView === 'typing' && (
            <TypingGame
              playerName={playerName}
              onUpdatePlayerName={handleUpdatePlayerName}
              onBackToHub={() => setCurrentView('hub')}
              onSaveScore={handleSaveScore}
            />
          )}
        </main>

        {/* Right Side Desktop Widget */}
        <RightSidebar
          currentView={currentView}
          onSelectGame={(gameId) => setCurrentView(gameId)}
        />

      </div>

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
    </div>
  );
}
