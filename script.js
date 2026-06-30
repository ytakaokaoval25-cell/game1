const SIZE = 8;
const boardEl = document.getElementById('board');
const piecesEl = document.getElementById('pieces');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const comboEl = document.getElementById('combo');
const linesEl = document.getElementById('lines');
const messageEl = document.getElementById('message');
const resetBtn = document.getElementById('resetBtn');
const dialog = document.getElementById('gameOverDialog');
const finalScoreEl = document.getElementById('finalScore');
const playAgainBtn = document.getElementById('playAgainBtn');

const shapes = [
  [[1]],
  [[1,1]],
  [[1],[1]],
  [[1,1,1]],
  [[1],[1],[1]],
  [[1,1],[1,1]],
  [[1,0],[1,1]],
  [[0,1],[1,1]],
  [[1,1],[1,0]],
  [[1,1],[0,1]],
  [[1,1,1],[0,1,0]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]],
  [[1,1,0],[0,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,1,1]],
  [[1],[1],[1],[1]],
  [[1,1,1],[1,1,1]],
];

let board = [];
let pieces = [];
let selected = null;
let score = 0;
let combo = 1;
let totalLines = 0;
let best = Number(localStorage.getItem('blockComboBest') || 0);
bestEl.textContent = best;

function init() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  score = 0;
  combo = 1;
  totalLines = 0;
  selected = null;
  dialog.close?.();
  generatePieces();
  render();
  setMessage('ブロックを選んでスタート');
}

function generatePieces() {
  pieces = Array.from({ length: 3 }, () => ({ shape: randomShape(), used: false }));
}

function randomShape() {
  const base = shapes[Math.floor(Math.random() * shapes.length)];
  return base.map(row => [...row]);
}

function render() {
  renderBoard();
  renderPieces();
  scoreEl.textContent = score;
  comboEl.textContent = `x${combo}`;
  linesEl.textContent = totalLines;
  bestEl.textContent = best;
}

function renderBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('button');
      cell.className = 'cell' + (board[r][c] ? ' filled' : '');
      cell.setAttribute('aria-label', `row ${r + 1}, column ${c + 1}`);
      cell.addEventListener('mouseenter', () => preview(r, c));
      cell.addEventListener('focus', () => preview(r, c));
      cell.addEventListener('mouseleave', clearPreview);
      cell.addEventListener('blur', clearPreview);
      cell.addEventListener('click', () => placeSelected(r, c));
      boardEl.appendChild(cell);
    }
  }
}

function renderPieces() {
  piecesEl.innerHTML = '';
  pieces.forEach((piece, index) => {
    const card = document.createElement('button');
    card.className = `piece-card ${selected === index ? 'selected' : ''} ${piece.used ? 'used' : ''}`;
    card.disabled = piece.used;
    card.addEventListener('click', () => {
      if (piece.used) return;
      selected = selected === index ? null : index;
      renderPieces();
      setMessage(selected === null ? 'ブロックを選んでください' : '盤面の置きたい場所をタップ');
    });

    const rows = piece.shape.length;
    const cols = Math.max(...piece.shape.map(row => row.length));
    const mini = document.createElement('div');
    mini.className = 'mini-grid';
    mini.style.gridTemplateColumns = `repeat(${cols}, 18px)`;
    mini.style.gridTemplateRows = `repeat(${rows}, 18px)`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const m = document.createElement('span');
        m.className = 'mini-cell' + (piece.shape[r][c] ? ' on' : '');
        mini.appendChild(m);
      }
    }
    card.appendChild(mini);
    piecesEl.appendChild(card);
  });
}

function canPlace(shape, row, col) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = row + r;
      const bc = col + c;
      if (br < 0 || br >= SIZE || bc < 0 || bc >= SIZE || board[br][bc]) return false;
    }
  }
  return true;
}

function placeSelected(row, col) {
  if (selected === null || pieces[selected]?.used) {
    setMessage('先にブロックを選んでください');
    return;
  }
  const shape = pieces[selected].shape;
  if (!canPlace(shape, row, col)) {
    setMessage('ここには置けません');
    shakeBoard();
    return;
  }

  let blocksPlaced = 0;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        board[row + r][col + c] = 1;
        blocksPlaced++;
      }
    }
  }
  score += blocksPlaced * 10;
  pieces[selected].used = true;
  selected = null;

  const cleared = clearLines();
  if (cleared > 0) {
    const bonus = cleared * cleared * 100 * combo;
    score += bonus;
    totalLines += cleared;
    setMessage(`${cleared} line clear! +${bonus}`);
    combo++;
  } else {
    combo = 1;
    setMessage('Nice placement');
  }

  if (pieces.every(p => p.used)) generatePieces();
  updateBest();
  render();

  if (isGameOver()) {
    setTimeout(showGameOver, 250);
  }
}

function clearLines() {
  const rows = [];
  const cols = [];
  for (let r = 0; r < SIZE; r++) {
    if (board[r].every(Boolean)) rows.push(r);
  }
  for (let c = 0; c < SIZE; c++) {
    if (board.every(row => row[c])) cols.push(c);
  }

  rows.forEach(r => { for (let c = 0; c < SIZE; c++) board[r][c] = 0; });
  cols.forEach(c => { for (let r = 0; r < SIZE; r++) board[r][c] = 0; });
  return rows.length + cols.length;
}

function preview(row, col) {
  clearPreview();
  if (selected === null || pieces[selected]?.used) return;
  const shape = pieces[selected].shape;
  const ok = canPlace(shape, row, col);
  const cells = [...boardEl.children];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = row + r;
      const bc = col + c;
      if (br >= 0 && br < SIZE && bc >= 0 && bc < SIZE) {
        cells[br * SIZE + bc].classList.add(ok ? 'preview-ok' : 'preview-bad');
      }
    }
  }
}

function clearPreview() {
  [...boardEl.children].forEach(cell => cell.classList.remove('preview-ok', 'preview-bad'));
}

function isGameOver() {
  const availablePieces = pieces.filter(p => !p.used);
  return availablePieces.every(piece => {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (canPlace(piece.shape, r, c)) return false;
      }
    }
    return true;
  });
}

function showGameOver() {
  finalScoreEl.textContent = score;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else alert(`Game Over\nScore ${score}`);
}

function updateBest() {
  if (score > best) {
    best = score;
    localStorage.setItem('blockComboBest', String(best));
  }
}

function setMessage(text) {
  messageEl.textContent = text;
}

function shakeBoard() {
  boardEl.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(0)' }
  ], { duration: 160, easing: 'ease-out' });
}

resetBtn.addEventListener('click', init);
playAgainBtn.addEventListener('click', init);

init();
