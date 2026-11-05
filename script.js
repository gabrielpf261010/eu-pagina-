
// =====================================
// 1. ELEMENTOS DO HTML
// =====================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const coinText = document.getElementById("coin-count");
const lifeText = document.getElementById("live-count");
const levelText = document.getElementById("level-count");

const overlay = document.getElementById("game-screen-overlay");
const overlayText = document.getElementById("overlay-text");
const restartBtn = document.getElementById("restart-btn");


// =====================================
// 2. CONFIGURAÇÕES DO JOGO
// =====================================

const gravity = 1300;
const speed = 220;
const jumpForce = -530;

let lives = 3;
let totalCoins = 0;
let currentLevel = 0;

let cameraX = 0;
let playing = false;
let lastTime = 0;

const keys = {};


// =====================================
// 3. FASES DO JOGO
// =====================================

const levels = [
    {
        width: 1400,

        platforms: [
            {x: 0, y: 360, w: 350, h: 40},
            {x: 420, y: 310, w: 180, h: 20},
            {x: 680, y: 260, w: 180, h: 20},
            {x: 950, y: 320, w: 200, h: 20},
            {x: 1200, y: 360, w: 200, h: 40}
        ],

        coins: [
            {x: 200, y: 320},
            {x: 480, y: 270},
            {x: 740, y: 220},
            {x: 1050, y: 280}
        ],

        flag: {x: 1330, y: 290}
    },

    {
        width: 1600,

        platforms: [
            {x: 0, y: 360, w: 250, h: 40},
            {x: 320, y: 300, w: 130, h: 20},
            {x: 520, y: 240, w: 130, h: 20},
            {x: 730, y: 300, w: 130, h: 20},
            {x: 940, y: 240, w: 150, h: 20},
            {x: 1170, y: 300, w: 150, h: 20},
            {x: 1400, y: 360, w: 200, h: 40}
        ],

        coins: [
            {x: 360, y: 260},
            {x: 560, y: 200},
            {x: 770, y: 260},
            {x: 990, y: 200},
            {x: 1220, y: 260}
        ],

        flag: {x: 1510, y: 290}
    },

    {
        width: 1800,

        platforms: [
            {x: 0, y: 360, w: 250, h: 40},
            {x: 310, y: 290, w: 120, h: 20},
            {x: 500, y: 230, w: 120, h: 20},
            {x: 700, y: 290, w: 120, h: 20},
            {x: 900, y: 220, w: 130, h: 20},
            {x: 1120, y: 280, w: 130, h: 20},
            {x: 1350, y: 220, w: 130, h: 20},
            {x: 1580, y: 360, w: 220, h: 40}
        ],

        coins: [
            {x: 350, y: 250},
            {x: 540, y: 190},
            {x: 740, y: 250},
            {x: 940, y: 180},
            {x: 1160, y: 240},
            {x: 1390, y: 180}
        ],

        flag: {x: 1700, y: 290}
    }
];


// =====================================
// 4. JOGADOR
// =====================================

const player = {
    x: 50,
    y: 300,
    w: 30,
    h: 40,
    vx: 0,
    vy: 0,
    grounded: false
};

let platforms = [];
let coins = [];
let flag = {};


// =====================================
// 5. CARREGAR FASE
// =====================================

function loadLevel(number) {
    currentLevel = number;

    const level = levels[currentLevel];

    platforms = level.platforms;

    coins = level.coins.map(coin => ({
        ...coin,
        collected: false
    }));

    flag = level.flag;

    player.x = 50;
    player.y = 300;
    player.vx = 0;
    player.vy = 0;

    cameraX = 0;

    levelText.textContent = currentLevel + 1;
}


// =====================================
// 6. DETECTAR COLISÕES
// =====================================

function collision(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}


// =====================================
// 7. CONTROLES
// =====================================

document.addEventListener("keydown", event => {
    keys[event.code] = true;

    if ([
        "ArrowUp", "ArrowDown",
        "ArrowLeft", "ArrowRight", "Space"
    ].includes(event.code)) {
        event.preventDefault();
    }
});

document.addEventListener("keyup", event => {
    keys[event.code] = false;
});


// =====================================
// 8. ATUALIZAR O JOGO
// =====================================

