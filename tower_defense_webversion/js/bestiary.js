// bestiary.js — Enemy Encyclopedia / Bestiary screen

import { SCREEN_WIDTH, SCREEN_HEIGHT, Colors, EnemyType, ArmorType, EnemyColors, FONT } from './constants.js';
import { ENEMY_DATA } from './enemyData.js';

// Flavor text and tactical info for each enemy type
const BESTIARY_INFO = {
    [EnemyType.GRUNT]: {
        flavor: "The backbone of every horde. Simple but relentless.",
        weakTo: "Everything \u2014 no armor",
        strongVs: "Nothing",
    },
    [EnemyType.RUNNER]: {
        flavor: "Blinding speed makes up for fragile bodies.",
        weakTo: "Fast-firing towers (Arrow, Sky-Hunter)",
        strongVs: "Slow towers can't track them",
    },
    [EnemyType.TANK]: {
        flavor: "Heavily plated. Shrugs off physical attacks.",
        weakTo: "Energy, Fire (1.5x damage)",
        strongVs: "Kinetic, Explosive (0.5x damage)",
    },
    [EnemyType.GHOST]: {
        flavor: "Ethereal beings that phase through debuffs.",
        weakTo: "Kinetic, Explosive (1.5x damage)",
        strongVs: "Energy, Frost, Fire (0.5x). Immune to slow & armor break",
    },
    [EnemyType.HEALER]: {
        flavor: "Mends wounded allies within range every 3 seconds.",
        weakTo: "Kill them first! High priority target.",
        strongVs: "Healing can undo your damage if ignored",
    },
    [EnemyType.WASP]: {
        flavor: "Flying enemies that ignore ground paths entirely.",
        weakTo: "Sky-Hunter, Arrow, Mage (can hit air)",
        strongVs: "Cannon, Flame (can't hit air)",
    },
    [EnemyType.DISRUPTOR]: {
        flavor: "Emits pulses that disable nearby towers.",
        weakTo: "Long-range towers outside disable radius",
        strongVs: "Short-range towers get shut down",
    },
    [EnemyType.SUMMONER]: {
        flavor: "Spawns 3 Imps on death. The gift that keeps giving.",
        weakTo: "AoE towers to handle the imp swarm",
        strongVs: "Single-target towers waste time on imps",
    },
    [EnemyType.IMP]: {
        flavor: "Tiny, fast, and worthless. Spawned by Summoners.",
        weakTo: "Any AoE or fast-firing tower",
        strongVs: "Nothing \u2014 just annoying in numbers",
    },
    [EnemyType.BOSS]: {
        flavor: "Stuns all towers in range every 8 seconds. Costs 5 lives.",
        weakTo: "Kinetic, Explosive (1.5x). Sniper is ideal.",
        strongVs: "Energy, Frost, Fire (0.5x). Stuns your defenses",
    },
};

// Display order for enemy entries
const ENEMY_ORDER = [
    EnemyType.GRUNT,
    EnemyType.RUNNER,
    EnemyType.TANK,
    EnemyType.GHOST,
    EnemyType.HEALER,
    EnemyType.WASP,
    EnemyType.DISRUPTOR,
    EnemyType.SUMMONER,
    EnemyType.IMP,
    EnemyType.BOSS,
];

export class Bestiary {
    constructor() {
        this.buttons = [];
    }

    draw(ctx, saveData) {
        ctx.save(); // Protect canvas state

        // Clear background
        ctx.fillStyle = Colors.BG;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Count discovered enemies
        const discovered = saveData.stats?.discovered || {};
        const discoveredCount = ENEMY_ORDER.filter(type => discovered[type]).length;

        // Title
        ctx.fillStyle = Colors.ACCENT;
        ctx.font = `bold 28px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('BESTIARY', SCREEN_WIDTH / 2, 18);

        // Subtitle
        ctx.fillStyle = Colors.TEXT_DIM;
        ctx.font = `14px ${FONT}`;
        ctx.fillText(`${discoveredCount} / ${ENEMY_ORDER.length} Discovered`, SCREEN_WIDTH / 2, 52);

        // Enemy entries — 2 columns, 5 rows
        const colW = (SCREEN_WIDTH - 50) / 2;
        const cardHeight = 120;
        const cardGap = 6;
        const startY = 74;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        for (let i = 0; i < ENEMY_ORDER.length; i++) {
            const type = ENEMY_ORDER[i];
            const data = ENEMY_DATA[type];
            const info = BESTIARY_INFO[type];
            const isDiscovered = !!discovered[type];
            const col = i < 5 ? 0 : 1;
            const row = i < 5 ? i : i - 5;
            const cardX = 20 + col * (colW + 10);
            const cardY = startY + row * (cardHeight + cardGap);

            // Card background
            if (isDiscovered) {
                ctx.fillStyle = Colors.BG_LIGHT;
            } else {
                ctx.fillStyle = '#1f1f30';
            }
            ctx.beginPath();
            this._roundRect(ctx, cardX, cardY, colW, cardHeight, 6);
            ctx.fill();

            // Card border
            ctx.strokeStyle = isDiscovered ? Colors.PANEL_BORDER : '#2a2a40';
            ctx.lineWidth = 1;
            ctx.beginPath();
            this._roundRect(ctx, cardX, cardY, colW, cardHeight, 6);
            ctx.stroke();

            if (isDiscovered) {
                this._drawDiscoveredCard(ctx, cardX, cardY, colW, cardHeight, type, data, info);
            } else {
                this._drawLockedCard(ctx, cardX, cardY, colW, cardHeight);
            }
        }

        // Back button
        const btnW = 200;
        const btnH = 44;
        const btnX = (SCREEN_WIDTH - btnW) / 2;
        const btnY = SCREEN_HEIGHT - 60;

        ctx.fillStyle = Colors.ACCENT;
        ctx.beginPath();
        this._roundRect(ctx, btnX, btnY, btnW, btnH, 8);
        ctx.fill();

        ctx.fillStyle = Colors.BG;
        ctx.font = `bold 18px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BACK', btnX + btnW / 2, btnY + btnH / 2);

        // Store button for click detection
        this.buttons = [{ id: 'back', x: btnX, y: btnY, w: btnW, h: btnH }];

        ctx.restore(); // Restore canvas state
    }

