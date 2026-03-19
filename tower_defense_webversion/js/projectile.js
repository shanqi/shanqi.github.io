// projectile.js — Projectile class

import { TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y, TowerType } from './constants.js';

let nextProjectileId = 0;

export class Projectile {
    constructor(tower, target) {
        this.id = nextProjectileId++;
        this.towerType = tower.type;
        this.x = tower.gridX;
        this.y = tower.gridY;
        this.targetId = target.id;
        this.targetX = target.x;
        this.targetY = target.y;
        this.speed = tower.projectileSpeed;
        this.damage = tower.damage;
        this.damageType = tower.baseDamageType;
        this.splashRadius = tower.splashRadius;
        this.chainCount = tower.chainCount;
        this.slowStrength = tower.slowStrength;
        this.slowDuration = tower.slowDuration;
        this.burnDPS = tower.burnDPS;
        this.burnDuration = tower.burnDuration;
        this.alive = true;
        this.towerId = tower.id;

        // Specialization data
        this.armorBreak = 0;
        this.chainStun = 0;
        this.executeMult = 0;
        this.executeThreshold = 0;
        this.ignoreArmor = false;

        if (tower.specialization) {
            const spec = tower.type === TowerType.CANNON && tower.specialization === 'B'
                ? { armor_break: 3.0 } : {};
            // Pull from tower data specializations
            const towerData = window.__TOWER_DATA?.[tower.type];
            if (towerData?.specializations?.[tower.specialization]) {
                const s = towerData.specializations[tower.specialization];
                this.armorBreak = s.armor_break || 0;
                this.chainStun = s.chain_stun || 0;
                this.executeMult = s.execute_mult || 0;
                this.executeThreshold = s.execute_threshold || 0;
                this.ignoreArmor = s.ignore_armor || false;
            }
        }

        // Trail
        this.trail = [];
        this.trailTimer = 0;
    }

    get pixelX() {
        return GRID_OFFSET_X + this.x * TILE_SIZE + TILE_SIZE / 2;
    }

    get pixelY() {
        return GRID_OFFSET_Y + this.y * TILE_SIZE + TILE_SIZE / 2;
    }

    update(dt, enemies) {
        if (!this.alive) return;

        // Update trail
        this.trailTimer += dt;
        if (this.trailTimer >= 0.02) {
            this.trailTimer = 0;
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 8) this.trail.shift();
        }

        // Find target enemy
        const target = enemies.find(e => e.id === this.targetId && e.alive);
        if (target) {
            this.targetX = target.x;
            this.targetY = target.y;
        }

        // Move toward target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.3 || this.speed === 0) {
            // Hit
            this.alive = false;
            return { hit: true, x: this.targetX, y: this.targetY };
        }

        const moveAmount = this.speed * dt;
        if (moveAmount >= dist) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.alive = false;
            return { hit: true, x: this.targetX, y: this.targetY };
        }

        this.x += (dx / dist) * moveAmount;
        this.y += (dy / dist) * moveAmount;
        return null;
    }
}
