const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Elementos de UI externa
const coinCountSpan = document.getElementById("coin-count");
const liveCountSpan = document.getElementById("live-count");
const overlay = document.getElementById("game-screen-overlay");
const overlayText = document.getElementById("overlay-text");
const restartBtn = document.getElementById("restart-btn");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const gameContainer = document.getElementById("game-container");

// Configurações Globais
let score = 0;
let lives = 3;
let gameOver = false;

// Estado das teclas pressionadas
const keys = { right: false, left: false, up: false };

// Configurações do Jogador (Mario-like)
const player = {
    x: 50,
    y: 300,
    width: 30,
    height: 40,
    speed: 5,
    velX: 0,
    velY: 0,
    jumping: false,
    grounded: false,
    color: "#e52521" // Vermelho icônico
};

const gravity = 0.6;
const friction = 0.85;

// Estrutura do Mapa: Chão e Plataformas (Blocos flutuantes)
const platforms = [
    { x: 0, y: 370, width: 1200, height: 30, color: "#8c531d" },  // Chão principal longo
    { x: 200, y: 260, width: 120, height: 20, color: "#fbd000" }, // Bloco flutuante 1
    { x: 400, y: 180, width: 150, height: 20, color: "#fbd000" }, // Bloco flutuante 2
    { x: 650, y: 250, width: 100, height: 20, color: "#fbd000" }, // Bloco flutuante 3
    { x: 900, y: 200, width: 150, height: 20, color: "#fbd000" }  // Bloco final da bandeira
];

// Moedas para coletar
let coins = [
    { x: 250, y: 220, radius: 8, collected: false },
    { x: 470, y: 140, radius: 8, collected: false },
    { x: 700, y: 210, radius: 8, collected: false }
];

// O "Cano" ou Mastro Final (Objetivo de Vitória)
const flagPole = { x: 1000, y: 170, width: 20, height: 200, color: "#43b047" };

// Gerenciamento de Câmera (Scroll de tela lateral)
let cameraX = 0;

// Ouvintes de Teclado
window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
    if (e.key === "ArrowUp" || e.key === " " || e.key === "w") keys.up = true;
});

window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
    if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
    if (e.key === "ArrowUp" || e.key === " " || e.key === "w") keys.up = false;
});

// Botão para resetar o jogo
restartBtn.addEventListener("click", resetGame);