    _drawDiscoveredCard(ctx, cardX, cardY, cardWidth, cardHeight, type, data, info) {
        const circleR = 18;
        const circleX = cardX + 26;
        const circleY = cardY + 30;
        const enemyColor = EnemyColors[type] || Colors.TEXT_DIM;

        // Colored circle with first letter
        ctx.fillStyle = enemyColor;
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
        ctx.stroke();

        // Letter inside circle
        ctx.fillStyle = '#000';
        ctx.font = `bold 18px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(data.name.charAt(0).toUpperCase(), circleX, circleY);

        // Text area
        const textX = circleX + circleR + 14;
        const maxW = cardWidth - (textX - cardX) - 10;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Row 1: Name + ability badges
        ctx.fillStyle = '#fff';
        ctx.font = `bold 15px ${FONT}`;
        ctx.fillText(data.name, textX, cardY + 8);

        const badges = [];
        if (data.is_flying) badges.push('Flying');
        if (data.ability) {
            const labels = { debuff_immune: 'Immune', heal_aura: 'Healer', disable_tower: 'Disabler', summon_on_death: 'Summoner', tower_stun: 'Stunner' };
            if (labels[data.ability]) badges.push(labels[data.ability]);
        }
        if (badges.length > 0) {
            const nameW = ctx.measureText(data.name).width;
            ctx.fillStyle = enemyColor;
            ctx.font = `bold 11px ${FONT}`;
            ctx.fillText(badges.join(' | '), textX + nameW + 8, cardY + 11);
        }

        // Row 2: Stats
        ctx.fillStyle = Colors.TEXT_DIM;
        ctx.font = `13px ${FONT}`;
        const armor = this._formatArmor(data.armor);
        ctx.fillText(`HP: ${data.hp}   Speed: ${data.speed}   Armor: ${armor}   Reward: ${data.reward}g`, textX, cardY + 28);

        // Row 3: Flavor text
        ctx.fillStyle = '#aaaacc';
        ctx.font = `italic 12px ${FONT}`;
        let flavor = info.flavor;
        // Truncate if too long for card width
        while (ctx.measureText(flavor).width > maxW && flavor.length > 20) {
            flavor = flavor.slice(0, -1);
        }
        if (flavor !== info.flavor) flavor += '...';
        ctx.fillText(flavor, textX, cardY + 48);

        // Row 4: Weak to (green)
        ctx.fillStyle = '#66dd66';
        ctx.font = `12px ${FONT}`;
        let weakText = `Weak: ${info.weakTo}`;
        while (ctx.measureText(weakText).width > maxW && weakText.length > 15) {
            weakText = weakText.slice(0, -1);
        }
        if (weakText.length < `Weak: ${info.weakTo}`.length) weakText += '..';
        ctx.fillText(weakText, textX, cardY + 66);

        // Row 5: Strong vs (red)
        ctx.fillStyle = '#dd6666';
        ctx.font = `12px ${FONT}`;
        let strongText = `Strong: ${info.strongVs}`;
        while (ctx.measureText(strongText).width > maxW && strongText.length > 15) {
            strongText = strongText.slice(0, -1);
        }
        if (strongText.length < `Strong: ${info.strongVs}`.length) strongText += '..';
        ctx.fillText(strongText, textX, cardY + 82);

        // Lives cost indicator (bottom-left of circle area)
        if (data.lives_cost > 1) {
            ctx.fillStyle = Colors.DANGER;
            ctx.font = `bold 11px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.fillText(`${data.lives_cost} lives`, circleX, cardY + 56);
            ctx.textAlign = 'left';
        }
    }

    _drawLockedCard(ctx, cardX, cardY, cardWidth, cardHeight) {
        // "???" centered
        ctx.fillStyle = '#555566';
        ctx.font = `bold 22px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('???', cardX + cardWidth / 2, cardY + cardHeight / 2 - 8);

        // Hint text
        ctx.fillStyle = '#444455';
        ctx.font = `12px ${FONT}`;
        ctx.fillText('Reach further waves to discover', cardX + cardWidth / 2, cardY + cardHeight / 2 + 12);

        // Reset alignment
        ctx.textAlign = 'left';
    }

    _formatArmor(armorType) {
        const labels = {
            [ArmorType.UNARMORED]: 'None',
            [ArmorType.PLATED]: 'Plated',
            [ArmorType.ETHEREAL]: 'Ethereal',
            [ArmorType.RESISTANT]: 'Resistant',
        };
        return labels[armorType] || armorType;
    }

    _roundRect(ctx, x, y, w, h, r) {
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

    handleClick(mx, my) {
        for (const btn of this.buttons) {
            if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                if (btn.id === 'back') return 'back';
            }
        }
        return null;
    }
}
