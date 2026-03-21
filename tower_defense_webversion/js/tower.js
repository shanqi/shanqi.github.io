// tower.js — Tower class

import {
    TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y,
    TowerType, TargetMode, HIGH_GROUND_RANGE_BONUS, UPGRADE_MULTIPLIERS
} from './constants.js';
import { TOWER_DATA } from './towerData.js';

let nextTowerId = 0;

export class Tower {
    constructor(type, gridX, gridY, isHighGround = false) {
        this.id = nextTowerId++;
        this.type = type;
        this.gridX = gridX;
        this.gridY = gridY;
        this.isHighGround = isHighGround;
        this.level = 1;
        this.totalInvestment = 0;
        this.specialization = null; // 'A' or 'B'

        const data = TOWER_DATA[type];
        this.name = data.name;
        this.baseDamage = data.damage;
        this.baseDamageType = data.damage_type;
        this.baseRange = data.range;
        this.baseFireRate = data.fire_rate;
        this.splashRadius = data.splash_radius;
        this.targetMode = data.target_mode;
        this.canHitAir = data.can_hit_air;
        this.canHitGround = data.can_hit_ground;
        this.projectileSpeed = data.projectile_speed;

        // Special flags
        this.isSpawner = data.is_spawner || false;
        this.isSupport = data.is_support || false;
        this.isEconomy = data.is_economy || false;
        this.isAoePulse = data.is_aoe_pulse || false;

        // Spawner
        this.spawnInterval = data.spawn_interval || 0;
        this.spawnTimer = 0;
        this.duckHP = data.duck_hp || 0;
        this.duckDamage = data.duck_damage || 0;
        this.duckSpeed = data.duck_speed || 0;

        // Support
        this.auraBuff = 'damage'; // 'attack_speed' or 'damage'
        this.auraAttackSpeed = data.aura_attack_speed || 1;
        this.auraDamage = data.aura_damage || 0;

        // Economy
        this.goldPerTick = data.gold_per_tick || 0;
        this.tickInterval = data.tick_interval || 0;
        this.tickTimer = 0;

        // Special tower data
        this.chainCount = data.chain_count || 0;
        this.slowStrength = data.slow_strength || 0;
        this.slowDuration = data.slow_duration || 0;
        this.burnDPS = data.burn_dps || 0;
        this.burnDuration = data.burn_duration || 0;

        // Combat state
        this.cooldownTimer = 0;
        this.target = null;
        this.rotation = 0;
        this.fireAnimTimer = 0;
        this.disabled = false;
        this.disabledTimer = 0;
        this.stunned = false;
        this.stunnedTimer = 0;

        // Synergy buffs (applied externally)
        this.synergyDamageBonus = 0;
        this.synergyRangeBonus = 0;
        this.synergyFireRateBonus = 1.0;
        this.auraDamageBonus = 0;
        this.auraFireRateBonus = 1.0;

        this.totalInvestment = data.cost;
    }

    get pixelX() {
        return GRID_OFFSET_X + this.gridX * TILE_SIZE + TILE_SIZE / 2;
    }

    get pixelY() {
        return GRID_OFFSET_Y + this.gridY * TILE_SIZE + TILE_SIZE / 2;
    }

    get damage() {
        let mult = this.level <= 7 ? UPGRADE_MULTIPLIERS[this.level - 1].damage : UPGRADE_MULTIPLIERS[6].damage;
        let dmg = this.baseDamage * mult;
        dmg *= (1 + this.synergyDamageBonus + this.auraDamageBonus);

        if (this.specialization) {
            const spec = TOWER_DATA[this.type].specializations[this.specialization];
            if (spec.damage_mult) dmg *= spec.damage_mult;
        }
        return dmg;
    }

    get range() {
        let mult = this.level <= 7 ? UPGRADE_MULTIPLIERS[this.level - 1].range : UPGRADE_MULTIPLIERS[6].range;
        let r = this.baseRange * mult;
        r += this.synergyRangeBonus;
        if (this.isHighGround) r += HIGH_GROUND_RANGE_BONUS;
        if (this.specialization) {
            const spec = TOWER_DATA[this.type].specializations[this.specialization];
            if (spec.range_bonus) r += spec.range_bonus;
        }
        return r;
    }

    get fireRate() {
        let mult = this.level <= 7 ? UPGRADE_MULTIPLIERS[this.level - 1].fire_rate : UPGRADE_MULTIPLIERS[6].fire_rate;
        let rate = this.baseFireRate * mult;
        rate *= this.synergyFireRateBonus;
        rate *= this.auraFireRateBonus;
        if (this.specialization) {
            const spec = TOWER_DATA[this.type].specializations[this.specialization];
            if (spec.fire_rate) rate = spec.fire_rate;
        }
        return rate;
    }

    // Gold mine level-scaled values
    get currentGoldPerTick() {
        let gpt = this.goldPerTick + (this.level - 1) * 0.5;
        if (this.specialization === 'A') {
            const spec = TOWER_DATA[this.type]?.specializations?.A;
            if (spec?.gold_per_tick) gpt = spec.gold_per_tick;
        }
        return Math.floor(gpt * 10) / 10; // round to 1 decimal
    }

    get currentTickInterval() {
        return Math.max(this.tickInterval - (this.level - 1) * 0.15, 2.5);
    }

    get upgradeCost() {
        const data = TOWER_DATA[this.type];
        if (this.level > 7) return null;
        return data.upgrade_costs[this.level - 1];
    }

