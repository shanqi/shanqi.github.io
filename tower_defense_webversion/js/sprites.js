// sprites.js — Procedural sprite generation using offscreen canvas

import { TILE_SIZE, TowerType, EnemyType, TileType, TowerColors, EnemyColors, Colors } from './constants.js';

const spriteCache = new Map();

function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

function getCached(key, w, h, drawFn) {
    if (spriteCache.has(key)) return spriteCache.get(key);
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d');
    drawFn(ctx, w, h);
    spriteCache.set(key, c);
    return c;
}

// Tile sprites
export function getGrassTile(variant = 0) {
    return getCached(`grass_${variant}`, TILE_SIZE, TILE_SIZE, (ctx, w, h) => {
        ctx.fillStyle = variant === 0 ? Colors.GRASS_DARK : Colors.GRASS_LIGHT;
        ctx.fillRect(0, 0, w, h);
        // Texture dots
        const rng = variant * 17 + 7;
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < 5; i++) {
            const x = ((rng * (i + 1) * 13) % w);
            const y = ((rng * (i + 1) * 7) % h);
            ctx.fillRect(x, y, 2, 2);
        }
    });
}

export function getPathTile() {
    return getCached('path', TILE_SIZE, TILE_SIZE, (ctx, w, h) => {
        ctx.fillStyle = Colors.PATH;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = Colors.PATH_EDGE;
        ctx.fillRect(0, 0, w, 2);
        ctx.fillRect(0, h - 2, w, 2);
        // Gravel
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 0; i < 8; i++) {
            ctx.fillRect((i * 7 + 3) % w, (i * 11 + 5) % h, 2, 2);
        }
    });
}

export function getWaterTile() {
    return getCached('water', TILE_SIZE, TILE_SIZE, (ctx, w, h) => {
        ctx.fillStyle = Colors.WATER;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = Colors.WATER_HIGHLIGHT;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(4, 8, 12, 3);
        ctx.fillRect(18, 18, 10, 3);
        ctx.globalAlpha = 1;
    });
}

