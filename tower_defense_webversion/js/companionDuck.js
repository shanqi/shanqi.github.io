// companionDuck.js — Harry the Duck, your friendly map inspector

import { TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y, GRID_WIDTH, GRID_HEIGHT, FONT } from './constants.js';

const SPEECH_BUBBLES = {
    arrow:      ["Nice aim!", "Pew pew!", "Sharp!"],
    cannon:     ["BOOM!", "Big gun!", "Kaboom!"],
    mage:       ["Magical!", "Sparkly!", "Arcane!"],
    ice:        ["Brrr!", "Chilly!", "Cool!"],
    sky_hunter: ["Eyes up!", "Air patrol!", "Hawk eye!"],
    flame:      ["Toasty!", "Hot stuff!", "Sizzle!"],
    tesla:      ["Zappy!", "Bzzt!", "Shocking!"],
    sniper:     ["Headshot!", "Steady...", "Long range!"],
    harry_duck: ["My ducks!", "Quack HQ!", "Family!"],
    aura:       ["Glow up!", "Team buff!", "Radiant!"],
    gold_mine:  ["Ka-ching!", "Rich!", "Shiny!"],
    doom_spire: ["Whoa...", "Scary!", "Big power!"],
    _place:     ["Ooh, new!", "Nice pick!", "Good spot!"],
    _upgrade:   ["Leveled up!", "Stronger!", "Growing!"],
    _victory:   ["We won!", "Hooray!", "Dance time!"],
    _idle:      ["Hmm...", "La la la~", "*waddle*", "Quack!", "..."],
};

export class CompanionDuck {
    constructor() {
        // Position in tile coordinates (float)
        this.x = 2;
        this.y = 10;
        this.targetX = this.x;
        this.targetY = this.y;
        this.speed = 2.5; // tiles per second
        this.facingRight = true;

        // State
        this.state = 'idle'; // idle, walking, inspecting, hiding, celebrating
        this.stateTimer = 0;
        this.inspectTimer = 0;
        this.idleTimer = 2;

        // Speech
        this.speechText = '';
        this.speechTimer = 0;
        this.speechX = 0;
        this.speechY = 0;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.bobOffset = 0;

        // Tracking
        this.visitedTower = null;
        this.dancePose = 0;
        this.danceTimer = 0;
    }

    update(dt, towers, gameState, wave) {
        // Animation
        this.animTimer += dt;
        if (this.animTimer >= 0.15) {
            this.animTimer -= 0.15;
            this.animFrame = (this.animFrame + 1) % 4;
        }
        this.bobOffset = Math.sin(this.animTimer * 8) * 0.5;

        // Speech timer
        if (this.speechTimer > 0) {
            this.speechTimer -= dt;
        }

        if (gameState === 'WON') {
            this._celebrate(dt);
            return;
        }

        if (gameState === 'COMBAT') {
            this._hide(dt, towers);
            return;
        }

        // PREP phase — wander and inspect
        if (this.state === 'idle') {
            this.idleTimer -= dt;
            if (this.idleTimer <= 0) {
                if (towers.length > 0) {
                    // Pick a random tower to visit
                    const candidates = towers.filter(t => t !== this.visitedTower);
                    const target = candidates.length > 0
                        ? candidates[Math.floor(Math.random() * candidates.length)]
                        : towers[Math.floor(Math.random() * towers.length)];
                    this.visitedTower = target;
                    // Pick adjacent tile to stand on
                    const offsets = [[1,0],[-1,0],[0,1],[0,-1]];
                    const off = offsets[Math.floor(Math.random() * offsets.length)];
                    this.targetX = Math.max(0, Math.min(GRID_WIDTH - 1, target.gridX + off[0]));
                    this.targetY = Math.max(0, Math.min(GRID_HEIGHT - 1, target.gridY + off[1]));
                    this.state = 'walking';
                } else {
                    // No towers — idle wander
                    this.targetX = 2 + Math.floor(Math.random() * (GRID_WIDTH - 4));
                    this.targetY = 2 + Math.floor(Math.random() * (GRID_HEIGHT - 4));
                    this.state = 'walking';
                    this.idleTimer = 3 + Math.random() * 2;
                }
            }
            // Occasional idle speech
            if (this.speechTimer <= 0 && Math.random() < 0.003) {
                this._say(SPEECH_BUBBLES._idle);
            }
        }

        if (this.state === 'walking') {
            this._moveToward(dt);
            const dist = Math.sqrt((this.x - this.targetX) ** 2 + (this.y - this.targetY) ** 2);
            if (dist < 0.2) {
                this.x = this.targetX;
                this.y = this.targetY;
                if (this.visitedTower) {
                    this.state = 'inspecting';
                    this.inspectTimer = 1.5 + Math.random();
                } else {
                    this.state = 'idle';
                    this.idleTimer = 2 + Math.random() * 3;
                }
            }
        }

        if (this.state === 'inspecting') {
            this.inspectTimer -= dt;
            // Face the tower
            if (this.visitedTower) {
                this.facingRight = this.visitedTower.gridX >= this.x;
            }
            if (this.inspectTimer <= 0) {
                // Comment on the tower
                if (this.visitedTower && this.speechTimer <= 0) {
                    const type = this.visitedTower.type;
                    const bubbles = SPEECH_BUBBLES[type] || SPEECH_BUBBLES._idle;
                    this._say(bubbles);
                }
                this.state = 'idle';
                this.idleTimer = 1.5 + Math.random() * 2;
            }
        }
    }

