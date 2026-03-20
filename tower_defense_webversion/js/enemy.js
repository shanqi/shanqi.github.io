// enemy.js — Enemy class

import { TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y, EnemyType, ArmorType } from './constants.js';
import { ENEMY_DATA, scaleEnemyHP, scaleEnemySpeed, scaleEnemyReward } from './enemyData.js';

let nextEnemyId = 0;

export class Enemy {
    constructor(type, wave, route, spawnIndex = 0) {
        this.id = nextEnemyId++;
        this.type = type;
        const data = ENEMY_DATA[type];

        this.name = data.name;
        this.maxHP = scaleEnemyHP(data.hp, wave);
        this.hp = this.maxHP;
        this.displayHP = this.hp;
        this.speed = scaleEnemySpeed(data.speed, wave);
        this.baseSpeed = this.speed;
        this.armor = data.armor;
        this.reward = scaleEnemyReward(data.reward, wave);
        this.livesCost = data.lives_cost;
        this.isFlying = data.is_flying;
        this.ability = data.ability;
        this.size = data.size;
        this.spawnIndex = spawnIndex;

        // Ability data
        this.healAmount = data.heal_amount || 0;
        this.healRadius = data.heal_radius || 0;
        this.healCooldown = data.heal_cooldown || 0;
        this.healTimer = 0;
        this.disableRadius = data.disable_radius || 0;
        this.disableDuration = data.disable_duration || 0;
        this.disableCooldown = data.disable_cooldown || 0;
        this.disableTimer = 0;
        this.summonType = data.summon_type || null;
        this.summonCount = data.summon_count || 0;
        this.stunRadius = data.stun_radius || 0;
        this.stunDuration = data.stun_duration || 0;
        this.stunCooldown = data.stun_cooldown || 0;
        this.stunTimer = 0;

        // Movement
        this.route = route;
        this.routeIndex = 0;
        if (route.length > 0) {
            this.x = route[0].x;
            this.y = route[0].y;
        } else {
            this.x = 0;
            this.y = 0;
        }

        // Status effects
        this.slowStrength = 0;
        this.slowTimer = 0;
        this.burnDPS = 0;
        this.burnTimer = 0;
        this.stunned = false;
        this.stunnedTimer = 0;
        this.armorBroken = false;
        this.armorBreakTimer = 0;

        // Visual
        this.animFrame = 0;
        this.animTimer = 0;
        this.hitFlashTimer = 0;
        this.alive = true;
        this.reachedExit = false;
        this.progress = 0; // 0-1 along route
    }

    get pixelX() {
        return GRID_OFFSET_X + this.x * TILE_SIZE + TILE_SIZE / 2;
    }

    get pixelY() {
        return GRID_OFFSET_Y + this.y * TILE_SIZE + TILE_SIZE / 2;
    }

    get currentSpeed() {
        if (this.stunned) return 0;
        if (this.ability === 'debuff_immune') return this.baseSpeed;
        return this.baseSpeed * (1 - this.slowStrength);
    }

    update(dt) {
        if (!this.alive || this.reachedExit) return;

        // Animation
        this.animTimer += dt;
        if (this.animTimer >= 0.12) {
            this.animTimer -= 0.12;
            this.animFrame = (this.animFrame + 1) % 8;
        }

        // Hit flash
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

        // Display HP lerp
        const hpDiff = this.hp - this.displayHP;
        this.displayHP += hpDiff * Math.min(1, dt * 8);

        // Status effects
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) this.slowStrength = 0;
        }
        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.hp -= this.burnDPS * dt;
            if (this.hp <= 0) { this.alive = false; return; }
            if (this.burnTimer <= 0) this.burnDPS = 0;
        }
        if (this.stunnedTimer > 0) {
            this.stunnedTimer -= dt;
            if (this.stunnedTimer <= 0) this.stunned = false;
        }
        if (this.armorBreakTimer > 0) {
            this.armorBreakTimer -= dt;
            if (this.armorBreakTimer <= 0) this.armorBroken = false;
        }

        // Ability timers
        if (this.ability === 'heal_aura') this.healTimer += dt;
        if (this.ability === 'disable_tower') this.disableTimer += dt;
        if (this.ability === 'tower_stun') this.stunTimer += dt;

        // Movement
        this.move(dt);
    }

    move(dt) {
        if (this.route.length === 0 || this.routeIndex >= this.route.length - 1) {
            this.reachedExit = true;
            return;
        }

        const speed = this.currentSpeed;
        if (speed <= 0) return;

        let remaining = speed * dt;
        while (remaining > 0 && this.routeIndex < this.route.length - 1) {
            const target = this.route[this.routeIndex + 1];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= remaining) {
                this.x = target.x;
                this.y = target.y;
                remaining -= dist;
                this.routeIndex++;
            } else {
                this.x += (dx / dist) * remaining;
                this.y += (dy / dist) * remaining;
                remaining = 0;
            }
        }

        // Update progress
        if (this.route.length > 1) {
            this.progress = this.routeIndex / (this.route.length - 1);
        }

        if (this.routeIndex >= this.route.length - 1) {
            this.reachedExit = true;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hitFlashTimer = 0.1;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
    }

    applySlow(strength, duration) {
        if (this.ability === 'debuff_immune') return;
        if (this.armor === ArmorType.ETHEREAL) return;
        if (strength > this.slowStrength || this.slowTimer <= 0) {
            this.slowStrength = strength;
        }
        this.slowTimer = Math.max(this.slowTimer, duration);
    }

    applyBurn(dps, duration) {
        if (dps > this.burnDPS) {
            this.burnDPS = dps;
        }
        this.burnTimer = Math.max(this.burnTimer, duration);
    }

    applyStun(duration) {
        this.stunned = true;
        this.stunnedTimer = Math.max(this.stunnedTimer, duration);
    }

    applyArmorBreak(duration) {
        if (this.ability === 'debuff_immune') return;
        if (this.armor === ArmorType.ETHEREAL) return;
        this.armorBroken = true;
        this.armorBreakTimer = Math.max(this.armorBreakTimer, duration);
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    distanceToPoint(px, py) {
        const dx = this.x - px;
        const dy = this.y - py;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
