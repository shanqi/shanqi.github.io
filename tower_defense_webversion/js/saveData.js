// saveData.js — localStorage persistence for essence, upgrades, unlocks, stats

const SAVE_KEY = 'tower_defense_save';

const DEFAULT_SAVE = {
    essence: 0,
    upgrades: {
        starting_economy: 0,
        better_lives: 0,
        interest_rate: 0,
        salvage_expert: 0,
    },
    unlocks: {
        mage_tower: false,
        aura_tower: false,
    },
    mastery: {
        arrow: 0, cannon: 0, mage: 0, ice: 0, sky_hunter: 0,
        flame: 0, tesla: 0, sniper: 0, harry_duck: 0, aura: 0, gold_mine: 0,
    },
    stats: {
        games_played: 0,
        best_wave: 0,
        total_kills: 0,
    },
};

// Workshop upgrade definitions
export const WORKSHOP_UPGRADES = {
    starting_economy: { name: 'Starting Economy', desc: '+50g per level', max: 3, costs: [100, 250, 500], effect: 50 },
    better_lives:     { name: 'Better Lives',     desc: '+5 lives per level', max: 2, costs: [200, 400], effect: 5 },
    interest_rate:    { name: 'Interest Rate',     desc: '+5 interest cap per level', max: 4, costs: [150, 300, 500, 800], effect: 5 },
    salvage_expert:   { name: 'Salvage Expert',    desc: '+10% sell refund per level', max: 2, costs: [300, 600], effect: 0.1 },
};

export const TOWER_UNLOCKS = {
    mage_tower: { name: 'Mage Tower',  desc: 'Unlock the Mage tower', cost: 200 },
    aura_tower: { name: 'Aura Tower',  desc: 'Unlock the Aura tower', cost: 400 },
};

export const TOWER_MASTERY = {
    arrow:      { name: 'Arrow Mastery',      desc: '-5% cost/level',        max: 4, costs: [100, 200, 400, 700] },
    cannon:     { name: 'Cannon Mastery',     desc: '+0.3 AoE radius/level', max: 4, costs: [150, 300, 500, 800] },
    mage:       { name: 'Mage Mastery',       desc: '+5% damage/level',      max: 4, costs: [150, 300, 500, 800] },
    ice:        { name: 'Ice Mastery',        desc: '+0.3s slow dur/level',  max: 4, costs: [100, 200, 400, 700] },
    sky_hunter: { name: 'Sky-Hunter Mastery', desc: '+0.5 range/level',      max: 4, costs: [120, 250, 450, 750] },
    flame:      { name: 'Flame Mastery',      desc: '+10% burn dmg/level',   max: 4, costs: [120, 250, 450, 750] },
    tesla:      { name: 'Tesla Mastery',      desc: '+1 chain target/level', max: 4, costs: [150, 300, 500, 800] },
    sniper:     { name: 'Sniper Mastery',     desc: '+8% damage/level',      max: 4, costs: [150, 300, 500, 800] },
    harry_duck: { name: 'Harry Duck Mastery', desc: '+15% duck HP/level',    max: 4, costs: [200, 350, 550, 850] },
    aura:       { name: 'Aura Mastery',       desc: '+0.5 buff radius/level',max: 4, costs: [200, 350, 550, 850] },
    gold_mine:  { name: 'Gold Mine Mastery',  desc: '+1g/tick/level',        max: 4, costs: [100, 200, 400, 700] },
};

export function loadSaveData() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            // Merge with defaults to handle new fields
            return deepMerge(structuredClone(DEFAULT_SAVE), data);
        }
    } catch (e) {
        console.warn('Failed to load save data:', e);
    }
    return structuredClone(DEFAULT_SAVE);
}

export function saveSaveData(data) {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save data:', e);
    }
}

function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

// Calculate essence earned from a completed game
export function calculateEssence(wavesCompleted, bossesKilled, won, challengeMult = 1.0) {
    let essence = wavesCompleted * 10 + bossesKilled * 100;
    if (won) essence += 500;
    return Math.floor(essence * challengeMult);
}