    get canUpgrade() {
        return this.level < 8;
    }

    get needsSpecialization() {
        return this.level === 7; // Next upgrade (to 8) requires specialization
    }

    upgrade() {
        if (this.level >= 8) return false;
        const cost = this.upgradeCost;
        this.level++;
        this.totalInvestment += cost;
        return true;
    }

    specialize(choice) {
        if (this.specialization || this.level < 8) return;
        this.specialization = choice;

        // Apply specialization-specific changes
        const spec = TOWER_DATA[this.type].specializations[choice];

        if (this.type === TowerType.ICE) {
            if (spec.splash_radius) this.splashRadius = spec.splash_radius;
            if (spec.slow_strength) this.slowStrength = spec.slow_strength;
            if (spec.slow_duration) this.slowDuration = spec.slow_duration;
        }
        if (this.type === TowerType.TESLA) {
            if (spec.chain_count) this.chainCount = spec.chain_count;
        }
        if (this.type === TowerType.FLAME) {
            if (spec.splash_radius) this.splashRadius = spec.splash_radius;
            if (spec.burn_dps) this.burnDPS = spec.burn_dps;
            if (spec.burn_duration) this.burnDuration = spec.burn_duration;
            if (spec.burn_dps_mult) this.burnDPS *= spec.burn_dps_mult;
            if (spec.burn_duration_bonus) this.burnDuration += spec.burn_duration_bonus;
        }
        if (this.type === TowerType.CANNON && spec.splash_bonus) {
            this.splashRadius += spec.splash_bonus;
        }
        if (this.type === TowerType.GOLD_MINE && spec.gold_per_tick) {
            this.goldPerTick = spec.gold_per_tick;
        }
    }

    update(dt, enemies) {
        if (this.disabled || this.stunned) {
            if (this.disabledTimer > 0) {
                this.disabledTimer -= dt;
                if (this.disabledTimer <= 0) this.disabled = false;
            }
            if (this.stunnedTimer > 0) {
                this.stunnedTimer -= dt;
                if (this.stunnedTimer <= 0) this.stunned = false;
            }
            return null;
        }

        // Fire animation
        if (this.fireAnimTimer > 0) this.fireAnimTimer -= dt;

        // Economy ticking
        if (this.isEconomy) {
            const interval = this.currentTickInterval;
            const gold = this.currentGoldPerTick;
            this.tickTimer += dt;
            if (this.tickTimer >= interval) {
                this.tickTimer -= interval;
                return { type: 'gold', amount: Math.floor(gold) };
            }
            return null;
        }

        // Spawner ticking — only when enemies are alive
        if (this.isSpawner) {
            const aliveEnemies = enemies.filter(e => e.alive && !e.reachedExit);
            if (aliveEnemies.length === 0) {
                this.spawnTimer = 0; // reset so ducks don't burst-spawn
                return null;
            }
            this.spawnTimer += dt;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer -= this.spawnInterval;
                return { type: 'spawn_duck' };
            }
            return null;
        }

        // Support tower doesn't attack
        if (this.isSupport) return null;

        // Combat
        this.cooldownTimer -= dt;
        if (this.cooldownTimer > 0) return null;

        // Find target
        this.target = this.findTarget(enemies);
        if (!this.target) return null;

        // Rotate toward target
        const dx = this.target.x - this.gridX;
        const dy = this.target.y - this.gridY;
        this.rotation = Math.atan2(dy, dx);

        // Fire
        this.cooldownTimer = this.fireRate;
        this.fireAnimTimer = 0.15;

        return { type: 'fire', target: this.target };
    }

    findTarget(enemies) {
        const inRange = enemies.filter(e => {
            if (!e.alive || e.reachedExit) return false;
            if (e.isFlying && !this.canHitAir) return false;
            if (!e.isFlying && !this.canHitGround) return false;
            if (this.targetMode === TargetMode.AIR_ONLY && !e.isFlying) return false;
            if (this.targetMode === TargetMode.GROUND_ONLY && e.isFlying) return false;
            return e.distanceToPoint(this.gridX, this.gridY) <= this.range;
        });

        if (inRange.length === 0) return null;

        switch (this.targetMode) {
            case TargetMode.FIRST:
            case TargetMode.AIR_ONLY:
                return inRange.reduce((a, b) => a.progress > b.progress ? a : b);
            case TargetMode.LAST:
                return inRange.reduce((a, b) => a.progress < b.progress ? a : b);
            case TargetMode.STRONGEST:
                return inRange.reduce((a, b) => a.hp > b.hp ? a : b);
            case TargetMode.WEAKEST:
                return inRange.reduce((a, b) => a.hp < b.hp ? a : b);
            default:
                return inRange[0];
        }
    }

    cycleTargetMode() {
        const modes = [
            TargetMode.FIRST, TargetMode.LAST,
            TargetMode.STRONGEST, TargetMode.WEAKEST,
        ];
        if (this.targetMode === TargetMode.AIR_ONLY) return; // Sky-Hunter locked
        const idx = modes.indexOf(this.targetMode);
        this.targetMode = modes[(idx + 1) % modes.length];
    }

    disable(duration) {
        this.disabled = true;
        this.disabledTimer = Math.max(this.disabledTimer, duration);
    }

    stun(duration) {
        this.stunned = true;
        this.stunnedTimer = Math.max(this.stunnedTimer, duration);
    }
}
