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

// Cria Matriz
function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

// Tetrominos
const pieces = "TJLOSZI";

function createPiece(type) {
    switch(type) {
        case "T": return [[0,1,0],[1,1,1],[0,0,0]];
        case "O": return [[1,1],[1,1]];
        case "L": return [[1,0,0],[1,1,1],[0,0,0]];
        case "J": return [[0,0,1],[1,1,1],[0,0,0]];
        case "I": return [[1,1,1,1]];
        case "S": return [[0,1,1],[1,1,0],[0,0,0]];
        case "Z": return [[1,1,0],[0,1,1],[0,0,0]];
    }
}

let player = {
    pos: {x: 0, y: 0},
    piece: null,
    next: createPiece(pieces[Math.floor(Math.random() * pieces.length)])
};

// Desenhar quadrado
function drawSquare(x, y, color, ctxRef) {
    ctxRef.fillStyle = color;
    ctxRef.fillRect(x, y, 1, 1);
}

const colors = {
    1: "#ff1493",
    2: "#00fa9a",
    3: "#1e90ff",
    4: "#ff4500",
    5: "#ffd700",
    6: "#9400d3",
    7: "#00ced1",
};

// Desenhar o tabuleiro
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawSquare(x, y, colors[value], ctx);
            }
        });
    });

    // Desenhar peça atual
    player.piece.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawSquare(x + player.pos.x, y + player.pos.y, colors[value], ctx);
            }
        });
    });
}

function drawNext() {
    nextCtx.clearRect(0, 0, 4, 4);
    player.next.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawSquare(x, y, colors[value], nextCtx);
            }
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

// Mesclar peça no board
function merge(board, player) {
    player.piece.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + player.pos.y][x + player.pos.x] = value;
            }
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
    const type = pieces[Math.floor(Math.random() * pieces.length)];
    player.piece = createPiece(type);

    // Transformando os valores da peça em cores
    player.piece = player.piece.map(row =>
        row.map(v => (v === 1 ? Math.ceil(Math.random()*7) : 0))
    );

    player.pos.y = 0;
    player.pos.x = Math.floor(cols / 2) - Math.floor(player.piece[0].length / 2);

    if (collide(board, player)) {
        board = createMatrix(cols, rows);
        score = 0;
        document.getElementById("score").innerText = score;
    }

    drawNext();
}

function rotate(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
}

function rotatePlayer() {
    const rotated = rotate(player.piece);
    const oldPos = player.pos.x;

    player.piece = rotated;

    if (collide(board, player)) {
        player.pos.x = oldPos;
        player.piece = rotate(player.piece);
        player.piece = rotate(player.piece);
        player.piece = rotate(player.piece);
    }
}

function move(dir) {
    player.pos.x += dir;

    if (collide(board, player)) {
        player.pos.x -= dir;
    }
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

    if (dropCounter > dropInterval) {
        drop();
    }

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
