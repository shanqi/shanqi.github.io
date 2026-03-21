// ui.js — HUD, shop panel, menus — matches Python version exactly

import {
    SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE,
    GRID_WIDTH, GRID_HEIGHT, GRID_OFFSET_X, GRID_OFFSET_Y,
    PANEL_WIDTH, TOP_BAR_HEIGHT, BOTTOM_BAR_HEIGHT,
    TowerType, TileType, GameState, Colors, TowerColors, TOTAL_WAVES, SELL_REFUND_RATIO,
    ARMOR_MATRIX, DamageType, ArmorType, CHALLENGE_MODIFIERS,
    FONT, FONT_MONO
} from './constants.js';
import { TOWER_DATA, TOWER_ORDER } from './towerData.js';
import { ENEMY_DATA } from './enemyData.js';
import { getTowerSprite } from './sprites.js';

const PANEL_X = SCREEN_WIDTH - PANEL_WIDTH;
const PANEL_Y = TOP_BAR_HEIGHT;
const PANEL_H = SCREEN_HEIGHT - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT;
const W = PANEL_WIDTH - 20;  // usable width in panel

// Helper: draw rounded rect
function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Font helpers — build canvas font strings from modern font stack
const F = (size, weight = '') => `${weight} ${size}px ${FONT}`.trim();
const FM = (size, weight = '') => `${weight} ${size}px ${FONT_MONO}`.trim();

export class UI {
    constructor() {
        this.shopButtons = [];
        this._buildShopButtons();
        // Dynamic rects for tower info view
        this._upgradeBtn = null;
        this._sellBtn = null;
        this._targetBtn = null;
        this._specABtn = null;
        this._specBBtn = null;
        this._showingTowerInfo = false;
        // Challenge modifiers
        this.activeModifiers = new Set();
        // Tooltip hover state
        this._tooltipTimer = 0;
        this._lastMX = 0;
        this._lastMY = 0;
    }

    _buildShopButtons() {
        let y = PANEL_Y + 32;
        this.shopButtons = TOWER_ORDER.map((type) => {
            const btn = { type, x: PANEL_X + 8, y, w: PANEL_WIDTH - 16, h: 50 };
            y += 54;
            return btn;
        });
    }

    // ─── Hit Testing ─────────────────────────────

