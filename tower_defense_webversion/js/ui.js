// ui.js — HUD, shop panel, menus, and all UI drawing

import {
    SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE,
    GRID_WIDTH, GRID_HEIGHT, GRID_OFFSET_X, GRID_OFFSET_Y,
    PANEL_WIDTH, HUD_HEIGHT, BOTTOM_BAR_HEIGHT,
    TowerType, GameState, Colors, TowerColors, TOTAL_WAVES, SELL_REFUND_RATIO
} from './constants.js';
import { TOWER_DATA, TOWER_ORDER } from './towerData.js';
import { getTowerSprite } from './sprites.js';

const PANEL_X = SCREEN_WIDTH - PANEL_WIDTH;
const PANEL_Y = HUD_HEIGHT;
const PANEL_H = SCREEN_HEIGHT - HUD_HEIGHT - BOTTOM_BAR_HEIGHT;

const BUTTON_H = 46;
const BUTTON_SPACING = 50;
const BUTTON_MARGIN = 8;
const BUTTON_W = PANEL_WIDTH - BUTTON_MARGIN * 2;

export class UI {
    constructor() {
        this.hoveredTower = null;
        this.hoveredButton = null;
        this.scrollOffset = 0;
        this.buttons = [];
        this.buildButtons();
    }

    buildButtons() {
        this.shopButtons = TOWER_ORDER.map((type, i) => ({
            type,
            x: PANEL_X + BUTTON_MARGIN,
            y: PANEL_Y + 32 + i * BUTTON_SPACING,
            w: BUTTON_W,
            h: BUTTON_H,
        }));
    }

