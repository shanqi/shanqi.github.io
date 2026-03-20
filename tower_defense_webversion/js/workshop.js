// workshop.js — Workshop (meta-progression) screen
import { SCREEN_WIDTH, SCREEN_HEIGHT, Colors } from './constants.js';
import { WORKSHOP_UPGRADES, TOWER_UNLOCKS, TOWER_MASTERY, saveSaveData } from './saveData.js';

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

export class Workshop {
    constructor() {
        this.buttons = [];
    }

    /**
     * Draw the full workshop screen.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} saveData
     */
    draw(ctx, saveData) {
        this.buttons = [];

        // Background
        ctx.fillStyle = Colors.BG;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Title
        ctx.fillStyle = Colors.ACCENT;
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('THE WORKSHOP', SCREEN_WIDTH / 2, 18);

        // Essence display
        ctx.fillStyle = '#9933ff';
        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillText(`Essence: ${saveData.essence}`, SCREEN_WIDTH / 2, 54);

        // Reset text alignment for buttons
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // ── Left column: Global Upgrades ──
        const leftX = 50;
        const leftW = 420;
        let leftY = 95;

        ctx.fillStyle = Colors.TEXT_DIM;
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText('GLOBAL UPGRADES', leftX, leftY);
        leftY += 22;

        for (const [key, upg] of Object.entries(WORKSHOP_UPGRADES)) {
            const level = saveData.upgrades[key] || 0;
            const maxed = level >= upg.max;
            const cost = maxed ? null : upg.costs[level];
            const affordable = !maxed && saveData.essence >= cost;

            // Button background
            if (maxed) {
                ctx.fillStyle = 'rgb(30, 50, 30)';
            } else if (affordable) {
                ctx.fillStyle = Colors.BG_LIGHT;
            } else {
                ctx.fillStyle = 'rgb(25, 25, 40)';
            }
            roundRect(ctx, leftX, leftY, leftW, 42, 4);
            ctx.fill();

            // Name
            ctx.fillStyle = Colors.TEXT;
            ctx.font = '17px Arial, sans-serif';
            ctx.fillText(upg.name, leftX + 10, leftY + 5);

            // Description
            ctx.fillStyle = Colors.TEXT_DIM;
            ctx.font = '14px Arial, sans-serif';
            ctx.fillText(upg.desc, leftX + 10, leftY + 24);

            // Level pips on the right
            this._drawPips(ctx, leftX + leftW - 110, leftY + 10, level, upg.max);

            // Cost or MAX
            ctx.textAlign = 'right';
            if (maxed) {
                ctx.fillStyle = Colors.SUCCESS;
                ctx.font = '14px Arial, sans-serif';
                ctx.fillText('MAX', leftX + leftW - 10, leftY + 14);
            } else {
                ctx.fillStyle = affordable ? '#9933ff' : Colors.TEXT_DARK;
                ctx.font = '14px Arial, sans-serif';
                ctx.fillText(`${cost}`, leftX + leftW - 10, leftY + 14);
            }
            ctx.textAlign = 'left';

            // Store button
            this.buttons.push({ x: leftX, y: leftY, w: leftW, h: 42, category: 'upgrade', key });
            leftY += 45;
        }

        // ── Right column: Tower Unlocks ──
        const rightX = 500;
        const rightW = 370;
        let rightY = 95;

        ctx.fillStyle = Colors.TEXT_DIM;
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText('TOWER UNLOCKS', rightX, rightY);
        rightY += 22;

        for (const [key, unlock] of Object.entries(TOWER_UNLOCKS)) {
            const unlocked = saveData.unlocks[key] || false;
            const affordable = !unlocked && saveData.essence >= unlock.cost;

            // Button background
            if (unlocked) {
                ctx.fillStyle = 'rgb(30, 50, 30)';
            } else if (affordable) {
                ctx.fillStyle = Colors.BG_LIGHT;
            } else {
                ctx.fillStyle = 'rgb(25, 25, 40)';
            }
            roundRect(ctx, rightX, rightY, rightW, 42, 4);
            ctx.fill();

            // Name
            ctx.fillStyle = Colors.TEXT;
            ctx.font = '17px Arial, sans-serif';
            ctx.fillText(unlock.name, rightX + 10, rightY + 5);

            // Description
            ctx.fillStyle = Colors.TEXT_DIM;
            ctx.font = '14px Arial, sans-serif';
            ctx.fillText(unlock.desc, rightX + 10, rightY + 24);

            // Status
            ctx.textAlign = 'right';
            if (unlocked) {
                ctx.fillStyle = Colors.SUCCESS;
                ctx.font = '14px Arial, sans-serif';
                ctx.fillText('UNLOCKED', rightX + rightW - 10, rightY + 14);
            } else {
                ctx.fillStyle = affordable ? '#9933ff' : Colors.TEXT_DARK;
                ctx.font = '14px Arial, sans-serif';
                ctx.fillText(`${unlock.cost}`, rightX + rightW - 10, rightY + 14);
            }
            ctx.textAlign = 'left';

            // Store button
            this.buttons.push({ x: rightX, y: rightY, w: rightW, h: 42, category: 'unlock', key });
            rightY += 45;
        }

        // ── Right column: Tower Mastery ──
        rightY += 8;

        ctx.fillStyle = Colors.TEXT_DIM;
        ctx.font = '14px Arial, sans-serif';
        ctx.fillText('TOWER MASTERY', rightX, rightY);
        rightY += 22;

        for (const [key, mast] of Object.entries(TOWER_MASTERY)) {
            const level = saveData.mastery[key] || 0;
            const maxed = level >= mast.max;
            const cost = maxed ? null : mast.costs[level];
            const affordable = !maxed && saveData.essence >= cost;

            // Button background
            if (maxed) {
                ctx.fillStyle = 'rgb(30, 50, 30)';
            } else if (affordable) {
                ctx.fillStyle = Colors.BG_LIGHT;
            } else {
                ctx.fillStyle = 'rgb(25, 25, 40)';
            }
            roundRect(ctx, rightX, rightY, rightW, 38, 4);
            ctx.fill();

            // Name
            ctx.fillStyle = Colors.TEXT;
            ctx.font = '17px Arial, sans-serif';
            ctx.fillText(mast.name, rightX + 10, rightY + 5);

            // Pips at x + 170
            this._drawPips(ctx, rightX + 170, rightY + 10, level, mast.max);

            // Cost or MAX
            ctx.textAlign = 'right';
            if (maxed) {
                ctx.fillStyle = Colors.SUCCESS;
                ctx.font = '14px Arial, sans-serif';
                ctx.fillText('MAX', rightX + rightW - 10, rightY + 12);
            } else {
                ctx.fillStyle = affordable ? '#9933ff' : Colors.TEXT_DARK;
                ctx.font = '14px Arial, sans-serif';
                ctx.fillText(`${cost}`, rightX + rightW - 10, rightY + 12);
            }
            ctx.textAlign = 'left';

            // Store button
            this.buttons.push({ x: rightX, y: rightY, w: rightW, h: 38, category: 'mastery', key });
            rightY += 40;
        }

        // ── Back button ──
        const backW = 200;
        const backH = 44;
        const backX = (SCREEN_WIDTH - backW) / 2;
        const backY = SCREEN_HEIGHT - 60;

        ctx.fillStyle = Colors.ACCENT;
        roundRect(ctx, backX, backY, backW, backH, 6);
        ctx.fill();

        ctx.fillStyle = Colors.BLACK;
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BACK', backX + backW / 2, backY + backH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        this.buttons.push({ x: backX, y: backY, w: backW, h: backH, category: 'back', key: null });
    }

