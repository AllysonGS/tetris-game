// --- CANVAS + CONTEXTS
const canvas = document.getElementById("tetris");
const ctx = canvas.getContext("2d");

const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const scale = 30;
const rows = 20;
const cols = 10;

ctx.scale(scale, scale);
nextCtx.scale(30, 30);

// --- GAME STATE
let board = createMatrix(cols, rows);
let score = 0;
let linesCleared = 0;
let level = 1;
let running = false;
let gameOver = false;

// --- AUDIO (WebAudio small helper)
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function ensureAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
}
function playSound(type = "blip") {
    ensureAudio();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    let now = audioCtx.currentTime;

    switch (type) {
        case "rotate":
            o.type = "sawtooth"; o.frequency.setValueAtTime(880, now);
            g.gain.setValueAtTime(0.06, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            o.start(now); o.stop(now + 0.12);
            break;
        case "drop":
            o.type = "square"; o.frequency.setValueAtTime(440, now);
            g.gain.setValueAtTime(0.05, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            o.start(now); o.stop(now + 0.06);
            break;
        case "line":
            // quick chord-like sequence
            o.type = "sine";
            o.frequency.setValueAtTime(660, now);
            g.gain.setValueAtTime(0.08, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            o.start(now); o.stop(now + 0.22);
            break;
        case "gameover":
            o.type = "sawtooth";
            o.frequency.setValueAtTime(220, now);
            g.gain.setValueAtTime(0.12, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            o.start(now); o.stop(now + 0.6);
            break;
        default:
            o.type = "sine"; o.frequency.setValueAtTime(440, now);
            g.gain.setValueAtTime(0.04, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            o.start(now); o.stop(now + 0.08);
    }
}

// --- HELPERS / MATRIX
function createMatrix(w,h){
    const m = [];
    while(h--) m.push(new Array(w).fill(0));
    return m;
}

// --- PIECES & PALETTE
const pieces = "TJLOSZI";
const colors = {
    1: "#ff1493", // T
    2: "#ffd700", // O
    3: "#ff4500", // L
    4: "#1e90ff", // J
    5: "#00fa9a", // I
    6: "#9400d3", // S
    7: "#00ced1", // Z
};

function createPiece(type){
    switch(type){
        case "T": return [[0,1,0],[1,1,1],[0,0,0]];
        case "O": return [[2,2],[2,2]];
        case "L": return [[0,0,3],[3,3,3],[0,0,0]];
        case "J": return [[4,0,0],[4,4,4],[0,0,0]];
        case "I": return [[5,5,5,5]];
        case "S": return [[0,6,6],[6,6,0],[0,0,0]];
        case "Z": return [[7,7,0],[0,7,7],[0,0,0]];
    }
}

// --- PLAYER
let player = {
    pos: {x:0,y:0},
    piece: null,
    next: createPiece(pieces[Math.floor(Math.random()*pieces.length)])
};

// --- DRAWINGS (with contorno)
function drawSquare(x,y,color,ctxRef,alpha=1){
    ctxRef.globalAlpha = alpha;
    ctxRef.fillStyle = color;
    ctxRef.fillRect(x,y,1,1);
    ctxRef.globalAlpha = 1;

    ctxRef.strokeStyle = "#000";
    ctxRef.lineWidth = 0.08;
    ctxRef.strokeRect(x,y,1,1);
}

// Draw ghost piece (translucent)
function drawGhost(){
    if(!player.piece) return;
    const ghost = { pos: {x:player.pos.x, y:player.pos.y}, piece: null, matrix: player.piece.map(r=>r.slice()) };
    // build ghost object compatible with collide (we'll use matrix property name 'piece' as original collide expects player.piece)
    const ghostPlayer = { pos: {x: player.pos.x, y: player.pos.y}, piece: player.piece.map(r=>r.slice()) };

    while(true){
        ghostPlayer.pos.y++;
        if(collide(board, ghostPlayer)){
            ghostPlayer.pos.y--;
            break;
        }
    }

    ghostPlayer.piece.forEach((row,y) => {
        row.forEach((value,x) => {
            if(value !== 0){
                drawSquare(x + ghostPlayer.pos.x, y + ghostPlayer.pos.y, colors[value], ctx, 0.28);
            }
        });
    });
}

function draw(){
    // clear (use black background in grid coords)
    ctx.fillStyle = "#000";
    // because ctx is scaled, canvas.width/scale gives width in user units
    ctx.fillRect(0,0,canvas.width/scale,canvas.height/scale);

    // draw board
    board.forEach((row,y) => {
        row.forEach((value,x) => {
            if(value !== 0) drawSquare(x,y,colors[value],ctx);
        });
    });

    // ghost under current piece
    if(player.piece && running) drawGhost();

    // draw current piece
    if(player.piece){
        player.piece.forEach((row,y) => {
            row.forEach((value,x) => {
                if(value !== 0) drawSquare(x + player.pos.x, y + player.pos.y, colors[value], ctx);
            });
        });
    }
}

// draw next preview (centered)
function drawNext(){
    nextCtx.clearRect(0,0, nextCanvas.width/30, nextCanvas.height/30);
    // place next in 4x4 area centered
    const matrix = player.next;
    const offsetX = Math.floor((4 - matrix[0].length)/2);
    const offsetY = Math.floor((4 - matrix.length)/2);
    matrix.forEach((row,y) => {
        row.forEach((value,x) => {
            if(value !== 0) drawSquare(x + offsetX, y + offsetY, colors[value], nextCtx);
        });
    });
}

// --- COLLISION / MERGE / SWEEP
function collide(board, playerObj){
    const m = playerObj.piece;
    const o = playerObj.pos;
    for(let y=0;y<m.length;y++){
        for(let x=0;x<m[y].length;x++){
            if(m[y][x] !== 0){
                // if outside vertical bounds or horizontal bounds OR cell occupied -> collision
                if (!board[y + o.y] || board[y + o.y][x + o.x] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function merge(board, player){
    player.piece.forEach((row,y) => {
        row.forEach((value,x) => {
            if(value !== 0) board[y + player.pos.y][x + player.pos.x] = value;
        });
    });
}

function sweep(){
    let lines = 0;
    outer: for(let y = board.length -1; y>=0; y--){
        for(let x=0;x<board[y].length;x++){
            if(board[y][x] === 0) continue outer;
        }
        // remove
        const row = board.splice(y,1)[0].fill(0);
        board.unshift(row);
        lines++;
        y++;
    }
    if(lines > 0){
        // scoring typical tetris curve
        const pointsByLines = {1:100,2:300,3:500,4:800};
        score += pointsByLines[lines] || (lines * 200);
        linesCleared += lines;
        // play sound
        playSound("line");
        updateLevel();
        document.getElementById("score").innerText = score;
        document.getElementById("lines").innerText = linesCleared;
    }
}

// --- LEVEL / SPEED
function updateLevel(){
    const newLevel = Math.floor(linesCleared / 10) + 1;
    if(newLevel !== level){
        level = newLevel;
    }
    // dropInterval reduces as level grows, clamp to min 100ms
    dropInterval = Math.max(100, 700 - (level-1) * 70);
    document.getElementById("level").innerText = level;
}

// --- PLAYER ACTIONS
function playerReset(){
    const newType = pieces[Math.floor(Math.random() * pieces.length)];
    // current becomes next
    player.piece = player.next;
    // next becomes new random
    player.next = createPiece(newType);

    player.pos.y = 0;
    player.pos.x = Math.floor(cols/2) - Math.floor(player.piece[0].length/2);

    if(collide(board, player)){
        // instead of showing overlay / stopping, reset the board and stats and continue
        board = createMatrix(cols, rows);
        score = 0;
        linesCleared = 0;
        level = 1;
        dropInterval = 700;
        document.getElementById("score").innerText = score;
        document.getElementById("lines").innerText = linesCleared;
        document.getElementById("level").innerText = level;
        playSound("gameover");
    }
    drawNext();
}

function rotate(matrix){
    return matrix[0].map((_,i) => matrix.map(row => row[i]).reverse());
}

function rotatePlayer(){
    if(!running) return;
    const rotated = rotate(player.piece);
    const oldX = player.pos.x;
    player.piece = rotated;
    let offset = 1;
    while(collide(board, player)){
        player.pos.x += offset;
        offset = -(offset + (offset>0 ? 1 : -1));
        if(Math.abs(offset) > player.piece[0].length){
            // undo rotate
            player.piece = rotate(player.piece);
            player.piece = rotate(player.piece);
            player.piece = rotate(player.piece);
            player.pos.x = oldX;
            return;
        }
    }
    playSound("rotate");
}

function move(dir){
    if(!running) return;
    player.pos.x += dir;
    if(collide(board, player)) player.pos.x -= dir;
}

function drop(){
    if(!running) return;
    player.pos.y++;
    if(collide(board, player)){
        player.pos.y--;
        merge(board, player);
        sweep();
        playerReset();
    } else {
        playSound("drop");
    }
    dropCounter = 0;
}

// --- INPUT
document.addEventListener("keydown", e => {
    if(e.key === "ArrowLeft") move(-1);
    else if(e.key === "ArrowRight") move(1);
    else if(e.key === "ArrowDown") drop();
    else if(e.key === "ArrowUp") rotatePlayer();
});

// --- GAME LOOP
let dropCounter = 0;
let dropInterval = 700;
let lastTime = 0;
function update(time = 0){
    const delta = time - lastTime;
    lastTime = time;
    if(running){
        dropCounter += delta;
        if(dropCounter > dropInterval) drop();
    }
    draw();
    requestAnimationFrame(update);
}

// --- START / RESET
function startGame(){
    // reset states
    board = createMatrix(cols, rows);
    score = 0;
    linesCleared = 0;
    level = 1;
    running = true;
    gameOver = false;
    dropInterval = 700;
    player.next = createPiece(pieces[Math.floor(Math.random()*pieces.length)]);
    playerReset();
    document.getElementById("score").innerText = score;
    document.getElementById("lines").innerText = linesCleared;
    document.getElementById("level").innerText = level;
    // unlock audio context on first user interaction if needed
    ensureAudio();
}

// --- INIT: start immediately
startGame();
update();
