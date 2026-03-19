// input.js — Mouse and keyboard input handling

import {
    TILE_SIZE, GRID_WIDTH, GRID_HEIGHT, GRID_OFFSET_X, GRID_OFFSET_Y,
    SCREEN_WIDTH, SCREEN_HEIGHT, PANEL_WIDTH
} from './constants.js';

export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.mouseX = 0;
        this.mouseY = 0;
        this.gridX = -1;
        this.gridY = -1;
        this.isOnGrid = false;

        this.leftClick = false;
        this.rightClick = false;
        this.keysPressed = new Set();
        this.keysJustPressed = new Set();

        this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        window.addEventListener('keydown', e => this.onKeyDown(e));
        window.addEventListener('keyup', e => this.onKeyUp(e));
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.mouseX = (e.clientX - rect.left) * scaleX;
        this.mouseY = (e.clientY - rect.top) * scaleY;

        this.gridX = Math.floor((this.mouseX - GRID_OFFSET_X) / TILE_SIZE);
        this.gridY = Math.floor((this.mouseY - GRID_OFFSET_Y) / TILE_SIZE);
        this.isOnGrid = this.gridX >= 0 && this.gridX < GRID_WIDTH &&
                        this.gridY >= 0 && this.gridY < GRID_HEIGHT &&
                        this.mouseX < SCREEN_WIDTH - PANEL_WIDTH;
    }

    onMouseDown(e) {
        this.onMouseMove(e); // Update position
        if (e.button === 0) this.leftClick = true;
        if (e.button === 2) this.rightClick = true;
    }

    onKeyDown(e) {
        this.keysPressed.add(e.key.toLowerCase());
        this.keysJustPressed.add(e.key.toLowerCase());
    }

    onKeyUp(e) {
        this.keysPressed.delete(e.key.toLowerCase());
    }

    consumeClick() {
        const had = this.leftClick;
        this.leftClick = false;
        return had;
    }

    consumeRightClick() {
        const had = this.rightClick;
        this.rightClick = false;
        return had;
    }

    consumeKey(key) {
        const had = this.keysJustPressed.has(key.toLowerCase());
        this.keysJustPressed.delete(key.toLowerCase());
        return had;
    }

    clearFrame() {
        this.leftClick = false;
        this.rightClick = false;
        this.keysJustPressed.clear();
    }
}
