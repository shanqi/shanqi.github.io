// renderer.js — All canvas rendering

import {
    TILE_SIZE, GRID_WIDTH, GRID_HEIGHT, GRID_OFFSET_X, GRID_OFFSET_Y,
    SCREEN_WIDTH, SCREEN_HEIGHT, PANEL_WIDTH, HUD_HEIGHT, BOTTOM_BAR_HEIGHT,
    TileType, Colors, TowerColors
} from './constants.js';
import { getTileSprite, getTowerSprite, getEnemySprite, getDuckSprite } from './sprites.js';

export class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.time = 0;
    }

    advance(dt) {
        this.time += dt;
    }

    clear() {
        this.ctx.fillStyle = Colors.BG;
        this.ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    drawMap(tiles) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const tile = tiles[y][x];
                const sprite = getTileSprite(tile, x, y);
                const px = GRID_OFFSET_X + x * TILE_SIZE;
                const py = GRID_OFFSET_Y + y * TILE_SIZE;
                this.ctx.drawImage(sprite, px, py);

                // Water animation
                if (tile === TileType.WATER) {
                    const wave = Math.sin(this.time * 2.5 + x * 0.7 + y * 0.5);
                    this.ctx.fillStyle = `rgba(255,255,255,${0.1 + wave * 0.05})`;
                    this.ctx.fillRect(px + 4, py + 8 + wave * 2, 12, 2);
                }
            }
        }
    }

    drawTowers(towers) {
        for (const tower of towers) {
            const px = GRID_OFFSET_X + tower.gridX * TILE_SIZE;
            const py = GRID_OFFSET_Y + tower.gridY * TILE_SIZE;

            // Range circle for selected
            if (tower._selected) {
                this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(
                    px + TILE_SIZE / 2, py + TILE_SIZE / 2,
                    tower.range * TILE_SIZE, 0, Math.PI * 2
                );
                this.ctx.stroke();
            }

            // Tower sprite
            const sprite = getTowerSprite(tower.type, tower.level);
            const scale = tower.fireAnimTimer > 0 ? 1.1 : 1.0;
            const sx = (TILE_SIZE * (1 - scale)) / 2;
            const sy = (TILE_SIZE * (1 - scale)) / 2;
            this.ctx.drawImage(sprite, px + sx, py + sy, TILE_SIZE * scale, TILE_SIZE * scale);

            // Disabled overlay
            if (tower.disabled || tower.stunned) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
                this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                // Stun stars
                if (tower.stunned) {
                    const starCount = 3;
                    for (let i = 0; i < starCount; i++) {
                        const angle = this.time * 3 + (i / starCount) * Math.PI * 2;
                        const sx = px + TILE_SIZE / 2 + Math.cos(angle) * 10;
                        const sy = py + 4 + Math.sin(angle) * 5;
                        this.ctx.fillStyle = '#ffff00';
                        this.ctx.font = '10px Arial';
                        this.ctx.fillText('*', sx, sy);
                    }
                }
            }
        }
    }

    drawEnemies(enemies) {
        for (const e of enemies) {
            if (!e.alive || e.reachedExit) continue;
            const sprite = getEnemySprite(e.type, e.animFrame, e.size);
            const px = e.pixelX - e.size / 2;
            const py = e.pixelY - e.size / 2;

            // Hit flash
            if (e.hitFlashTimer > 0) {
                this.ctx.globalAlpha = 0.6;
                this.ctx.filter = 'brightness(2)';
            }

            this.ctx.drawImage(sprite, px, py);
            this.ctx.globalAlpha = 1;
            this.ctx.filter = 'none';

            // HP bar
            if (e.hp < e.maxHP) {
                const barW = e.size;
                const barH = 4;
                const barX = e.pixelX - barW / 2;
                const barY = e.pixelY - e.size / 2 - 8;
                const hpRatio = Math.max(0, e.displayHP / e.maxHP);

                this.ctx.fillStyle = Colors.HP_BG;
                this.ctx.fillRect(barX, barY, barW, barH);

                let hpColor = Colors.HP_GREEN;
                if (hpRatio < 0.3) hpColor = Colors.HP_RED;
                else if (hpRatio < 0.6) hpColor = Colors.HP_YELLOW;

                this.ctx.fillStyle = hpColor;
                this.ctx.fillRect(barX, barY, barW * hpRatio, barH);
            }

            // Status indicators
            let iconX = e.pixelX - e.size / 2;
            const iconY = e.pixelY + e.size / 2 + 2;
            if (e.slowStrength > 0 && e.slowTimer > 0) {
                this.ctx.fillStyle = Colors.FROST;
                this.ctx.font = '8px Arial';
                this.ctx.fillText('~', iconX, iconY + 8);
                iconX += 8;
            }
            if (e.burnDPS > 0 && e.burnTimer > 0) {
                this.ctx.fillStyle = Colors.FIRE;
                this.ctx.font = '8px Arial';
                this.ctx.fillText('^', iconX, iconY + 8);
            }
        }
    }

    drawProjectiles(projectiles) {
        for (const p of projectiles) {
            if (!p.alive) continue;

            // Trail
            if (p.trail.length > 1) {
                for (let i = 1; i < p.trail.length; i++) {
                    const alpha = i / p.trail.length * 0.5;
                    this.ctx.globalAlpha = alpha;
                    const pt = p.trail[i];
                    const ppx = GRID_OFFSET_X + pt.x * TILE_SIZE + TILE_SIZE / 2;
                    const ppy = GRID_OFFSET_Y + pt.y * TILE_SIZE + TILE_SIZE / 2;
                    this.ctx.fillStyle = TowerColors[p.towerType] || '#fff';
                    this.ctx.beginPath();
                    this.ctx.arc(ppx, ppy, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                this.ctx.globalAlpha = 1;
            }

            // Projectile
            this.ctx.fillStyle = TowerColors[p.towerType] || '#fff';
            this.ctx.beginPath();
            this.ctx.arc(p.pixelX, p.pixelY, 4, 0, Math.PI * 2);
            this.ctx.fill();

            // Glow
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.beginPath();
            this.ctx.arc(p.pixelX, p.pixelY, 6, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawDucks(ducks) {
        for (const d of ducks) {
            if (!d.alive) continue;
            const sprite = getDuckSprite(d.animFrame, d.size);
            this.ctx.drawImage(sprite, d.pixelX - d.size / 2, d.pixelY - d.size / 2);

            // HP bar
            if (d.hp < d.maxHP) {
                const barW = d.size * 0.8;
                const barH = 3;
                const barX = d.pixelX - barW / 2;
                const barY = d.pixelY - d.size / 2 - 6;
                const hpRatio = d.hp / d.maxHP;
                this.ctx.fillStyle = Colors.HP_BG;
                this.ctx.fillRect(barX, barY, barW, barH);
                this.ctx.fillStyle = Colors.HP_GREEN;
                this.ctx.fillRect(barX, barY, barW * hpRatio, barH);
            }
        }
    }

    drawGhostTower(type, gridX, gridY, canPlace) {
        const px = GRID_OFFSET_X + gridX * TILE_SIZE;
        const py = GRID_OFFSET_Y + gridY * TILE_SIZE;

        this.ctx.globalAlpha = 0.5;
        const sprite = getTowerSprite(type, 1);
        this.ctx.drawImage(sprite, px, py);
        this.ctx.globalAlpha = 1;

        // Place indicator
        this.ctx.strokeStyle = canPlace ? '#00ff00' : '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
    }

    drawSynergyLines(synergies) {
        for (const s of synergies) {
            this.ctx.strokeStyle = 'rgba(230, 184, 0, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([4, 4]);
            this.ctx.beginPath();
            this.ctx.moveTo(s.x1, s.y1);
            this.ctx.lineTo(s.x2, s.y2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }
}
