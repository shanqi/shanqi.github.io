// constants.js — All game constants, enums, and colors

// Fonts — modern system font stack for crisp rendering
export const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif";
export const FONT_MONO = "'SF Mono', 'Cascadia Code', 'Consolas', 'Menlo', monospace";

export const TILE_SIZE = 32;
export const GRID_WIDTH = 30;
export const GRID_HEIGHT = 20;
export const PANEL_WIDTH = 280;
export const TOP_BAR_HEIGHT = 50;
export const BOTTOM_BAR_HEIGHT = 50;
export const EXTRA_HEIGHT = 40;
export const SCREEN_WIDTH = GRID_WIDTH * TILE_SIZE + PANEL_WIDTH;  // 1240
export const SCREEN_HEIGHT = GRID_HEIGHT * TILE_SIZE + TOP_BAR_HEIGHT + BOTTOM_BAR_HEIGHT + EXTRA_HEIGHT;  // 780
export const GRID_OFFSET_X = 0;
export const GRID_OFFSET_Y = TOP_BAR_HEIGHT;
// Aliases for backward compat
export const HUD_HEIGHT = TOP_BAR_HEIGHT;

// Game states
export const GameState = {
    MAIN_MENU: 'MAIN_MENU',
    MAP_SELECT: 'MAP_SELECT',
    WORKSHOP: 'WORKSHOP',
    BESTIARY: 'BESTIARY',
    EDITOR: 'EDITOR',
    PREP: 'PREP',
    COMBAT: 'COMBAT',
    PAUSED: 'PAUSED',
    WON: 'WON',
    LOST: 'LOST',
};

// Tile types
export const TileType = {
    GRASS: 0,
    PATH: 1,
    WATER: 2,
    TREE: 3,
    ROCK: 4,
    SPAWN: 5,
    EXIT: 6,
    TOWER_BASE: 7,
    HIGH_GROUND: 8,
    BUILDING: 9,    // School building — dark roof, non-buildable
    FIELD: 10,      // Sports field — bright turf green, non-buildable
    PARKING: 11,    // Parking lot — gray asphalt, non-buildable
};

// Tower types
export const TowerType = {
    ARROW: 'arrow',
    CANNON: 'cannon',
    MAGE: 'mage',
    ICE: 'ice',
    SKY_HUNTER: 'sky_hunter',
    FLAME: 'flame',
    TESLA: 'tesla',
    SNIPER: 'sniper',
    HARRY_DUCK: 'harry_duck',
    AURA: 'aura',
    GOLD_MINE: 'gold_mine',
    DOOM_SPIRE: 'doom_spire',
};

// Damage types
export const DamageType = {
    KINETIC: 'kinetic',
    EXPLOSIVE: 'explosive',
    ENERGY: 'energy',
    FROST: 'frost',
    FIRE: 'fire',
};

// Armor types
export const ArmorType = {
    UNARMORED: 'unarmored',
    PLATED: 'plated',
    ETHEREAL: 'ethereal',
    RESISTANT: 'resistant',
};

// Target modes
export const TargetMode = {
    FIRST: 'first',
    LAST: 'last',
    STRONGEST: 'strongest',
    WEAKEST: 'weakest',
    AIR_ONLY: 'air_only',
    GROUND_ONLY: 'ground_only',
};

// Enemy types
export const EnemyType = {
    GRUNT: 'grunt',
    RUNNER: 'runner',
    TANK: 'tank',
    GHOST: 'ghost',
    HEALER: 'healer',
    WASP: 'wasp',
    DISRUPTOR: 'disruptor',
    SUMMONER: 'summoner',
    IMP: 'imp',
    BOSS: 'boss',
};