    /**
     * Handle a click on the workshop screen.
     * @param {number} mx
     * @param {number} my
     * @param {object} saveData
     * @returns {string|null} 'back', 'purchased', or null
     */
    handleClick(mx, my, saveData) {
        for (const btn of this.buttons) {
            if (mx < btn.x || mx > btn.x + btn.w || my < btn.y || my > btn.y + btn.h) {
                continue;
            }

            if (btn.category === 'back') {
                return 'back';
            }

            if (btn.category === 'upgrade') {
                const upg = WORKSHOP_UPGRADES[btn.key];
                const level = saveData.upgrades[btn.key] || 0;
                if (level < upg.max && saveData.essence >= upg.costs[level]) {
                    saveData.essence -= upg.costs[level];
                    saveData.upgrades[btn.key] = level + 1;
                    saveSaveData(saveData);
                    return 'purchased';
                }
            }

            if (btn.category === 'unlock') {
                const unlock = TOWER_UNLOCKS[btn.key];
                const already = saveData.unlocks[btn.key] || false;
                if (!already && saveData.essence >= unlock.cost) {
                    saveData.essence -= unlock.cost;
                    saveData.unlocks[btn.key] = true;
                    saveSaveData(saveData);
                    return 'purchased';
                }
            }

            if (btn.category === 'mastery') {
                const mast = TOWER_MASTERY[btn.key];
                const level = saveData.mastery[btn.key] || 0;
                if (level < mast.max && saveData.essence >= mast.costs[level]) {
                    saveData.essence -= mast.costs[level];
                    saveData.mastery[btn.key] = level + 1;
                    saveSaveData(saveData);
                    return 'purchased';
                }
            }
        }

        return null;
    }

    /**
     * Draw small square pips showing level progress.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x - Starting x position
     * @param {number} y - Starting y position
     * @param {number} level - Current level
     * @param {number} max - Maximum level
     */
    _drawPips(ctx, x, y, level, max) {
        const pipSize = 6;
        const pipGap = 4;
        for (let i = 0; i < max; i++) {
            const px = x + i * (pipSize + pipGap);
            if (i < level) {
                // Filled pip
                ctx.fillStyle = Colors.SUCCESS;
                ctx.fillRect(px, y, pipSize, pipSize);
            } else {
                // Empty pip (border only)
                ctx.strokeStyle = Colors.TEXT_DIM;
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 0.5, y + 0.5, pipSize - 1, pipSize - 1);
            }
        }
    }
}
