import { useState, useEffect, useCallback } from 'react';
import { audioService } from '../utils/audio';

// Helper: Check if a cell is within bounds
const isValid = (r, c, gridSize) => r >= 0 && r < gridSize && c >= 0 && c < gridSize;

// Helper: Scan board for newly completed SOS lines (pure helper)
const scanForNewSOS = (tempBoard, r, c, placedLetter, gridSize, existingKeys = new Set()) => {
  const found = [];

  const dir8 = [
    [0, 1],   // Right
    [1, 0],   // Down
    [1, 1],   // Down-Right
    [-1, 1],  // Up-Right
    [0, -1],  // Left
    [-1, 0],  // Up
    [-1, -1], // Up-Left
    [1, -1]   // Down-Left
  ];

  const dir4 = [
    [0, 1],  // Horizontal
    [1, 0],  // Vertical
    [1, 1],  // Diagonal down-right
    [-1, 1]  // Diagonal up-right
  ];

  if (placedLetter === 'S') {
    for (let [dr, dc] of dir8) {
      const rO = r + dr;
      const cO = c + dc;
      const rS = r + 2 * dr;
      const cS = c + 2 * dc;

      if (isValid(rO, cO, gridSize) && isValid(rS, cS, gridSize)) {
        if (tempBoard[rO][cO] === 'O' && tempBoard[rS][cS] === 'S') {
          const cells = [
            { r, c },
            { r: rO, c: cO },
            { r: rS, c: cS }
          ];
          cells.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.c - b.c));

          const key = `${cells[0].r},${cells[0].c}-${cells[1].r},${cells[1].c}-${cells[2].r},${cells[2].c}`;
          if (!existingKeys.has(key)) {
            found.push({
              key,
              cells: {
                p1: { r, c },
                p2: { r: rO, c: cO },
                p3: { r: rS, c: cS }
              }
            });
          }
        }
      }
    }
  } else if (placedLetter === 'O') {
    for (let [dr, dc] of dir4) {
      const rS1 = r - dr;
      const cS1 = c - dc;
      const rS2 = r + dr;
      const cS2 = c + dc;

      if (isValid(rS1, cS1, gridSize) && isValid(rS2, cS2, gridSize)) {
        if (tempBoard[rS1][cS1] === 'S' && tempBoard[rS2][cS2] === 'S') {
          const cells = [
            { r: rS1, c: cS1 },
            { r, c },
            { r: rS2, c: cS2 }
          ];
          cells.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.c - b.c));

          const key = `${cells[0].r},${cells[0].c}-${cells[1].r},${cells[1].c}-${cells[2].r},${cells[2].c}`;
          if (!existingKeys.has(key)) {
            found.push({
              key,
              cells: {
                p1: { r: rS1, c: cS1 },
                p2: { r, c },
                p3: { r: rS2, c: cS2 }
              }
            });
          }
        }
      }
    }
  }

  return found;
};

// Helper: Check if board is completely filled
const isBoardFull = (tempBoard) => {
  return tempBoard.every(row => row.every(cell => cell !== null));
};

// Helper: Get AI Best Move (pure helper, executes outside components render loop)
const getAIBestMove = (board, gridSize, completedKeys) => {
  const emptyCells = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (board[r][c] === null) {
        emptyCells.push({ r, c });
      }
    }
  }

  if (emptyCells.length === 0) return null;

  // 1. Scoring Moves
  const scoringMoves = [];
  for (let cell of emptyCells) {
    for (let letter of ['S', 'O']) {
      const found = scanForNewSOS(board, cell.r, cell.c, letter, gridSize, completedKeys);
      if (found.length > 0) {
        scoringMoves.push({
          r: cell.r,
          c: cell.c,
          letter,
          gain: found.length
        });
      }
    }
  }

  if (scoringMoves.length > 0) {
    scoringMoves.sort((a, b) => b.gain - a.gain);
    return scoringMoves[0];
  }

  // 2. Evaluate Safety of Moves (simulating with deep clones)
  const safeMoves = [];
  const unsafeMoves = [];

  for (let cell of emptyCells) {
    for (let letter of ['S', 'O']) {
      const simBoard = board.map(row => [...row]);
      simBoard[cell.r][cell.c] = letter;

      let opponentCanScore = false;
      for (let oppCell of emptyCells) {
        if (oppCell.r === cell.r && oppCell.c === cell.c) continue;
        for (let oppLetter of ['S', 'O']) {
          const oppFound = scanForNewSOS(simBoard, oppCell.r, oppCell.c, oppLetter, gridSize, completedKeys);
          if (oppFound.length > 0) {
            opponentCanScore = true;
            break;
          }
        }
        if (opponentCanScore) break;
      }

      if (!opponentCanScore) {
        safeMoves.push({ r: cell.r, c: cell.c, letter });
      } else {
        unsafeMoves.push({ r: cell.r, c: cell.c, letter });
      }
    }
  }

  // 3. Choose Move:
  if (safeMoves.length > 0) {
    const countAdjacents = (r, c) => {
      let count = 0;
      const deltas = [-1, 0, 1];
      for (let dr of deltas) {
        for (let dc of deltas) {
          if (dr === 0 && dc === 0) continue;
          if (isValid(r + dr, c + dc, gridSize) && board[r + dr][c + dc] !== null) {
            count++;
          }
        }
      }
      return count;
    };

    safeMoves.sort((a, b) => countAdjacents(b.r, b.c) - countAdjacents(a.r, a.c));

    const topCount = Math.min(3, safeMoves.length);
    return safeMoves[Math.floor(Math.random() * topCount)];
  }

  if (unsafeMoves.length > 0) {
    return unsafeMoves[Math.floor(Math.random() * unsafeMoves.length)];
  }

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  return {
    r: randomCell.r,
    c: randomCell.c,
    letter: Math.random() > 0.5 ? 'S' : 'O'
  };
};