// Armor damage multipliers
export const ARMOR_MATRIX = {
    [ArmorType.UNARMORED]: {
        [DamageType.KINETIC]: 1.0, [DamageType.EXPLOSIVE]: 1.0,
        [DamageType.ENERGY]: 1.0, [DamageType.FROST]: 1.0, [DamageType.FIRE]: 1.0,
    },
    [ArmorType.PLATED]: {
        [DamageType.KINETIC]: 0.5, [DamageType.EXPLOSIVE]: 0.5,
        [DamageType.ENERGY]: 1.5, [DamageType.FROST]: 1.0, [DamageType.FIRE]: 1.5,
    },
    [ArmorType.ETHEREAL]: {
        [DamageType.KINETIC]: 1.5, [DamageType.EXPLOSIVE]: 1.5,
        [DamageType.ENERGY]: 0.5, [DamageType.FROST]: 0.5, [DamageType.FIRE]: 0.5,
    },
    [ArmorType.RESISTANT]: {
        [DamageType.KINETIC]: 0.75, [DamageType.EXPLOSIVE]: 0.75,
        [DamageType.ENERGY]: 0.75, [DamageType.FROST]: 0.75, [DamageType.FIRE]: 0.75,
    },
};

// Economy
export const STARTING_GOLD = 400;
export const STARTING_LIVES = 20;
export const INTEREST_RATE = 0.02;
export const INTEREST_CAP = 10;
export const SELL_REFUND_RATIO = 0.6;
export const PERFECT_WAVE_BONUS = 10;
export const EARLY_START_BONUS = 5;
export const MAX_GOLD_MINES = 5;
export const HIGH_GROUND_RANGE_BONUS = 1.0;
export const TOTAL_WAVES = 20;

// Combat
export const SPLASH_DAMAGE_RATIO = 0.6;
export const CHAIN_DAMAGE_RATIO = 0.7;
export const CHAIN_MAX_DISTANCE = 3.0;
export const ARMOR_BREAK_MULTIPLIER = 1.25;

// Synergies
export const SYNERGIES = {
    steam:    { towers: [TowerType.ICE, TowerType.FLAME],   buff: { damage: 0.15 }, name: 'Steam' },
    marksman: { towers: [TowerType.ARROW, TowerType.SNIPER], buff: { range: 0.10 }, name: 'Marksman' },
    arcane:   { towers: [TowerType.TESLA, TowerType.MAGE],  buff: { fire_rate: 0.80 }, name: 'Arcane Surge' },
    fortified:{ towers: [TowerType.CANNON, TowerType.ARROW], buff: { damage: 0.10 }, name: 'Fortified' },
    arctic:   { towers: [TowerType.ICE, TowerType.SNIPER],  buff: { damage: 0.12 }, name: 'Arctic Precision' },
};

// Projectile speeds (tiles/sec)
export const PROJECTILE_SPEEDS = {
    [TowerType.ARROW]: 12,
    [TowerType.CANNON]: 8,
    [TowerType.MAGE]: 10,
    [TowerType.ICE]: 10,
    [TowerType.SKY_HUNTER]: 14,
    [TowerType.FLAME]: 9,
    [TowerType.TESLA]: 11,
    [TowerType.SNIPER]: 18,
    [TowerType.DOOM_SPIRE]: 0,
};

