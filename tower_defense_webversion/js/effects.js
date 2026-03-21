// effects.js — Particles, floating text, expanding rings

import { Colors, FONT } from './constants.js';

export class EffectSystem {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
        this.expandingRings = [];
        this.lightnings = [];
        this.announcements = [];
        this.screenShake = 0;
        this.shakeIntensity = 0;

        // Combo kill system
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboWindow = 0.8;
        this.lastKillX = 0;
        this.lastKillY = 0;
    }

    addParticle(x, y, color, vx = 0, vy = 0) {
        this.particles.push({
            x, y, color,
            vx: vx || (Math.random() - 0.5) * 60,
            vy: vy || (Math.random() - 0.5) * 60 - 30,
            life: 1.0,
            maxLife: 1.0 + Math.random(),
            size: 2 + Math.random() * 3,
            gravity: 60,
        });
    }

    addFloatingText(x, y, text, color = '#fff', duration = 1.0) {
        this.floatingTexts.push({
            x, y, text, color,
            life: duration,
            maxLife: duration,
            vy: -40,
        });
    }

    addExpandingRing(x, y, maxRadius, color) {
        this.expandingRings.push({
            x, y, maxRadius, color,
            radius: 0,
            life: 0.4,
            maxLife: 0.4,
        });
    }

    addLightning(x1, y1, x2, y2) {
        this.lightnings.push({
            x1, y1, x2, y2,
            life: 0.15,
            maxLife: 0.15,
        });
    }

    addAnnouncement(text, color = Colors.ACCENT, duration = 2.0) {
        this.announcements.push({
            text, color,
            life: duration,
            maxLife: duration,
            scale: 0,
        });
    }

    addScreenShake(duration = 0.2, intensity = 3) {
        this.screenShake = Math.max(this.screenShake, duration);
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    addTowerFireEffect(towerType, x, y) {
        const effects = {
            'cannon': { color: 'rgb(180,170,160)', count: 6, speed: 40, size: 3, life: 0.35 },
            'flame': { color: 'rgb(255,140,40)', count: 4, speed: 30, size: 2.5, life: 0.25 },
            'tesla': { color: 'rgb(100,200,255)', count: 3, speed: 25, size: 2, life: 0.2 },
            'sniper': { color: 'rgb(255,255,200)', count: 1, speed: 0, size: 3, life: 0.12 },
            'ice': { color: 'rgb(180,230,255)', count: 3, speed: 20, size: 1.5, life: 0.3 },
            'mage': { color: 'rgb(200,140,255)', count: 3, speed: 20, size: 2, life: 0.25 },
            'doom_spire': { color: 'rgb(180,80,255)', count: 8, speed: 50, size: 3, life: 0.35 },
        };
        const e = effects[towerType] || { color: 'rgb(255,255,200)', count: 1, speed: 0, size: 2, life: 0.1 };
        for (let i = 0; i < e.count; i++) {
            this.particles.push({
                x, y, color: e.color,
                vx: (Math.random() - 0.5) * e.speed * 2,
                vy: (Math.random() - 0.5) * e.speed * 2 - 20,
                life: 1.0, maxLife: e.life,
                size: e.size + Math.random(), gravity: 30,
            });
        }
    }

    registerKill(x, y) {
        if (this.comboTimer > 0) {
            this.comboCount++;
        } else {
            this.comboCount = 1;
        }
        this.comboTimer = this.comboWindow;
        this.lastKillX = x;
        this.lastKillY = y;

        if (this.comboCount >= 3) {
            let label, color;
            if (this.comboCount >= 8) { label = 'MEGA KILL!'; color = '#ff3300'; }
            else if (this.comboCount >= 5) { label = `x${this.comboCount} FRENZY!`; color = '#ff6633'; }
            else { label = `x${this.comboCount}!`; color = '#e6b800'; }
            this.addFloatingText(x, y - 30, label, color, 1.2);
            // Extra particles for big combos
            if (this.comboCount >= 5) {
                for (let i = 0; i < 6; i++) {
                    this.addParticle(x, y, color);
                }
            }
        }
        return this.comboCount >= 3 ? this.comboCount : 0;
    }

    addPortalParticles(x, y) {
        const colors = ['rgb(180,60,60)', 'rgb(120,40,40)', 'rgb(200,80,80)'];
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 15;
            this.particles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                color: colors[Math.floor(Math.random() * 3)],
                vx: -Math.cos(angle) * 30,
                vy: -Math.sin(angle) * 30,
                life: 1.0, maxLife: 0.5,
                size: 2 + Math.random(), gravity: 0,
            });
        }
    }

    update(dt) {
        // Combo timer decay
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.comboCount = 0;
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.gravity * dt;
            p.life -= dt / p.maxLife;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.y += t.vy * dt;
            t.life -= dt;
            if (t.life <= 0) this.floatingTexts.splice(i, 1);
        }

        // Expanding rings
        for (let i = this.expandingRings.length - 1; i >= 0; i--) {
            const r = this.expandingRings[i];
            r.life -= dt;
            r.radius = r.maxRadius * (1 - r.life / r.maxLife);
            if (r.life <= 0) this.expandingRings.splice(i, 1);
        }

        // Lightning
        for (let i = this.lightnings.length - 1; i >= 0; i--) {
            this.lightnings[i].life -= dt;
            if (this.lightnings[i].life <= 0) this.lightnings.splice(i, 1);
        }

        // Announcements
        for (let i = this.announcements.length - 1; i >= 0; i--) {
            const a = this.announcements[i];
            a.life -= dt;
            a.scale = Math.min(1, a.scale + dt * 5);
            if (a.life <= 0) this.announcements.splice(i, 1);
        }

        // Screen shake
        if (this.screenShake > 0) {
            this.screenShake -= dt;
            if (this.screenShake <= 0) {
                this.shakeIntensity = 0;
            }
        }
    }

    draw(ctx) {
        const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * this.shakeIntensity * 2 : 0;
        const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * this.shakeIntensity * 2 : 0;

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // Particles
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;

        // Expanding rings
        for (const r of this.expandingRings) {
            ctx.globalAlpha = Math.max(0, r.life / r.maxLife) * 0.6;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Lightning
        for (const l of this.lightnings) {
            ctx.globalAlpha = l.life / l.maxLife;
            ctx.strokeStyle = '#88ddff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            // Jagged lightning
            const mx = (l.x1 + l.x2) / 2 + (Math.random() - 0.5) * 20;
            const my = (l.y1 + l.y2) / 2 + (Math.random() - 0.5) * 20;
            ctx.lineTo(mx, my);
            ctx.lineTo(l.x2, l.y2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Floating texts
        for (const t of this.floatingTexts) {
            const alpha = Math.max(0, t.life / t.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = t.color;
            ctx.font = `bold 14px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.fillText(t.text, t.x, t.y);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';

        ctx.restore();

        // Announcements (not affected by shake)
        for (const a of this.announcements) {
            const alpha = Math.min(1, a.life / a.maxLife * 2);
            ctx.globalAlpha = alpha;
            ctx.save();
            const sx = 460; // center of game area
            const sy = 350;
            ctx.translate(sx, sy);
            ctx.scale(a.scale, a.scale);
            ctx.fillStyle = a.color;
            ctx.font = `bold 36px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.fillText(a.text, 0, 0);
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }
}
