// mapEditor.js — Map Editor for creating custom tower defense maps

import {
    SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE, GRID_WIDTH, GRID_HEIGHT,
    GRID_OFFSET_X, GRID_OFFSET_Y, TOP_BAR_HEIGHT, BOTTOM_BAR_HEIGHT,
    PANEL_WIDTH, TileType, Colors, FONT
} from './constants.js';
import { getTileSprite } from './sprites.js';
import { findRoute } from './pathfinding.js';

// roundRect helper for drawing rounded-corner rectangles
function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

export class MapEditor {
    constructor() {
        // 20 rows x 30 columns grid, initialized to GRASS
        this.tiles = [];
        for (let row = 0; row < GRID_HEIGHT; row++) {
            this.tiles.push(new Array(GRID_WIDTH).fill(TileType.GRASS));
        }

        this.mapName = 'Untitled';
        this.selectedTile = TileType.PATH;
        this.painting = false;
        this.erasing = false;

        this.undoStack = [];
        this.statusMsg = '';
        this.statusTimer = 0;
        this.validationResult = null;

        // Tile palette
        this.palette = [
            TileType.GRASS, TileType.PATH, TileType.WATER, TileType.TREE,
            TileType.ROCK, TileType.SPAWN, TileType.EXIT, TileType.HIGH_GROUND
        ];
        this.paletteNames = [
            'Grass', 'Path', 'Water', 'Tree',
            'Rock', 'Spawn', 'Exit', 'High Ground'
        ];

        // Panel layout
        const panelX = SCREEN_WIDTH - PANEL_WIDTH;
        const palStartY = GRID_OFFSET_Y + 10;
        const btnW = 260;
        const palBtnH = 34;
        const palSpacing = 38;

        // Build palette buttons
        this.paletteButtons = [];
        for (let i = 0; i < this.palette.length; i++) {
            this.paletteButtons.push({
                x: panelX + 10,
                y: palStartY + i * palSpacing,
                w: btnW,
                h: palBtnH,
                tileType: this.palette[i],
                label: this.paletteNames[i],
            });
        }

        // Tool buttons below palette
        const toolStartY = palStartY + this.palette.length * palSpacing + 20;
        const toolBtnH = 30;
        const toolSpacing = 35;
        const toolLabels = ['Validate (V)', 'Clear (C)', 'Generate (G)', 'Save', 'Load'];
        const toolActions = ['validate', 'clear', 'generate', 'save', 'load'];

        this.toolButtons = [];
        for (let i = 0; i < toolLabels.length; i++) {
            this.toolButtons.push({
                x: panelX + 10,
                y: toolStartY + i * toolSpacing,
                w: btnW,
                h: toolBtnH,
                label: toolLabels[i],
                action: toolActions[i],
            });
        }

        // Back button (bottom-right)
        this.backButton = {
            x: SCREEN_WIDTH - 130,
            y: SCREEN_HEIGHT - 35,
            w: 120,
            h: 30,
        };
    }

    update(dt) {
        if (this.statusTimer > 0) {
            this.statusTimer -= dt;
            if (this.statusTimer <= 0) {
                this.statusMsg = '';
                this.statusTimer = 0;
            }
        }
    }

