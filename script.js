const canvas = document.getElementById("tetris");
const ctx = canvas.getContext("2d");

const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const scale = 30;
const rows = 20;
const cols = 10;

ctx.scale(scale, scale);
nextCtx.scale(30, 30);

let board = createMatrix(cols, rows);
let score = 0;

// Criar matriz
function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

// Peças
const pieces = "TJLOSZI";

// Cores fixas por peça
const colors = {
    1: "#ff1493", // T
    2: "#ffd700", // O
    3: "#ff4500", // L
    4: "#1e90ff", // J
    5: "#00fa9a", // I
    6: "#9400d3", // S
    7: "#00ced1", // Z
};

// Criar peça com número fixo (1–7)
function createPiece(type) {
    switch(type) {
        case "T": return [[0,1,0],[1,1,1],[0,0,0]];
        case "O": return [[2,2],[2,2]];
        case "L": return [[0,0,3],[3,3,3],[0,0,0]];
        case "J": return [[4,0,0],[4,4,4],[0,0,0]];
        case "I": return [[5,5,5,5]];
        case "S": return [[0,6,6],[6,6,0],[0,0,0]];
        case "Z": return [[7,7,0],[0,7,7],[0,0,0]];
    }
}

let player = {
    pos: {x: 0, y: 0},
    piece: null,
    next: createPiece(pieces[Math.floor(Math.random() * pieces.length)])
};

// Desenhar bloco com contorno preto
function drawSquare(x, y, color, ctxRef) {
    ctxRef.fillStyle = color;
    ctxRef.fillRect(x, y, 1, 1);

    ctxRef.strokeStyle = "#000";
    ctxRef.lineWidth = 0.08;
    ctxRef.strokeRect(x, y, 1, 1);
}

// Desenhar tabuleiro + peça atual
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) drawSquare(x, y, colors[value], ctx);
        });
    });

    player.piece.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) drawSquare(x + player.pos.x, y + player.pos.y, colors[value], ctx);
        });
    });
}

function drawNext() {
    nextCtx.clearRect(0, 0, 4, 4);
    player.next.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0)
                drawSquare(x, y, colors[value], nextCtx);
        });
    });
}

// Colisão
function collide(board, player) {
    const m = player.piece;
    const o = player.pos;

    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0 &&
               (board[y + o.y] &&
                board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// Mesclar peça no tabuleiro
function merge(board, player) {
    player.piece.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) board[y + player.pos.y][x + player.pos.x] = value;
        });
    });
}

// Remover linhas completas
function sweep() {
    let lines = 0;

    outer: for (let y = board.length - 1; y >= 0; y--) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] === 0) continue outer;
        }

        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        lines++;
        y++;
    }

    score += lines * 100;
    document.getElementById("score").innerText = score;
}

// Resetar jogador
function playerReset() {
    const newType = pieces[Math.floor(Math.random() * pieces.length)];

    // peça atual = próxima peça
    player.piece = player.next;

    // próxima peça vira outra nova
    player.next = createPiece(newType);

    player.pos.y = 0;
    player.pos.x = Math.floor(cols / 2) - Math.floor(player.piece[0].length / 2);

    if (collide(board, player)) {
        board = createMatrix(cols, rows);
        score = 0;
        document.getElementById("score").innerText = score;
    }

    drawNext();
}

// Rotação
function rotate(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
}

function rotatePlayer() {
    const rotated = rotate(player.piece);
    const oldX = player.pos.x;

    player.piece = rotated;

    if (collide(board, player)) {
        player.pos.x = oldX;
        player.piece = rotate(player.piece);
        player.piece = rotate(player.piece);
        player.piece = rotate(player.piece);
    }
}

function move(dir) {
    player.pos.x += dir;
    if (collide(board, player)) player.pos.x -= dir;
}

function drop() {
    player.pos.y++;

    if (collide(board, player)) {
        player.pos.y--;
        merge(board, player);
        sweep();
        playerReset();
    }

    dropCounter = 0;
}

document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") move(-1);
    if (e.key === "ArrowRight") move(1);
    if (e.key === "ArrowDown") drop();
    if (e.key === "ArrowUp") rotatePlayer();
});

let dropCounter = 0;
let dropInterval = 700;
let lastTime = 0;

function update(time = 0) {
    const delta = time - lastTime;
    lastTime = time;

    dropCounter += delta;

    if (dropCounter > dropInterval) drop();

    draw();
    requestAnimationFrame(update);
}

document.getElementById("startBtn").addEventListener("click", () => {
    board = createMatrix(cols, rows);
    score = 0;
    document.getElementById("score").innerText = score;
    playerReset();
    update();
});