// Colors — match Python version exactly (RGB tuples → hex)
export const Colors = {
    // UI
    BG: '#1a1a2e',         // (26, 26, 46)
    BG_LIGHT: '#282846',   // (40, 40, 70)
    PANEL: '#1e1e37',      // (30, 30, 55)
    PANEL_BORDER: '#3c3c64', // (60, 60, 100)
    ACCENT: '#e6b800',     // (230, 184, 0)
    DANGER: '#ff4444',     // (255, 68, 68)
    SUCCESS: '#44ff44',    // (68, 255, 68)
    TEXT: '#ffffff',
    TEXT_DIM: '#c8c8c8',   // (200, 200, 200)
    TEXT_DARK: '#969696',  // (150, 150, 150)
    GOLD: '#ffd700',       // (255, 215, 0)
    BLACK: '#000000',
    WHITE: '#ffffff',

    // Tiles
    GRASS_DARK: '#4a7c2e',
    GRASS_LIGHT: '#5a9e37',
    PATH: '#c4a663',
    PATH_EDGE: '#b0935a',
    WATER: '#3d85c6',
    WATER_HIGHLIGHT: '#5ba3e6',
    TREE_TRUNK: '#2d5a1e',
    TREE_CANOPY: '#3b7a28',
    ROCK: '#888888',
    ROCK_DARK: '#666666',
    HIGH_GROUND: '#d4a03c',
    HIGH_GROUND_EDGE: '#c4903a',
    SPAWN: '#ff6464',
    EXIT: '#64ff64',

    // Damage types
    KINETIC: '#c4804a',
    EXPLOSIVE: '#ff6633',
    ENERGY: '#9933ff',
    FROST: '#66ccff',
    FIRE: '#ff3300',

    // Health bar
    HP_GREEN: '#00c800',
    HP_YELLOW: '#ffff00',
    HP_RED: '#ff0000',
    HP_BG: '#3c3c3c',
};

// Tower colors
export const TowerColors = {
    [TowerType.ARROW]:      '#a07838',
    [TowerType.CANNON]:     '#646464',
    [TowerType.MAGE]:       '#823cc8',
    [TowerType.ICE]:        '#64b4f0',
    [TowerType.SKY_HUNTER]: '#b48c50',
    [TowerType.FLAME]:      '#dc5a1e',
    [TowerType.TESLA]:      '#3cb4dc',
    [TowerType.SNIPER]:     '#5a4638',
    [TowerType.HARRY_DUCK]: '#f0d23c',
    [TowerType.AURA]:       '#e6c83c',
    [TowerType.GOLD_MINE]:  '#c8aa32',
    [TowerType.DOOM_SPIRE]: '#b428dc',
};

// Enemy colors
export const EnemyColors = {
    [EnemyType.GRUNT]:     '#50b43c',
    [EnemyType.RUNNER]:    '#3c8cdc',
    [EnemyType.TANK]:      '#c83c3c',
    [EnemyType.GHOST]:     '#b4a0dc',
    [EnemyType.HEALER]:    '#78c850',
    [EnemyType.WASP]:      '#e6c832',
    [EnemyType.DISRUPTOR]: '#8c3cb4',
    [EnemyType.SUMMONER]:  '#3ca08c',
    [EnemyType.IMP]:       '#dc5050',
    [EnemyType.BOSS]:      '#7828b4',
};

// Upgrade stat multipliers per level (0=base, 1-7=upgrades)
export const UPGRADE_MULTIPLIERS = [
    { damage: 1.0,  range: 1.0,  fire_rate: 1.0  },  // level 1 (base)
    { damage: 1.15, range: 1.05, fire_rate: 1.0  },  // level 2
    { damage: 1.35, range: 1.10, fire_rate: 1.0  },  // level 3
    { damage: 1.55, range: 1.15, fire_rate: 0.94 },  // level 4
    { damage: 1.80, range: 1.22, fire_rate: 0.90 },  // level 5
    { damage: 2.10, range: 1.30, fire_rate: 0.85 },  // level 6
    { damage: 2.50, range: 1.40, fire_rate: 0.80 },  // level 7
];

// Challenge modifiers
export const CHALLENGE_MODIFIERS = {
    speed_demon:  { name: 'Speed Demon',  desc: 'Enemies +25% speed, +50% gold', essence_mult: 1.3 },
    iron_man:     { name: 'Iron Man',     desc: 'Cannot sell towers',            essence_mult: 1.2 },
    minimalist:   { name: 'Minimalist',   desc: 'Max 10 towers',                essence_mult: 1.5 },
    glass_cannon: { name: 'Glass Cannon', desc: '2x tower damage, 5 lives',     essence_mult: 1.4 },
};
