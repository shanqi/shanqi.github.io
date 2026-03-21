// renderer.js — All canvas rendering

import {
    TILE_SIZE, GRID_WIDTH, GRID_HEIGHT, GRID_OFFSET_X, GRID_OFFSET_Y,
    SCREEN_WIDTH, SCREEN_HEIGHT, PANEL_WIDTH, HUD_HEIGHT, BOTTOM_BAR_HEIGHT,
    TileType, Colors, TowerColors, FONT
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
        const ctx = this.ctx;
        for (const tower of towers) {
            const px = GRID_OFFSET_X + tower.gridX * TILE_SIZE;
            const py = GRID_OFFSET_Y + tower.gridY * TILE_SIZE;

            // Draw tower base platform (high ground keeps its visual)
            if (tower.isHighGround) {
                const hgSprite = getTileSprite(8, tower.gridX, tower.gridY); // HIGH_GROUND = 8
                ctx.drawImage(hgSprite, px, py);
            }

            // Range circle for selected
            if (tower._selected) {
                ctx.fillStyle = 'rgba(255,255,255,0.05)';
                ctx.beginPath();
                ctx.arc(
                    px + TILE_SIZE / 2, py + TILE_SIZE / 2,
                    tower.range * TILE_SIZE, 0, Math.PI * 2
                );
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(
                    px + TILE_SIZE / 2, py + TILE_SIZE / 2,
                    tower.range * TILE_SIZE, 0, Math.PI * 2
                );
                ctx.stroke();
            }

            // [8] Aura tower range circle
            if (tower.isSupport) {
                ctx.fillStyle = 'rgba(230,200,60,0.08)';
                ctx.beginPath();
                ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, tower.range * TILE_SIZE, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(230,200,60,0.24)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // [2] Tower drop shadow
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.ellipse(px + TILE_SIZE / 2, py + TILE_SIZE - 4, TILE_SIZE * 0.45, TILE_SIZE * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tower sprite
            const sprite = getTowerSprite(tower.type, tower.level);
            const scale = tower.fireAnimTimer > 0 ? 1.1 : 1.0;

            // [1] Tower rotation toward target (only for attacking towers)
            if (tower.baseDamage > 0 && tower.rotation) {
                ctx.save();
                ctx.translate(px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                ctx.rotate(tower.rotation);
                ctx.drawImage(sprite, -TILE_SIZE * scale / 2, -TILE_SIZE * scale / 2, TILE_SIZE * scale, TILE_SIZE * scale);
                ctx.restore();
            } else {
                const sx = (TILE_SIZE * (1 - scale)) / 2;
                const sy = (TILE_SIZE * (1 - scale)) / 2;
                ctx.drawImage(sprite, px + sx, py + sy, TILE_SIZE * scale, TILE_SIZE * scale);
            }

            // Disabled overlay
            if (tower.disabled || tower.stunned) {
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                // [10] Stun stars as animated circles
                if (tower.stunned) {
                    for (let i = 0; i < 3; i++) {
                        const angle = this.time * 4 + i * 2.1;
                        const starX = px + TILE_SIZE / 2 + Math.cos(angle) * 8;
                        const starY = py + 4 + Math.sin(angle) * 5;
                        ctx.fillStyle = '#ffff00';
                        ctx.beginPath();
                        ctx.arc(starX, starY, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // Undo grace period shimmer
            if (tower._undoGracePeriod > 0) {
                const pulse = 0.3 + 0.2 * Math.sin(this.time * 6);
                ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    drawEnemies(enemies) {
        const ctx = this.ctx;
        for (const e of enemies) {
            if (!e.alive || e.reachedExit) continue;
            const sprite = getEnemySprite(e.type, e.animFrame, e.size);
            const px = e.pixelX - e.size / 2;
            const py = e.pixelY - e.size / 2;

            // [3] Enemy drop shadow
            const shadowY = e.isFlying ? e.pixelY + e.size / 2 + 6 : e.pixelY + e.size / 2 - 2;
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(e.pixelX, shadowY, e.size * 0.4, e.size * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();

            // Hit flash
            if (e.hitFlashTimer > 0) {
                ctx.globalAlpha = 0.6;
                ctx.filter = 'brightness(2)';
            }

            ctx.drawImage(sprite, px, py);
            ctx.globalAlpha = 1;
            ctx.filter = 'none';

            // [4] Status effect tints on enemies
            if (e.slowStrength > 0 && e.slowTimer > 0) {
                ctx.fillStyle = 'rgba(102,204,255,0.24)';
                ctx.fillRect(px, py, e.size, e.size);
            }
            if (e.burnDPS > 0 && e.burnTimer > 0) {
                ctx.fillStyle = 'rgba(255,51,0,0.20)';
                ctx.fillRect(px, py, e.size, e.size);
            }
            if (e.armorBroken && e.armorBreakTimer > 0) {
                ctx.fillStyle = 'rgba(255,255,0,0.16)';
                ctx.fillRect(px, py, e.size, e.size);
            }

            // HP bar
            if (e.hp < e.maxHP) {
                const barW = e.size;
                const barH = 4;
                const barX = e.pixelX - barW / 2;
                const barY = e.pixelY - e.size / 2 - 8;
                const hpRatio = Math.max(0, e.hp / e.maxHP);

                // HP bar background
                ctx.fillStyle = Colors.HP_BG;
                ctx.fillRect(barX, barY, barW, barH);

                // [6] HP bar damage preview (displayHP)
                const displayRatio = Math.max(0, e.displayHP / e.maxHP);
                if (displayRatio > hpRatio) {
                    ctx.fillStyle = '#b42828';
                    ctx.fillRect(barX, barY, barW * displayRatio, barH);
                }

                // [5] HP bar gradient fill
                let barTop, barBot;
                if (hpRatio > 0.6) { barTop = '#28dc28'; barBot = '#14a014'; }
                else if (hpRatio > 0.3) { barTop = '#ffff3c'; barBot = '#c8b414'; }
                else { barTop = '#ff3c28'; barBot = '#b41e14'; }
                const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barH);
                gradient.addColorStop(0, barTop);
                gradient.addColorStop(1, barBot);
                ctx.fillStyle = gradient;
                ctx.fillRect(barX, barY, barW * hpRatio, barH);

                // [7] Armor type indicator dot
                if (e.armor === 'plated') {
                    ctx.fillStyle = 'rgb(180,180,190)';
                    ctx.beginPath();
                    ctx.arc(barX + barW + 3, barY + barH / 2, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (e.armor === 'ethereal') {
                    ctx.fillStyle = 'rgb(160,120,220)';
                    ctx.beginPath();
                    ctx.arc(barX + barW + 3, barY + barH / 2, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (e.armor === 'resistant') {
                    ctx.fillStyle = 'rgb(180,150,80)';
                    ctx.beginPath();
                    ctx.arc(barX + barW + 3, barY + barH / 2, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Status indicators
            let iconX = e.pixelX - e.size / 2;
            const iconY = e.pixelY + e.size / 2 + 2;
            if (e.slowStrength > 0 && e.slowTimer > 0) {
                ctx.fillStyle = Colors.FROST;
                ctx.font = `8px ${FONT}`;
                ctx.fillText('~', iconX, iconY + 8);
                iconX += 8;
            }
            if (e.burnDPS > 0 && e.burnTimer > 0) {
                ctx.fillStyle = Colors.FIRE;
                ctx.font = `8px ${FONT}`;
                ctx.fillText('^', iconX, iconY + 8);
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

    drawGhostTower(type, gridX, gridY, canPlace, rangeTiles) {
        const px = GRID_OFFSET_X + gridX * TILE_SIZE;
        const py = GRID_OFFSET_Y + gridY * TILE_SIZE;
        const cx = px + TILE_SIZE / 2;
        const cy = py + TILE_SIZE / 2;
        const rangeR = rangeTiles * TILE_SIZE;

        // Range preview circle (filled translucent + brighter outline)
        if (rangeTiles > 0) {
            const fillColor = canPlace ? 'rgba(0,255,0,0.12)' : 'rgba(255,0,0,0.12)';
            const strokeColor = canPlace ? 'rgba(0,255,0,0.28)' : 'rgba(255,0,0,0.28)';
            this.ctx.fillStyle = fillColor;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, rangeR, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, rangeR, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Ghost tower sprite (semi-transparent with green/red tint)
        this.ctx.globalAlpha = 0.6;
        const sprite = getTowerSprite(type, 1);
        this.ctx.drawImage(sprite, px, py);
        this.ctx.globalAlpha = 1;

        // Green/red border on the tile
        this.ctx.strokeStyle = canPlace ? 'rgba(0,255,0,0.6)' : 'rgba(255,0,0,0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
    }

    // [11] Synergy lines with double-draw glow
    drawSynergyLines(synergies) {
        const ctx = this.ctx;
        for (const s of synergies) {
            // Outer glow
            ctx.strokeStyle = 'rgba(230,184,0,0.31)';
            ctx.lineWidth = 3;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
            ctx.stroke();
            // Inner bright
            ctx.strokeStyle = 'rgba(230,184,0,0.63)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // [9] Day/night tint overlay
    drawDayNightTint(wave, totalWaves) {
        if (wave <= 0) return;
        const ctx = this.ctx;
        const t = (wave - 1) / Math.max(totalWaves - 1, 1);
        const cycle = t * 2 * Math.PI;
        const r = Math.sin(cycle + Math.PI) * 15;
        const g = Math.sin(cycle + Math.PI * 0.5) * 8;
        const b = Math.sin(cycle) * 25;
        if (r === 0 && g === 0 && b === 0) return;
        const rr = Math.max(0, r);
        const gg = Math.max(0, g);
        const bb = Math.max(0, b);
        const ra = Math.max(0, -r);
        const ga = Math.max(0, -g);
        const ba = Math.max(0, -b);
        // Warm tint
        if (rr + gg + bb > 0) {
            ctx.fillStyle = `rgba(${Math.floor(rr * 4)},${Math.floor(gg * 4)},${Math.floor(bb * 4)},0.08)`;
            ctx.fillRect(0, 50, 960, 640);
        }
        // Cool tint
        if (ra + ga + ba > 0) {
            ctx.fillStyle = `rgba(${Math.floor(ra * 2)},${Math.floor(ga * 2)},${Math.floor(ba * 6)},0.06)`;
            ctx.fillRect(0, 50, 960, 640);
        }
    }
}