    // Called when a new tower is placed
    onTowerPlaced(tower) {
        this.visitedTower = tower;
        const off = this.x < tower.gridX ? [-1, 0] : [1, 0];
        this.targetX = Math.max(0, Math.min(GRID_WIDTH - 1, tower.gridX + off[0]));
        this.targetY = Math.max(0, Math.min(GRID_HEIGHT - 1, tower.gridY + off[1]));
        this.state = 'walking';
        this._say(SPEECH_BUBBLES._place);
    }

    // Called when a tower is upgraded
    onTowerUpgraded(tower) {
        if (this.speechTimer <= 0) {
            this._say(SPEECH_BUBBLES._upgrade);
        }
    }

    _hide(dt, towers) {
        // During combat, hide behind the strongest tower
        if (this.state !== 'hiding') {
            this.state = 'hiding';
            if (towers.length > 0) {
                const best = towers.reduce((a, b) => (a.baseDamage || 0) > (b.baseDamage || 0) ? a : b);
                this.targetX = Math.max(0, best.gridX - 1);
                this.targetY = best.gridY;
            }
        }
        this._moveToward(dt);
    }

    _celebrate(dt) {
        if (this.state !== 'celebrating') {
            this.state = 'celebrating';
            this._say(SPEECH_BUBBLES._victory);
        }
        this.danceTimer += dt;
        if (this.danceTimer >= 0.4) {
            this.danceTimer -= 0.4;
            this.dancePose = (this.dancePose + 1) % 4;
            this.facingRight = this.dancePose % 2 === 0;
        }
    }

    _moveToward(dt) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.05) return;
        const step = Math.min(this.speed * dt, dist);
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        this.facingRight = dx > 0;
    }

    _say(options) {
        const text = Array.isArray(options) ? options[Math.floor(Math.random() * options.length)] : options;
        this.speechText = text;
        this.speechTimer = 2.5;
        this.speechX = this.pixelX;
        this.speechY = this.pixelY - 28;
    }

    get pixelX() {
        return GRID_OFFSET_X + this.x * TILE_SIZE + TILE_SIZE / 2;
    }

    get pixelY() {
        return GRID_OFFSET_Y + this.y * TILE_SIZE + TILE_SIZE / 2;
    }

    draw(ctx) {
        const px = this.pixelX;
        const py = this.pixelY + this.bobOffset;
        const size = 20;

        ctx.save();
        if (!this.facingRight) {
            ctx.translate(px * 2, 0);
            ctx.scale(-1, 1);
        }

        // Body (yellow ellipse)
        ctx.fillStyle = '#f0d23c';
        ctx.beginPath();
        ctx.ellipse(px, py, size * 0.45, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(px + size * 0.25, py - size * 0.3, size * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(px + size * 0.32, py - size * 0.35, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(px + size * 0.44, py - size * 0.32);
        ctx.lineTo(px + size * 0.58, py - size * 0.26);
        ctx.lineTo(px + size * 0.44, py - size * 0.2);
        ctx.closePath();
        ctx.fill();

        // Feet (animated waddle)
        ctx.fillStyle = '#ff8800';
        const footOffset = Math.sin(this.animFrame * Math.PI / 2) * 2;
        ctx.fillRect(px - 3 + footOffset, py + size * 0.28, 4, 3);
        ctx.fillRect(px + 2 - footOffset, py + size * 0.28, 4, 3);

        // Crown (tiny, because he's the boss)
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(px + size * 0.12, py - size * 0.5);
        ctx.lineTo(px + size * 0.18, py - size * 0.62);
        ctx.lineTo(px + size * 0.25, py - size * 0.52);
        ctx.lineTo(px + size * 0.32, py - size * 0.62);
        ctx.lineTo(px + size * 0.38, py - size * 0.5);
        ctx.closePath();
        ctx.fill();

        // Dance effect during celebration
        if (this.state === 'celebrating') {
            const jumpY = Math.abs(Math.sin(this.danceTimer * 8)) * 6;
            // Musical notes
            ctx.fillStyle = '#ffd700';
            ctx.font = `14px ${FONT}`;
            const noteX = px + 12 + Math.sin(this.danceTimer * 3) * 5;
            const noteY = py - 20 - jumpY;
            ctx.fillText('♪', noteX, noteY);
        }

        ctx.restore();

        // Speech bubble (not flipped)
        if (this.speechTimer > 0 && this.speechText) {
            const alpha = Math.min(1, this.speechTimer / 0.5);
            ctx.globalAlpha = alpha;

            const bubbleX = this.pixelX;
            const bubbleY = this.pixelY - 32;

            ctx.font = `bold 12px ${FONT}`;
            const textW = ctx.measureText(this.speechText).width;
            const padX = 8, padY = 4;
            const bw = textW + padX * 2;
            const bh = 18 + padY * 2;
            const bx = bubbleX - bw / 2;
            const by = bubbleY - bh;

            // Bubble background
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.beginPath();
            ctx.moveTo(bx + 4, by);
            ctx.lineTo(bx + bw - 4, by);
            ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + 4);
            ctx.lineTo(bx + bw, by + bh - 4);
            ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 4, by + bh);
            // Little tail
            ctx.lineTo(bx + bw / 2 + 4, by + bh);
            ctx.lineTo(bx + bw / 2, by + bh + 5);
            ctx.lineTo(bx + bw / 2 - 4, by + bh);
            ctx.lineTo(bx + 4, by + bh);
            ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - 4);
            ctx.lineTo(bx, by + 4);
            ctx.quadraticCurveTo(bx, by, bx + 4, by);
            ctx.closePath();
            ctx.fill();

            // Bubble border
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Text
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(this.speechText, bubbleX, by + bh / 2 + 5);
            ctx.textAlign = 'left';

            ctx.globalAlpha = 1;
        }
    }
}
