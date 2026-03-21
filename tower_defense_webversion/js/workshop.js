// workshop.js — Workshop (meta-progression) screen
import { SCREEN_WIDTH, SCREEN_HEIGHT, Colors, FONT } from './constants.js';
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

    draw(ctx, saveData) {
        this.buttons = [];
        ctx.save();

        // Background
        ctx.fillStyle = Colors.BG;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Title
        ctx.fillStyle = Colors.ACCENT;
        ctx.font = `bold 28px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('THE WORKSHOP', SCREEN_WIDTH / 2, 14);

        // Essence display
        ctx.fillStyle = '#9933ff';
        ctx.font = `bold 20px ${FONT}`;
        ctx.fillText(`Essence: ${saveData.essence}`, SCREEN_WIDTH / 2, 48);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // ── Left column: Global Upgrades + first 5 masteries ──
        const leftX = 30;
        const leftW = 400;
        let leftY = 80;

        ctx.fillStyle = Colors.ACCENT;
        ctx.font = `bold 13px ${FONT}`;
        ctx.fillText('GLOBAL UPGRADES', leftX, leftY);
        leftY += 18;

        for (const [key, upg] of Object.entries(WORKSHOP_UPGRADES)) {
            leftY = this._drawUpgradeBtn(ctx, leftX, leftY, leftW, 40, upg, saveData.upgrades[key] || 0, saveData.essence, 'upgrade', key);
        }

        // Tower unlocks on left column
        leftY += 10;
        ctx.fillStyle = Colors.ACCENT;
        ctx.font = `bold 13px ${FONT}`;
        ctx.fillText('TOWER UNLOCKS', leftX, leftY);
        leftY += 18;

        for (const [key, unlock] of Object.entries(TOWER_UNLOCKS)) {
            const unlocked = saveData.unlocks[key] || false;
            const affordable = !unlocked && saveData.essence >= unlock.cost;

            ctx.fillStyle = unlocked ? 'rgb(30,50,30)' : affordable ? Colors.BG_LIGHT : 'rgb(25,25,40)';
            roundRect(ctx, leftX, leftY, leftW, 36, 4);
            ctx.fill();

            ctx.fillStyle = Colors.TEXT; ctx.font = `15px ${FONT}`;
            ctx.fillText(unlock.name, leftX + 10, leftY + 4);
            ctx.fillStyle = Colors.TEXT_DIM; ctx.font = `12px ${FONT}`;
            ctx.fillText(unlock.desc, leftX + 10, leftY + 21);

            ctx.textAlign = 'right';
            ctx.fillStyle = unlocked ? (Colors.SUCCESS || '#44ff44') : affordable ? '#9933ff' : Colors.TEXT_DARK;
            ctx.font = `13px ${FONT}`;
            ctx.fillText(unlocked ? 'UNLOCKED' : `${unlock.cost}`, leftX + leftW - 8, leftY + 12);
            ctx.textAlign = 'left';

            this.buttons.push({ x: leftX, y: leftY, w: leftW, h: 36, category: 'unlock', key });
            leftY += 40;
        }

        // ── Right column: Tower Mastery (all 11) ──
        const rightX = 460;
        const rightW = 380;
        let rightY = 80;

        ctx.fillStyle = Colors.ACCENT;
        ctx.font = `bold 13px ${FONT}`;
        ctx.fillText('TOWER MASTERY', rightX, rightY);
        rightY += 18;

        const masteryEntries = Object.entries(TOWER_MASTERY);
        for (const [key, mast] of masteryEntries) {
            const level = saveData.mastery[key] || 0;
            const maxed = level >= mast.max;
            const cost = maxed ? null : mast.costs[level];
            const affordable = !maxed && saveData.essence >= cost;

            ctx.fillStyle = maxed ? 'rgb(30,50,30)' : affordable ? Colors.BG_LIGHT : 'rgb(25,25,40)';
            roundRect(ctx, rightX, rightY, rightW, 46, 4);
            ctx.fill();

            // Name
            ctx.fillStyle = Colors.TEXT; ctx.font = `14px ${FONT}`;
            ctx.fillText(mast.name, rightX + 8, rightY + 3);

            // Description (single line, truncated)
            ctx.fillStyle = Colors.TEXT_DIM; ctx.font = `11px ${FONT}`;
            let desc = mast.desc;
            if (ctx.measureText(desc).width > rightW - 110) {
                while (ctx.measureText(desc + '..').width > rightW - 110 && desc.length > 10) desc = desc.slice(0, -1);
                desc += '..';
            }
            ctx.fillText(desc, rightX + 8, rightY + 20);

            // Level indicator
            ctx.fillStyle = Colors.TEXT_DARK; ctx.font = `11px ${FONT}`;
            ctx.fillText(`Lv ${level}/${mast.max}`, rightX + 8, rightY + 34);

            // Pips
            this._drawPips(ctx, rightX + rightW - 100, rightY + 6, level, mast.max);

            // Cost
            ctx.textAlign = 'right';
            if (maxed) {
                ctx.fillStyle = Colors.SUCCESS || '#44ff44';
                ctx.font = `13px ${FONT}`;
                ctx.fillText('MAX', rightX + rightW - 8, rightY + 6);
            } else {
                ctx.fillStyle = affordable ? '#9933ff' : Colors.TEXT_DARK;
                ctx.font = `13px ${FONT}`;
                ctx.fillText(`${cost}`, rightX + rightW - 8, rightY + 6);
            }
            ctx.textAlign = 'left';

            this.buttons.push({ x: rightX, y: rightY, w: rightW, h: 46, category: 'mastery', key });
            rightY += 50;
        }

        // ── Back button — dynamically positioned below all content ──
        const backW = 200;
        const backH = 44;
        const contentBottom = Math.max(leftY, rightY);
        const backY = Math.min(contentBottom + 12, SCREEN_HEIGHT - 54);
        const backX = (SCREEN_WIDTH - backW) / 2;

        ctx.fillStyle = Colors.ACCENT;
        roundRect(ctx, backX, backY, backW, backH, 6);
        ctx.fill();

        ctx.fillStyle = Colors.BLACK;
        ctx.font = `bold 20px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BACK', backX + backW / 2, backY + backH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        this.buttons.push({ x: backX, y: backY, w: backW, h: backH, category: 'back', key: null });

        ctx.restore();
    }

    _drawUpgradeBtn(ctx, x, y, w, h, upg, level, essence, category, key) {
        const maxed = level >= upg.max;
        const cost = maxed ? null : upg.costs[level];
        const affordable = !maxed && essence >= cost;

        ctx.fillStyle = maxed ? 'rgb(30,50,30)' : affordable ? Colors.BG_LIGHT : 'rgb(25,25,40)';
        roundRect(ctx, x, y, w, h, 4);
        ctx.fill();

        ctx.fillStyle = Colors.TEXT; ctx.font = `15px ${FONT}`;
        ctx.fillText(upg.name, x + 10, y + 4);
        ctx.fillStyle = Colors.TEXT_DIM; ctx.font = `11px ${FONT}`;
        // Truncate long descriptions
        let desc = upg.desc;
        if (ctx.measureText(desc).width > w - 120) {
            while (ctx.measureText(desc + '..').width > w - 120 && desc.length > 10) desc = desc.slice(0, -1);
            desc += '..';
        }
        ctx.fillText(desc, x + 10, y + 22);

        this._drawPips(ctx, x + w - 100, y + 8, level, upg.max);

        ctx.textAlign = 'right';
        if (maxed) {
            ctx.fillStyle = Colors.SUCCESS || '#44ff44';
            ctx.font = `13px ${FONT}`;
            ctx.fillText('MAX', x + w - 8, y + 10);
        } else {
            ctx.fillStyle = affordable ? '#9933ff' : Colors.TEXT_DARK;
            ctx.font = `13px ${FONT}`;
            ctx.fillText(`${cost}`, x + w - 8, y + 10);
        }
        ctx.textAlign = 'left';

        this.buttons.push({ x, y, w, h, category, key });
        return y + h + 4;
    }

    handleClick(mx, my, saveData) {
        for (const btn of this.buttons) {
            if (mx < btn.x || mx > btn.x + btn.w || my < btn.y || my > btn.y + btn.h) continue;

            if (btn.category === 'back') return 'back';

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
                if (!(saveData.unlocks[btn.key]) && saveData.essence >= unlock.cost) {
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

    _drawPips(ctx, x, y, level, max) {
        const pipSize = 6;
        const pipGap = 3;
        for (let i = 0; i < max; i++) {
            const px = x + i * (pipSize + pipGap);
            if (i < level) {
                ctx.fillStyle = Colors.SUCCESS || '#44ff44';
                ctx.fillRect(px, y, pipSize, pipSize);
            } else {
                ctx.strokeStyle = Colors.TEXT_DIM;
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 0.5, y + 0.5, pipSize - 1, pipSize - 1);
            }
        }
    }
}