    getShopButtonAt(mx, my) {
        for (const btn of this.shopButtons) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                return btn;
            }
        }
        return null;
    }

    getBottomButtonAt(mx, my, gameState) {
        const btnY = SCREEN_HEIGHT - BOTTOM_BAR_HEIGHT + 3;
        const btnH = 34;

        // Start Wave button
        if (gameState === GameState.PREP) {
            if (mx >= 10 && mx <= 170 && my >= btnY && my <= btnY + btnH) {
                return 'start_wave';
            }
        }

        // Speed buttons
        if (mx >= 180 && mx <= 232 && my >= btnY && my <= btnY + btnH) return 'speed_2x';
        if (mx >= 240 && mx <= 292 && my >= btnY && my <= btnY + btnH) return 'speed_4x';

        // Pause
        const pauseX = PANEL_X - 52;
        if (mx >= pauseX && mx <= pauseX + 42 && my >= btnY && my <= btnY + btnH) return 'pause';

        return null;
    }

    getSelectedTowerButtonAt(mx, my, selectedTower) {
        if (!selectedTower) return null;
        const btnX = PANEL_X + 10;
        const baseY = PANEL_Y + 32;

        // When a tower is selected, the panel shows tower info
        // Upgrade button area
        const upgradeY = baseY + 220;
        if (mx >= btnX && mx <= btnX + BUTTON_W - 20 && my >= upgradeY && my <= upgradeY + 32) {
            return 'upgrade';
        }

        // Sell button
        const sellY = upgradeY + 40;
        if (mx >= btnX && mx <= btnX + BUTTON_W - 20 && my >= sellY && my <= sellY + 32) {
            return 'sell';
        }

        // Target mode
        const targetY = sellY + 40;
        if (mx >= btnX && mx <= btnX + BUTTON_W - 20 && my >= targetY && my <= targetY + 28) {
            return 'target_mode';
        }

        // Specialization buttons
        if (selectedTower.level >= 8 && !selectedTower.specialization) {
            const specAY = targetY + 40;
            if (mx >= btnX && mx <= btnX + BUTTON_W / 2 - 15 && my >= specAY && my <= specAY + 32) {
                return 'spec_A';
            }
            if (mx >= btnX + BUTTON_W / 2 - 5 && mx <= btnX + BUTTON_W - 20 && my >= specAY && my <= specAY + 32) {
                return 'spec_B';
            }
        }

        // Aura buff selection
        if (selectedTower.isSupport) {
            const auraY = targetY + 40;
            if (mx >= btnX && mx <= btnX + BUTTON_W / 2 - 15 && my >= auraY && my <= auraY + 28) {
                return 'aura_speed';
            }
            if (mx >= btnX + BUTTON_W / 2 - 5 && mx <= btnX + BUTTON_W - 20 && my >= auraY && my <= auraY + 28) {
                return 'aura_damage';
            }
        }

        return null;
    }

    getMenuButtonAt(mx, my, gameState) {
        const cx = SCREEN_WIDTH / 2;

        if (gameState === GameState.MAIN_MENU) {
            // Play
            if (mx >= cx - 100 && mx <= cx + 100 && my >= 350 && my <= 390) return 'play';
            return null;
        }

        if (gameState === GameState.MAP_SELECT) {
            // Map buttons (5 maps, stacked)
            for (let i = 0; i < 5; i++) {
                const by = 180 + i * 60;
                if (mx >= cx - 150 && mx <= cx + 150 && my >= by && my <= by + 50) {
                    return `map_${i}`;
                }
            }
            // Back
            if (mx >= cx - 80 && mx <= cx + 80 && my >= 500 && my <= 540) return 'back';
            return null;
        }

        if (gameState === GameState.PAUSED) {
            if (mx >= cx - 100 && mx <= cx + 100 && my >= 320 && my <= 360) return 'resume';
            if (mx >= cx - 100 && mx <= cx + 100 && my >= 380 && my <= 420) return 'main_menu';
            return null;
        }

        if (gameState === GameState.WON || gameState === GameState.LOST) {
            if (mx >= cx - 100 && mx <= cx + 100 && my >= 380 && my <= 420) return 'main_menu';
            return null;
        }

        return null;
    }

    drawHUD(ctx, gold, lives, wave, enemyCount) {
        // Top bar background
        ctx.fillStyle = Colors.PANEL;
        ctx.fillRect(0, 0, SCREEN_WIDTH, HUD_HEIGHT);
        ctx.fillStyle = Colors.PANEL_BORDER;
        ctx.fillRect(0, HUD_HEIGHT - 1, SCREEN_WIDTH, 1);

        const y = 32;
        ctx.font = 'bold 14px Arial';

        // Gold
        ctx.fillStyle = Colors.GOLD;
        ctx.fillText('$', 20, y);
        ctx.fillStyle = Colors.TEXT;
        ctx.font = '12px Arial';
        ctx.fillText('GOLD', 36, y - 8);
        ctx.font = 'bold 18px Arial';
        ctx.fillText(Math.floor(gold).toString(), 36, y + 8);

        // Lives
        ctx.fillStyle = lives > 10 ? Colors.HP_GREEN : lives > 5 ? Colors.HP_YELLOW : Colors.HP_RED;
        ctx.font = '14px Arial';
        ctx.fillText('\u2665', 160, y);
        ctx.fillStyle = Colors.TEXT;
        ctx.font = '12px Arial';
        ctx.fillText('LIVES', 178, y - 8);
        ctx.font = 'bold 18px Arial';
        ctx.fillText(lives.toString(), 178, y + 8);

        // Wave
        ctx.fillStyle = Colors.ACCENT;
        ctx.font = '14px Arial';
        ctx.fillText('\u2691', 290, y);
        ctx.fillStyle = Colors.TEXT;
        ctx.font = '12px Arial';
        ctx.fillText('WAVE', 308, y - 8);
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`${wave}/${TOTAL_WAVES}`, 308, y + 8);

        // Enemies
        ctx.fillStyle = Colors.DANGER;
        ctx.font = '14px Arial';
        ctx.fillText('\u2620', 420, y);
        ctx.fillStyle = Colors.TEXT;
        ctx.font = '12px Arial';
        ctx.fillText('ENEMIES', 438, y - 8);
        ctx.font = 'bold 18px Arial';
        ctx.fillText(enemyCount.toString(), 438, y + 8);
    }

    drawBottomBar(ctx, gameState, speedMult) {
        const barY = SCREEN_HEIGHT - BOTTOM_BAR_HEIGHT;
        ctx.fillStyle = Colors.PANEL;
        ctx.fillRect(0, barY, SCREEN_WIDTH, BOTTOM_BAR_HEIGHT);
        ctx.fillStyle = Colors.PANEL_BORDER;
        ctx.fillRect(0, barY, SCREEN_WIDTH, 1);

        const btnY = barY + 3;
        const btnH = 34;

        // Start Wave
        if (gameState === GameState.PREP) {
            this.drawButton(ctx, 10, btnY, 160, btnH, 'START WAVE', Colors.HP_GREEN, '#000');
        } else {
            this.drawButton(ctx, 10, btnY, 160, btnH, 'WAVE IN PROGRESS', '#555', Colors.TEXT_DIM);
        }

        // Speed buttons
        this.drawButton(ctx, 180, btnY, 52, btnH,
            '2x', speedMult === 2 ? Colors.ACCENT : '#444', speedMult === 2 ? '#000' : Colors.TEXT_DIM);
        this.drawButton(ctx, 240, btnY, 52, btnH,
            '4x', speedMult === 4 ? Colors.ACCENT : '#444', speedMult === 4 ? '#000' : Colors.TEXT_DIM);

        // Pause
        const pauseX = PANEL_X - 52;
        this.drawButton(ctx, pauseX, btnY, 42, btnH, '| |', '#444', Colors.TEXT);
    }

    drawShopPanel(ctx, gold, selectedTower, selectedType) {
        // Panel background
        ctx.fillStyle = Colors.PANEL;
        ctx.fillRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_H);
        ctx.fillStyle = Colors.PANEL_BORDER;
        ctx.fillRect(PANEL_X, PANEL_Y, 1, PANEL_H);

        if (selectedTower) {
            this.drawTowerInfo(ctx, selectedTower);
            return;
        }

        // Title
        ctx.fillStyle = Colors.TEXT;
        ctx.font = 'bold 16px Arial';
        ctx.fillText('TOWER SHOP', PANEL_X + 10, PANEL_Y + 22);

        // Tower buttons
        for (const btn of this.shopButtons) {
            const data = TOWER_DATA[btn.type];
            const canAfford = gold >= data.cost;
            const isSelected = selectedType === btn.type;

            // Button bg
            ctx.fillStyle = isSelected ? '#3a3a5a' : '#2a2a4a';
            ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            ctx.strokeStyle = isSelected ? Colors.ACCENT : Colors.PANEL_BORDER;
            ctx.lineWidth = 1;
            ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

            // Tower icon
            const sprite = getTowerSprite(btn.type, 1, 32);
            ctx.drawImage(sprite, btn.x + 4, btn.y + 7);

            // Name
            ctx.fillStyle = canAfford ? Colors.TEXT : Colors.TEXT_DARK;
            ctx.font = '14px Arial';
            ctx.fillText(data.name, btn.x + 40, btn.y + 18);

            // Cost
            ctx.fillStyle = canAfford ? Colors.GOLD : Colors.DANGER;
            ctx.font = '12px Arial';
            ctx.fillText(`$${data.cost}`, btn.x + 40, btn.y + 34);

            // Damage type indicator
            if (data.damage_type) {
                ctx.fillStyle = this.getDamageTypeColor(data.damage_type);
                ctx.fillRect(btn.x + btn.w - 30, btn.y + 8, 20, 4);
            }
        }
    }

    drawTowerInfo(ctx, tower) {
        const x = PANEL_X + 10;
        let y = PANEL_Y + 20;

        // Tower sprite large
        const sprite = getTowerSprite(tower.type, tower.level, 48);
        ctx.drawImage(sprite, PANEL_X + PANEL_WIDTH / 2 - 24, y);
        y += 58;

        // Name + level
        ctx.fillStyle = Colors.TEXT;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${tower.name} Lv.${tower.level}`, PANEL_X + PANEL_WIDTH / 2, y);
        ctx.textAlign = 'left';
        y += 8;

        if (tower.specialization) {
            const spec = TOWER_DATA[tower.type].specializations[tower.specialization];
            ctx.fillStyle = Colors.ACCENT;
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(spec.name, PANEL_X + PANEL_WIDTH / 2, y + 16);
            ctx.textAlign = 'left';
            y += 20;
        }
        y += 10;

        // Stats
        ctx.font = '13px Arial';
        const stats = [
            ['Damage', tower.damage.toFixed(1)],
            ['Range', tower.range.toFixed(1)],
            ['Fire Rate', tower.fireRate.toFixed(2) + 's'],
        ];
        if (tower.splashRadius > 0) stats.push(['Splash', tower.splashRadius.toFixed(1)]);
        if (tower.chainCount > 0) stats.push(['Chain', tower.chainCount.toString()]);
        if (tower.isSpawner) stats.push(['Spawn', tower.spawnInterval + 's']);
        if (tower.isEconomy) stats.push(['Income', `$${tower.goldPerTick}/${tower.tickInterval}s`]);

        for (const [label, val] of stats) {
            ctx.fillStyle = Colors.TEXT_DIM;
            ctx.fillText(label, x, y);
            ctx.fillStyle = Colors.TEXT;
            ctx.fillText(val, x + 120, y);
            y += 18;
        }
        y += 8;

        // Upgrade button
        const btnW = BUTTON_W - 20;
        if (tower.canUpgrade) {
            const cost = tower.upgradeCost;
            this.drawButton(ctx, x, y, btnW, 32, `UPGRADE ($${cost})`, '#2a5a2a', Colors.TEXT);
        } else {
            this.drawButton(ctx, x, y, btnW, 32, 'MAX LEVEL', '#333', Colors.TEXT_DIM);
        }
        y += 40;

        // Sell button
        const sellValue = Math.floor(tower.totalInvestment * SELL_REFUND_RATIO);
        this.drawButton(ctx, x, y, btnW, 32, `SELL ($${sellValue})`, '#5a2a2a', Colors.TEXT);
        y += 40;

        // Target mode
        ctx.fillStyle = Colors.TEXT_DIM;
        ctx.font = '12px Arial';
        ctx.fillText('Target:', x, y + 4);
        this.drawButton(ctx, x + 50, y - 8, btnW - 50, 28,
            tower.targetMode.toUpperCase(), '#2a2a4a', Colors.ACCENT);
        y += 40;

        // Specialization buttons (level 8, no spec yet)
        if (tower.level >= 8 && !tower.specialization) {
            const specA = TOWER_DATA[tower.type].specializations.A;
            const specB = TOWER_DATA[tower.type].specializations.B;
            const halfW = btnW / 2 - 5;
            this.drawButton(ctx, x, y, halfW, 32, specA.name, '#2a4a5a', Colors.TEXT);
            this.drawButton(ctx, x + halfW + 10, y, halfW, 32, specB.name, '#4a2a5a', Colors.TEXT);
            y += 40;
            // Description
            ctx.fillStyle = Colors.TEXT_DIM;
            ctx.font = '11px Arial';
            ctx.fillText(`A: ${specA.desc}`, x, y);
            y += 16;
            ctx.fillText(`B: ${specB.desc}`, x, y);
        }

        // Aura buff selection
        if (tower.isSupport) {
            const halfW = btnW / 2 - 5;
            const isSpeed = tower.auraBuff === 'attack_speed';
            this.drawButton(ctx, x, y, halfW, 28, 'ATK Speed',
                isSpeed ? Colors.ACCENT : '#2a2a4a', isSpeed ? '#000' : Colors.TEXT);
            this.drawButton(ctx, x + halfW + 10, y, halfW, 28, 'Damage',
                !isSpeed ? Colors.ACCENT : '#2a2a4a', !isSpeed ? '#000' : Colors.TEXT);
        }
    }

    drawMainMenu(ctx) {
        ctx.fillStyle = Colors.BG;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        const cx = SCREEN_WIDTH / 2;

        // Title
        ctx.fillStyle = Colors.ACCENT;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TOWER DEFENSE', cx, 200);

        ctx.fillStyle = Colors.TEXT_DIM;
        ctx.font = '18px Arial';
        ctx.fillText('A Strategic Defense Game', cx, 240);

        // Play button
        this.drawButton(ctx, cx - 100, 350, 200, 40, 'PLAY', Colors.ACCENT, '#000');

        ctx.textAlign = 'left';
    }

    drawMapSelect(ctx, maps) {
        ctx.fillStyle = Colors.BG;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        const cx = SCREEN_WIDTH / 2;

        ctx.fillStyle = Colors.TEXT;
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT MAP', cx, 140);

        for (let i = 0; i < maps.length; i++) {
            const by = 180 + i * 60;
            this.drawButton(ctx, cx - 150, by, 300, 50,
                `${maps[i].name}  (${maps[i].difficulty})`, '#2a2a4a', Colors.TEXT);
        }

        this.drawButton(ctx, cx - 80, 500, 160, 40, 'BACK', '#444', Colors.TEXT);
        ctx.textAlign = 'left';
    }

    drawPauseMenu(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        const cx = SCREEN_WIDTH / 2;
        ctx.fillStyle = Colors.TEXT;
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', cx, 270);

        this.drawButton(ctx, cx - 100, 320, 200, 40, 'RESUME', Colors.HP_GREEN, '#000');
        this.drawButton(ctx, cx - 100, 380, 200, 40, 'MAIN MENU', '#5a2a2a', Colors.TEXT);
        ctx.textAlign = 'left';
    }

    drawWinScreen(ctx, wave) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        const cx = SCREEN_WIDTH / 2;
        ctx.fillStyle = Colors.ACCENT;
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', cx, 280);

        ctx.fillStyle = Colors.TEXT;
        ctx.font = '20px Arial';
        ctx.fillText(`All ${TOTAL_WAVES} waves defeated!`, cx, 330);

        this.drawButton(ctx, cx - 100, 380, 200, 40, 'MAIN MENU', Colors.ACCENT, '#000');
        ctx.textAlign = 'left';
    }

    drawLoseScreen(ctx, wave) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        const cx = SCREEN_WIDTH / 2;
        ctx.fillStyle = Colors.DANGER;
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', cx, 280);

        ctx.fillStyle = Colors.TEXT;
        ctx.font = '20px Arial';
        ctx.fillText(`Survived to wave ${wave}`, cx, 330);

        this.drawButton(ctx, cx - 100, 380, 200, 40, 'MAIN MENU', '#5a2a2a', Colors.TEXT);
        ctx.textAlign = 'left';
    }

    drawButton(ctx, x, y, w, h, text, bgColor, textColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = textColor;
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, x + w / 2, y + h / 2 + 5);
        ctx.textAlign = 'left';
    }

    getDamageTypeColor(type) {
        const map = {
            kinetic: Colors.KINETIC,
            explosive: Colors.EXPLOSIVE,
            energy: Colors.ENERGY,
            frost: Colors.FROST,
            fire: Colors.FIRE,
        };
        return map[type] || '#888';
    }
}