// --- MECÂNICA DE TELA CHEIA COMPATÍVEL ---
fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
        gameContainer.requestFullscreen().catch(err => {
            alert(`Erro ao tentar ativar Tela Cheia: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

// Detectar colisão retangular clássica (AABB)
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Loop Principal do Jogo rodando em ciclos de animação do navegador
function update() {
    if (gameOver) return;

    // Movimentação horizontal com inércia (fricção)
    if (keys.right) {
        if (player.velX < player.speed) player.velX++;
    }
    if (keys.left) {
        if (player.velX > -player.speed) player.velX--;
    }
    player.velX *= friction;
    
    // Gravidade aplicada constantemente
    player.velY += gravity;

    // Atualiza posições temporárias para testar colisões
    player.x += player.velX;
    
    // Impedir o jogador de voltar para trás do início do mapa
    if (player.x < 0) player.x = 0;

    // Lógica de pulo
    if (keys.up && !player.jumping && player.grounded) {
        player.jumping = true;
        player.grounded = false;
        player.velY = -12; // Força do pulo
    }

    player.grounded = false;
    player.y += player.velY;

    // Checar colisão com as Plataformas
    for (let plat of platforms) {
        if (checkCollision(player, plat)) {
            // Colisão por cima (pisar na plataforma)
            if (player.velY > 0 && (player.y + player.height - player.velY) <= plat.y) {
                player.grounded = true;
                player.jumping = false;
                player.velY = 0;
                player.y = plat.y - player.height;
            }
            // Colisão por baixo (bater a cabeça na plataforma)
            else if (player.velY < 0 && (player.y - player.velY) >= plat.y + plat.height) {
                player.velY = 0;
                player.y = plat.y + plat.height;
            }
        }
    }

    // Coleta de moedas
    for (let coin of coins) {
        if (!coin.collected) {
            // Conversão simples para colisão círculo-retângulo aproximada
            if (player.x < coin.x + coin.radius && player.x + player.width > coin.x - coin.radius &&
                player.y < coin.y + coin.radius && player.y + player.height > coin.y - coin.radius) {
                coin.collected = true;
                score++;
                coinCountSpan.innerText = score;
            }
        }
    }

    // Checar se alcançou o Mastro de Vitória
    if (checkCollision(player, flagPole)) {
        endGame(true);
    }

    // Queda em buracos (Game Over)
    if (player.y > canvas.height + 50) {
        lives--;
        liveCountSpan.innerText = lives;
        if (lives <= 0) {
            endGame(false);
        } else {
            // Renasce no início do nível
            player.x = 50;
            player.y = 200;
            player.velX = 0;
            player.velY = 0;
        }
    }

    // Atualiza o Scroll de Câmera focado no jogador a partir do meio da tela
    if (player.x > canvas.width / 2) {
        cameraX = player.x - canvas.width / 2;
    } else {
        cameraX = 0;
    }

    // Renderizar Elementos Visuais na Tela
    draw();

    requestAnimationFrame(update);
}

function draw() {
    // Limpa a tela com a cor azul céu
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Desloca o contexto de desenho com base no movimento da câmera
    ctx.translate(-cameraX, 0);

    // Desenhar Fundo (Nuvens decorativas estáticas ao fundo)
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath(); ctx.arc(150, 80, 30, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(600, 100, 40, 0, Math.PI * 2); ctx.fill();

    // Desenhar Plataformas e Chão
    for (let plat of platforms) {
        ctx.fillStyle = plat.color;
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        
        // Bordas superiores pretas estilo retrô
        ctx.fillStyle = "#000";
        ctx.fillRect(plat.x, plat.y, plat.width, 3);
    }

    // Desenhar Moedas animadas (círculos amarelos)
    for (let coin of coins) {
        if (!coin.collected) {
            ctx.fillStyle = "#fbd000";
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    // Desenhar o Objetivo Final (Cano/Mastro verde)
    ctx.fillStyle = flagPole.color;
    ctx.fillRect(flagPole.x, flagPole.y, flagPole.width, flagPole.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(flagPole.x, flagPole.y, flagPole.width, 5); // topo

    // Desenhar o Personagem (Retângulo com visual simples do Macacão do Mario)
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    // Detalhe dos Olhos / Boné
    ctx.fillStyle = "#000";
    if (player.velX >= 0) {
        ctx.fillRect(player.x + player.width - 10, player.y + 8, 6, 6); // Olho p/ direita
        ctx.fillStyle = "#fff"; ctx.fillRect(player.x, player.y + 18, 18, 12); // Macacão detalhe
    } else {
        ctx.fillRect(player.x + 4, player.y + 8, 6, 6); // Olho p/ esquerda
        ctx.fillStyle = "#fff"; ctx.fillRect(player.x + 12, player.y + 18, 18, 12);
    }

    ctx.restore();
}

function endGame(won) {
    gameOver = true;
    overlay.classList.remove("hidden");
    if (won) {
        overlayText.innerText = "Você Venceu! 🎉";
        overlayText.style.color = "#43b047";
    } else {
        overlayText.innerText = "Fim de Jogo! 🍄";
        overlayText.style.color = "#e52521";
    }
}

function resetGame() {
    score = 0;
    lives = 3;
    gameOver = false;
    player.x = 50;
    player.y = 300;
    player.velX = 0;
    player.velY = 0;
    cameraX = 0;
    
    coinCountSpan.innerText = score;
    liveCountSpan.innerText = lives;
    
    // Reseta moedas
    coins.forEach(c => c.collected = false);
    
    overlay.classList.add("hidden");
    update();
}

// Inicializar o jogo pela primeira vez
resetGame();
