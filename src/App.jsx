import { useState, useEffect } from 'react';
import ClassicTicTacToe from './components/ClassicTicTacToe';
import SOSGame from './components/SOSGame';
import { audioService } from './utils/audio';
import './App.css';

export default function App() {
  const [activeGame, setActiveGame] = useState(null); // null (hub), 'ttt', 'sos'
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [isMuted, setIsMuted] = useState(audioService.isMuted());
  const [victory, setVictory] = useState({ show: false, winner: null, gameMode: null });

  // Sync theme to root HTML element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    audioService.playClick();
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleMute = () => {
    const newMuted = audioService.toggleMute();
    setIsMuted(newMuted);
    if (!newMuted) {
      audioService.playClick();
    }
  };

  const handleGameEnd = (winner, mode) => {
    // delay showing victory screen for premium timing
    setTimeout(() => {
      setVictory({ show: true, winner, gameMode: mode });
    }, 900);
  };

  const closeVictoryScreen = () => {
    audioService.playClick();
    setVictory({ show: false, winner: null, gameMode: null });
  };

  const navigateToHub = () => {
    audioService.playClick();
    setActiveGame(null);
    setVictory({ show: false, winner: null, gameMode: null });
  };

  const confettiColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="app-container">
      {/* Header controls (Global) */}
      <header className="app-header">
        <div className="logo-section">
          <h1 onClick={navigateToHub} style={{ cursor: 'pointer' }}>TIC-TAC-SOS</h1>
          <p>Local Dual-Game Board</p>
        </div>
        <div className="header-controls">
          <button
            className="btn-icon"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            className="btn-icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {activeGame === null ? (
          /* Hub Mode */
          <div className="hub-container">
            <h2 className="hub-title animate-pop">Select a Game</h2>
            <div className="hub-modes-grid">
              <div className="mode-card animate-scale" style={{ animationDelay: '0.05s' }}>
                <span className="mode-icon">❌</span>
                <h2>Tic-Tac-Toe</h2>
                <p>
                  Classic 3-in-a-row puzzle. Play locally against a friend, or challenge the unbeatable Computer AI.
                </p>
                <button
                  className="btn-primary"
                  onClick={() => {
                    audioService.playClick();
                    setActiveGame('ttt');
                  }}
                >
                  Play Tic-Tac-Toe
                </button>
              </div>

              <div className="mode-card animate-scale" style={{ animationDelay: '0.15s' }}>
                <span className="mode-icon">🔠</span>
                <h2>SOS Game</h2>
                <p>
                  Place S and O to form SOS combinations. Configurable grids from 3x3 to 8x8, with scores and heuristic AI.
                </p>
                <button
                  className="btn-primary"
                  onClick={() => {
                    audioService.playClick();
                    setActiveGame('sos');
                  }}
                >
                  Play SOS Game
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Game Active Mode */
          <>
            <div className="hub-navigation">
              <button className="btn-back" onClick={navigateToHub}>
                ⬅️ Back to Menu
              </button>
            </div>

            {activeGame === 'ttt' && (
              <ClassicTicTacToe onGameEnd={(w) => handleGameEnd(w, 'ttt')} />
            )}
            {activeGame === 'sos' && (
              <SOSGame onGameEnd={(w) => handleGameEnd(w, 'sos')} />
            )}
          </>
        )}
      </main>

      {/* Victory Overlay Modal */}
      {victory.show && (
        <div className="victory-overlay">
          {/* Render Confetti statically without calling Math.random during render or updates */}
          {victory.winner !== 'Draw' && (
            <div className="confetti-container">
              {Array.from({ length: 60 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${(i * 17) % 100}%`,
                    animationDelay: `${((i * 0.05) % 1.5).toFixed(2)}s`,
                    animationDuration: `${(2.0 + ((i * 0.17) % 1.8)).toFixed(2)}s`,
                    backgroundColor: confettiColors[i % confettiColors.length],
                    transform: `rotate(${(i * 23) % 360}deg)`
                  }}
                />
              ))}
            </div>
          )}

          <div className="victory-card">
            <span className="victory-emoji">
              {victory.winner === 'Draw' ? '🤝' : '🏆'}
            </span>
            <h2 className="victory-title">
              {victory.winner === 'Draw'
                ? "It's a Tie!"
                : victory.gameMode === 'ttt'
                ? `Player ${victory.winner} Wins!`
                : victory.winner === 'P1'
                ? 'Player 1 Wins!'
                : 'Player 2 Wins!'}
            </h2>
            <p className="victory-subtitle">
              {victory.winner === 'Draw'
                ? 'An evenly matched battle! Well played.'
                : 'Congratulations on a brilliant victory!'}
            </p>
            <button className="btn-primary" onClick={closeVictoryScreen}>
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
