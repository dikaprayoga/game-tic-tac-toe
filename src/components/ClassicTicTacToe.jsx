import { useState, useEffect } from 'react';
import { audioService } from '../utils/audio';

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Helper to check for a winner (pure function)
const checkWinner = (squares) => {
  for (let combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: combo };
    }
  }
  if (squares.every(cell => cell !== null)) {
    return { winner: 'Draw', line: null };
  }
  return { winner: null, line: null };
};

// Minimax algorithm helper (pure function)
const minimax = (tempBoard, depth, isMaximizing) => {
  const result = checkWinner(tempBoard);
  if (result.winner === 'O') return 10 - depth;
  if (result.winner === 'X') return depth - 10;
  if (result.winner === 'Draw') return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (tempBoard[i] === null) {
        tempBoard[i] = 'O';
        let score = minimax(tempBoard, depth + 1, false);
        tempBoard[i] = null;
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (tempBoard[i] === null) {
        tempBoard[i] = 'X';
        let score = minimax(tempBoard, depth + 1, true);
        tempBoard[i] = null;
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
};

// Best move selection helper (pure function, except Math.random inside condition but it is outside React render context)
const getAIMove = (currentBoard, difficulty) => {
  const emptyIndices = currentBoard
    .map((cell, idx) => (cell === null ? idx : null))
    .filter((idx) => idx !== null);

  if (emptyIndices.length === 0) return null;

  if (difficulty === 'easy') {
    // Pick random empty square using deterministic-like indexes based on length
    // (though since it's outside component render context, Math.random is also fine)
    const randomIndex = Math.floor(Math.random() * emptyIndices.length);
    return emptyIndices[randomIndex];
  }

  // Hard/Perfect mode: Minimax
  let bestScore = -Infinity;
  let bestMove = null;

  for (let index of emptyIndices) {
    currentBoard[index] = 'O';
    let score = minimax(currentBoard, 0, false);
    currentBoard[index] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = index;
    }
  }
  return bestMove;
};

export default function ClassicTicTacToe({ onGameEnd }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [isVsAI, setIsVsAI] = useState(true);
  const [aiDifficulty, setAiDifficulty] = useState('hard'); // 'easy' or 'hard'
  const [scores, setScores] = useState({ X: 0, O: 0, ties: 0 });
  const [winnerInfo, setWinnerInfo] = useState({ winner: null, line: null });

  const handleGameEnd = (result) => {
    setWinnerInfo(result);
    if (result.winner === 'X') {
      setScores(prev => ({ ...prev, X: prev.X + 1 }));
      audioService.playWin();
      if (onGameEnd) onGameEnd('X');
    } else if (result.winner === 'O') {
      setScores(prev => ({ ...prev, O: prev.O + 1 }));
      if (isVsAI) {
        audioService.playDraw(); // AI won = player loss, play sad sound
      } else {
        audioService.playWin();
      }
      if (onGameEnd) onGameEnd('O');
    } else if (result.winner === 'Draw') {
      setScores(prev => ({ ...prev, ties: prev.ties + 1 }));
      audioService.playDraw();
      if (onGameEnd) onGameEnd('Draw');
    }
  };

  // Handle cell clicks
  const handleClick = (index) => {
    // Ignore click if cell already occupied or game won
    if (board[index] || winnerInfo.winner) return;

    // Human player (X) moves
    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    audioService.playPlace();
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result.winner) {
      handleGameEnd(result);
    } else {
      setIsXNext(!isXNext);
    }
  };

  // Trigger AI move if it is O's turn and AI mode is active
  useEffect(() => {
    if (isVsAI && !isXNext && !winnerInfo.winner) {
      // Add slight delay for premium feel
      const timer = setTimeout(() => {
        const aiMove = getAIMove([...board], aiDifficulty);
        if (aiMove !== null) {
          const newBoard = [...board];
          newBoard[aiMove] = 'O';
          audioService.playPlace();
          setBoard(newBoard);

          const result = checkWinner(newBoard);
          if (result.winner) {
            handleGameEnd(result);
          } else {
            setIsXNext(true);
          }
        }
      }, 500);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isXNext, isVsAI, board, winnerInfo.winner, aiDifficulty]);

  const handleReset = (fullReset = false) => {
    audioService.playClick();
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinnerInfo({ winner: null, line: null });
    if (fullReset) {
      setScores({ X: 0, O: 0, ties: 0 });
    }
  };

  // Helper to determine if winning line contains index
  const isWinningCell = (index) => {
    return winnerInfo.line && winnerInfo.line.includes(index);
  };

  return (
    <div className="game-container classic-ttt">
      <div className="game-settings-bar">
        <div className="toggle-group">
          <button
            className={`btn-toggle ${!isVsAI ? 'active' : ''}`}
            onClick={() => {
              audioService.playClick();
              setIsVsAI(false);
              handleReset();
            }}
          >
            👥 2 Player
          </button>
          <button
            className={`btn-toggle ${isVsAI ? 'active' : ''}`}
            onClick={() => {
              audioService.playClick();
              setIsVsAI(true);
              handleReset();
            }}
          >
            🤖 Vs Computer
          </button>
        </div>

        {isVsAI && (
          <div className="toggle-group difficulty">
            <button
              className={`btn-toggle ${aiDifficulty === 'easy' ? 'active' : ''}`}
              onClick={() => {
                audioService.playClick();
                setAiDifficulty('easy');
              }}
            >
              Easy
            </button>
            <button
              className={`btn-toggle ${aiDifficulty === 'hard' ? 'active' : ''}`}
              onClick={() => {
                audioService.playClick();
                setAiDifficulty('hard');
              }}
            >
              Impossible
            </button>
          </div>
        )}
      </div>

      <div className="scoreboard">
        <div className="score-card player-x">
          <span className="player-label">Player X</span>
          <span className="player-score">{scores.X}</span>
        </div>
        <div className="score-card ties">
          <span className="player-label">Draws</span>
          <span className="player-score">{scores.ties}</span>
        </div>
        <div className="score-card player-o">
          <span className="player-label">{isVsAI ? 'Computer (O)' : 'Player O'}</span>
          <span className="player-score">{scores.O}</span>
        </div>
      </div>

      <div className="status-banner">
        {winnerInfo.winner ? (
          winnerInfo.winner === 'Draw' ? (
            <span className="status-text animate-pop">It's a Draw! 🤝</span>
          ) : (
            <span className={`status-text animate-pop winner-${winnerInfo.winner.toLowerCase()}`}>
              🎉 Player {winnerInfo.winner} Wins!
            </span>
          )
        ) : (
          <span className="status-text">
            Turn: <strong className={`turn-${isXNext ? 'x' : 'o'}`}>{isXNext ? 'X' : 'O'}</strong>
            {isVsAI && !isXNext && ' (Thinking...)'}
          </span>
        )}
      </div>

      <div className="board-wrapper">
        <div className="board-grid grid-3x3">
          {board.map((cell, index) => (
            <button
              key={index}
              className={`cell cell-ttt ${cell ? 'filled' : ''} ${isWinningCell(index) ? 'winning' : ''}`}
              onClick={() => handleClick(index)}
              disabled={cell !== null || winnerInfo.winner !== null || (isVsAI && !isXNext)}
              aria-label={`Cell ${index + 1}, ${cell || 'empty'}`}
            >
              {cell && (
                <span className={`token token-${cell.toLowerCase()} animate-scale`}>
                  {cell}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="game-actions">
        <button className="btn-secondary" onClick={() => handleReset(false)}>
          🔄 Reset Round
        </button>
        <button className="btn-tertiary" onClick={() => handleReset(true)}>
          🧹 Clear Scores
        </button>
      </div>
    </div>
  );
}
