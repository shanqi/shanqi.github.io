// main.js — Entry point and game loop

import { SCREEN_WIDTH, SCREEN_HEIGHT } from './constants.js';
import { Game } from './game.js';

const canvas = document.getElementById('gameCanvas');

// HiDPI/Retina support — render at native resolution for crisp text
const dpr = window.devicePixelRatio || 1;
canvas.width = SCREEN_WIDTH * dpr;
canvas.height = SCREEN_HEIGHT * dpr;
canvas.style.width = SCREEN_WIDTH + 'px';
canvas.style.height = SCREEN_HEIGHT + 'px';

const ctx = canvas.getContext('2d');
ctx.scale(dpr, dpr);

// Scale canvas to fit window while maintaining aspect ratio
function resizeCanvas() {
    const ratio = SCREEN_WIDTH / SCREEN_HEIGHT;
    const maxW = window.innerWidth * 0.98;
    const maxH = window.innerHeight * 0.98;

    let w, h;
    if (maxW / maxH > ratio) {
        h = maxH;
        w = h * ratio;
    } else {
        w = maxW;
        h = w / ratio;
    }

    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const game = new Game(canvas);

let lastTime = performance.now();
const MAX_DT = 1 / 30;

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, MAX_DT);
    lastTime = timestamp;

    game.update(dt);
    game.draw();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