export default function SOSGame({ onGameEnd }) {
  const [gridSize, setGridSize] = useState(6); // default 6x6
  const [board, setBoard] = useState(() => Array(6).fill(null).map(() => Array(6).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState(1); // 1 = Red, 2 = Blue
  const [selectedLetter, setSelectedLetter] = useState('S'); // 'S' or 'O'
  const [isVsAI, setIsVsAI] = useState(true);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [completedLines, setCompletedLines] = useState([]); // list of { p1, p2, p3, player }
  const [completedKeys, setCompletedKeys] = useState(new Set()); // unique keys
  const [gameOver, setGameOver] = useState(false);

  // Re-initialise board function
  const initGame = useCallback((resetScores = true) => {
    const newBoard = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(null));
    setBoard(newBoard);
    setCurrentPlayer(1);
    setSelectedLetter('S');
    setCompletedLines([]);
    setCompletedKeys(new Set());
    setGameOver(false);
    if (resetScores) {
      setScore({ p1: 0, p2: 0 });
    }
  }, [gridSize]);

  // Handle grid size switches explicitly in event handler (no effect dependency loop)
  const handleGridSizeChange = (newSize) => {
    audioService.playClick();
    setGridSize(newSize);
    const newBoard = Array(newSize)
      .fill(null)
      .map(() => Array(newSize).fill(null));
    setBoard(newBoard);
    setCurrentPlayer(1);
    setSelectedLetter('S');
    setCompletedLines([]);
    setCompletedKeys(new Set());
    setGameOver(false);
    setScore({ p1: 0, p2: 0 });
  };

  // Perform a move at (r, c) with letter
  const makeMove = useCallback((r, c, letter) => {
    if (board[r][c] || gameOver) return;

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = letter;
    audioService.playPlace();

    const newKeysSet = new Set(completedKeys);
    const newSOSList = scanForNewSOS(newBoard, r, c, letter, gridSize, newKeysSet);

    let pointScored = false;

    if (newSOSList.length > 0) {
      pointScored = true;
      audioService.playScore();

      const newLines = [...completedLines];
      newSOSList.forEach((sos) => {
        newKeysSet.add(sos.key);
        newLines.push({
          ...sos.cells,
          player: currentPlayer
        });
      });

      setCompletedLines(newLines);
      setCompletedKeys(newKeysSet);

      const newScore = { ...score };
      if (currentPlayer === 1) {
        newScore.p1 += newSOSList.length;
      } else {
        newScore.p2 += newSOSList.length;
      }
      setScore(newScore);
    }

    setBoard(newBoard);

    if (isBoardFull(newBoard)) {
      setGameOver(true);
      const p1Score = currentPlayer === 1 && pointScored ? score.p1 + newSOSList.length : score.p1;
      const p2Score = currentPlayer === 2 && pointScored ? score.p2 + newSOSList.length : score.p2;

      if (p1Score === p2Score) {
        audioService.playDraw();
        if (onGameEnd) onGameEnd('Draw');
      } else {
        audioService.playWin();
        if (onGameEnd) onGameEnd(p1Score > p2Score ? 'P1' : 'P2');
      }
      return;
    }

    if (!pointScored) {
      setCurrentPlayer(prev => prev === 1 ? 2 : 1);
    }
  }, [board, gameOver, completedKeys, completedLines, currentPlayer, score, gridSize, onGameEnd]);

  // AI Trigger hook
  useEffect(() => {
    if (isVsAI && currentPlayer === 2 && !gameOver) {
      const timer = setTimeout(() => {
        const aiMove = getAIBestMove(board, gridSize, completedKeys);
        if (aiMove) {
          makeMove(aiMove.r, aiMove.c, aiMove.letter);
        }
      }, 700);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, isVsAI, gameOver, board, gridSize]);

  // Handle human clicking a grid cell
  const handleCellClick = (r, c) => {
    if (board[r][c] || gameOver) return;
    if (isVsAI && currentPlayer === 2) return;

    makeMove(r, c, selectedLetter);
  };

  const handleFullReset = () => {
    audioService.playClick();
    initGame(true);
  };

  const handleRoundReset = () => {
    audioService.playClick();
    initGame(false);
  };

  return (
    <div className="game-container sos-game">
      <div className="game-settings-bar">
        <div className="toggle-group">
          <button
            className={`btn-toggle ${!isVsAI ? 'active' : ''}`}
            onClick={() => {
              audioService.playClick();
              setIsVsAI(false);
              initGame(true);
            }}
          >
            👥 2 Player
          </button>
          <button
            className={`btn-toggle ${isVsAI ? 'active' : ''}`}
            onClick={() => {
              audioService.playClick();
              setIsVsAI(true);
              initGame(true);
            }}
          >
            🤖 Vs Computer
          </button>
        </div>

        <div className="size-selector">
          <span className="label">Grid:</span>
          {[3, 4, 5, 6, 7, 8].map((size) => (
            <button
              key={size}
              className={`btn-size ${gridSize === size ? 'active' : ''}`}
              onClick={() => handleGridSizeChange(size)}
            >
              {size}x{size}
            </button>
          ))}
        </div>
      </div>

      <div className="scoreboard">
        <div className="score-card player-p1">
          <span className="player-label">Player 1 (Red)</span>
          <span className="player-score">{score.p1}</span>
        </div>
        <div className="score-card player-p2">
          <span className="player-label">{isVsAI ? 'Computer (Blue)' : 'Player 2 (Blue)'}</span>
          <span className="player-score">{score.p2}</span>
        </div>
      </div>

      <div className="status-banner">
        {gameOver ? (
          score.p1 === score.p2 ? (
            <span className="status-text animate-pop">It's a Tie! 🤝</span>
          ) : (
            <span className={`status-text animate-pop winner-p${score.p1 > score.p2 ? '1' : '2'}`}>
              🎉 Player {score.p1 > score.p2 ? '1' : '2'} Wins!
            </span>
          )
        ) : (
          <div className="status-row">
            <span className="status-text">
              Turn:{' '}
              <strong className={`turn-p${currentPlayer}`}>
                {currentPlayer === 1 ? 'Player 1 (Red)' : isVsAI ? 'Computer' : 'Player 2 (Blue)'}
              </strong>
              {isVsAI && currentPlayer === 2 && ' (Thinking...)'}
            </span>

            {/* Letter selection */}
            {!(isVsAI && currentPlayer === 2) && (
              <div className="letter-toggle">
                <button
                  className={`btn-letter ${selectedLetter === 'S' ? 'active' : ''}`}
                  onClick={() => {
                    audioService.playClick();
                    setSelectedLetter('S');
                  }}
                >
                  S
                </button>
                <button
                  className={`btn-letter ${selectedLetter === 'O' ? 'active' : ''}`}
                  onClick={() => {
                    audioService.playClick();
                    setSelectedLetter('O');
                  }}
                >
                  O
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid and Overlaid lines */}
      <div className="board-wrapper">
        <div
          className="board-grid relative-grid"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
            aspectRatio: '1 / 1',
            maxWidth: '480px',
            width: '100%',
            margin: '0 auto'
          }}
        >
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => (
              <button
                key={`${rIdx}-${cIdx}`}
                className={`cell cell-sos ${cell ? 'filled' : ''}`}
                onClick={() => handleCellClick(rIdx, cIdx)}
                disabled={cell !== null || gameOver || (isVsAI && currentPlayer === 2)}
                aria-label={`Cell at row ${rIdx + 1}, column ${cIdx + 1}, ${cell || 'empty'}`}
              >
                {cell && (
                  <span className={`token token-${cell.toLowerCase()} animate-scale`}>
                    {cell}
                  </span>
                )}
              </button>
            ))
          )}

          {/* SVG Overlay to draw SOS connecting lines */}
          <svg className="sos-svg-overlay" style={{ pointerEvents: 'none' }}>
            {completedLines.map((line, idx) => {
              const x1 = `${((line.p1.c + 0.5) / gridSize) * 100}%`;
              const y1 = `${((line.p1.r + 0.5) / gridSize) * 100}%`;
              const x2 = `${((line.p3.c + 0.5) / gridSize) * 100}%`;
              const y2 = `${((line.p3.r + 0.5) / gridSize) * 100}%`;

              const strokeColor = line.player === 1 ? 'var(--red-color, #ef4444)' : 'var(--blue-color, #3b82f6)';

              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={strokeColor}
                  className="sos-draw-line"
                />
              );
            })}
          </svg>
        </div>
      </div>

      <div className="game-actions">
        <button className="btn-secondary" onClick={handleRoundReset}>
          🔄 Reset Round
        </button>
        <button className="btn-tertiary" onClick={handleFullReset}>
          🧹 Reset All (Scores)
        </button>
      </div>
    </div>
  );
}