export function getTreeTile(variant = 0) {
    return getCached(`tree_${variant}`, TILE_SIZE, TILE_SIZE, (ctx, w, h) => {
        ctx.fillStyle = Colors.GRASS_DARK;
        ctx.fillRect(0, 0, w, h);
        // Trunk
        ctx.fillStyle = Colors.TREE_TRUNK;
        ctx.fillRect(13, 18, 6, 14);
        // Canopy
        ctx.fillStyle = Colors.TREE_CANOPY;
        const sizes = [14, 16, 12];
        const s = sizes[variant % 3];
        ctx.beginPath();
        ctx.arc(16, 12, s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.arc(18, 14, s / 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

export function getRockTile(variant = 0) {
    return getCached(`rock_${variant}`, TILE_SIZE, TILE_SIZE, (ctx, w, h) => {
        ctx.fillStyle = Colors.GRASS_DARK;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = Colors.ROCK;
        const sizes = [[18, 14], [14, 16], [20, 12]];
        const [rw, rh] = sizes[variant % 3];
        ctx.beginPath();
        ctx.ellipse(16, 18, rw / 2, rh / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Colors.ROCK_DARK;
        ctx.beginPath();
        ctx.ellipse(18, 20, rw / 3, rh / 3, 0, 0, Math.PI * 2);
        ctx.fill();
    });
}

export function getHighGroundTile() {
    return getCached('high_ground', TILE_SIZE, TILE_SIZE, (ctx, w, h) => {
        ctx.fillStyle = Colors.HIGH_GROUND;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = Colors.HIGH_GROUND_EDGE;
        ctx.fillRect(0, h - 4, w, 4);
        ctx.fillRect(0, 0, w, 2);
        // Platform highlight
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(2, 2, w - 4, 4);
    });
}

export function getSpawnTile() {
    return getCached('spawn', TILE_SIZE, TILE_SIZE, (ctx, w, h) => {
        ctx.fillStyle = Colors.PATH;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = Colors.SPAWN;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(2, 2, w - 4, h - 4);
        ctx.globalAlpha = 1;
        // Arrow
        ctx.fillStyle = Colors.SPAWN;
        ctx.beginPath();
        ctx.moveTo(w / 2, 6);
        ctx.lineTo(w - 6, h / 2);
        ctx.lineTo(w / 2, h - 6);
        ctx.closePath();
        ctx.fill();
    });
}

export function getExitTile() {
    return getCached('exit', TILE_SIZE, TILE_SIZE, (ctx, w, h) => {
        ctx.fillStyle = Colors.PATH;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = Colors.EXIT;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(2, 2, w - 4, h - 4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = Colors.EXIT;
        ctx.beginPath();
        ctx.moveTo(w / 2, 6);
        ctx.lineTo(w - 6, h / 2);
        ctx.lineTo(w / 2, h - 6);
        ctx.closePath();
        ctx.fill();
    });
}

export function getBuildingTile(variant = 0) {
    return getCached(`building_${variant}`, TILE_SIZE, TILE_SIZE, (ctx, w, h) => {
        // Red/brown school roof (terracotta style)
        const roofColors = ['#8b4532', '#7a3d2c', '#945040'];
        ctx.fillStyle = roofColors[variant % 3];
        ctx.fillRect(0, 0, w, h);
        // Roof ridge line
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, h / 2 - 1, w, 2);
        // Roof edge highlight
        ctx.fillStyle = 'rgba(255,200,150,0.12)';
        ctx.fillRect(0, 0, w, 2);
        // Subtle tile pattern
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        for (let i = 0; i < w; i += 8) {
            ctx.fillRect(i, 0, 1, h);
        }
        for (let i = 0; i < h; i += 8) {
            ctx.fillRect(0, i, w, 1);
        }
        // Edge shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(w - 1, 0, 1, h);
        ctx.fillRect(0, h - 1, w, 1);
    });
}

export function getFieldTile(variant = 0) {
    return getCached(`field_${variant}`, TILE_SIZE, TILE_SIZE, (ctx, w, h) => {
        // Bright sports field turf — alternating mow stripes
        const bright = variant % 2 === 0;
        ctx.fillStyle = bright ? '#3d8c30' : '#358526';
        ctx.fillRect(0, 0, w, h);
        // Turf line stripes (subtle mowing pattern)
        ctx.fillStyle = bright ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
        for (let i = 0; i < w; i += 6) {
            ctx.fillRect(i, 0, 3, h);
        }
        // Field line markings (white lines on some tiles)
        if (variant === 2) {
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(0, h / 2, w, 2);
        }
        if (variant === 3) {
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(w / 2, 0, 2, h);
        }
    });
}

export function getParkingTile(variant = 0) {
    return getCached(`parking_${variant}`, TILE_SIZE, TILE_SIZE, (ctx, w, h) => {
        // Gray asphalt
        ctx.fillStyle = '#505058';
        ctx.fillRect(0, 0, w, h);
        // Asphalt texture (subtle noise)
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        for (let i = 0; i < 6; i++) {
            const px = ((variant + 1) * (i + 1) * 13) % w;
            const py = ((variant + 1) * (i + 1) * 7) % h;
            ctx.fillRect(px, py, 2, 2);
        }
        // Parking lines (white dashes on some tiles)
        if (variant % 3 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(w / 2 - 1, 2, 2, h - 4);
        }
        if (variant % 3 === 1) {
            // Parked car representation (small colored rectangle)
            const carColors = ['#667', '#556', '#778', '#665'];
            ctx.fillStyle = carColors[variant % 4];
            ctx.fillRect(6, 8, 18, 14);
            ctx.fillStyle = 'rgba(150,180,220,0.3)';
            ctx.fillRect(8, 10, 6, 5); // windshield
        }
    });
}

export function getTileSprite(tileType, x, y) {
    switch (tileType) {
        case TileType.GRASS: return getGrassTile((x + y) % 2);
        case TileType.PATH: return getPathTile();
        case TileType.WATER: return getWaterTile();
        case TileType.TREE: return getTreeTile((x * 3 + y * 7) % 3);
        case TileType.ROCK: return getRockTile((x * 5 + y * 3) % 3);
        case TileType.SPAWN: return getSpawnTile();
        case TileType.EXIT: return getExitTile();
        case TileType.TOWER_BASE: return getGrassTile(0);
        case TileType.HIGH_GROUND: return getHighGroundTile();
        case TileType.BUILDING: return getBuildingTile((x * 3 + y * 5) % 3);
        case TileType.FIELD: return getFieldTile((x + y * 2) % 4);
        case TileType.PARKING: return getParkingTile((x * 7 + y * 3) % 4);
        default: return getGrassTile(0);
    }
}

// Tower sprites
export function getTowerSprite(towerType, level = 1, size = TILE_SIZE) {
    const key = `tower_${towerType}_${level}_${size}`;
    return getCached(key, size, size, (ctx, w, h) => {
        const color = TowerColors[towerType] || '#888';
        const cx = w / 2, cy = h / 2;
        const r = w * 0.35;

        // Base platform
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + r * 0.5, r * 1.1, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tower body
        ctx.fillStyle = color;
        switch (towerType) {
            case TowerType.ARROW:
                drawArrowTower(ctx, cx, cy, r, level);
                break;
            case TowerType.CANNON:
                drawCannonTower(ctx, cx, cy, r, level);
                break;
            case TowerType.MAGE:
                drawMageTower(ctx, cx, cy, r, level);
                break;
            case TowerType.ICE:
                drawIceTower(ctx, cx, cy, r, level);
                break;
            case TowerType.SKY_HUNTER:
                drawSkyHunterTower(ctx, cx, cy, r, level);
                break;
            case TowerType.FLAME:
                drawFlameTower(ctx, cx, cy, r, level);
                break;
            case TowerType.TESLA:
                drawTeslaTower(ctx, cx, cy, r, level);
                break;
            case TowerType.SNIPER:
                drawSniperTower(ctx, cx, cy, r, level);
                break;
            case TowerType.HARRY_DUCK:
                drawHarryDuckTower(ctx, cx, cy, r, level);
                break;
            case TowerType.AURA:
                drawAuraTower(ctx, cx, cy, r, level);
                break;
            case TowerType.GOLD_MINE:
                drawGoldMineTower(ctx, cx, cy, r, level);
                break;
            case TowerType.DOOM_SPIRE:
                drawDoomSpireTower(ctx, cx, cy, r, level);
                break;
            default:
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
        }

        // Level indicator (small dots)
        if (level > 1) {
            ctx.fillStyle = '#ffd700';
            const dotCount = Math.min(level - 1, 7);
            for (let i = 0; i < dotCount; i++) {
                const angle = (i / dotCount) * Math.PI * 2 - Math.PI / 2;
                const dx = cx + Math.cos(angle) * (r + 3);
                const dy = cy + Math.sin(angle) * (r + 3);
                ctx.beginPath();
                ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
}

function drawArrowTower(ctx, cx, cy, r, level) {
    ctx.fillStyle = TowerColors[TowerType.ARROW];
    // Tower body
    ctx.fillRect(cx - r * 0.3, cy - r * 0.8, r * 0.6, r * 1.4);
    // Battlements
    ctx.fillRect(cx - r * 0.5, cy - r * 0.9, r * 0.25, r * 0.3);
    ctx.fillRect(cx + r * 0.25, cy - r * 0.9, r * 0.25, r * 0.3);
    // Bow
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.2, r * 0.4, -0.8, 0.8);
    ctx.stroke();
}

function drawCannonTower(ctx, cx, cy, r, level) {
    ctx.fillStyle = TowerColors[TowerType.CANNON];
    // Base
    ctx.fillRect(cx - r * 0.6, cy - r * 0.3, r * 1.2, r * 0.9);
    // Barrel
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(cx - r * 0.15, cy - r * 0.9, r * 0.3, r * 0.7);
    // Wheel
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy + r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.stroke();
}

function drawMageTower(ctx, cx, cy, r, level) {
    ctx.fillStyle = TowerColors[TowerType.MAGE];
    // Pointed tower
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.5);
    ctx.lineTo(cx - r * 0.5, cy + r * 0.5);
    ctx.closePath();
    ctx.fill();
    // Crystal
    ctx.fillStyle = '#cc88ff';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawIceTower(ctx, cx, cy, r, level) {
    ctx.fillStyle = TowerColors[TowerType.ICE];
    // Crystal shape
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.6, cy);
    ctx.lineTo(cx, cy + r * 0.6);
    ctx.lineTo(cx - r * 0.6, cy);
    ctx.closePath();
    ctx.fill();
    // Glow
    ctx.fillStyle = 'rgba(200, 240, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
}

function drawSkyHunterTower(ctx, cx, cy, r, level) {
    ctx.fillStyle = TowerColors[TowerType.SKY_HUNTER];
    // Tall narrow tower
    ctx.fillRect(cx - r * 0.2, cy - r, r * 0.4, r * 1.6);
    // Wings
    ctx.fillStyle = '#c8a870';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.5);
    ctx.lineTo(cx + r * 0.8, cy);
    ctx.lineTo(cx, cy + r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.5);
    ctx.lineTo(cx - r * 0.8, cy);
    ctx.lineTo(cx, cy + r * 0.2);
    ctx.closePath();
    ctx.fill();
}

function drawFlameTower(ctx, cx, cy, r, level) {
    ctx.fillStyle = TowerColors[TowerType.FLAME];
    // Brazier base
    ctx.fillRect(cx - r * 0.4, cy, r * 0.8, r * 0.6);
    // Flame
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.8);
    ctx.bezierCurveTo(cx + r * 0.5, cy - r * 0.3, cx + r * 0.3, cy, cx, cy + r * 0.1);
    ctx.bezierCurveTo(cx - r * 0.3, cy, cx - r * 0.5, cy - r * 0.3, cx, cy - r * 0.8);
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawTeslaTower(ctx, cx, cy, r, level) {
    ctx.fillStyle = TowerColors[TowerType.TESLA];
    // Coil base
    ctx.fillRect(cx - r * 0.3, cy - r * 0.2, r * 0.6, r * 0.8);
    // Tesla coil top
    ctx.fillStyle = '#88ddff';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.5, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Lightning bolt
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.8);
    ctx.lineTo(cx + r * 0.15, cy - r * 0.4);
    ctx.lineTo(cx - r * 0.1, cy - r * 0.3);
    ctx.lineTo(cx + r * 0.1, cy);
    ctx.stroke();
}

function drawSniperTower(ctx, cx, cy, r, level) {
    ctx.fillStyle = TowerColors[TowerType.SNIPER];
    // Tall narrow tower
    ctx.fillRect(cx - r * 0.2, cy - r * 0.9, r * 0.4, r * 1.6);
    // Scope
    ctx.fillStyle = '#333';
    ctx.fillRect(cx + r * 0.2, cy - r * 0.6, r * 0.6, r * 0.12);
    // Window
    ctx.fillStyle = '#aaa';
    ctx.fillRect(cx - r * 0.1, cy - r * 0.5, r * 0.2, r * 0.15);
}

function drawHarryDuckTower(ctx, cx, cy, r, level) {
    ctx.fillStyle = TowerColors[TowerType.HARRY_DUCK];
    // Duck house
    ctx.fillRect(cx - r * 0.5, cy - r * 0.3, r, r * 0.9);
    // Roof
    ctx.fillStyle = '#cc9933';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy - r * 0.3);
    ctx.lineTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.7, cy - r * 0.3);
    ctx.closePath();
    ctx.fill();
    // Door
    ctx.fillStyle = '#996633';
    ctx.fillRect(cx - r * 0.15, cy + r * 0.1, r * 0.3, r * 0.5);
}

function drawAuraTower(ctx, cx, cy, r, level) {
    ctx.fillStyle = TowerColors[TowerType.AURA];
    // Pillar
    ctx.fillRect(cx - r * 0.2, cy - r * 0.6, r * 0.4, r * 1.2);
    // Glow rings
    ctx.strokeStyle = 'rgba(230, 200, 60, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();
}

function drawGoldMineTower(ctx, cx, cy, r, level) {
    ctx.fillStyle = TowerColors[TowerType.GOLD_MINE];
    // Mine structure
    ctx.fillRect(cx - r * 0.5, cy - r * 0.2, r, r * 0.8);
    // Gold pile
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.3, r * 0.3, Math.PI, 0);
    ctx.fill();
    // Entrance
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.25, Math.PI, 0);
    ctx.fill();
}

function drawDoomSpireTower(ctx, cx, cy, r, level) {
    ctx.fillStyle = TowerColors[TowerType.DOOM_SPIRE];
    // Tall spire
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 1.1);
    ctx.lineTo(cx + r * 0.4, cy + r * 0.5);
    ctx.lineTo(cx - r * 0.4, cy + r * 0.5);
    ctx.closePath();
    ctx.fill();
    // Glowing orb
    ctx.fillStyle = '#dd66ff';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.4, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    // Glow
    ctx.fillStyle = 'rgba(200, 50, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.4, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

// Enemy sprites
export function getEnemySprite(enemyType, frame = 0, size = null) {
    const defaultSizes = {
        [EnemyType.IMP]: 16,
        [EnemyType.RUNNER]: 28,
        [EnemyType.WASP]: 24,
        [EnemyType.TANK]: 36,
        [EnemyType.SUMMONER]: 36,
        [EnemyType.BOSS]: 64,
    };
    const s = size || defaultSizes[enemyType] || 32;
    const key = `enemy_${enemyType}_${frame}_${s}`;
    return getCached(key, s, s, (ctx, w, h) => {
        const color = EnemyColors[enemyType] || '#888';
        const cx = w / 2, cy = h / 2;
        const r = w * 0.35;

        ctx.fillStyle = color;

        switch (enemyType) {
            case EnemyType.GRUNT:
                drawGruntEnemy(ctx, cx, cy, r, frame);
                break;
            case EnemyType.RUNNER:
                drawRunnerEnemy(ctx, cx, cy, r, frame);
                break;
            case EnemyType.TANK:
                drawTankEnemy(ctx, cx, cy, r, frame);
                break;
            case EnemyType.GHOST:
                drawGhostEnemy(ctx, cx, cy, r, frame);
                break;
            case EnemyType.HEALER:
                drawHealerEnemy(ctx, cx, cy, r, frame);
                break;
            case EnemyType.WASP:
                drawWaspEnemy(ctx, cx, cy, r, frame);
                break;
            case EnemyType.DISRUPTOR:
                drawDisruptorEnemy(ctx, cx, cy, r, frame);
                break;
            case EnemyType.SUMMONER:
                drawSummonerEnemy(ctx, cx, cy, r, frame);
                break;
            case EnemyType.IMP:
                drawImpEnemy(ctx, cx, cy, r, frame);
                break;
            case EnemyType.BOSS:
                drawBossEnemy(ctx, cx, cy, r, frame);
                break;
            default:
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
        }
    });
}

function drawGruntEnemy(ctx, cx, cy, r, frame) {
    const bob = Math.sin(frame * Math.PI / 4) * 2;
    ctx.fillStyle = EnemyColors[EnemyType.GRUNT];
    ctx.beginPath();
    ctx.arc(cx, cy + bob, r, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - r * 0.3, cy - r * 0.2 + bob, 3, 3);
    ctx.fillRect(cx + r * 0.1, cy - r * 0.2 + bob, 3, 3);
}

function drawRunnerEnemy(ctx, cx, cy, r, frame) {
    const bob = Math.sin(frame * Math.PI / 4) * 3;
    ctx.fillStyle = EnemyColors[EnemyType.RUNNER];
    // Sleeker body
    ctx.beginPath();
    ctx.ellipse(cx, cy + bob, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Speed lines
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.2, cy + bob);
    ctx.lineTo(cx - r * 0.6, cy + bob);
    ctx.stroke();
}

function drawTankEnemy(ctx, cx, cy, r, frame) {
    const bob = Math.sin(frame * Math.PI / 4) * 1;
    ctx.fillStyle = EnemyColors[EnemyType.TANK];
    // Armored square body
    ctx.fillRect(cx - r, cy - r + bob, r * 2, r * 2);
    // Armor plates
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(cx - r + 2, cy - r + 2 + bob, r * 2 - 4, 3);
    ctx.fillRect(cx - r + 2, cy + r - 5 + bob, r * 2 - 4, 3);
}

function drawGhostEnemy(ctx, cx, cy, r, frame) {
    const bob = Math.sin(frame * Math.PI / 4) * 2;
    ctx.fillStyle = EnemyColors[EnemyType.GHOST];
    ctx.globalAlpha = 0.7;
    // Ghostly shape
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.3 + bob, r, Math.PI, 0);
    ctx.lineTo(cx + r, cy + r + bob);
    for (let i = 0; i < 3; i++) {
        const x = cx + r - (i + 0.5) * (r * 2 / 3);
        ctx.quadraticCurveTo(x + r / 3, cy + r * 0.5 + bob, x, cy + r + bob);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.3 + bob, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.25, cy - r * 0.3 + bob, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
}

function drawHealerEnemy(ctx, cx, cy, r, frame) {
    const bob = Math.sin(frame * Math.PI / 4) * 2;
    ctx.fillStyle = EnemyColors[EnemyType.HEALER];
    ctx.beginPath();
    ctx.arc(cx, cy + bob, r, 0, Math.PI * 2);
    ctx.fill();
    // Cross
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 1.5, cy - r * 0.4 + bob, 3, r * 0.8);
    ctx.fillRect(cx - r * 0.4, cy - 1.5 + bob, r * 0.8, 3);
}

function drawWaspEnemy(ctx, cx, cy, r, frame) {
    const bob = Math.sin(frame * Math.PI / 2) * 3;
    ctx.fillStyle = EnemyColors[EnemyType.WASP];
    // Body
    ctx.beginPath();
    ctx.ellipse(cx, cy + bob, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stripes
    ctx.fillStyle = '#333';
    ctx.fillRect(cx - r * 0.2, cy - r * 0.5 + bob, r * 0.4, 2);
    ctx.fillRect(cx - r * 0.2, cy + r * 0.2 + bob, r * 0.4, 2);
    // Wings
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    const wingFlap = Math.sin(frame * Math.PI) * 0.3;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.5, cy - r * 0.5 + bob, r * 0.5, r * 0.3, wingFlap, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.5, cy - r * 0.5 + bob, r * 0.5, r * 0.3, -wingFlap, 0, Math.PI * 2);
    ctx.fill();
}

function drawDisruptorEnemy(ctx, cx, cy, r, frame) {
    const bob = Math.sin(frame * Math.PI / 4) * 2;
    ctx.fillStyle = EnemyColors[EnemyType.DISRUPTOR];
    // Hexagonal shape
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r + bob;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    // Electric symbol
    ctx.strokeStyle = '#ff88ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - r * 0.4 + bob);
    ctx.lineTo(cx + 2, cy + bob);
    ctx.lineTo(cx - 2, cy + bob);
    ctx.lineTo(cx + 2, cy + r * 0.4 + bob);
    ctx.stroke();
}

function drawSummonerEnemy(ctx, cx, cy, r, frame) {
    const bob = Math.sin(frame * Math.PI / 4) * 2;
    ctx.fillStyle = EnemyColors[EnemyType.SUMMONER];
    // Hooded figure
    ctx.beginPath();
    ctx.moveTo(cx, cy - r + bob);
    ctx.lineTo(cx + r * 0.7, cy + r * 0.5 + bob);
    ctx.lineTo(cx - r * 0.7, cy + r * 0.5 + bob);
    ctx.closePath();
    ctx.fill();
    // Hood
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.3 + bob, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Glowing orbs
    ctx.fillStyle = '#88ffcc';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy + r * 0.2 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.3, cy + r * 0.2 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawImpEnemy(ctx, cx, cy, r, frame) {
    const bob = Math.sin(frame * Math.PI / 4) * 1;
    ctx.fillStyle = EnemyColors[EnemyType.IMP];
    ctx.beginPath();
    ctx.arc(cx, cy + bob, r, 0, Math.PI * 2);
    ctx.fill();
}

function drawBossEnemy(ctx, cx, cy, r, frame) {
    const bob = Math.sin(frame * Math.PI / 4) * 2;
    ctx.fillStyle = EnemyColors[EnemyType.BOSS];
    // Large armored body
    ctx.beginPath();
    ctx.arc(cx, cy + bob, r, 0, Math.PI * 2);
    ctx.fill();
    // Crown
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy - r * 0.7 + bob);
    ctx.lineTo(cx - r * 0.3, cy - r * 1.1 + bob);
    ctx.lineTo(cx, cy - r * 0.8 + bob);
    ctx.lineTo(cx + r * 0.3, cy - r * 1.1 + bob);
    ctx.lineTo(cx + r * 0.5, cy - r * 0.7 + bob);
    ctx.closePath();
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.1 + bob, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.2, cy - r * 0.1 + bob, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // Armor detail
    ctx.strokeStyle = 'rgba(255,215,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy + bob, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
}

// Duck soldier sprite
export function getDuckSprite(frame = 0, size = 32) {
    const key = `duck_${frame}_${size}`;
    return getCached(key, size, size, (ctx, w, h) => {
        const cx = w / 2, cy = h / 2;
        const bob = Math.sin(frame * Math.PI / 2) * 2;
        // Body
        ctx.fillStyle = '#f0d23c';
        ctx.beginPath();
        ctx.ellipse(cx, cy + bob, w * 0.3, w * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.beginPath();
        ctx.arc(cx + w * 0.15, cy - w * 0.2 + bob, w * 0.15, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.3, cy - w * 0.2 + bob);
        ctx.lineTo(cx + w * 0.4, cy - w * 0.15 + bob);
        ctx.lineTo(cx + w * 0.3, cy - w * 0.1 + bob);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx + w * 0.2, cy - w * 0.25 + bob, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Tiny sword
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.1, cy + bob);
        ctx.lineTo(cx + w * 0.35, cy - w * 0.15 + bob);
        ctx.stroke();
    });
}