function update(dt) {
    if (!playing) return;

    // Movimento para os lados
    player.vx = 0;

    if (keys["ArrowRight"] || keys["KeyD"]) {
        player.vx = speed;
    }

    if (keys["ArrowLeft"] || keys["KeyA"]) {
        player.vx = -speed;
    }

    player.x += player.vx * dt;

    // Limite do mapa
    const levelWidth = levels[currentLevel].width;

    player.x = Math.max(
        0,
        Math.min(player.x, levelWidth - player.w)
    );

    // Pulo
    if (
        (keys["Space"] || keys["ArrowUp"] || keys["KeyW"]) &&
        player.grounded
    ) {
        player.vy = jumpForce;
        player.grounded = false;
    }

    // Gravidade e movimento vertical
    const oldBottom = player.y + player.h;

    player.vy += gravity * dt;
    player.y += player.vy * dt;

    player.grounded = false;

    // Colisão com plataformas
    for (const platform of platforms) {
        const horizontal =
            player.x + player.w > platform.x &&
            player.x < platform.x + platform.w;

        const newBottom = player.y + player.h;

        if (
            horizontal &&
            oldBottom <= platform.y &&
            newBottom >= platform.y &&
            player.vy >= 0
        ) {
            player.y = platform.y - player.h;
            player.vy = 0;
            player.grounded = true;
        }
    }

    // Coletar moedas
    for (const coin of coins) {
        if (coin.collected) continue;

        const coinBox = {
            x: coin.x - 10,
            y: coin.y - 10,
            w: 20,
            h: 20
        };

        if (collision(player, coinBox)) {
            coin.collected = true;
            totalCoins++;
            coinText.textContent = totalCoins;
        }
    }

    // Chegar na bandeira
    const flagBox = {
        x: flag.x,
        y: flag.y,
        w: 30,
        h: 70
    };

    if (collision(player, flagBox)) {
        nextLevel();
        return;
    }

    // Cair do cenário
    if (player.y > canvas.height + 100) {
        lives--;
        lifeText.textContent = lives;

        if (lives <= 0) {
            endGame("Fim de jogo!");
        } else {
            player.x = 50;
            player.y = 300;
            player.vy = 0;
        }
    }

    // Câmera acompanha o jogador
    cameraX = player.x - canvas.width / 2;

    cameraX = Math.max(
        0,
        Math.min(cameraX, levelWidth - canvas.width)
    );
}


// =====================================
// 9. DESENHAR O CENÁRIO
// =====================================

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Plataformas
    ctx.fillStyle = "#238b45";

    for (const platform of platforms) {
        ctx.fillRect(
            platform.x,
            platform.y,
            platform.w,
            platform.h
        );
    }

    // Moedas
    for (const coin of coins) {
        if (coin.collected) continue;

        ctx.fillStyle = "gold";
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    // Bandeira
    ctx.fillStyle = "white";
    ctx.fillRect(flag.x, flag.y, 5, 70);

    ctx.fillStyle = "red";
    ctx.fillRect(flag.x + 5, flag.y, 25, 18);

    // Jogador
    ctx.fillStyle = "#e53935";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // Olho
    ctx.fillStyle = "white";
    ctx.fillRect(player.x + 18, player.y + 8, 6, 6);

    ctx.restore();
}


// =====================================
// 10. MUDAR DE FASE
// =====================================

function nextLevel() {
    if (currentLevel < levels.length - 1) {
        loadLevel(currentLevel + 1);
    } else {
        endGame("Você venceu as 3 fases!");
    }
}


// =====================================
// 11. FINALIZAR O JOGO
// =====================================

function endGame(message) {
    playing = false;

    overlayText.textContent = message;
    restartBtn.textContent = "Jogar novamente";

    overlay.style.display = "flex";
}


// =====================================
// 12. LOOP PRINCIPAL
// =====================================

function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;

    lastTime = timestamp;

    // Limitar o tempo para evitar movimentos exagerados
    dt = Math.min(dt, 0.033);

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}


// =====================================
// 13. COMEÇAR OU REINICIAR
// =====================================

function startGame() {
    lives = 3;
    totalCoins = 0;

    lifeText.textContent = lives;
    coinText.textContent = totalCoins;

    loadLevel(0);

    playing = true;
    overlay.style.display = "none";
}

restartBtn.addEventListener("click", startGame);


// =====================================
// 14. TELA CHEIA
// =====================================

document.getElementById("fullscreen-btn").addEventListener("click", () => {
    const container = document.getElementById("game-container");

    if (!document.fullscreenElement) {
        container.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});


// =====================================
// 15. INICIAR O JOGO
// =====================================

loadLevel(0);
requestAnimationFrame(gameLoop);