    getShopButtonAt(mx, my) {
        for (const btn of this.shopButtons) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h)
                return btn;
        }
        return null;
    }

    getBottomButtonAt(mx, my, gameState) {
        const barY = SCREEN_HEIGHT - BOTTOM_BAR_HEIGHT;
        // Start Wave: Rect(12, barY+8, 160, 34)
        if (mx >= 12 && mx <= 172 && my >= barY + 8 && my <= barY + 42)
            return (gameState === GameState.PREP) ? 'start_wave' : null;
        // 1x: Rect(182, barY+8, 42, 34)
        if (mx >= 182 && mx <= 224 && my >= barY + 8 && my <= barY + 42) return 'speed_1x';
        // 2x: Rect(228, barY+8, 42, 34)
        if (mx >= 228 && mx <= 270 && my >= barY + 8 && my <= barY + 42) return 'speed_2x';
        // 4x: Rect(274, barY+8, 42, 34)
        if (mx >= 274 && mx <= 316 && my >= barY + 8 && my <= barY + 42) return 'speed_4x';
        // Pause: Rect(PANEL_X-50, 8, 42, 34)  — it's in the TOP bar
        if (mx >= PANEL_X - 50 && mx <= PANEL_X - 8 && my >= 8 && my <= 42) return 'pause';
        return null;
    }

    getSelectedTowerButtonAt(mx, my, selectedTower) {
        if (!selectedTower || !this._showingTowerInfo) return null;
        if (this._upgradeBtn && mx >= this._upgradeBtn.x && mx <= this._upgradeBtn.x + this._upgradeBtn.w &&
            my >= this._upgradeBtn.y && my <= this._upgradeBtn.y + this._upgradeBtn.h) return 'upgrade';
        if (this._sellBtn && mx >= this._sellBtn.x && mx <= this._sellBtn.x + this._sellBtn.w &&
            my >= this._sellBtn.y && my <= this._sellBtn.y + this._sellBtn.h) return 'sell';
        if (this._targetBtn && mx >= this._targetBtn.x && mx <= this._targetBtn.x + this._targetBtn.w &&
            my >= this._targetBtn.y && my <= this._targetBtn.y + this._targetBtn.h) return 'target_mode';
        if (this._specABtn && mx >= this._specABtn.x && mx <= this._specABtn.x + this._specABtn.w &&
            my >= this._specABtn.y && my <= this._specABtn.y + this._specABtn.h) return 'spec_A';
        if (this._specBBtn && mx >= this._specBBtn.x && mx <= this._specBBtn.x + this._specBBtn.w &&
            my >= this._specBBtn.y && my <= this._specBBtn.y + this._specBBtn.h) return 'spec_B';
        // Click elsewhere in panel = deselect
        if (mx >= PANEL_X) return 'deselect';
        return null;
    }

    getMenuButtonAt(mx, my, gameState) {
        const cx = SCREEN_WIDTH / 2;
        if (gameState === GameState.MAIN_MENU) {
            const by = this._menuBtnStartY || 330;
            if (this._hitRect(mx, my, cx - 160, by, 320, 58)) return 'play';
            if (this._hitRect(mx, my, cx - 160, by + 68, 320, 58)) return 'workshop';
            if (this._hitRect(mx, my, cx - 160, by + 136, 320, 58)) return 'editor';
            if (this._hitRect(mx, my, cx - 160, by + 204, 320, 58)) return 'bestiary';
            if (this._hitRect(mx, my, cx - 160, by + 272, 320, 58)) return 'quit';
            return null;
        }
        if (gameState === GameState.MAP_SELECT) {
            // Check modifier checkboxes first
            if (this._modifierBtns) {
                for (const btn of this._modifierBtns) {
                    if (this._hitRect(mx, my, btn.x, btn.y, btn.w, btn.h)) {
                        if (this.activeModifiers.has(btn.key)) {
                            this.activeModifiers.delete(btn.key);
                        } else {
                            this.activeModifiers.add(btn.key);
                        }
                        return 'modifier_toggle';
                    }
                }
            }
            // Map buttons (left side, new positions)
            for (let i = 0; i < 10; i++) {
                if (this._hitRect(mx, my, 40, 100 + i * 60, 420, 55)) return `map_${i}`;
            }
            if (this._hitRect(mx, my, 20, SCREEN_HEIGHT - 60, 120, 40)) return 'back';
            return null;
        }
        if (gameState === GameState.PAUSED) {
            if (this._hitRect(mx, my, cx - 140, 380, 280, 50)) return 'resume';
            if (this._hitRect(mx, my, cx - 140, 450, 280, 50)) return 'restart';
            if (this._hitRect(mx, my, cx - 140, 520, 280, 50)) return 'main_menu';
            return null;
        }
        if (gameState === GameState.WON || gameState === GameState.LOST) {
            if (this._hitRect(mx, my, cx - 140, 520, 280, 50)) return 'main_menu';
            return null;
        }
        return null;
    }

    _hitRect(mx, my, x, y, w, h) {
        return mx >= x && mx <= x + w && my >= y && my <= y + h;
    }

    // ─── Top Bar (HUD) ─────────────────────────────
    // Matches Python hud.py exactly: gradient bg, custom icons, monospace stat values

    drawHUD(ctx, gold, lives, wave, enemyCount, gameState, speedMult) {
        // Top bar gradient
        for (let row = 0; row < TOP_BAR_HEIGHT; row++) {
            const t = row / TOP_BAR_HEIGHT;
            const r = Math.floor(26 + 10 * (1 - t));
            const g = Math.floor(26 + 10 * (1 - t));
            const b = Math.floor(46 + 14 * (1 - t));
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(0, row, SCREEN_WIDTH, 1);
        }
        // Bottom accent lines
        ctx.fillStyle = 'rgb(50,50,80)';
        ctx.fillRect(0, TOP_BAR_HEIGHT - 1, SCREEN_WIDTH, 1);
        ctx.fillStyle = 'rgb(20,20,36)';
        ctx.fillRect(0, TOP_BAR_HEIGHT - 2, SCREEN_WIDTH, 1);

        const cy = 14;  // vertical center for stat line

        // ── Gold icon (yellow circle with $) ──
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(18, cy + 11, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c8aa00'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(18, cy + 11, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#a08200'; ctx.font = F(12);
        ctx.textAlign = 'center'; ctx.fillText('$', 18, cy + 15); ctx.textAlign = 'left';
        // Label + value
        ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(14);
        ctx.fillText('GOLD', 28, cy + 6);
        ctx.fillStyle = Colors.GOLD; ctx.font = FM(22, 'bold');
        ctx.fillText(String(Math.floor(gold)), 28 + ctx.measureText('GOLD').width + 6, cy + 18);

        // ── Lives icon (heart shape) ──
        const lx = 180;
        const hy = cy + 11;
        ctx.fillStyle = 'rgb(220,50,50)';
        ctx.beginPath(); ctx.arc(lx + 3, hy - 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(lx + 9, hy - 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(lx, hy - 1); ctx.lineTo(lx + 6, hy + 5); ctx.lineTo(lx + 12, hy - 1);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(14);
        ctx.fillText('LIVES', lx + 16, cy + 6);
        const livesColor = lives > 10 ? Colors.HP_GREEN : lives > 5 ? Colors.HP_YELLOW : Colors.HP_RED;
        ctx.fillStyle = livesColor; ctx.font = FM(22, 'bold');
        ctx.fillText(String(lives), lx + 16 + ctx.measureText('LIVES').width + 6, cy + 18);

        // ── Wave icon (blue flag) ──
        const wx = 340;
        const fy = cy + 11;
        ctx.strokeStyle = 'rgb(180,180,200)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(wx + 4, fy - 7); ctx.lineTo(wx + 4, fy + 6); ctx.stroke();
        ctx.fillStyle = 'rgb(80,140,220)';
        ctx.beginPath();
        ctx.moveTo(wx + 5, fy - 7); ctx.lineTo(wx + 14, fy - 4); ctx.lineTo(wx + 5, fy - 1);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(14);
        ctx.fillText('WAVE', wx + 18, cy + 6);
        ctx.fillStyle = Colors.TEXT; ctx.font = FM(22, 'bold');
        ctx.fillText(`${wave}/${TOTAL_WAVES}`, wx + 18 + ctx.measureText('WAVE').width + 6, cy + 18);

        // ── Enemies icon (skull) ──
        const ex = 510;
        const sy = cy + 10;
        ctx.fillStyle = 'rgb(180,180,180)';
        ctx.beginPath(); ctx.arc(ex + 6, sy - 1, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(ex + 3, sy + 2, 7, 4);
        ctx.fillStyle = Colors.BG;
        ctx.beginPath(); ctx.arc(ex + 4, sy - 1, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + 8, sy - 1, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(14);
        ctx.fillText('ENEMIES', ex + 16, cy + 6);
        ctx.fillStyle = Colors.TEXT; ctx.font = FM(22, 'bold');
        ctx.fillText(String(enemyCount), ex + 16 + ctx.measureText('ENEMIES').width + 6, cy + 18);

        // ── Speed indicator ──
        if (speedMult > 1) {
            ctx.fillStyle = Colors.ACCENT; ctx.font = F(28, 'bold');
            ctx.fillText(`${speedMult}x`, 660, cy + 18);
        }

        // ── Pause button (in top bar) ──
        const pauseRect = { x: PANEL_X - 50, y: 8, w: 42, h: 34 };
        this._drawRoundBtn(ctx, pauseRect, '| |', Colors.BG_LIGHT, Colors.TEXT, 6, F(20, 'bold'));
    }

    // ─── Bottom Bar ─────────────────────────────

    drawBottomBar(ctx, gameState, speedMult, nextWaveInfo, curWaveInfo) {
        const barY = SCREEN_HEIGHT - BOTTOM_BAR_HEIGHT;

        // Gradient (opposite direction from top)
        for (let row = 0; row < BOTTOM_BAR_HEIGHT; row++) {
            const t = row / BOTTOM_BAR_HEIGHT;
            const r = Math.floor(26 + 10 * t);
            const g = Math.floor(26 + 10 * t);
            const b = Math.floor(46 + 14 * t);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(0, barY + row, SCREEN_WIDTH, 1);
        }
        // Top accent lines
        ctx.fillStyle = 'rgb(50,50,80)'; ctx.fillRect(0, barY, SCREEN_WIDTH, 1);
        ctx.fillStyle = 'rgb(20,20,36)'; ctx.fillRect(0, barY + 1, SCREEN_WIDTH, 1);

        const btnY = barY + 8;
        const isPrep = gameState === GameState.PREP;

        // Start Wave button
        const startRect = { x: 12, y: btnY, w: 160, h: 34 };
        const startBg = isPrep ? Colors.ACCENT : Colors.BG_LIGHT;
        const startText = isPrep ? 'START WAVE' : 'Spawning...';
        const startColor = isPrep ? Colors.BLACK : Colors.TEXT_DIM;
        this._drawRoundBtn(ctx, startRect, startText, startBg, startColor, 6, F(17));

        // 1x speed (normal)
        const is1x = Math.abs(speedMult - 1) < 0.1;
        this._drawRoundBtn(ctx, { x: 182, y: btnY, w: 42, h: 34 }, '1x',
            is1x ? Colors.ACCENT : Colors.BG_LIGHT, is1x ? Colors.BLACK : Colors.TEXT, 6, F(17, 'bold'));

        // 2x speed
        const is2x = Math.abs(speedMult - 2) < 0.1;
        this._drawRoundBtn(ctx, { x: 228, y: btnY, w: 42, h: 34 }, '2x',
            is2x ? Colors.ACCENT : Colors.BG_LIGHT, is2x ? Colors.BLACK : Colors.TEXT, 6, F(17, 'bold'));

        // 4x speed
        const is4x = Math.abs(speedMult - 4) < 0.1;
        this._drawRoundBtn(ctx, { x: 274, y: btnY, w: 42, h: 34 }, '4x',
            is4x ? '#ff6633' : Colors.BG_LIGHT, is4x ? Colors.BLACK : Colors.TEXT, 6, F(17, 'bold'));

        // Next wave preview (during PREP)
        if (nextWaveInfo && isPrep) {
            ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(14);
            ctx.fillText('Next:', 310, barY + 20);
            let xOff = 310 + ctx.measureText('Next: ').width + 4;
            const enemyColors = {
                grunt: '#50b43c', runner: '#3c8cdc', tank: '#c83c3c', ghost: '#b4a0dc',
                healer: '#78c850', wasp: '#e6c832', disruptor: '#8c3cb4', summoner: '#3ca08c',
                imp: '#dc5050', boss: '#7828b4',
            };
            for (const etype of nextWaveInfo.enemyTypes) {
                ctx.fillStyle = enemyColors[etype] || '#888';
                ctx.beginPath();
                ctx.arc(xOff + 6, barY + 17, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff'; ctx.font = F(9);
                const label = etype.charAt(0).toUpperCase();
                ctx.textAlign = 'center';
                ctx.fillText(label, xOff + 6, barY + 20);
                ctx.textAlign = 'left';
                xOff += 18;
            }
            ctx.fillStyle = Colors.TEXT_DIM; ctx.font = F(14);
            ctx.fillText(`(${nextWaveInfo.totalEnemies} enemies)`, xOff + 4, barY + 20);
        }

        // Current wave info (right side, during COMBAT)
        if (curWaveInfo && gameState === GameState.COMBAT) {
            const infoText = `Wave ${curWaveInfo.wave}: ${curWaveInfo.totalEnemies} enemies`;
            ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(14);
            ctx.textAlign = 'right';
            ctx.fillText(infoText, PANEL_X - 10, barY + 28);
            ctx.textAlign = 'left';
        }
    }

    // ─── Shop Panel ─────────────────────────────

    drawShopPanel(ctx, gold, selectedTower, selectedType, unlocks = {}) {
        // Panel bg
        ctx.fillStyle = Colors.PANEL;
        ctx.fillRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_H);
        ctx.fillStyle = Colors.PANEL_BORDER;
        ctx.fillRect(PANEL_X, PANEL_Y, 1, PANEL_H);

        if (selectedTower) {
            this._showingTowerInfo = true;
            this._drawTowerInfo(ctx, selectedTower, gold);
            return;
        }

        this._showingTowerInfo = false;
        this._upgradeBtn = this._sellBtn = this._targetBtn = this._specABtn = this._specBBtn = null;

        // Title "TOWERS" centered
        ctx.fillStyle = Colors.ACCENT;
        ctx.font = F(22, 'bold');
        ctx.textAlign = 'center';
        ctx.fillText('TOWERS', PANEL_X + PANEL_WIDTH / 2, PANEL_Y + 22);
        ctx.textAlign = 'left';

        // Tower buttons
        for (const btn of this.shopButtons) {
            const data = TOWER_DATA[btn.type];

            // Check if tower requires unlock
            if (data.requires_unlock && !unlocks[data.requires_unlock]) {
                // Locked tower
                roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 4);
                ctx.fillStyle = 'rgb(30,30,38)'; ctx.fill();
                ctx.strokeStyle = 'rgb(80,60,60)'; ctx.lineWidth = 1; ctx.stroke();
                // Grayed icon
                const sprite = getTowerSprite(btn.type, 1, 32);
                ctx.globalAlpha = 0.3;
                ctx.drawImage(sprite, btn.x + 4, btn.y + 9);
                ctx.globalAlpha = 1;
                // Lock icon
                ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(14, 'bold');
                ctx.fillText('\u{1F512}', btn.x + btn.w - 24, btn.y + 16);
                // Name
                ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(17);
                ctx.fillText(data.name, btn.x + 38, btn.y + 16);
                // Hint
                ctx.fillStyle = 'rgb(120,90,90)'; ctx.font = F(14);
                ctx.fillText('Unlock in Workshop', btn.x + 38, btn.y + 32);
                ctx.fillStyle = 'rgb(80,80,80)';
                ctx.fillText(`${data.cost}g`, btn.x + 38, btn.y + 46);
                continue;
            }

            const canAfford = gold >= data.cost;
            const isSel = selectedType === btn.type;

            // Background color
            let bgColor, textColor, statColor;
            if (isSel) {
                bgColor = Colors.ACCENT; textColor = Colors.BLACK; statColor = 'rgb(50,50,30)';
            } else if (canAfford) {
                bgColor = Colors.BG_LIGHT; textColor = Colors.TEXT; statColor = Colors.TEXT_DIM;
            } else {
                bgColor = 'rgb(30,30,40)'; textColor = Colors.TEXT_DARK; statColor = 'rgb(80,80,80)';
            }

            // Draw button with border-radius 4
            roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 4);
            ctx.fillStyle = bgColor; ctx.fill();
            ctx.strokeStyle = Colors.PANEL_BORDER; ctx.lineWidth = 1; ctx.stroke();

            // Tower icon (32x32) — use grayed out when can't afford
            const sprite = getTowerSprite(btn.type, 1, 32);
            if (!canAfford && !isSel) {
                ctx.globalAlpha = 0.4;
            }
            ctx.drawImage(sprite, btn.x + 4, btn.y + 9);
            ctx.globalAlpha = 1;

            // Name (17pt, top-left after icon)
            ctx.fillStyle = textColor; ctx.font = F(17);
            ctx.fillText(data.name, btn.x + 38, btn.y + 16);

            // Cost (17pt, right-aligned)
            ctx.fillStyle = canAfford ? Colors.GOLD : Colors.TEXT_DARK;
            ctx.font = F(17);
            const costStr = `${data.cost}g`;
            const costW = ctx.measureText(costStr).width;
            ctx.fillText(costStr, btn.x + btn.w - costW - 4, btn.y + 16);

            // Stats line 1 (14px, always shown)
            ctx.font = F(14); ctx.fillStyle = statColor;
            if (data.damage > 0) {
                // Attacking tower: Dmg/Rng/Spd
                ctx.fillText(`Dmg:${data.damage}  Rng:${data.range.toFixed(1)}  Spd:${data.fire_rate}s`, btn.x + 38, btn.y + 32);
                // Stats line 2: damage type + traits (only if affordable or selected)
                if (canAfford || isSel) {
                    ctx.fillStyle = statColor; ctx.font = F(14);
                    const dtype = data.damage_type ? (data.damage_type.charAt(0).toUpperCase() + data.damage_type.slice(1)) : '';
                    const traits = [dtype];
                    if (data.splash_radius > 0) traits.push(`AoE:${data.splash_radius}`);
                    if (data.chain_count > 0) traits.push(`Chain:${data.chain_count}`);
                    if (data.burn_dps > 0) traits.push('Burn');
                    if (btn.type === TowerType.SKY_HUNTER) traits.push('Air only');
                    if (data.is_aoe_pulse) traits.push('Pulse AoE');
                    ctx.fillText(traits.join('  '), btn.x + 38, btn.y + 46);
                }
            } else if (btn.type === TowerType.AURA) {
                ctx.fillText('Buffs nearby towers', btn.x + 38, btn.y + 32);
                if (canAfford || isSel) {
                    ctx.fillText(`Range: ${data.range.toFixed(1)}`, btn.x + 38, btn.y + 46);
                }
            } else if (btn.type === TowerType.HARRY_DUCK) {
                const duckDmg = data.duck_damage || 15;
                const duckHP = data.duck_hp || 80;
                const interval = data.spawn_interval || 6;
                ctx.fillText(`Duck: ${duckDmg}dmg ${duckHP}hp`, btn.x + 38, btn.y + 32);
                if (canAfford || isSel) {
                    ctx.fillText(`Spawn every ${interval}s`, btn.x + 38, btn.y + 46);
                }
            } else if (btn.type === TowerType.GOLD_MINE) {
                const gpt = data.gold_per_tick || 3;
                const interval = data.tick_interval || 5;
                ctx.fillStyle = canAfford ? Colors.GOLD : 'rgb(80,80,60)';
                ctx.fillText(`${gpt}g every ${interval}s`, btn.x + 38, btn.y + 32);
                if (canAfford || isSel) {
                    ctx.fillStyle = statColor; ctx.font = F(14);
                    ctx.fillText(`(${(gpt * 60 / interval).toFixed(0)}g/min)`, btn.x + 38, btn.y + 46);
                }
            }

            // Not enough gold warning (replaces stats line 2)
            if (!canAfford && !isSel) {
                const shortfall = data.cost - gold;
                ctx.fillStyle = 'rgb(160,80,80)'; ctx.font = F(14);
                ctx.fillText(`Need ${shortfall}g more`, btn.x + 38, btn.y + 46);
            }
        }
    }

    // ─── Tower Info (selected placed tower) ─────

    _drawTowerInfo(ctx, tower, gold) {
        const x = PANEL_X + 10;
        let y = PANEL_Y + 8;
        const w = PANEL_WIDTH - 20;

        // Name — large accent
        ctx.fillStyle = Colors.ACCENT; ctx.font = F(22, 'bold');
        ctx.fillText(tower.name, x, y + 18);
        y += 26;

        // Level pips
        this._drawLevelPips(ctx, x, y, tower.level, 8);
        y += 12;

        // Level text
        ctx.fillStyle = Colors.TEXT_DIM; ctx.font = F(17);
        ctx.fillText(`Level ${tower.level} / 8`, x, y + 14);
        y += 20;

        // Specialization name
        if (tower.specialization) {
            const spec = TOWER_DATA[tower.type].specializations[tower.specialization];
            ctx.fillStyle = Colors.ENERGY || '#9933ff'; ctx.font = F(17);
            ctx.fillText(spec.name, x, y + 14);
            y += 18;
            ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(14);
            ctx.fillText(spec.desc, x, y + 12);
            y += 16;
        }

        // Separator
        y += 4;
        ctx.fillStyle = Colors.PANEL_BORDER; ctx.fillRect(x, y, w, 1);
        y += 6;

        // Stats
        const lh = 20;
        ctx.font = F(17);
        if (tower.baseDamage > 0) {
            ctx.fillStyle = Colors.TEXT_DIM;
            ctx.fillText(`Damage: ${tower.damage.toFixed(0)}`, x, y + 14); y += lh;
            ctx.fillText(`Range: ${tower.range.toFixed(1)}`, x, y + 14); y += lh;
            ctx.fillText(`Fire Rate: ${tower.fireRate.toFixed(2)}s`, x, y + 14); y += lh;
            if (tower.baseDamageType) {
                ctx.fillText(`Type: ${tower.baseDamageType}`, x, y + 14); y += lh;
            }
            if (tower.splashRadius > 0) {
                ctx.fillText(`Splash: ${tower.splashRadius.toFixed(1)}`, x, y + 14); y += lh;
            }
        } else if (tower.type === TowerType.HARRY_DUCK) {
            ctx.fillStyle = Colors.GOLD;
            ctx.fillText(`Duck HP: ${tower.duckHP}`, x, y + 14); y += lh;
            ctx.fillText(`Duck Dmg: ${tower.duckDamage}`, x, y + 14); y += lh;
            ctx.fillStyle = Colors.TEXT_DIM;
            ctx.fillText(`Spawn: ${tower.spawnInterval}s`, x, y + 14); y += lh;
        } else if (tower.type === TowerType.AURA) {
            ctx.fillStyle = Colors.TEXT_DIM;
            ctx.fillText(`Buff: ${tower.auraBuff}`, x, y + 14); y += lh;
            ctx.fillText(`Range: ${tower.range.toFixed(1)}`, x, y + 14); y += lh;
        } else if (tower.type === TowerType.GOLD_MINE) {
            ctx.fillStyle = Colors.GOLD;
            const gpt = tower.currentGoldPerTick;
            const interval = tower.currentTickInterval;
            ctx.fillText(`Income: ${gpt}g / ${interval.toFixed(1)}s`, x, y + 14); y += lh;
            ctx.fillStyle = Colors.TEXT_DIM;
            ctx.fillText(`(${(gpt * 60 / interval).toFixed(0)}g/min)`, x, y + 14); y += lh;
        }

        if (tower.isHighGround) {
            ctx.fillStyle = 'rgb(180,150,60)'; ctx.font = F(14);
            ctx.fillText('+1 range (high ground)', x, y + 12); y += 16;
        }
        y += 4;

        // Targeting mode button
        if (tower.baseDamage > 0) {
            const tgtH = 28;
            this._targetBtn = { x, y, w, h: tgtH };
            this._drawRoundBtn(ctx, this._targetBtn, `Target: ${tower.targetMode}`,
                Colors.BG_LIGHT, Colors.TEXT, 3, F(17));
            y += tgtH + 6;
        } else {
            this._targetBtn = null;
            y += 4;
        }

        // Separator
        ctx.fillStyle = Colors.PANEL_BORDER; ctx.fillRect(x, y, w, 1); y += 6;

        // Upgrade section
        if (tower.canUpgrade) {
            const cost = tower.upgradeCost;
            const canAfford = gold >= cost;

            if (tower.needsSpecialization) {
                // Specialization choice at level 7→8
                ctx.fillStyle = '#9933ff'; ctx.font = F(14);
                ctx.fillText('SPECIALIZE:', x, y + 12); y += 18;

                if (!canAfford) {
                    ctx.fillStyle = 'rgb(180,80,80)'; ctx.font = F(14);
                    ctx.fillText(`Need ${cost - gold}g more`, x, y + 12); y += 16;
                }

                const data = TOWER_DATA[tower.type];
                for (const key of ['A', 'B']) {
                    const spec = data.specializations[key];
                    const btn = { x, y, w, h: 46 };
                    if (key === 'A') this._specABtn = btn; else this._specBBtn = btn;

                    const bg = canAfford ? Colors.BG_LIGHT : 'rgb(25,25,35)';
                    const borderC = canAfford ? '#9933ff' : 'rgb(60,50,50)';
                    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 4);
                    ctx.fillStyle = bg; ctx.fill();
                    ctx.strokeStyle = borderC; ctx.lineWidth = 1; ctx.stroke();

                    ctx.fillStyle = canAfford ? Colors.TEXT : Colors.TEXT_DARK;
                    ctx.font = F(14);
                    ctx.fillText(`${key}: ${spec.name}`, x + 4, y + 16);
                    ctx.fillStyle = Colors.TEXT_DIM;
                    ctx.fillText(spec.desc, x + 4, y + 34);
                    ctx.fillStyle = canAfford ? Colors.GOLD : Colors.TEXT_DARK;
                    ctx.fillText(`${cost}g`, x + w - 36, y + 16);
                    y += 50;
                }
                this._upgradeBtn = null;
            } else {
                // Standard upgrade button
                this._specABtn = this._specBBtn = null;
                this._upgradeBtn = { x, y, w, h: 30 };
                const canAf = gold >= cost;
                const bg = canAf ? Colors.ACCENT : 'rgb(30,30,40)';
                const txtC = canAf ? Colors.BLACK : Colors.TEXT_DARK;
                const borderC = canAf ? Colors.ACCENT : 'rgb(80,60,60)';

                roundRect(ctx, x, y, w, 30, 4);
                ctx.fillStyle = bg; ctx.fill();
                ctx.strokeStyle = borderC; ctx.lineWidth = 1; ctx.stroke();

                ctx.fillStyle = txtC; ctx.font = F(14);
                ctx.fillText(`Upgrade to Lv ${tower.level + 1}`, x + 6, y + 20);
                ctx.fillStyle = canAf ? Colors.GOLD : Colors.TEXT_DARK;
                const costStr = `${cost}g`;
                ctx.fillText(costStr, x + w - ctx.measureText(costStr).width - 6, y + 20);

                y += 34;
                if (!canAf) {
                    ctx.fillStyle = 'rgb(160,80,80)'; ctx.font = F(14);
                    ctx.fillText(`Need ${cost - gold}g more`, x, y + 12); y += 18;
                }
                // Upgrade preview
                ctx.fillStyle = 'rgb(100,180,100)'; ctx.font = F(14);
                if (tower.type === TowerType.GOLD_MINE) {
                    const curG = tower.currentGoldPerTick;
                    const curI = tower.currentTickInterval;
                    const nxtG = Math.floor((tower.goldPerTick + tower.level * 0.5) * 10) / 10;
                    const nxtI = Math.max(tower.tickInterval - tower.level * 0.15, 2.5);
                    ctx.fillText(`${curG}g -> ${nxtG}g per tick`, x, y + 12); y += 18;
                    ctx.fillText(`${curI.toFixed(1)}s -> ${nxtI.toFixed(1)}s interval`, x, y + 12); y += 18;
                } else if (tower.type === TowerType.HARRY_DUCK) {
                    ctx.fillText('+duck stats per level', x, y + 12); y += 18;
                } else if (tower.baseDamage > 0) {
                    ctx.fillText('+dmg, +range, faster', x, y + 12); y += 18;
                }
            }
        } else {
            this._upgradeBtn = this._specABtn = this._specBBtn = null;
            // MAX LEVEL badge
            roundRect(ctx, x, y, w, 22, 4);
            ctx.fillStyle = 'rgb(40,30,60)'; ctx.fill();
            ctx.strokeStyle = '#9933ff'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#9933ff'; ctx.font = F(14); ctx.textAlign = 'center';
            ctx.fillText('MAX LEVEL', x + w / 2, y + 16); ctx.textAlign = 'left';
            y += 28;
        }

        if (tower.level === 6) {
            ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(14);
            ctx.fillText('Lv 8: Choose spec!', x, y + 12); y += 18;
        }

        y += 4;

        // Sell button
        const sellVal = Math.floor(tower.totalInvestment * SELL_REFUND_RATIO);
        this._sellBtn = { x, y, w, h: 26 };
        roundRect(ctx, x, y, w, 26, 4);
        ctx.fillStyle = Colors.DANGER; ctx.fill();
        ctx.fillStyle = Colors.WHITE; ctx.font = F(14);
        ctx.fillText(`Sell (${sellVal}g)`, x + 8, y + 18);
        y += 30;

        // Total invested
        ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(17);
        ctx.fillText(`Total invested: ${tower.totalInvestment}g`, x, y + 14);
    }

    _drawLevelPips(ctx, x, y, level, max) {
        const pipSize = 6;
        const gap = 2;
        const tierColors = [Colors.TEXT_DIM, 'rgb(100,200,100)', 'rgb(80,150,255)', Colors.ACCENT, '#9933ff'];
        for (let i = 0; i < max; i++) {
            const px = x + i * (pipSize + gap);
            if (i < level) {
                const tier = Math.floor(i * 4 / max);
                ctx.fillStyle = tierColors[Math.min(tier, tierColors.length - 1)];
                ctx.fillRect(px, y, pipSize, pipSize);
            } else {
                ctx.strokeStyle = Colors.PANEL_BORDER; ctx.lineWidth = 1;
                ctx.strokeRect(px, y, pipSize, pipSize);
            }
        }
    }

    // ─── Main Menu ─────────────────────────────

    drawMainMenu(ctx, essence = 0) {
        ctx.fillStyle = Colors.BG;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        const cx = SCREEN_WIDTH / 2;

        // Decorative line
        ctx.strokeStyle = Colors.PANEL_BORDER; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 300, 85); ctx.lineTo(cx + 300, 85); ctx.stroke();

        // Title
        ctx.fillStyle = Colors.ACCENT; ctx.font = F(44, 'bold'); ctx.textAlign = 'center';
        ctx.fillText('TOWER DEFENSE', cx, 140);

        // Subtitle with horizontal rules
        ctx.fillStyle = Colors.TEXT_DIM; ctx.font = F(17);
        const subText = 'A Strategic Battle';
        const subW = ctx.measureText(subText).width;
        ctx.fillText(subText, cx, 178);
        ctx.strokeStyle = Colors.PANEL_BORDER; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - subW / 2 - 20, 174); ctx.lineTo(cx - subW / 2 - 4, 174); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + subW / 2 + 4, 174); ctx.lineTo(cx + subW / 2 + 20, 174); ctx.stroke();

        // Separator
        ctx.beginPath(); ctx.moveTo(cx - 140, 200); ctx.lineTo(cx + 140, 200); ctx.stroke();

        // Producer credit
        ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(14);
        ctx.fillText('Produced by', cx, 225);
        ctx.fillStyle = Colors.ACCENT; ctx.font = F(28, 'bold');
        ctx.fillText('Harry the Duck', cx, 257);
        ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(14);
        ctx.fillText('March 2026  |  v0.2.21', cx, 280);

        // Separator
        ctx.strokeStyle = Colors.PANEL_BORDER;
        ctx.beginPath(); ctx.moveTo(cx - 180, 300); ctx.lineTo(cx + 180, 300); ctx.stroke();

        // Essence display
        let btnStartY = 330;
        if (essence > 0) {
            ctx.fillStyle = Colors.TEXT_DARK; ctx.font = F(14);
            ctx.fillText('ESSENCE', cx, 318);
            ctx.fillStyle = '#9933ff'; ctx.font = F(28, 'bold');
            ctx.fillText(String(essence), cx, 348);
            btnStartY = 375;
        }

        // Buttons
        this._drawMenuButton(ctx, { x: cx - 160, y: btnStartY, w: 320, h: 58 }, 'Play Game', Colors.ACCENT, Colors.BLACK);
        this._drawMenuButton(ctx, { x: cx - 160, y: btnStartY + 68, w: 320, h: 58 }, 'Workshop', Colors.BG_LIGHT, Colors.TEXT);
        this._drawMenuButton(ctx, { x: cx - 160, y: btnStartY + 136, w: 320, h: 58 }, 'Map Editor', Colors.BG_LIGHT, Colors.TEXT);
        this._drawMenuButton(ctx, { x: cx - 160, y: btnStartY + 204, w: 320, h: 58 }, 'Bestiary', Colors.BG_LIGHT, Colors.TEXT);
        this._drawMenuButton(ctx, { x: cx - 160, y: btnStartY + 272, w: 320, h: 58 }, 'Quit', 'rgb(40,40,50)', Colors.TEXT_DIM);

        // Store button positions for hit testing
        this._menuBtnStartY = btnStartY;

        // Footer
        ctx.fillStyle = 'rgb(60,60,80)'; ctx.font = F(14);
        ctx.fillText('Press 1-9 to quick-select towers  |  F to toggle speed  |  U to upgrade', cx, SCREEN_HEIGHT - 30);

        ctx.textAlign = 'left';
    }

    // ─── Map Select ─────────────────────────────

    drawMapSelect(ctx, maps) {
        ctx.fillStyle = Colors.BG;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        const cx = SCREEN_WIDTH / 2;

        ctx.fillStyle = Colors.ACCENT; ctx.font = F(28, 'bold'); ctx.textAlign = 'center';
        ctx.fillText('SELECT MAP', cx, 65);
        ctx.textAlign = 'left';

        // Maps (left side)
        let y = 100;
        for (let i = 0; i < maps.length; i++) {
            const map = maps[i];
            const btn = { x: 40, y, w: 420, h: 55 };

            roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 6);
            ctx.fillStyle = Colors.BG_LIGHT; ctx.fill();
            ctx.strokeStyle = Colors.PANEL_BORDER; ctx.lineWidth = 1; ctx.stroke();

            ctx.fillStyle = Colors.TEXT; ctx.font = F(17);
            ctx.fillText(map.name, btn.x + 15, btn.y + 20);

            const diffColors = { Easy: Colors.HP_GREEN, Medium: Colors.HP_YELLOW, Hard: Colors.HP_RED, Expert: '#9933ff', Custom: Colors.ACCENT };
            ctx.fillStyle = diffColors[map.difficulty] || Colors.TEXT;
            ctx.font = F(13);
            ctx.fillText(map.difficulty, btn.x + 15, btn.y + 40);

            ctx.fillStyle = Colors.TEXT_DIM;
            ctx.fillText(`Spawns: ${map.spawns.length}  Exits: ${map.exits.length}`, btn.x + 150, btn.y + 40);

            y += 60;
        }

        // Challenge Modifiers (right side)
        const modX = 500;
        const modW = 360;
        let modY = 100;

        ctx.fillStyle = Colors.TEXT_DIM; ctx.font = F(14, 'bold');
        ctx.fillText('CHALLENGE MODIFIERS', modX, modY);
        modY += 22;

        this._modifierBtns = [];
        for (const [key, mod] of Object.entries(CHALLENGE_MODIFIERS)) {
            const active = this.activeModifiers.has(key);
            const btn = { x: modX, y: modY, w: modW, h: 42 };

            // Background
            roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 4);
            ctx.fillStyle = active ? 'rgba(230,184,0,0.12)' : Colors.BG_LIGHT;
            ctx.fill();
            ctx.strokeStyle = active ? Colors.ACCENT : Colors.PANEL_BORDER;
            ctx.lineWidth = active ? 2 : 1;
            ctx.stroke();

            // Checkbox
            const cbx = btn.x + 10, cby = btn.y + 11, cbs = 18;
            ctx.strokeStyle = active ? Colors.ACCENT : Colors.PANEL_BORDER;
            ctx.lineWidth = 2;
            ctx.strokeRect(cbx, cby, cbs, cbs);
            if (active) {
                ctx.strokeStyle = Colors.ACCENT; ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(cbx + 3, cby + 9);
                ctx.lineTo(cbx + 7, cby + 14);
                ctx.lineTo(cbx + 15, cby + 4);
                ctx.stroke();
            }

            // Name
            ctx.fillStyle = active ? Colors.ACCENT : Colors.TEXT;
            ctx.font = F(14);
            ctx.fillText(mod.name, btn.x + 36, btn.y + 14);

            // Description
            ctx.fillStyle = Colors.TEXT_DIM; ctx.font = F(12);
            ctx.fillText(mod.desc, btn.x + 36, btn.y + 30);

            // Essence multiplier badge
            ctx.fillStyle = '#9933ff'; ctx.font = F(13, 'bold');
            ctx.textAlign = 'right';
            ctx.fillText(`x${mod.essence_mult.toFixed(1)}`, btn.x + btn.w - 10, btn.y + 20);
            ctx.textAlign = 'left';

            this._modifierBtns.push({ ...btn, key });
            modY += 48;
        }

        // Essence multiplier total
        let totalMult = 1.0;
        for (const key of this.activeModifiers) {
            totalMult *= CHALLENGE_MODIFIERS[key]?.essence_mult || 1;
        }
        if (totalMult > 1) {
            ctx.fillStyle = '#9933ff'; ctx.font = F(16, 'bold');
            ctx.fillText(`Total: x${totalMult.toFixed(2)} essence`, modX, modY + 10);
        }

        // Back button
        this._drawMenuButton(ctx, { x: 20, y: SCREEN_HEIGHT - 60, w: 120, h: 40 }, 'Back', Colors.BG_LIGHT, Colors.TEXT_DIM);
    }

    // ─── Pause Menu ─────────────────────────────

    drawPauseMenu(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.59)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        const cx = SCREEN_WIDTH / 2;

        ctx.fillStyle = Colors.ACCENT; ctx.font = F(28, 'bold'); ctx.textAlign = 'center';
        ctx.fillText('PAUSED', cx, 330);
        ctx.textAlign = 'left';

        this._drawMenuButton(ctx, { x: cx - 140, y: 380, w: 280, h: 50 }, 'Resume', Colors.ACCENT, Colors.BLACK);
        this._drawMenuButton(ctx, { x: cx - 140, y: 450, w: 280, h: 50 }, 'Restart', Colors.BG_LIGHT, Colors.TEXT);
        this._drawMenuButton(ctx, { x: cx - 140, y: 520, w: 280, h: 50 }, 'Quit to Menu', Colors.BG_LIGHT, Colors.TEXT);
    }

    // ─── Win/Lose Screens ─────────────────────────────

    drawWinScreen(ctx, wave, bossesKilled = 0, totalKills = 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.71)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        const cx = SCREEN_WIDTH / 2;

        ctx.fillStyle = Colors.ACCENT; ctx.font = F(44, 'bold'); ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', cx, 240);

        ctx.fillStyle = Colors.TEXT; ctx.font = F(17);
        ctx.fillText(`Waves Completed: ${wave}`, cx, 300);
        ctx.fillText(`Enemies Killed: ${totalKills}`, cx, 325);
        ctx.fillText(`Bosses Slain: ${bossesKilled}`, cx, 350);

        // Essence preview
        const ess = wave * 10 + bossesKilled * 100 + 500;
        ctx.fillStyle = '#9933ff'; ctx.font = F(22, 'bold');
        ctx.fillText(`Essence Earned: +${ess}`, cx, 400);

        this._drawMenuButton(ctx, { x: cx - 140, y: 520, w: 280, h: 50 }, 'Continue', Colors.ACCENT, Colors.BLACK);
        ctx.textAlign = 'left';
    }

    drawLoseScreen(ctx, wave, bossesKilled = 0, totalKills = 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.71)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        const cx = SCREEN_WIDTH / 2;

        ctx.fillStyle = Colors.DANGER; ctx.font = F(44, 'bold'); ctx.textAlign = 'center';
        ctx.fillText('DEFEAT', cx, 240);

        ctx.fillStyle = Colors.TEXT; ctx.font = F(17);
        ctx.fillText(`Waves Completed: ${wave}`, cx, 300);
        ctx.fillText(`Enemies Killed: ${totalKills}`, cx, 325);
        ctx.fillText(`Bosses Slain: ${bossesKilled}`, cx, 350);

        // Essence preview
        const ess = wave * 10 + bossesKilled * 100;
        ctx.fillStyle = '#9933ff'; ctx.font = F(22, 'bold');
        ctx.fillText(`Essence Earned: +${ess}`, cx, 400);

        this._drawMenuButton(ctx, { x: cx - 140, y: 520, w: 280, h: 50 }, 'Continue', Colors.ACCENT, Colors.BLACK);
        ctx.textAlign = 'left';
    }

    // ─── Shared Button Drawing ─────────────────────────────

    _drawMenuButton(ctx, rect, text, bgColor, textColor) {
        const { x, y, w, h } = rect;
        // Shadow
        roundRect(ctx, x + 2, y + 2, w, h, 10);
        ctx.fillStyle = 'rgb(15,15,25)'; ctx.fill();
        // Body
        roundRect(ctx, x, y, w, h, 10);
        ctx.fillStyle = bgColor; ctx.fill();
        // Highlight (top third)
        ctx.save();
        roundRect(ctx, x + 2, y + 2, w - 4, Math.floor(h / 3), 8);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x, y, w, h);
        ctx.restore();
        // Border
        roundRect(ctx, x, y, w, h, 10);
        ctx.strokeStyle = Colors.PANEL_BORDER; ctx.lineWidth = 1; ctx.stroke();
        // Text
        ctx.fillStyle = textColor; ctx.font = F(22); ctx.textAlign = 'center';
        ctx.fillText(text, x + w / 2, y + h / 2 + 7);
        ctx.textAlign = 'left';
    }

    _drawRoundBtn(ctx, rect, text, bgColor, textColor, radius = 6, font = F(17)) {
        const { x, y, w, h } = rect;
        roundRect(ctx, x, y, w, h, radius);
        ctx.fillStyle = bgColor; ctx.fill();
        ctx.strokeStyle = Colors.PANEL_BORDER; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = textColor; ctx.font = font; ctx.textAlign = 'center';
        ctx.fillText(text, x + w / 2, y + h / 2 + 5);
        ctx.textAlign = 'left';
    }

    // ─── Hover Tooltip ─────────────────────────────

    drawTooltip(ctx, mouseX, mouseY, towers, enemies, tiles, placingType) {
        // Reset timer if mouse moved more than 5px
        const dx = mouseX - this._lastMX;
        const dy = mouseY - this._lastMY;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
            this._tooltipTimer = 0;
            this._lastMX = mouseX;
            this._lastMY = mouseY;
        }

        // Don't show tooltips when mouse is in the shop panel
        if (mouseX >= PANEL_X) return;
        // Don't show in top/bottom bars
        if (mouseY < TOP_BAR_HEIGHT || mouseY > SCREEN_HEIGHT - BOTTOM_BAR_HEIGHT) return;

        // Accumulate time (assume ~16ms per frame at 60fps)
        this._tooltipTimer += 1 / 60;
        if (this._tooltipTimer < 0.3) return;

        // Determine what's under the cursor
        const gridX = Math.floor((mouseX - GRID_OFFSET_X) / TILE_SIZE);
        const gridY = Math.floor((mouseY - GRID_OFFSET_Y) / TILE_SIZE);
        const onGrid = gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT;

        let title = '';
        let lines = [];

        // Check for tower in shop placing mode
        if (placingType && onGrid) {
            const data = TOWER_DATA[placingType];
            title = data.name;
            if (data.damage > 0) {
                lines.push(`Damage: ${data.damage}`);
                lines.push(`Range: ${data.range.toFixed(1)}`);
                lines.push(`Fire Rate: ${data.fire_rate}s`);
                if (data.damage_type) {
                    const dt = data.damage_type.charAt(0).toUpperCase() + data.damage_type.slice(1);
                    lines.push(`Type: ${dt}`);
                }
                if (data.splash_radius > 0) lines.push(`Splash Radius: ${data.splash_radius}`);
                if (data.chain_count > 0) lines.push(`Chain: ${data.chain_count} targets`);
                if (data.burn_dps > 0) lines.push(`Burn: ${data.burn_dps} dps for ${data.burn_duration}s`);
                if (data.slow_strength > 0) lines.push(`Slow: ${Math.round(data.slow_strength * 100)}% for ${data.slow_duration}s`);
                if (data.is_aoe_pulse) lines.push('Pulse AoE: hits all in range');
                if (!data.can_hit_air) lines.push('Cannot hit air');
                if (!data.can_hit_ground) lines.push('Air targets only');
                // Strong/weak against
                if (data.damage_type) {
                    const strong = [];
                    const weak = [];
                    for (const [armorName, mults] of Object.entries(ARMOR_MATRIX)) {
                        const m = mults[data.damage_type];
                        if (m > 1.0) strong.push(armorName);
                        else if (m < 1.0) weak.push(armorName);
                    }
                    if (strong.length > 0) lines.push(`Strong vs: ${strong.join(', ')}`);
                    if (weak.length > 0) lines.push(`Weak vs: ${weak.join(', ')}`);
                }
            } else if (data.is_spawner) {
                lines.push(`Duck HP: ${data.duck_hp}`);
                lines.push(`Duck Damage: ${data.duck_damage}`);
                lines.push(`Spawn every ${data.spawn_interval}s`);
            } else if (data.is_support) {
                lines.push('Buffs nearby towers');
                lines.push(`Buff Range: ${data.range.toFixed(1)}`);
                lines.push(`+${Math.round(data.aura_damage * 100)}% dmg or ${Math.round((1 - data.aura_attack_speed) * 100)}% faster`);
            } else if (data.is_economy) {
                lines.push(`${data.gold_per_tick}g every ${data.tick_interval}s`);
                lines.push(`(${(data.gold_per_tick * 60 / data.tick_interval).toFixed(0)}g/min)`);
            }
            if (data.description) lines.push(data.description);
        }

        // Check for placed tower on grid
        if (!title && onGrid) {
            const tower = towers.find(t => t.gridX === gridX && t.gridY === gridY);
            if (tower) {
                title = tower.name;
                lines.push(`Level ${tower.level}`);
                lines.push(`Kills: ${tower.totalKills || 0}`);
                if (tower.baseDamage > 0) {
                    lines.push(`Target: ${tower.targetMode}`);
                    const dps = tower.damage / tower.fireRate;
                    lines.push(`DPS: ${dps.toFixed(1)}`);
                } else if (tower.type === TowerType.GOLD_MINE) {
                    const gpm = tower.currentGoldPerTick * 60 / tower.currentTickInterval;
                    lines.push(`Income: ${gpm.toFixed(0)}g/min`);
                } else if (tower.type === TowerType.HARRY_DUCK) {
                    lines.push(`Duck HP: ${tower.duckHP}  Dmg: ${tower.duckDamage}`);
                } else if (tower.type === TowerType.AURA) {
                    lines.push(`Buff: ${tower.auraBuff}`);
                }
                if (tower.specialization) {
                    const spec = TOWER_DATA[tower.type].specializations[tower.specialization];
                    lines.push(`Spec: ${spec.name}`);
                }
            }
        }

        // Check for enemy under cursor (pixel-based hit test)
        if (!title) {
            for (const e of enemies) {
                if (!e.alive || e.reachedExit) continue;
                const ex = e.pixelX;
                const ey = e.pixelY;
                const halfSize = (e.size || 32) / 2;
                if (mouseX >= ex - halfSize && mouseX <= ex + halfSize &&
                    mouseY >= ey - halfSize && mouseY <= ey + halfSize) {
                    title = e.name;
                    lines.push(`HP: ${Math.ceil(e.hp)} / ${Math.ceil(e.maxHP)}`);
                    if (e.armor) {
                        const armorLabel = e.armor.charAt(0).toUpperCase() + e.armor.slice(1);
                        lines.push(`Armor: ${armorLabel}`);
                    }
                    lines.push(`Speed: ${e.baseSpeed.toFixed(1)}`);
                    if (e.isFlying) lines.push('Flying');
                    // Ability descriptions
                    if (e.ability === 'heal_aura') lines.push('Heals nearby allies');
                    if (e.ability === 'disable_tower') lines.push('Disables towers');
                    if (e.ability === 'debuff_immune') lines.push('Immune to slow');
                    if (e.ability === 'summon_on_death') lines.push(`Spawns ${e.summonCount} imps on death`);
                    if (e.ability === 'tower_stun') lines.push('Stuns nearby towers');
                    break;
                }
            }
        }

        // Check tile types
        if (!title && onGrid && tiles) {
            const tile = tiles[gridY]?.[gridX];
            if (tile === TileType.HIGH_GROUND) {
                title = 'High Ground';
                lines.push('Towers here get +1 range');
            } else if (tile === TileType.PATH || tile === TileType.SPAWN || tile === TileType.EXIT) {
                title = 'Enemy Path';
                lines.push('Cannot build here');
            } else if (tile === TileType.WATER || tile === TileType.TREE || tile === TileType.ROCK) {
                const names = { [TileType.WATER]: 'Water', [TileType.TREE]: 'Tree', [TileType.ROCK]: 'Rock' };
                title = names[tile] || 'Obstacle';
                lines.push('Cannot build here');
            } else if (tile === TileType.GRASS) {
                title = 'Grass';
                lines.push('Buildable — place towers here');
            } else if (tile === TileType.TOWER_BASE) {
                // Already occupied by a tower — tooltip was handled above
            }
        }

        if (!title) return;

        // ─── Render tooltip ───
        const maxW = 250;
        const pad = 8;
        const titleFont = F(14, 'bold');
        const bodyFont = F(13);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Measure title
        ctx.font = titleFont;
        const titleWidth = ctx.measureText(title).width;

        // Word-wrap body lines and measure
        ctx.font = bodyFont;
        const wrappedLines = [];
        for (const line of lines) {
            const words = line.split(' ');
            let cur = '';
            for (const word of words) {
                const test = cur ? cur + ' ' + word : word;
                if (ctx.measureText(test).width > maxW - pad * 2) {
                    if (cur) wrappedLines.push(cur);
                    cur = word;
                } else {
                    cur = test;
                }
            }
            if (cur) wrappedLines.push(cur);
        }

        // Calculate dimensions
        let bodyMaxW = 0;
        for (const l of wrappedLines) {
            bodyMaxW = Math.max(bodyMaxW, ctx.measureText(l).width);
        }
        const tooltipW = Math.min(maxW, Math.max(titleWidth, bodyMaxW) + pad * 2);
        const lineH = 16;
        const titleH = 18;
        const tooltipH = pad + titleH + wrappedLines.length * lineH + pad;

        // Position near mouse, clamped to screen edges
        let tx = mouseX + 15;
        let ty = mouseY + 15;
        if (tx + tooltipW > SCREEN_WIDTH - 4) tx = mouseX - tooltipW - 10;
        if (ty + tooltipH > SCREEN_HEIGHT - 4) ty = mouseY - tooltipH - 10;
        if (tx < 4) tx = 4;
        if (ty < 4) ty = 4;

        // Draw background
        roundRect(ctx, tx, ty, tooltipW, tooltipH, 4);
        ctx.fillStyle = 'rgba(20,20,40,0.92)';
        ctx.fill();
        ctx.strokeStyle = Colors.PANEL_BORDER;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw title
        ctx.font = titleFont;
        ctx.fillStyle = Colors.TEXT;
        ctx.fillText(title, tx + pad, ty + pad);

        // Draw body
        ctx.font = bodyFont;
        ctx.fillStyle = Colors.TEXT_DIM;
        let ly = ty + pad + titleH;
        for (const l of wrappedLines) {
            ctx.fillText(l, tx + pad, ly);
            ly += lineH;
        }

        ctx.restore();
    }

    getDamageTypeColor(type) {
        return { kinetic: Colors.KINETIC, explosive: Colors.EXPLOSIVE, energy: Colors.ENERGY,
                 frost: Colors.FROST, fire: Colors.FIRE }[type] || '#888';
    }
}