    draw(ctx, mouseX, mouseY) {
        ctx.save(); // Protect canvas state

        // --- Top bar ---
        ctx.fillStyle = Colors.BG;
        ctx.fillRect(0, 0, SCREEN_WIDTH, TOP_BAR_HEIGHT);
        // Title
        ctx.fillStyle = Colors.ACCENT;
        ctx.font = `bold 20px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`MAP EDITOR - ${this.mapName}`, 16, TOP_BAR_HEIGHT / 2);
        // Grid size right-aligned
        ctx.fillStyle = Colors.TEXT_DIM;
        ctx.font = `14px ${FONT}`;
        ctx.textAlign = 'right';
        ctx.fillText(`${GRID_WIDTH} x ${GRID_HEIGHT}`, SCREEN_WIDTH - PANEL_WIDTH - 16, TOP_BAR_HEIGHT / 2);
        ctx.textAlign = 'left';

        // --- Grid ---
        for (let row = 0; row < GRID_HEIGHT; row++) {
            for (let col = 0; col < GRID_WIDTH; col++) {
                const tileType = this.tiles[row][col];
                const px = GRID_OFFSET_X + col * TILE_SIZE;
                const py = GRID_OFFSET_Y + row * TILE_SIZE;
                const sprite = getTileSprite(tileType, col, row);
                ctx.drawImage(sprite, px, py);
            }
        }

        // Faint grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let col = 0; col <= GRID_WIDTH; col++) {
            const x = GRID_OFFSET_X + col * TILE_SIZE;
            ctx.beginPath();
            ctx.moveTo(x, GRID_OFFSET_Y);
            ctx.lineTo(x, GRID_OFFSET_Y + GRID_HEIGHT * TILE_SIZE);
            ctx.stroke();
        }
        for (let row = 0; row <= GRID_HEIGHT; row++) {
            const y = GRID_OFFSET_Y + row * TILE_SIZE;
            ctx.beginPath();
            ctx.moveTo(GRID_OFFSET_X, y);
            ctx.lineTo(GRID_OFFSET_X + GRID_WIDTH * TILE_SIZE, y);
            ctx.stroke();
        }

        // Highlight hovered tile
        const hovered = this._screenToGrid(mouseX, mouseY);
        if (hovered) {
            const hx = GRID_OFFSET_X + hovered.gx * TILE_SIZE;
            const hy = GRID_OFFSET_Y + hovered.gy * TILE_SIZE;
            ctx.strokeStyle = Colors.ACCENT;
            ctx.lineWidth = 2;
            ctx.strokeRect(hx, hy, TILE_SIZE, TILE_SIZE);
        }

        // Validation overlay
        if (this.validationResult) {
            for (let row = 0; row < GRID_HEIGHT; row++) {
                for (let col = 0; col < GRID_WIDTH; col++) {
                    const tileType = this.tiles[row][col];
                    if (tileType === TileType.PATH || tileType === TileType.SPAWN || tileType === TileType.EXIT) {
                        const px = GRID_OFFSET_X + col * TILE_SIZE;
                        const py = GRID_OFFSET_Y + row * TILE_SIZE;
                        if (this.validationResult.valid) {
                            ctx.fillStyle = 'rgba(68, 255, 68, 0.2)';
                        } else {
                            ctx.fillStyle = 'rgba(255, 68, 68, 0.2)';
                        }
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }

        // --- Right panel ---
        const panelX = SCREEN_WIDTH - PANEL_WIDTH;
        ctx.fillStyle = Colors.PANEL;
        ctx.fillRect(panelX, 0, PANEL_WIDTH, SCREEN_HEIGHT);
        // Panel border
        ctx.strokeStyle = Colors.PANEL_BORDER;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX, 0);
        ctx.lineTo(panelX, SCREEN_HEIGHT);
        ctx.stroke();

        // Panel title
        ctx.fillStyle = Colors.TEXT_DIM;
        ctx.font = `bold 14px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText('TILES', panelX + 10, GRID_OFFSET_Y - 4);

        // Palette buttons
        for (const btn of this.paletteButtons) {
            const isSelected = btn.tileType === this.selectedTile;
            // Button background
            if (isSelected) {
                ctx.fillStyle = Colors.ACCENT;
            } else {
                ctx.fillStyle = Colors.BG_LIGHT;
            }
            roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 4);
            ctx.fill();

            // Button border on hover
            if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
                mouseY >= btn.y && mouseY <= btn.y + btn.h) {
                ctx.strokeStyle = Colors.ACCENT;
                ctx.lineWidth = 1;
                roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 4);
                ctx.stroke();
            }

            // Tile preview swatch
            const swatchSize = 22;
            const swatchX = btn.x + 8;
            const swatchY = btn.y + (btn.h - swatchSize) / 2;
            const sprite = getTileSprite(btn.tileType, 0, 0);
            ctx.drawImage(sprite, swatchX, swatchY, swatchSize, swatchSize);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(swatchX, swatchY, swatchSize, swatchSize);

            // Label
            ctx.fillStyle = isSelected ? Colors.BLACK : Colors.TEXT;
            ctx.font = `13px ${FONT}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.label, btn.x + 38, btn.y + btn.h / 2);

            // Hotkey hint
            const idx = this.palette.indexOf(btn.tileType);
            if (idx >= 0) {
                ctx.fillStyle = isSelected ? 'rgba(0,0,0,0.5)' : Colors.TEXT_DARK;
                ctx.font = `11px ${FONT}`;
                ctx.textAlign = 'right';
                ctx.fillText(`[${idx}]`, btn.x + btn.w - 8, btn.y + btn.h / 2);
            }
        }

        // Tool buttons
        for (const btn of this.toolButtons) {
            ctx.fillStyle = Colors.BG_LIGHT;
            roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 4);
            ctx.fill();

            // Hover highlight
            if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
                mouseY >= btn.y && mouseY <= btn.y + btn.h) {
                ctx.strokeStyle = Colors.ACCENT;
                ctx.lineWidth = 1;
                roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 4);
                ctx.stroke();
            }

            ctx.fillStyle = Colors.TEXT;
            ctx.font = `13px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
        }

        // --- Bottom bar ---
        const bottomY = SCREEN_HEIGHT - BOTTOM_BAR_HEIGHT;
        ctx.fillStyle = Colors.BG;
        ctx.fillRect(0, bottomY, SCREEN_WIDTH, BOTTOM_BAR_HEIGHT);

        // Status message
        if (this.statusMsg) {
            ctx.fillStyle = Colors.ACCENT;
            ctx.font = `13px ${FONT}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.statusMsg, 16, bottomY + BOTTOM_BAR_HEIGHT / 2);
        }

        // Selected tile info
        ctx.fillStyle = Colors.TEXT_DIM;
        ctx.font = `12px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const selIdx = this.palette.indexOf(this.selectedTile);
        const selName = selIdx >= 0 ? this.paletteNames[selIdx] : '???';
        ctx.fillText(`Selected: ${selName}`, SCREEN_WIDTH / 2, bottomY + BOTTOM_BAR_HEIGHT / 2);

        // Spawn / exit counts
        let spawnCount = 0;
        let exitCount = 0;
        for (let row = 0; row < GRID_HEIGHT; row++) {
            for (let col = 0; col < GRID_WIDTH; col++) {
                if (this.tiles[row][col] === TileType.SPAWN) spawnCount++;
                if (this.tiles[row][col] === TileType.EXIT) exitCount++;
            }
        }
        ctx.fillStyle = Colors.TEXT_DIM;
        ctx.font = `12px ${FONT}`;
        ctx.textAlign = 'right';
        ctx.fillText(`Spawns: ${spawnCount}  Exits: ${exitCount}`, SCREEN_WIDTH - PANEL_WIDTH - 16, bottomY + BOTTOM_BAR_HEIGHT / 2);

        // --- Back button ---
        const bb = this.backButton;
        ctx.fillStyle = Colors.BG_LIGHT;
        roundRect(ctx, bb.x, bb.y, bb.w, bb.h, 4);
        ctx.fill();
        if (mouseX >= bb.x && mouseX <= bb.x + bb.w &&
            mouseY >= bb.y && mouseY <= bb.y + bb.h) {
            ctx.strokeStyle = Colors.ACCENT;
            ctx.lineWidth = 1;
            roundRect(ctx, bb.x, bb.y, bb.w, bb.h, 4);
            ctx.stroke();
        }
        ctx.fillStyle = Colors.TEXT;
        ctx.font = `13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Back (Esc)', bb.x + bb.w / 2, bb.y + bb.h / 2);

        ctx.restore(); // Restore canvas state
    }

    handleMouseDown(mx, my, button) {
        if (button === 0) {
            // Check palette buttons
            for (const btn of this.paletteButtons) {
                if (mx >= btn.x && mx <= btn.x + btn.w &&
                    my >= btn.y && my <= btn.y + btn.h) {
                    this.selectedTile = btn.tileType;
                    return null;
                }
            }

            // Check tool buttons
            for (const btn of this.toolButtons) {
                if (mx >= btn.x && mx <= btn.x + btn.w &&
                    my >= btn.y && my <= btn.y + btn.h) {
                    switch (btn.action) {
                        case 'validate': this._validate(); break;
                        case 'clear': this._clear(); break;
                        case 'generate': this._generateRandom(); break;
                        case 'save': this._saveMap(); break;
                        case 'load': this._loadMap(); break;
                    }
                    return null;
                }
            }

            // Check back button
            const bb = this.backButton;
            if (mx >= bb.x && mx <= bb.x + bb.w &&
                my >= bb.y && my <= bb.y + bb.h) {
                return 'quit';
            }

            // Start painting on grid
            const cell = this._screenToGrid(mx, my);
            if (cell) {
                this._pushUndo();
                this.painting = true;
                this._paintAt(cell.gx, cell.gy);
            }
        } else if (button === 2) {
            // Right-click: start erasing
            const cell = this._screenToGrid(mx, my);
            if (cell) {
                this._pushUndo();
                this.erasing = true;
                this.tiles[cell.gy][cell.gx] = TileType.GRASS;
                this.validationResult = null;
            }
        }
        return null;
    }

    handleMouseMove(mx, my) {
        if (this.painting) {
            const cell = this._screenToGrid(mx, my);
            if (cell) {
                this._paintAt(cell.gx, cell.gy);
            }
        }
        if (this.erasing) {
            const cell = this._screenToGrid(mx, my);
            if (cell) {
                this.tiles[cell.gy][cell.gx] = TileType.GRASS;
                this.validationResult = null;
            }
        }
    }

    handleMouseUp() {
        this.painting = false;
        this.erasing = false;
    }

    handleKeyDown(key, ctrlKey = false) {
        const k = key.toLowerCase();
        if (k === 'escape') {
            return 'quit';
        }
        if (k === 'v') {
            this._validate();
            return null;
        }
        if (k === 'c') {
            this._clear();
            return null;
        }
        if (k === 'g') {
            this._generateRandom();
            return null;
        }
        if (k === 'z' && ctrlKey) {
            this._undo();
            return null;
        }
        // Number keys 0-7 to select palette tile
        const num = parseInt(key);
        if (!isNaN(num) && num >= 0 && num <= 7) {
            this.selectedTile = this.palette[num];
            return null;
        }
        return null;
    }

    _screenToGrid(mx, my) {
        const gx = Math.floor((mx - GRID_OFFSET_X) / TILE_SIZE);
        const gy = Math.floor((my - GRID_OFFSET_Y) / TILE_SIZE);
        if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) {
            return null;
        }
        return { gx, gy };
    }

    _pushUndo() {
        const copy = this.tiles.map(row => [...row]);
        this.undoStack.push(copy);
        if (this.undoStack.length > 50) {
            this.undoStack.shift();
        }
    }

    _undo() {
        if (this.undoStack.length === 0) {
            this._setStatus('Nothing to undo');
            return;
        }
        this.tiles = this.undoStack.pop();
        this.validationResult = null;
        this._setStatus('Undo');
    }

    _paintAt(gx, gy) {
        this.tiles[gy][gx] = this.selectedTile;
        this.validationResult = null;
    }

    _setStatus(msg, duration = 3.0) {
        this.statusMsg = msg;
        this.statusTimer = duration;
    }

    _validate() {
        const errors = [];

        // Collect spawns and exits
        const spawns = [];
        const exits = [];
        let buildableCount = 0;
        const totalCells = GRID_WIDTH * GRID_HEIGHT;

        for (let row = 0; row < GRID_HEIGHT; row++) {
            for (let col = 0; col < GRID_WIDTH; col++) {
                const t = this.tiles[row][col];
                if (t === TileType.SPAWN) spawns.push([col, row]);
                if (t === TileType.EXIT) exits.push([col, row]);
                // Buildable: GRASS or HIGH_GROUND
                if (t === TileType.GRASS || t === TileType.HIGH_GROUND) {
                    buildableCount++;
                }
            }
        }

        // Check at least 1 spawn
        if (spawns.length === 0) {
            errors.push('Need at least 1 Spawn tile');
        }
        // Check at least 1 exit
        if (exits.length === 0) {
            errors.push('Need at least 1 Exit tile');
        }

        // Check spawns on left edge (x = 0)
        for (const [sx, sy] of spawns) {
            if (sx !== 0) {
                errors.push(`Spawn at (${sx},${sy}) must be on left edge (x=0)`);
            }
        }
        // Check exits on right edge (x = 29)
        for (const [ex, ey] of exits) {
            if (ex !== GRID_WIDTH - 1) {
                errors.push(`Exit at (${ex},${ey}) must be on right edge (x=${GRID_WIDTH - 1})`);
            }
        }

        // Check path connectivity: each spawn must reach at least one exit
        if (spawns.length > 0 && exits.length > 0) {
            for (const spawn of spawns) {
                const route = findRoute(this.tiles, spawn, exits);
                if (route.length === 0) {
                    errors.push(`Spawn at (${spawn[0]},${spawn[1]}) has no path to any exit`);
                }
            }
        }

        // Check buildable area >= 20%
        const buildableRatio = buildableCount / totalCells;
        if (buildableRatio < 0.2) {
            errors.push(`Buildable area too low: ${(buildableRatio * 100).toFixed(1)}% (need >= 20%)`);
        }

        const valid = errors.length === 0;
        this.validationResult = { valid, errors };

        if (valid) {
            this._setStatus('Map is valid!', 4.0);
        } else {
            this._setStatus(`Invalid: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ''}`, 5.0);
        }
    }

    _clear() {
        this._pushUndo();
        for (let row = 0; row < GRID_HEIGHT; row++) {
            for (let col = 0; col < GRID_WIDTH; col++) {
                this.tiles[row][col] = TileType.GRASS;
            }
        }
        this.validationResult = null;
        this._setStatus('Cleared');
    }

    _generateRandom() {
        this._pushUndo();

        // Fill with grass
        for (let row = 0; row < GRID_HEIGHT; row++) {
            for (let col = 0; col < GRID_WIDTH; col++) {
                this.tiles[row][col] = TileType.GRASS;
            }
        }

        // Place 1-2 spawns on left edge
        const numSpawns = 1 + Math.floor(Math.random() * 2);
        const spawnRows = [];
        for (let i = 0; i < numSpawns; i++) {
            let sy;
            do {
                sy = 2 + Math.floor(Math.random() * (GRID_HEIGHT - 4));
            } while (spawnRows.includes(sy));
            spawnRows.push(sy);
            this.tiles[sy][0] = TileType.SPAWN;
        }

        // Place 1-2 exits on right edge
        const numExits = 1 + Math.floor(Math.random() * 2);
        const exitRows = [];
        for (let i = 0; i < numExits; i++) {
            let ey;
            do {
                ey = 2 + Math.floor(Math.random() * (GRID_HEIGHT - 4));
            } while (exitRows.includes(ey));
            exitRows.push(ey);
            this.tiles[ey][GRID_WIDTH - 1] = TileType.EXIT;
        }

        // Generate snaking paths from each spawn to nearest exit
        for (const sy of spawnRows) {
            // Find the closest exit row
            let targetRow = exitRows[0];
            let minDist = Math.abs(sy - exitRows[0]);
            for (const ey of exitRows) {
                const dist = Math.abs(sy - ey);
                if (dist < minDist) {
                    minDist = dist;
                    targetRow = ey;
                }
            }

            // Walk from spawn toward exit with horizontal and vertical segments
            let cx = 1;  // start after spawn
            let cy = sy;
            const targetX = GRID_WIDTH - 2; // stop before exit

            while (cx <= targetX) {
                // Horizontal segment (3-8 tiles long)
                const hLen = 3 + Math.floor(Math.random() * 6);
                for (let i = 0; i < hLen && cx <= targetX; i++) {
                    this.tiles[cy][cx] = TileType.PATH;
                    cx++;
                }

                if (cx > targetX) break;

                // Vertical jog toward target row
                const diff = targetRow - cy;
                if (diff !== 0) {
                    const vLen = Math.min(Math.abs(diff), 2 + Math.floor(Math.random() * 4));
                    const dir = diff > 0 ? 1 : -1;
                    for (let i = 0; i < vLen; i++) {
                        cy += dir;
                        cy = Math.max(1, Math.min(GRID_HEIGHT - 2, cy));
                        this.tiles[cy][cx] = TileType.PATH;
                    }
                } else {
                    // Random vertical jog for variety
                    const jog = (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
                    const steps = Math.abs(jog);
                    const dir = jog > 0 ? 1 : -1;
                    for (let i = 0; i < steps; i++) {
                        cy += dir;
                        cy = Math.max(1, Math.min(GRID_HEIGHT - 2, cy));
                        this.tiles[cy][cx] = TileType.PATH;
                    }
                }
            }

            // Connect last path tile to exit
            const exitX = GRID_WIDTH - 1;
            // Ensure there's a path tile adjacent to the exit
            if (this.tiles[targetRow][exitX - 1] !== TileType.PATH) {
                // Connect vertically from cy to targetRow at cx-1
                let connectX = Math.min(cx, GRID_WIDTH - 2);
                const startY = cy;
                const endY = targetRow;
                const dir = endY > startY ? 1 : -1;
                let yy = startY;
                while (yy !== endY) {
                    yy += dir;
                    this.tiles[yy][connectX] = TileType.PATH;
                }
                // Then horizontal to exit
                for (let xx = connectX + 1; xx < exitX; xx++) {
                    this.tiles[targetRow][xx] = TileType.PATH;
                }
            }
        }

        // Add decorations near the path
        for (let row = 0; row < GRID_HEIGHT; row++) {
            for (let col = 0; col < GRID_WIDTH; col++) {
                if (this.tiles[row][col] !== TileType.GRASS) continue;

                // Check if near a path
                let nearPath = false;
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const nr = row + dy;
                        const nc = col + dx;
                        if (nr >= 0 && nr < GRID_HEIGHT && nc >= 0 && nc < GRID_WIDTH) {
                            const t = this.tiles[nr][nc];
                            if (t === TileType.PATH || t === TileType.SPAWN || t === TileType.EXIT) {
                                nearPath = true;
                                break;
                            }
                        }
                    }
                    if (nearPath) break;
                }

                const rand = Math.random();
                if (nearPath) {
                    // Near path: occasional trees/rocks
                    if (rand < 0.06) {
                        this.tiles[row][col] = TileType.TREE;
                    } else if (rand < 0.10) {
                        this.tiles[row][col] = TileType.ROCK;
                    } else if (rand < 0.12) {
                        this.tiles[row][col] = TileType.HIGH_GROUND;
                    }
                } else {
                    // Far from path: more decorations
                    if (rand < 0.08) {
                        this.tiles[row][col] = TileType.TREE;
                    } else if (rand < 0.12) {
                        this.tiles[row][col] = TileType.ROCK;
                    } else if (rand < 0.15) {
                        this.tiles[row][col] = TileType.WATER;
                    } else if (rand < 0.17) {
                        this.tiles[row][col] = TileType.HIGH_GROUND;
                    }
                }
            }
        }

        this.validationResult = null;
        this._setStatus('Generated random map');
    }

    _saveMap() {
        // Collect spawns and exits
        const spawns = [];
        const exits = [];
        for (let row = 0; row < GRID_HEIGHT; row++) {
            for (let col = 0; col < GRID_WIDTH; col++) {
                if (this.tiles[row][col] === TileType.SPAWN) spawns.push([col, row]);
                if (this.tiles[row][col] === TileType.EXIT) exits.push([col, row]);
            }
        }

        const mapData = {
            name: this.mapName,
            width: GRID_WIDTH,
            height: GRID_HEIGHT,
            tiles: this.tiles.map(row => [...row]),
            spawns,
            exits,
        };

        try {
            const key = `custom_map_${this.mapName}`;
            localStorage.setItem(key, JSON.stringify(mapData));
            this._setStatus('Saved!');
        } catch (e) {
            this._setStatus(`Save failed: ${e.message}`, 4.0);
        }
    }

    _loadMap() {
        // Scan localStorage for custom maps
        let foundKey = null;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('custom_map_')) {
                foundKey = key;
                break;
            }
        }

        if (!foundKey) {
            this._setStatus('No saved maps found');
            return;
        }

        try {
            const data = JSON.parse(localStorage.getItem(foundKey));
            if (!data || !data.tiles) {
                this._setStatus('Invalid map data');
                return;
            }

            this._pushUndo();
            this.mapName = data.name || 'Untitled';

            // Restore tiles
            for (let row = 0; row < GRID_HEIGHT; row++) {
                for (let col = 0; col < GRID_WIDTH; col++) {
                    if (data.tiles[row] && data.tiles[row][col] !== undefined) {
                        this.tiles[row][col] = data.tiles[row][col];
                    } else {
                        this.tiles[row][col] = TileType.GRASS;
                    }
                }
            }

            this.validationResult = null;
            this._setStatus(`Loaded ${this.mapName}`);
        } catch (e) {
            this._setStatus(`Load failed: ${e.message}`, 4.0);
        }
    }
}
