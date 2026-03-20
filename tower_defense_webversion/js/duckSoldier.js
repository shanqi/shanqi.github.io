// duckSoldier.js — Duck soldier entity

import { TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from './constants.js';

let nextDuckId = 0;

export class DuckSoldier {
    constructor(x, y, hp, damage, speed, isMega = false) {
        this.id = nextDuckId++;
        this.x = x;
        this.y = y;
        this.hp = hp;
        this.maxHP = hp;
        this.damage = damage;
        this.speed = speed;
        this.isMega = isMega;
        this.size = isMega ? 48 : 32;
        this.attackRange = 1.8;
        this.attackRate = 0.8;
        this.attackTimer = 0;
        this.lifetime = 20;
        this.lifeTimer = 0;
        this.target = null;
        this.alive = true;
        this.animFrame = 0;
        this.animTimer = 0;
    }

    get pixelX() {
        return GRID_OFFSET_X + this.x * TILE_SIZE + TILE_SIZE / 2;
    }

    get pixelY() {
        return GRID_OFFSET_Y + this.y * TILE_SIZE + TILE_SIZE / 2;
    }

    update(dt, enemies) {
        if (!this.alive) return null;

        this.lifeTimer += dt;
        if (this.lifeTimer >= this.lifetime) {
            this.alive = false;
            return null;
        }

        // Animation
        this.animTimer += dt;
        if (this.animTimer >= 0.2) {
            this.animTimer -= 0.2;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        // Find nearest enemy
        let nearest = null;
        let nearestDist = Infinity;
        for (const e of enemies) {
            if (!e.alive || e.reachedExit || e.isFlying) continue;
            const dx = e.x - this.x;
            const dy = e.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = e;
            }
        }

        this.target = nearest;

        if (nearest && nearestDist <= this.attackRange) {
            // Attack
            this.attackTimer += dt;
            if (this.attackTimer >= this.attackRate) {
                this.attackTimer -= this.attackRate;
                return { type: 'attack', target: nearest, damage: this.damage };
            }
        } else if (nearest) {
            // Move toward nearest
            const dx = nearest.x - this.x;
            const dy = nearest.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }

        return null;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
    }
}
