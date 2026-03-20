// combat.js — Damage calculation and combat resolution

import {
    ARMOR_MATRIX, ARMOR_BREAK_MULTIPLIER,
    SPLASH_DAMAGE_RATIO, CHAIN_DAMAGE_RATIO, CHAIN_MAX_DISTANCE,
    DamageType, EnemyType, TowerType
} from './constants.js';
import { TOWER_DATA } from './towerData.js';

export function calculateDamage(baseDamage, damageType, armorType, armorBroken, ignoreArmor) {
    if (ignoreArmor || !damageType) return baseDamage;
    let mult = ARMOR_MATRIX[armorType]?.[damageType] ?? 1.0;
    if (armorBroken) mult *= ARMOR_BREAK_MULTIPLIER;
    return baseDamage * mult;
}

export function resolveProjectileHit(projectile, enemies, effects) {
    const { targetX: tx, targetY: ty } = projectile;

    // Find primary target (nearest to hit point)
    let primary = null;
    let minDist = Infinity;
    for (const e of enemies) {
        if (!e.alive || e.reachedExit) continue;
        const dx = e.x - tx;
        const dy = e.y - ty;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1.5 && dist < minDist) {
            minDist = dist;
            primary = e;
        }
    }

    if (!primary) return [];

    const kills = [];

    // Execute multiplier check
    let dmg = projectile.damage;
    if (projectile.executeMult > 0 && primary.hp / primary.maxHP < projectile.executeThreshold) {
        dmg *= projectile.executeMult;
    }

    // Calculate and apply damage
    const finalDmg = calculateDamage(dmg, projectile.damageType, primary.armor, primary.armorBroken, projectile.ignoreArmor);
    primary.takeDamage(finalDmg);

    // Effects
    effects.addFloatingText(primary.pixelX, primary.pixelY - 20, Math.round(finalDmg).toString(), '#ff4444');

    if (!primary.alive) kills.push(primary);

    // Slow
    if (projectile.slowStrength > 0) {
        primary.applySlow(projectile.slowStrength, projectile.slowDuration);
    }

    // Burn
    if (projectile.burnDPS > 0) {
        primary.applyBurn(projectile.burnDPS, projectile.burnDuration);
    }

    // Armor break
    if (projectile.armorBreak > 0) {
        primary.applyArmorBreak(projectile.armorBreak);
    }

    // Splash damage
    if (projectile.splashRadius > 0) {
        for (const e of enemies) {
            if (e === primary || !e.alive || e.reachedExit) continue;
            const dx = e.x - tx;
            const dy = e.y - ty;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= projectile.splashRadius) {
                const splashDmg = calculateDamage(
                    dmg * SPLASH_DAMAGE_RATIO, projectile.damageType,
                    e.armor, e.armorBroken, projectile.ignoreArmor
                );
                e.takeDamage(splashDmg);
                if (!e.alive) kills.push(e);
            }
        }
        // Splash visual
        effects.addExpandingRing(
            primary.pixelX, primary.pixelY,
            projectile.splashRadius * 32, '#ff6633'
        );
    }

    // Chain damage
    if (projectile.chainCount > 0) {
        let lastTarget = primary;
        const chained = new Set([primary.id]);

        for (let i = 0; i < projectile.chainCount; i++) {
            let nearest = null;
            let nearestDist = Infinity;
            for (const e of enemies) {
                if (!e.alive || e.reachedExit || chained.has(e.id)) continue;
                const dist = lastTarget.distanceTo(e);
                if (dist <= CHAIN_MAX_DISTANCE && dist < nearestDist) {
                    nearestDist = dist;
                    nearest = e;
                }
            }
            if (!nearest) break;

            chained.add(nearest.id);
            const chainDmg = calculateDamage(
                dmg * CHAIN_DAMAGE_RATIO, projectile.damageType,
                nearest.armor, nearest.armorBroken, projectile.ignoreArmor
            );
            nearest.takeDamage(chainDmg);
            if (!nearest.alive) kills.push(nearest);

            // Chain stun
            if (projectile.chainStun > 0) {
                nearest.applyStun(projectile.chainStun);
            }

            // Chain visual (lightning line)
            effects.addLightning(lastTarget.pixelX, lastTarget.pixelY, nearest.pixelX, nearest.pixelY);

            lastTarget = nearest;
        }
    }

    return kills;
}

export function resolveAoePulse(tower, enemies, effects) {
    const kills = [];
    const range = tower.range;

    for (const e of enemies) {
        if (!e.alive || e.reachedExit) continue;
        if (e.isFlying && !tower.canHitAir) continue;
        if (!e.isFlying && !tower.canHitGround) continue;
        const dist = e.distanceToPoint(tower.gridX, tower.gridY);
        if (dist <= range) {
            const dmg = calculateDamage(tower.damage, tower.baseDamageType, e.armor, e.armorBroken, false);
            e.takeDamage(dmg);
            effects.addFloatingText(e.pixelX, e.pixelY - 20, Math.round(dmg).toString(), '#cc44ff');
            if (!e.alive) kills.push(e);

            // Vortex spec: pull and slow
            if (tower.specialization === 'B') {
                const spec = TOWER_DATA[tower.type]?.specializations?.B;
                if (spec?.vortex_pull) {
                    const dx = tower.gridX - e.x;
                    const dy = tower.gridY - e.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d > 0) {
                        e.x += (dx / d) * Math.min(spec.vortex_pull, d);
                        e.y += (dy / d) * Math.min(spec.vortex_pull, d);
                    }
                    e.applySlow(spec.vortex_slow, spec.vortex_slow_duration);
                }
            }
        }
    }

    // Pulse visual
    effects.addExpandingRing(tower.pixelX, tower.pixelY, range * 32, '#9933ff');

    return kills;
}
