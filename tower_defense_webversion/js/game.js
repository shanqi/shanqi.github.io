// game.js — Core game state management

import {
    GameState, TileType, TowerType, EnemyType,
    STARTING_GOLD, STARTING_LIVES, INTEREST_RATE, INTEREST_CAP,
    SELL_REFUND_RATIO, PERFECT_WAVE_BONUS, EARLY_START_BONUS, MAX_GOLD_MINES, TOTAL_WAVES,
    SYNERGIES, TILE_SIZE, FONT
} from './constants.js';
import { MAP_DATA } from './mapData.js';
import { TOWER_DATA, TOWER_ORDER } from './towerData.js';
import { ENEMY_DATA } from './enemyData.js';
import { WAVE_DATA } from './waveData.js';
import { findAllRoutes, getFlyingPath } from './pathfinding.js';
import { Tower } from './tower.js';
import { Enemy } from './enemy.js';
import { Projectile } from './projectile.js';
import { DuckSoldier } from './duckSoldier.js';
import { resolveProjectileHit, resolveAoePulse } from './combat.js';
import { EffectSystem } from './effects.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';
import { InputManager } from './input.js';
import { loadSaveData, saveSaveData, calculateEssence } from './saveData.js';
import { Workshop } from './workshop.js';
import { MapEditor } from './mapEditor.js';
import { Bestiary } from './bestiary.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.renderer = new Renderer(this.ctx);
        this.ui = new UI();
        this.input = new InputManager(canvas);
        this.effects = new EffectSystem();

        this.state = GameState.MAIN_MENU;
        this.maps = MAP_DATA;
        this.selectedMapIndex = 0;
        this.speedMultiplier = 1;

        // Save data
        this.saveData = loadSaveData();
        this.workshop = new Workshop();
        this.bestiary = new Bestiary();
        this.mapEditor = null;

        // Game data (initialized on map load)
        this.gold = 0;
        this.lives = 0;
        this.wave = 0;
        this.tiles = null;
        this.routes = null;
        this.spawns = null;
        this.exits = null;

        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.ducks = [];
        this.recentPlacements = []; // Undo grace period tracking (max 3)

        this.selectedTower = null;
        this.placingTowerType = null;

        // Wave state
        this.waveActive = false;
        this.subwaveIndex = 0;
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.subwaveDelay = 0;
        this.enemiesSpawned = 0;
        this.perfectWave = true;
        this.goldMineCount = 0;

        // Essence tracking
        this.bossesKilled = 0;
        this.totalKills = 0;
        this.essenceEarned = 0;

        // Make tower data available to projectiles
        window.__TOWER_DATA = TOWER_DATA;
    }

    startMap(mapIndex) {
        const map = this.maps[mapIndex];
        this.selectedMapIndex = mapIndex;
        this.tiles = map.tiles.map(row => [...row]);
        this.spawns = map.spawns;
        this.exits = map.exits;
        this.routes = findAllRoutes(this.tiles, this.spawns, this.exits);

        // Apply workshop upgrades
        const upg = this.saveData.upgrades;
        this.gold = STARTING_GOLD + (upg.starting_economy || 0) * 50;
        this.lives = STARTING_LIVES + (upg.better_lives || 0) * 5;
        this.wave = 0;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.ducks = [];
        this.recentPlacements = [];
        this.selectedTower = null;
        this.placingTowerType = null;
        this.waveActive = false;
        this.speedMultiplier = 1;
        this.goldMineCount = 0;
        this.bossesKilled = 0;
        this.totalKills = 0;
        this.essenceEarned = 0;
        this.effects = new EffectSystem();

        this.state = GameState.PREP;
    }

    update(dt) {
        if (this._quit) return;
        if (this.state === GameState.MAIN_MENU || this.state === GameState.MAP_SELECT) {
            this.handleMenuInput();
            return;
        }

        if (this.state === GameState.WORKSHOP) {
            this.handleWorkshopInput();
            return;
        }

        if (this.state === GameState.BESTIARY) {
            this.handleBestiaryInput();
            return;
        }

        if (this.state === GameState.EDITOR) {
            this.handleEditorInput(dt);
            return;
        }

        if (this.state === GameState.PAUSED) {
            this.handlePauseInput();
            return;
        }

        if (this.state === GameState.WON || this.state === GameState.LOST) {
            this.handleEndInput();
            return;
        }

        // Game running
        const gameDt = dt * this.speedMultiplier;

        this.handleGameInput();

        if (this.state === GameState.COMBAT) {
            this.updateWaveSpawning(gameDt);
            this.updateEnemies(gameDt);
            this.updateTowers(gameDt);
            this.updateProjectiles(gameDt);
            this.updateDucks(gameDt);
            this.updateEnemyAbilities(gameDt);
            this.checkWaveComplete();
        } else if (this.state === GameState.PREP) {
            // No tower updates during prep — gold mines and spawners only work in combat
        }

        // Update undo grace period timers (runs in both PREP and COMBAT)
        for (let i = this.recentPlacements.length - 1; i >= 0; i--) {
            this.recentPlacements[i].timer -= gameDt;
            this.recentPlacements[i].tower._undoGracePeriod = this.recentPlacements[i].timer;
            if (this.recentPlacements[i].timer <= 0) {
                this.recentPlacements[i].tower._undoGracePeriod = 0;
                this.recentPlacements.splice(i, 1);
            }
        }

        this.updateSynergies();
        this.effects.update(gameDt);
        this.renderer.advance(gameDt);
    }

    handleMenuInput() {
        if (this.input.consumeClick()) {
            const btn = this.ui.getMenuButtonAt(this.input.mouseX, this.input.mouseY, this.state);
            if (this.state === GameState.MAIN_MENU) {
                if (btn === 'play') this.state = GameState.MAP_SELECT;
                else if (btn === 'workshop') this.state = GameState.WORKSHOP;
                else if (btn === 'editor') {
                    this.mapEditor = new MapEditor();
                    this.state = GameState.EDITOR;
                }
                else if (btn === 'bestiary') {
                    this.state = GameState.BESTIARY;
                }
                else if (btn === 'quit') {
                    // Web can't close the tab, so show a thank-you and stop the game loop
                    this.ctx.fillStyle = '#1a1a2e';
                    this.ctx.fillRect(0, 0, 1240, 780);
                    this.ctx.fillStyle = '#e6b800';
                    this.ctx.font = `bold 36px ${FONT}`;
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('Thanks for playing!', 620, 370);
                    this.ctx.fillStyle = '#969696';
                    this.ctx.font = `17px ${FONT}`;
                    this.ctx.fillText('You can close this tab now.', 620, 410);
                    this.ctx.textAlign = 'left';
                    this._quit = true;
                }
            } else if (this.state === GameState.MAP_SELECT) {
                if (btn?.startsWith('map_')) {
                    const idx = parseInt(btn.split('_')[1]);
                    this.startMap(idx);
                } else if (btn === 'back') {
                    this.state = GameState.MAIN_MENU;
                }
            }
        }
        this.input.clearFrame();
    }

    handleWorkshopInput() {
        if (this.input.consumeClick()) {
            const result = this.workshop.handleClick(this.input.mouseX, this.input.mouseY, this.saveData);
            if (result === 'back') {
                saveSaveData(this.saveData);
                this.state = GameState.MAIN_MENU;
            }
        }
        if (this.input.consumeKey('escape')) {
            saveSaveData(this.saveData);
            this.state = GameState.MAIN_MENU;
        }
        this.input.clearFrame();
    }

    handleBestiaryInput() {
        if (this.input.consumeClick()) {
            const result = this.bestiary.handleClick(this.input.mouseX, this.input.mouseY);
            if (result === 'back') {
                this.state = GameState.MAIN_MENU;
            }
        }
        if (this.input.consumeKey('escape')) {
            this.state = GameState.MAIN_MENU;
        }
        this.input.clearFrame();
    }

    handleEditorInput(dt) {
        if (!this.mapEditor) return;
        this.mapEditor.update(dt);

        // ESC key — direct check first
        if (this.input.consumeKey('escape')) {
            this._loadCustomMaps();
            this.mapEditor = null;
            this.state = GameState.MAIN_MENU;
            this.input.clearFrame();
            return;
        }

        // Left click (single press)
        if (this.input.consumeClick()) {
            const result = this.mapEditor.handleMouseDown(this.input.mouseX, this.input.mouseY, 0);
            if (result === 'quit') {
                this._loadCustomMaps();
                this.mapEditor = null;
                this.state = GameState.MAIN_MENU;
                this.input.clearFrame();
                return;
            }
        }

        // Right click (single press)
        if (this.input.consumeRightClick()) {
            this.mapEditor.handleMouseDown(this.input.mouseX, this.input.mouseY, 2);
        }

        // Drag painting while mouse held
        if (this.input.leftDown || this.input.rightDown) {
            this.mapEditor.handleMouseMove(this.input.mouseX, this.input.mouseY);
        }

        // Mouse released — stop painting/erasing
        if (!this.input.leftDown && !this.input.rightDown) {
            this.mapEditor.handleMouseUp();
        }

        // Keyboard shortcuts (not escape — handled above)
        for (const key of ['v', 'c', 'g', 'z', '0', '1', '2', '3', '4', '5', '6', '7']) {
            if (this.input.consumeKey(key)) {
                this.mapEditor.handleKeyDown(key, this.input.keysPressed.has('control') || this.input.keysPressed.has('meta'));
            }
        }
        this.input.clearFrame();
    }

    _loadCustomMaps() {
        // Scan localStorage for custom maps and add them to this.maps
        const baseCount = MAP_DATA.length;
        this.maps = [...MAP_DATA];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('custom_map_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.tiles && data.spawns && data.exits) {
                        data.name = '[Custom] ' + (data.name || 'Unnamed');
                        data.difficulty = data.difficulty || 'Custom';
                        this.maps.push(data);
                    }
                } catch (e) { /* skip corrupt */ }
            }
        }
    }

    handlePauseInput() {
        if (this.input.consumeClick()) {
            const btn = this.ui.getMenuButtonAt(this.input.mouseX, this.input.mouseY, GameState.PAUSED);
            if (btn === 'resume') this.state = this._prevState || GameState.PREP;
            if (btn === 'restart') this.startMap(this.selectedMapIndex);
            if (btn === 'main_menu') this.state = GameState.MAIN_MENU;
        }
        if (this.input.consumeKey('escape') || this.input.consumeKey(' ')) {
            this.state = this._prevState || GameState.PREP;
        }
        this.input.clearFrame();
    }

    handleEndInput() {
        if (this.input.consumeClick()) {
            const btn = this.ui.getMenuButtonAt(this.input.mouseX, this.input.mouseY, this.state);
            if (btn === 'main_menu') {
                // Award essence and save stats
                const won = this.state === GameState.WON;
                this.essenceEarned = calculateEssence(this.wave, this.bossesKilled, won);
                this.saveData.essence += this.essenceEarned;
                this.saveData.stats.games_played++;
                this.saveData.stats.best_wave = Math.max(this.saveData.stats.best_wave, this.wave);
                this.saveData.stats.total_kills += this.totalKills;
                saveSaveData(this.saveData);
                this.state = GameState.MAIN_MENU;
            }
        }
        this.input.clearFrame();
    }

    handleGameInput() {
        // Keyboard shortcuts
        if (this.input.consumeKey('escape')) {
            if (this.placingTowerType) {
                this.placingTowerType = null;
            } else if (this.selectedTower) {
                this.deselectTower();
            } else if (this.state === GameState.COMBAT || this.state === GameState.PREP) {
                this._prevState = this.state;
                this.state = GameState.PAUSED;
            }
        }

        if (this.input.consumeKey(' ')) {
            if (this.state === GameState.COMBAT) {
                this._prevState = this.state;
                this.state = GameState.PAUSED;
            }
        }

        if (this.input.consumeKey('f')) {
            this.speedMultiplier = this.speedMultiplier === 1 ? 2 : this.speedMultiplier === 2 ? 4 : 1;
        }

        // Ctrl+Z / Cmd+Z: undo recent tower placement
        if ((this.input.keysPressed.has('control') || this.input.keysPressed.has('meta')) && this.input.consumeKey('z')) {
            this.undoTowerPlacement();
        }

        if (this.input.consumeKey('u') && this.selectedTower) this.upgradeTower();
        if (this.input.consumeKey('s') && this.selectedTower) this.sellTower();
        if (this.input.consumeKey('t') && this.selectedTower) this.selectedTower.cycleTargetMode();

        // Number keys to select towers
        for (let i = 0; i < TOWER_ORDER.length && i < 9; i++) {
            if (this.input.consumeKey((i + 1).toString())) {
                this.placingTowerType = TOWER_ORDER[i];
                this.deselectTower();
            }
        }

        // Right click to deselect
        if (this.input.consumeRightClick()) {
            this.placingTowerType = null;
            this.deselectTower();
        }

        // Left click
        if (this.input.consumeClick()) {
            const mx = this.input.mouseX;
            const my = this.input.mouseY;

            // Bottom bar buttons
            const bottomBtn = this.ui.getBottomButtonAt(mx, my, this.state);
            if (bottomBtn === 'start_wave' && this.state === GameState.PREP) {
                this.startWave();
            } else if (bottomBtn === 'speed_1x') {
                this.speedMultiplier = 1;
            } else if (bottomBtn === 'speed_2x') {
                this.speedMultiplier = 2;
            } else if (bottomBtn === 'speed_4x') {
                this.speedMultiplier = 4;
            } else if (bottomBtn === 'pause') {
                if (this.state === GameState.COMBAT || this.state === GameState.PREP) {
                    this._prevState = this.state;
                    this.state = GameState.PAUSED;
                }
            }

            // Shop panel
            else if (this.selectedTower) {
                const towerBtn = this.ui.getSelectedTowerButtonAt(mx, my, this.selectedTower);
                if (towerBtn === 'upgrade') this.upgradeTower();
                else if (towerBtn === 'sell') this.sellTower();
                else if (towerBtn === 'target_mode') this.selectedTower.cycleTargetMode();
                else if (towerBtn === 'spec_A') this.specializeTower('A');
                else if (towerBtn === 'spec_B') this.specializeTower('B');
                else if (towerBtn === 'aura_speed') this.selectedTower.auraBuff = 'attack_speed';
                else if (towerBtn === 'aura_damage') this.selectedTower.auraBuff = 'damage';
                else if (towerBtn === 'deselect') this.deselectTower();
                else if (this.input.isOnGrid) {
                    // Click on grid - select/deselect
                    this.handleGridClick();
                }
            } else {
                const shopBtn = this.ui.getShopButtonAt(mx, my);
                if (shopBtn) {
                    this.placingTowerType = shopBtn.type;
                    this.deselectTower();
                } else if (this.input.isOnGrid) {
                    this.handleGridClick();
                }
            }
        }

        this.input.clearFrame();
    }

    handleGridClick() {
        const gx = this.input.gridX;
        const gy = this.input.gridY;

        if (this.placingTowerType) {
            this.placeTower(gx, gy);
        } else {
            // Select existing tower
            const tower = this.towers.find(t => t.gridX === gx && t.gridY === gy);
            if (tower) {
                this.selectTower(tower);
            } else {
                this.deselectTower();
            }
        }
    }

    selectTower(tower) {
        if (this.selectedTower) this.selectedTower._selected = false;
        this.selectedTower = tower;
        tower._selected = true;
        this.placingTowerType = null;
    }

    deselectTower() {
        if (this.selectedTower) this.selectedTower._selected = false;
        this.selectedTower = null;
    }

    canPlaceTower(gx, gy) {
        const tile = this.tiles[gy]?.[gx];
        if (tile !== TileType.GRASS && tile !== TileType.HIGH_GROUND) return false;
        if (this.towers.some(t => t.gridX === gx && t.gridY === gy)) return false;
        return true;
    }

    placeTower(gx, gy) {
        if (!this.canPlaceTower(gx, gy)) return;
        const type = this.placingTowerType;
        const data = TOWER_DATA[type];
        if (this.gold < data.cost) return;

        // Check if tower requires unlock
        if (data.requires_unlock && !this.saveData.unlocks[data.requires_unlock]) return;

        // Gold mine limit
        if (type === TowerType.GOLD_MINE && this.goldMineCount >= MAX_GOLD_MINES) return;

        const isHighGround = this.tiles[gy][gx] === TileType.HIGH_GROUND;
        const tower = new Tower(type, gx, gy, isHighGround);
        this.towers.push(tower);
        this.gold -= data.cost;
        this.tiles[gy][gx] = TileType.TOWER_BASE;

        if (type === TowerType.GOLD_MINE) this.goldMineCount++;

        // Track for undo grace period (max 3 recent placements)
        tower._undoGracePeriod = 3.0;
        this.recentPlacements.push({
            tower, gridX: gx, gridY: gy, wasHighGround: isHighGround, timer: 3.0
        });
        if (this.recentPlacements.length > 3) {
            this.recentPlacements[0].tower._undoGracePeriod = 0;
            this.recentPlacements.shift();
        }

        // Keep placing if holding the same tower type
    }

    upgradeTower() {
        if (!this.selectedTower || !this.selectedTower.canUpgrade) return;

        // Needs specialization at level 7→8
        if (this.selectedTower.needsSpecialization && !this.selectedTower.specialization) {
            // Can't upgrade without choosing spec at level 7
            if (this.selectedTower.level === 7) return;
        }

        const cost = this.selectedTower.upgradeCost;
        if (this.gold < cost) return;
        this.gold -= cost;
        this.selectedTower.upgrade();
    }

    specializeTower(choice) {
        if (!this.selectedTower || this.selectedTower.specialization) return;
        const tower = this.selectedTower;

        // At level 7, specializing also performs the upgrade to level 8
        if (tower.level === 7) {
            const cost = tower.upgradeCost;
            if (!cost || this.gold < cost) return;
            this.gold -= cost;
            tower.upgrade(); // 7 → 8
        }

        tower.specialize(choice);
    }

    sellTower() {
        if (!this.selectedTower) return;
        const tower = this.selectedTower;
        const refund = Math.floor(tower.totalInvestment * SELL_REFUND_RATIO);
        this.gold += refund;

        // Restore tile
        const originalTile = tower.isHighGround ? TileType.HIGH_GROUND : TileType.GRASS;
        this.tiles[tower.gridY][tower.gridX] = originalTile;

        if (tower.type === TowerType.GOLD_MINE) this.goldMineCount--;

        this.towers = this.towers.filter(t => t.id !== tower.id);
        this.deselectTower();
        this.effects.addFloatingText(tower.pixelX, tower.pixelY, `+$${refund}`, '#ffd700');
    }

    undoTowerPlacement() {
        if (this.recentPlacements.length === 0) return;

        const entry = this.recentPlacements.pop();
        const tower = entry.tower;
        const refund = tower.totalInvestment;

        // Refund full cost
        this.gold += refund;

        // Restore tile
        this.tiles[entry.gridY][entry.gridX] = entry.wasHighGround ? TileType.HIGH_GROUND : TileType.GRASS;

        // Gold mine count
        if (tower.type === TowerType.GOLD_MINE) this.goldMineCount--;

        // Remove tower
        this.towers = this.towers.filter(t => t.id !== tower.id);

        // Deselect if this tower was selected
        if (this.selectedTower && this.selectedTower.id === tower.id) {
            this.deselectTower();
        }

        // Clear grace period marker
        tower._undoGracePeriod = 0;

        this.effects.addFloatingText(tower.pixelX, tower.pixelY, `Undo! +$${refund}`, '#64ff64');
    }

    startWave() {
        if (this.state !== GameState.PREP) return;
        this.wave++;
        if (this.wave > TOTAL_WAVES) {
            this.state = GameState.WON;
            this.effects.addAnnouncement('VICTORY!', '#ffd700');
            return;
        }

        this.state = GameState.COMBAT;
        this.waveActive = true;
        this.perfectWave = true;

        // Early start bonus
        this.gold += EARLY_START_BONUS;
        this.effects.addFloatingText(480, 330, `Early Start: +$${EARLY_START_BONUS}`, '#64ff64', 1.5);

        // Set up spawning
        const waveData = WAVE_DATA[this.wave - 1];
        this.subwaveIndex = 0;
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.subwaveDelay = 0;
        this.setupSubwave();

        this.effects.addAnnouncement(`Wave ${this.wave}`, '#e6b800');
    }

    setupSubwave() {
        const waveData = WAVE_DATA[this.wave - 1];
        if (this.subwaveIndex >= waveData.subwaves.length) {
            this.spawnQueue = [];
            return;
        }

        const sw = waveData.subwaves[this.subwaveIndex];
        this.spawnQueue = [];
        for (let i = 0; i < sw.count; i++) {
            this.spawnQueue.push({
                type: sw.enemy_type,
                spawnIndex: sw.spawn_index || 0,
            });
        }
        this.spawnTimer = 0;
        this.currentSpawnDelay = sw.spawn_delay;
    }

    updateWaveSpawning(dt) {
        if (!this.waveActive) return;

        // Subwave delay
        if (this.subwaveDelay > 0) {
            this.subwaveDelay -= dt;
            return;
        }

        if (this.spawnQueue.length === 0) {
            // Move to next subwave
            this.subwaveIndex++;
            const waveData = WAVE_DATA[this.wave - 1];
            if (this.subwaveIndex >= waveData.subwaves.length) return;
            this.subwaveDelay = waveData.delay_between_subwaves || 2.5;
            this.setupSubwave();
            return;
        }

        this.spawnTimer += dt;
        while (this.spawnTimer >= this.currentSpawnDelay && this.spawnQueue.length > 0) {
            this.spawnTimer -= this.currentSpawnDelay;
            const spawn = this.spawnQueue.shift();
            this.spawnEnemy(spawn.type, spawn.spawnIndex);
        }
    }

    spawnEnemy(type, spawnIndex = 0) {
        const spawnPos = this.spawns[Math.min(spawnIndex, this.spawns.length - 1)];
        const data = ENEMY_DATA[type];
        let route;

        if (data.is_flying) {
            route = getFlyingPath(spawnPos, this.exits);
        } else {
            const key = `${spawnPos[0]},${spawnPos[1]}`;
            route = this.routes[key] || [];
        }

        if (route.length === 0) return;

        const enemy = new Enemy(type, this.wave, route, spawnIndex);
        this.enemies.push(enemy);
        this.effects.addPortalParticles(enemy.pixelX, enemy.pixelY);

        // Track enemy discovery for bestiary
        if (!this.saveData.stats.discovered) this.saveData.stats.discovered = {};
        if (!this.saveData.stats.discovered[type]) {
            this.saveData.stats.discovered[type] = true;
            saveSaveData(this.saveData);
        }
    }

    updateEnemies(dt) {
        for (const e of this.enemies) {
            e.update(dt);

            if (e.reachedExit && e.alive) {
                e.alive = false;
                this.lives -= e.livesCost;
                this.perfectWave = false;
                if (this.lives <= 0) {
                    this.lives = 0;
                    this.state = GameState.LOST;
                    this.effects.addAnnouncement('GAME OVER', '#ff4444');
                    return; // Stop processing immediately
                }
            }
        }

        // Process deaths
        const dead = this.enemies.filter(e => !e.alive && !e.reachedExit && !e._processed);
        for (const e of dead) {
            e._processed = true;
            this.gold += e.reward;
            this.effects.registerKill(e.pixelX, e.pixelY);
            this.effects.addFloatingText(e.pixelX, e.pixelY, `+$${e.reward}`, '#ffd700');

            // Death particles
            for (let i = 0; i < 5; i++) {
                this.effects.addParticle(e.pixelX, e.pixelY, '#ff4444');
            }

            // Summoner death
            if (e.ability === 'summon_on_death' && e.summonType) {
                for (let i = 0; i < e.summonCount; i++) {
                    const impRoute = [...e.route.slice(e.routeIndex)];
                    if (impRoute.length === 0) impRoute.push({ x: e.x, y: e.y });
                    else impRoute[0] = { x: e.x + (Math.random() - 0.5), y: e.y + (Math.random() - 0.5) };
                    const imp = new Enemy(EnemyType.IMP, this.wave, impRoute, e.spawnIndex);
                    imp.x = e.x + (Math.random() - 0.5) * 0.5;
                    imp.y = e.y + (Math.random() - 0.5) * 0.5;
                    this.enemies.push(imp);
                }
            }

            // Boss death screen shake
            if (e.type === EnemyType.BOSS) {
                this.effects.addScreenShake(0.5, 8);
                this.bossesKilled++;
            }

            this.totalKills++;
        }

        // Cleanup
        this.enemies = this.enemies.filter(e => e.alive || (!e._processed && !e.reachedExit));
    }

    updateTowers(dt) {
        for (const tower of this.towers) {
            const result = tower.update(dt, this.enemies);
            if (!result) continue;

            if (result.type === 'fire') {
                if (tower.isAoePulse) {
                    // Doom Spire: instant AoE
                    const kills = resolveAoePulse(tower, this.enemies, this.effects);
                    this.processKills(kills, tower);
                    tower.fireAnimTimer = 0.15;
                    this.effects.addScreenShake(0.12, 2);
                    this.effects.addTowerFireEffect(tower.type, tower.pixelX, tower.pixelY);
                } else {
                    // Create projectile
                    const proj = new Projectile(tower, result.target);
                    this.projectiles.push(proj);
                    this.effects.addTowerFireEffect(tower.type, tower.pixelX, tower.pixelY);
                }
            } else if (result.type === 'gold') {
                this.gold += result.amount;
                this.effects.addFloatingText(tower.pixelX, tower.pixelY - 10, `+$${result.amount}`, '#ffd700');
            } else if (result.type === 'spawn_duck') {
                this.spawnDuck(tower);
            }
        }
    }

    spawnDuck(tower) {
        const data = TOWER_DATA[tower.type];
        const spec = tower.specialization ? data.specializations[tower.specialization] : null;

        if (spec?.mega_duck) {
            const duck = new DuckSoldier(
                tower.gridX, tower.gridY,
                tower.duckHP * 3, tower.duckDamage * 3, tower.duckSpeed, true
            );
            this.ducks.push(duck);
        } else {
            const count = spec?.spawn_count || 1;
            for (let i = 0; i < count; i++) {
                const duck = new DuckSoldier(
                    tower.gridX + (Math.random() - 0.5) * 0.5,
                    tower.gridY + (Math.random() - 0.5) * 0.5,
                    tower.duckHP, tower.duckDamage, tower.duckSpeed
                );
                this.ducks.push(duck);
            }
        }
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            const result = proj.update(dt, this.enemies);

            if (result?.hit) {
                const kills = resolveProjectileHit(proj, this.enemies, this.effects);
                const tower = this.towers.find(t => t.id === proj.towerId);
                this.processKills(kills, tower);
            }

            if (!proj.alive) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    updateDucks(dt) {
        for (let i = this.ducks.length - 1; i >= 0; i--) {
            const duck = this.ducks[i];
            const result = duck.update(dt, this.enemies);

            if (result?.type === 'attack') {
                result.target.takeDamage(result.damage);
                // Duck attack slow
                result.target.applySlow(0.5, 0.3);
                this.effects.addFloatingText(
                    result.target.pixelX, result.target.pixelY - 15,
                    Math.round(result.damage).toString(), '#f0d23c'
                );
            }

            if (!duck.alive) {
                this.ducks.splice(i, 1);
            }
        }

        // Enemy counterattack: ground enemies near ducks deal damage
        for (const duck of this.ducks) {
            if (!duck.alive) continue;
            for (const e of this.enemies) {
                if (!e.alive || e.reachedExit || e.isFlying) continue;
                const dx = e.x - duck.x;
                const dy = e.y - duck.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= 1.5) {
                    duck.takeDamage(e.maxHP * 0.03 * dt);
                }
            }
        }
    }

    updateEnemyAbilities(dt) {
        for (const e of this.enemies) {
            if (!e.alive) continue;

            // Healer
            if (e.ability === 'heal_aura' && e.healTimer >= e.healCooldown) {
                e.healTimer = 0;
                for (const other of this.enemies) {
                    if (other === e || !other.alive) continue;
                    if (e.distanceTo(other) <= e.healRadius) {
                        const healAmt = Math.min(e.healAmount, other.maxHP - other.hp);
                        if (healAmt > 0) {
                            other.hp += healAmt;
                            this.effects.addFloatingText(
                                other.pixelX, other.pixelY - 20, `+${Math.round(healAmt)}`, '#78c850'
                            );
                        }
                    }
                }
            }

            // Disruptor
            if (e.ability === 'disable_tower' && e.disableTimer >= e.disableCooldown) {
                e.disableTimer = 0;
                const nearbyTowers = this.towers.filter(t =>
                    t.distanceToPoint?.(e.x, e.y) <= e.disableRadius ||
                    Math.sqrt((t.gridX - e.x) ** 2 + (t.gridY - e.y) ** 2) <= e.disableRadius
                );
                if (nearbyTowers.length > 0) {
                    const target = nearbyTowers[Math.floor(Math.random() * nearbyTowers.length)];
                    target.disable(e.disableDuration);
                }
            }

            // Boss stun
            if (e.ability === 'tower_stun' && e.stunTimer >= e.stunCooldown) {
                e.stunTimer = 0;
                for (const t of this.towers) {
                    const dist = Math.sqrt((t.gridX - e.x) ** 2 + (t.gridY - e.y) ** 2);
                    if (dist <= e.stunRadius) {
                        t.stun(e.stunDuration);
                    }
                }
                this.effects.addExpandingRing(e.pixelX, e.pixelY, e.stunRadius * TILE_SIZE, '#7828b4');
                this.effects.addScreenShake(0.15, 3);
            }
        }
    }

    processKills(kills, tower) {
        // Track kills per tower
        if (tower && kills.length > 0) {
            tower.totalKills = (tower.totalKills || 0) + kills.length;
        }
        // Additional processing for kills (combos, mint bonus, etc.)
        for (const e of kills) {
            if (tower?.specialization === 'A' && tower.type === TowerType.DOOM_SPIRE) {
                // Death explosion
                const spec = TOWER_DATA[tower.type].specializations.A;
                if (spec.death_explosion) {
                    for (const other of this.enemies) {
                        if (other === e || !other.alive) continue;
                        if (e.distanceTo(other) <= 2.0) {
                            other.takeDamage(tower.damage * spec.death_explosion_pct);
                        }
                    }
                }
            }
        }
    }

    updateSynergies() {
        // Reset synergy buffs
        for (const t of this.towers) {
            t.synergyDamageBonus = 0;
            t.synergyRangeBonus = 0;
            t.synergyFireRateBonus = 1.0;
            t.auraDamageBonus = 0;
            t.auraFireRateBonus = 1.0;
        }

        // Synergies
        this._activeSynergies = [];
        for (const [, synergy] of Object.entries(SYNERGIES)) {
            for (const t1 of this.towers) {
                if (!synergy.towers.includes(t1.type)) continue;
                for (const t2 of this.towers) {
                    if (t1 === t2 || !synergy.towers.includes(t2.type)) continue;
                    if (t1.type === t2.type) continue;
                    const dist = Math.max(Math.abs(t1.gridX - t2.gridX), Math.abs(t1.gridY - t2.gridY));
                    if (dist <= 1) {
                        if (synergy.buff.damage) {
                            t1.synergyDamageBonus = Math.max(t1.synergyDamageBonus, synergy.buff.damage);
                            t2.synergyDamageBonus = Math.max(t2.synergyDamageBonus, synergy.buff.damage);
                        }
                        if (synergy.buff.range) {
                            t1.synergyRangeBonus = Math.max(t1.synergyRangeBonus, synergy.buff.range);
                            t2.synergyRangeBonus = Math.max(t2.synergyRangeBonus, synergy.buff.range);
                        }
                        if (synergy.buff.fire_rate) {
                            t1.synergyFireRateBonus = Math.min(t1.synergyFireRateBonus, synergy.buff.fire_rate);
                            t2.synergyFireRateBonus = Math.min(t2.synergyFireRateBonus, synergy.buff.fire_rate);
                        }
                        this._activeSynergies.push({
                            x1: t1.pixelX, y1: t1.pixelY,
                            x2: t2.pixelX, y2: t2.pixelY,
                        });
                    }
                }
            }
        }

        // Aura tower buffs
        for (const aura of this.towers) {
            if (!aura.isSupport) continue;
            for (const t of this.towers) {
                if (t === aura || t.isSupport || t.isEconomy) continue;
                const dist = Math.sqrt((aura.gridX - t.gridX) ** 2 + (aura.gridY - t.gridY) ** 2);
                if (dist <= aura.range) {
                    if (aura.auraBuff === 'attack_speed') {
                        t.auraFireRateBonus = Math.min(t.auraFireRateBonus, aura.auraAttackSpeed);
                    } else {
                        t.auraDamageBonus = Math.max(t.auraDamageBonus, aura.auraDamage);
                    }
                }
            }
        }
    }

    checkWaveComplete() {
        if (!this.waveActive) return;
        if (this.state === GameState.LOST) return; // Don't override game over

        const waveData = WAVE_DATA[this.wave - 1];
        const allSpawned = this.subwaveIndex >= waveData.subwaves.length && this.spawnQueue.length === 0;
        const allDead = this.enemies.every(e => !e.alive || e.reachedExit);

        if (allSpawned && allDead) {
            this.waveActive = false;

            // Wave bonus
            const bonus = waveData.bonus_gold;
            this.gold += bonus;
            this.effects.addFloatingText(480, 350, `Wave Bonus: +$${bonus}`, '#ffd700', 1.5);

            // Interest
            const interest = Math.min(Math.floor(this.gold * INTEREST_RATE), INTEREST_CAP);
            if (interest > 0) {
                this.gold += interest;
                this.effects.addFloatingText(480, 370, `Interest: +$${interest}`, '#c8aa32', 1.5);
            }

            // Perfect wave bonus
            if (this.perfectWave) {
                this.gold += PERFECT_WAVE_BONUS;
                this.effects.addFloatingText(480, 390, `Perfect: +$${PERFECT_WAVE_BONUS}`, '#64ff64', 1.5);
            }

            // Check win
            if (this.wave >= TOTAL_WAVES) {
                this.state = GameState.WON;
                this.effects.addAnnouncement('VICTORY!', '#ffd700');
            } else {
                this.state = GameState.PREP;
            }

            // Cleanup
            this.enemies = [];
            this.projectiles = [];
        }
    }

    // Get wave preview info for upcoming wave
    getNextWaveInfo() {
        const nextIdx = this.wave; // 0-indexed next wave (wave is 1-indexed current)
        if (nextIdx >= WAVE_DATA.length) return null;
        const wd = WAVE_DATA[nextIdx];
        const types = new Set();
        let total = 0;
        for (const sw of wd.subwaves) {
            types.add(sw.enemy_type);
            total += sw.count;
        }
        return { wave: nextIdx + 1, enemyTypes: [...types], totalEnemies: total };
    }

    getCurrentWaveInfo() {
        if (this.wave <= 0 || this.wave > WAVE_DATA.length) return null;
        const wd = WAVE_DATA[this.wave - 1];
        let total = 0;
        for (const sw of wd.subwaves) total += sw.count;
        return { wave: this.wave, totalEnemies: total, bonusGold: wd.bonus_gold };
    }

    draw() {
        this.renderer.clear();

        if (this.state === GameState.MAIN_MENU) {
            this.ui.drawMainMenu(this.ctx, this.saveData.essence);
            return;
        }

        if (this.state === GameState.MAP_SELECT) {
            this.ui.drawMapSelect(this.ctx, this.maps);
            return;
        }

        if (this.state === GameState.WORKSHOP) {
            this.workshop.draw(this.ctx, this.saveData);
            return;
        }

        if (this.state === GameState.BESTIARY) {
            this.bestiary.draw(this.ctx, this.saveData);
            return;
        }

        if (this.state === GameState.EDITOR) {
            if (this.mapEditor) {
                this.mapEditor.draw(this.ctx, this.input.mouseX, this.input.mouseY);
            }
            return;
        }

        // Draw game
        this.renderer.drawMap(this.tiles);
        this.renderer.drawSynergyLines(this._activeSynergies || []);
        this.renderer.drawTowers(this.towers);
        this.renderer.drawEnemies(this.enemies);
        this.renderer.drawDucks(this.ducks);
        this.renderer.drawProjectiles(this.projectiles);

        // Ghost tower
        if (this.placingTowerType && this.input.isOnGrid) {
            const canPlace = this.canPlaceTower(this.input.gridX, this.input.gridY);
            const tdata = TOWER_DATA[this.placingTowerType];
            let rangeTiles = tdata.range || 0;
            // Account for high ground bonus
            if (this.tiles[this.input.gridY]?.[this.input.gridX] === TileType.HIGH_GROUND) {
                rangeTiles += 1.0;  // HIGH_GROUND_RANGE_BONUS
            }
            this.renderer.drawGhostTower(this.placingTowerType, this.input.gridX, this.input.gridY, canPlace, rangeTiles);
        }

        // Effects
        this.effects.draw(this.ctx);

        // Day/night tint
        this.renderer.drawDayNightTint(this.wave, 20);

        // UI
        const aliveEnemies = this.enemies.filter(e => e.alive && !e.reachedExit).length;
        const nextWave = this.getNextWaveInfo();
        const curWave = this.getCurrentWaveInfo();
        this.ui.drawHUD(this.ctx, this.gold, this.lives, this.wave, aliveEnemies, this.state, this.speedMultiplier);
        this.ui.drawBottomBar(this.ctx, this.state, this.speedMultiplier, nextWave, curWave);
        this.ui.drawShopPanel(this.ctx, this.gold, this.selectedTower, this.placingTowerType, this.saveData.unlocks);

        // Hover tooltip (before overlay menus, only during active gameplay)
        if (this.state === GameState.PREP || this.state === GameState.COMBAT) {
            this.ui.drawTooltip(this.ctx, this.input.mouseX, this.input.mouseY,
                this.towers, this.enemies, this.tiles, this.placingTowerType);
        }

        // Overlay menus
        if (this.state === GameState.PAUSED) this.ui.drawPauseMenu(this.ctx);
        if (this.state === GameState.WON) this.ui.drawWinScreen(this.ctx, this.wave, this.bossesKilled, this.totalKills);
        if (this.state === GameState.LOST) this.ui.drawLoseScreen(this.ctx, this.wave, this.bossesKilled, this.totalKills);
    }
}
