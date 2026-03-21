# Tower Defense Web Version — Complete Knowledge Base

**Version:** v0.2.20 | **Date:** March 2026 | **Lines:** ~7,800 JS across 23 files
**Producer:** Harry the Duck | **Engine:** HTML5 Canvas + ES6 Modules

This document contains everything needed to recreate the game from scratch.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Screen Layout & Dimensions](#2-screen-layout--dimensions)
3. [Game States & Flow](#3-game-states--flow)
4. [Towers — All 12 Types](#4-towers--all-12-types)
5. [Enemies — All 10 Types](#5-enemies--all-10-types)
6. [Waves — All 20 Waves](#6-waves--all-20-waves)
7. [Maps — All 5 Maps](#7-maps--all-5-maps)
8. [Combat System](#8-combat-system)
9. [Economy System](#9-economy-system)
10. [Synergy System](#10-synergy-system)
11. [Duck Soldier System](#11-duck-soldier-system)
12. [Workshop — Meta-Progression](#12-workshop--meta-progression)
13. [Challenge Modifiers](#13-challenge-modifiers)
14. [Bestiary — Enemy Encyclopedia](#14-bestiary--enemy-encyclopedia)
15. [Map Editor](#15-map-editor)
16. [Companion Duck (Harry)](#16-companion-duck-harry)
17. [UI Design — Complete Specification](#17-ui-design--complete-specification)
18. [Visual Polish & Effects](#18-visual-polish--effects)
19. [Save System](#19-save-system)
20. [Input & Controls](#20-input--controls)
21. [Fonts & Colors Reference](#21-fonts--colors-reference)
22. [Design Principles](#22-design-principles)

---

## 1. Project Structure

```
tower_defense_webversion/
├── index.html                  Entry point (ES6 module loader)
├── game_bundled.html           Single-file bundle (for file:// serving)
├── css/style.css               Dark theme, HiDPI scaling, font smoothing
├── KNOWLEDGE.md                This file
└── js/
    ├── main.js                 Game loop, HiDPI canvas setup, requestAnimationFrame
    ├── constants.js            All enums, colors, dimensions, balance numbers, font stacks
    ├── towerData.js            12 tower definitions, upgrade costs, specializations
    ├── enemyData.js            10 enemy definitions, wave-scaling functions
    ├── waveData.js             20 wave definitions (subwaves, bonus gold)
    ├── mapData.js              5 maps (30×20 tile grids, spawns, exits, high grounds)
    ├── saveData.js             localStorage persistence, workshop data, essence calc
    ├── pathfinding.js          BFS route-finding, flying paths
    ├── sprites.js              Procedural Canvas2D sprite generation (~730 lines)
    ├── enemy.js                Enemy class (movement, status effects, animation)
    ├── tower.js                Tower class (targeting, upgrades, synergy buffs, damage calc)
    ├── projectile.js           Projectile with trail history, specialization data
    ├── duckSoldier.js          Duck soldier AI (seek, attack, lifetime)
    ├── combat.js               Damage resolution, armor matrix, splash, chain, AoE pulse
    ├── effects.js              Particles, floating text, rings, lightning, combos, screen shake
    ├── renderer.js             Map/tower/enemy/projectile/duck rendering, visual polish
    ├── ui.js                   HUD, shop panel, menus, tooltips, wave preview
    ├── input.js                Mouse (click + held state + up) + keyboard input
    ├── workshop.js             Meta-progression screen (upgrades, unlocks, mastery)
    ├── bestiary.js             Enemy encyclopedia with discovery tracking
    ├── mapEditor.js            Tile painting, validation, save/load custom maps
    ├── companionDuck.js        Harry the Duck companion (wanders, inspects, speaks)
    └── game.js                 Core state machine, all systems wired together (~1050 lines)
```

## 2. Screen Layout & Dimensions

```
Total: 1240 × 780 pixels
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR (50px) — gradient bg, gold/lives/wave/enemies      │
│  Icons: coin(18px), heart, flag+pole, skull                 │
│  Stats: 14px labels + bold 22px monospace values            │
│  Positions: Gold@28, Lives@180, Wave@340, Enemies@510       │
│  Speed indicator@660, Pause button top-right                │
├─────────────────────────────────────┬───────────────────────┤
│                                     │  SHOP PANEL (280px)   │
│  GAME GRID (960 × 640)             │  "TOWERS" title       │
│  30 cols × 20 rows, 32px tiles     │  12 tower buttons     │
│  Origin: (0, 50)                   │  50px h, 54px spacing │
│                                     │  OR Tower Info view   │
│                                     │                       │
├─────────────────────────────────────┴───────────────────────┤
│  BOTTOM BAR (50px) — gradient bg                            │
│  [START WAVE] [1x] [2x] [4x]    Next wave preview (PREP)   │
│                                  Wave info text (COMBAT)    │
├─────────────────────────────────────────────────────────────┤
│  EXTRA SPACE (40px)                                         │
└─────────────────────────────────────────────────────────────┘
```

**Key constants:**
- `TILE_SIZE = 32`, `GRID_WIDTH = 30`, `GRID_HEIGHT = 20`
- `PANEL_WIDTH = 280`, `TOP_BAR_HEIGHT = 50`, `BOTTOM_BAR_HEIGHT = 50`, `EXTRA_HEIGHT = 40`
- `SCREEN_WIDTH = 1240`, `SCREEN_HEIGHT = 780`
- HiDPI: canvas rendered at `devicePixelRatio` scale, CSS-scaled down

## 3. Game States & Flow

```
MAIN_MENU → MAP_SELECT → PREP ⇄ COMBAT → WON/LOST → MAIN_MENU
    ↓           ↑                  ↑
 WORKSHOP    (back)             PAUSED
 BESTIARY
 EDITOR
```

States: `MAIN_MENU`, `MAP_SELECT`, `WORKSHOP`, `BESTIARY`, `EDITOR`, `PREP`, `COMBAT`, `PAUSED`, `WON`, `LOST`

**Main Menu buttons:** Play Game, Workshop, Map Editor, Bestiary, Quit
**Pause menu:** Resume, Restart, Quit to Menu

## 4. Towers — All 12 Types

### Base Stats

| Tower | Cost | Dmg | Type | Range | Rate | Splash | Target | Air | Gnd | Unlock |
|-------|------|-----|------|-------|------|--------|--------|-----|-----|--------|
| Arrow | 25 | 12 | Kinetic | 4.0 | 0.5s | 0 | First | Y | Y | — |
| Cannon | 50 | 45 | Explosive | 3.0 | 1.5s | 1.5 | First | N | Y | — |
| Mage | 60 | 25 | Energy | 3.5 | 1.0s | 0 | First | Y | Y | Workshop |
| Ice | 40 | 5 | Frost | 3.5 | 1.2s | 0 | First | Y | Y | — |
| Sky-Hunter | 45 | 30 | Kinetic | 5.0 | 0.4s | 0 | Air Only | Y | N | — |
| Flame | 55 | 8 | Fire | 3.0 | 0.8s | 0 | First | N | Y | — |
| Tesla | 65 | 18 | Energy | 3.5 | 1.0s | 0 | First | Y | Y | — |
| Sniper | 75 | 50 | Kinetic | 6.0 | 1.5s | 0 | Strongest | Y | Y | — |
| Harry's Duck Farm | 120 | 0 | — | 5.0 | — | 0 | — | N | N | — |
| Aura | 80 | 0 | — | 3.0 | — | 0 | — | N | N | Workshop |
| Gold Mine | 70 | 0 | — | 0 | — | 0 | — | N | N | — |
| Doom Spire | 1000 | 150 | Energy | 6.0 | 2.5s | 0 | First | Y | Y | — |

### Special Properties
- **Ice:** Applies 50% slow for 2s
- **Flame:** Applies burn 8 dps for 3s
- **Tesla:** Chains to 3 enemies (flat 70% damage per chain)
- **Sky-Hunter:** Air-only targeting, 0.4s fire rate (very fast)
- **Sniper:** Targets strongest enemy
- **Harry's Duck Farm:** Spawns duck soldiers every 4s (only when enemies alive)
- **Aura:** Buffs nearby towers (choose: 0.8× fire rate OR +15% damage). Spec B grants disable immunity.
- **Gold Mine:** Generates gold (scales with level). Max 5 mines.
- **Doom Spire:** AoE pulse hits ALL enemies in range simultaneously (instant, no projectile)

### Upgrade System
- 8 levels total. Upgrades 1-7 use cost table. Level 8 = choose specialization A or B.
- **Stat multipliers per level:**

| Level | Damage | Range | Fire Rate |
|-------|--------|-------|-----------|
| 1 | 1.0× | 1.0× | 1.0× |
| 2 | 1.15× | 1.05× | 1.0× |
| 3 | 1.35× | 1.10× | 1.0× |
| 4 | 1.55× | 1.15× | 0.94× |
| 5 | 1.80× | 1.22× | 0.90× |
| 6 | 2.10× | 1.30× | 0.85× |
| 7 | 2.50× | 1.40× | 0.80× |

### Upgrade Costs

| Tower | Lv2 | Lv3 | Lv4 | Lv5 | Lv6 | Lv7 | Lv8 |
|-------|-----|-----|-----|-----|-----|-----|-----|
| Arrow | 15 | 25 | 40 | 55 | 75 | 100 | 130 |
| Cannon | 30 | 45 | 65 | 85 | 110 | 140 | 180 |
| Mage | 35 | 50 | 70 | 95 | 120 | 155 | 200 |
| Ice | 25 | 40 | 55 | 75 | 100 | 130 | 170 |
| Sky-Hunter | 28 | 42 | 60 | 80 | 105 | 135 | 175 |
| Flame | 32 | 48 | 68 | 90 | 115 | 148 | 190 |
| Tesla | 38 | 55 | 78 | 100 | 130 | 168 | 215 |
| Sniper | 45 | 65 | 90 | 120 | 155 | 200 | 250 |
| Harry's Farm | 70 | 100 | 140 | 185 | 240 | 300 | 380 |
| Aura | 50 | 75 | 105 | 140 | 180 | 230 | 290 |
| Gold Mine | 30 | 50 | 70 | 90 | 120 | 155 | 200 |
| Doom Spire | 200 | 250 | 250 | 250 | 250 | 250 | 250 |

### Specializations (Level 8)

| Tower | Spec A | Effect | Spec B | Effect |
|-------|--------|--------|--------|--------|
| Arrow | Sharpshooter | +50% dmg, +1 range | Rapid Fire | 0.2s fire rate |
| Cannon | Heavy Ordnance | +50% dmg, +1 AoE | Armor Piercer | 3s armor break |
| Mage | Archmage | +50% dmg, chain 2 | Pyromancer | 10dps burn, 3s |
| Ice | Blizzard | AoE 2.0 slow | Permafrost | 75% slow, 3s |
| Sky-Hunter | Falcon Eye | +3 range | Strafing Run | 3-shot burst |
| Flame | Inferno | AoE 2.0, 15dps burn, 4s | Hellfire | 2× burn, +2s |
| Tesla | Storm Spire | 6 chains, +50% dmg | Overcharge | 0.5s stun on chain |
| Sniper | Assassin | 3× dmg to <30% HP | Siege Breaker | Ignore armor |
| Harry's Farm | Duck Army | Spawn 3 ducks | Mega Duck | 1 giant, 3× HP/dmg |
| Aura | War Banner | +2 range, +10% crit | Sanctuary | Immune to disable/stun |
| Gold Mine | Treasury | 8g/5s | Mint | +50% nearby kill gold |
| Doom Spire | Annihilation | 2× dmg, death explosion | Vortex | 1.5 tile pull, 60% slow 3s |

### Gold Mine Level Scaling
Formula: `goldPerTick = 3 + (level-1) * 0.5`, `interval = max(5.0 - (level-1) * 0.15, 2.5)`

| Level | Gold/Tick | Interval | Gold/Min |
|-------|-----------|----------|----------|
| 1 | 3.0g | 5.0s | 36/min |
| 2 | 3.5g | 4.85s | 43/min |
| 3 | 4.0g | 4.7s | 51/min |
| 4 | 4.5g | 4.55s | 59/min |
| 5 | 5.0g | 4.4s | 68/min |
| 6 | 5.5g | 4.25s | 78/min |
| 7 | 6.0g | 4.1s | 88/min |
| 8 (Treasury) | 8.0g | 3.95s | 122/min |

### Projectile Speeds (tiles/sec)
Arrow: 12, Cannon: 8, Mage: 10, Ice: 10, Sky-Hunter: 14, Flame: 9, Tesla: 11, Sniper: 18, Doom Spire: 0 (instant)

## 5. Enemies — All 10 Types

| Enemy | HP | Speed | Armor | Reward | Lives | Flying | Size | Ability |
|-------|-----|-------|-------|--------|-------|--------|------|---------|
| Grunt | 90 | 1.7 | Unarmored | 5g | 1 | No | 32 | — |
| Runner | 60 | 3.4 | Unarmored | 6g | 1 | No | 28 | — |
| Tank | 375 | 0.9 | Plated | 11g | 1 | No | 36 | — |
| Ghost | 150 | 1.4 | Ethereal | 14g | 1 | No | 32 | Debuff immune |
| Healer | 120 | 1.1 | Unarmored | 18g | 1 | No | 32 | Heals 15hp/3s/2 tile radius |
| Wasp | 45 | 2.8 | Unarmored | 8g | 1 | Yes | 24 | — |
| Disruptor | 180 | 1.1 | Plated | 20g | 1 | No | 32 | Disables tower 3s (3 tile range, 5s CD) |
| Summoner | 225 | 1.0 | Ethereal | 28g | 2 | No | 36 | Spawns 3 Imps on death |
| Imp | 30 | 2.3 | Unarmored | 1g | 0 | No | 16 | — |
| Boss | 1500 | 0.7 | Ethereal | 100g | 5 | No | 64 | Stuns towers 2s (4 tile, 8s CD) |

### Scaling per wave
- HP: `base × (1.0 + (wave - 1) × 0.18)`
- Speed: `base × min(1.0 + (wave - 1) × 0.025, 1.5)`
- Reward: `floor(base × (1.0 + (wave - 1) × 0.06))`

### Armor Damage Matrix

| | Kinetic | Explosive | Energy | Frost | Fire |
|--|---------|-----------|--------|-------|------|
| Unarmored | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| Plated | 0.5 | 0.5 | 1.5 | 1.0 | 1.5 |
| Ethereal | 1.5 | 1.5 | 0.5 | 0.5 | 0.5 |
| Resistant | 0.75 | 0.75 | 0.75 | 0.75 | 0.75 |

### Immunity Rules
- **Ghost (debuff_immune):** Immune to slow and armor break
- **Ethereal armor:** Immune to slow and armor break (separate from ability)
- **Aura Sanctuary:** Nearby towers immune to disable and stun

## 6. Waves — All 20 Waves

| Wave | Enemies | Bonus Gold | Notes |
|------|---------|-----------|-------|
| 1 | 20 Grunt | 10 | Tutorial wave |
| 2 | 12 Grunt, 8 Runner | 12 | Introduces speed |
| 3 | 15 Grunt, 6 Tank | 14 | Introduces armor |
| 4 | 10 Runner, 10 Ghost, 8 Grunt | 16 | Introduces ethereal |
| 5 | 24 Grunt, 8 Tank, **1 Boss** | 30 | First boss |
| 6 | 15 Wasp, 12 Grunt, 6 Runner | 20 | Introduces flying |
| 7 | 10 Grunt, 8 Healer, 12 Tank | 22 | Introduces healing |
| 8 | 15 Runner, 6 Disruptor, 10 Ghost | 24 | Introduces disable |
| 9 | 8 Summoner, 15 Grunt, 10 Wasp | 26 | Introduces summon |
| 10 | 20 Tank, 12 Ghost, **2 Boss** | 50 | Double boss |
| 11 | 30 Runner, 8 Healer | 30 | Speed rush |
| 12 | 15 Disruptor, 20 Grunt, 12 Wasp | 32 | Mixed abilities |
| 13 | 12 Summoner, 15 Tank, 8 Ghost | 34 | Tank wave |
| 14 | 25 Runner, 10 Disruptor, 15 Wasp | 36 | Air + disable |
| 15 | 20 Tank, 15 Ghost, 10 Healer, **3 Boss** | 70 | Triple boss |
| 16 | 35 Grunt, 20 Runner, 12 Disruptor | 42 | Mass swarm |
| 17 | 15 Summoner, 20 Tank, 15 Wasp | 44 | Everything |
| 18 | 30 Ghost, 15 Healer, 20 Runner | 46 | Ethereal heavy |
| 19 | 20 Disruptor, 25 Tank, 20 Wasp, 10 Summoner | 48 | Brutal |
| 20 | 30 Tank, 20 Ghost, 25 Runner, 15 Healer, 15 Disruptor, 10 Summoner, 20 Wasp, **4 Boss**, 30 Grunt | 100 | Final wave (169 enemies) |

Default delay between subwaves: 2.5 seconds.

## 7. Maps — All 5 Maps

| Map | Spawns | Exits | High Grounds | Theme |
|-----|--------|-------|-------------|-------|
| First Stand | 1 (0,11) | 1 (29,9) | 13 | Meadow |
| The Pincer | 2 (0,7)(0,11) | 1 (29,11) | 13 | Meadow |
| Split Decision | 1 (0,10) | 2 (29,7)(29,12) | 13 | Forest |
| Fly Zone | 1 (0,9) | 1 (29,9) | 13 | Canyon |
| The Citadel | 3 (0,4)(0,10)(0,14) | 2 (29,7)(29,11) | 13 | Canyon |

Grid: 30×20 tiles. Tile types: 0=Grass, 1=Path, 2=Water, 3=Tree, 4=Rock, 5=Spawn, 6=Exit, 7=TowerBase, 8=HighGround

**High ground placement:** Algorithmically placed at strategic positions — near path bends, chokepoints, and the middle portion of paths. Each map has exactly 13 high grounds. Towers on high ground get +1.0 range bonus.

**Pathfinding:** BFS from each spawn to nearest exit. Flying enemies take direct line. Routes pre-computed on map load.

## 8. Combat System

### Projectile Hit Detection
- Distance threshold: 0.15 tiles (sub-tile precision)
- Projectiles track target; if target dies, continues to last known position

### Splash Damage
- Ratio: 60% of base damage to enemies within `splash_radius`
- Visual: expanding ring effect

### Chain Lightning (Tesla)
- Flat 70% damage per chain (not cascading)
- Max chain distance: 3.0 tiles
- Chains don't repeat targets (tracked via Set)
- Tesla Overcharge spec: 0.5s stun per chain

### AoE Pulse (Doom Spire)
- Hits ALL enemies in range instantly (no projectile)
- Vortex spec: pulls enemies 1.5 tiles inward + 60% slow 3s

### Status Effects
- **Slow:** Reduces speed by strength% for duration. Blocked by debuff_immune and ethereal armor.
- **Burn:** DoT at X dps for duration. NOT blocked by debuff immunity.
- **Stun:** Prevents movement. Applied by Tesla Overcharge chain.
- **Armor Break:** 1.25× armor effectiveness for duration. Blocked by debuff_immune and ethereal.

### Enemy Animation
- 8 frames, 0.12s per frame
- Display HP lerps toward actual HP for smooth bar transition

## 9. Economy System

### Starting Resources
- Gold: **400** (+ workshop bonuses)
- Lives: **20** (+ workshop bonuses)

### Income Sources
1. **Enemy kills:** Variable per type (1-100g), scaled by wave, multiplied by goldRewardMult
2. **Wave completion bonus:** Per-wave amount (10-100g)
3. **Interest:** 2% of gold per wave (cap: 10g, upgradeable in workshop)
4. **Perfect wave bonus:** +10g if no enemies leaked
5. **Early start bonus:** +5g when starting a wave
6. **Gold Mine:** 3-8g per 2.5-5s depending on level

### Tower Selling
- Refund: 60% of total investment (upgradeable to 80% via workshop)
- **Iron Man modifier:** Cannot sell
- **Undo:** Ctrl+Z within 3s = 100% refund (max 3 recent placements)

### Gold Mine Limit
- Maximum 5 gold mines per game

## 10. Synergy System

Adjacent towers (Chebyshev distance ≤ 1, i.e., touching including diagonal) get buffs:

| Synergy | Towers | Buff |
|---------|--------|------|
| Steam | Ice + Flame | +15% damage both |
| Marksman | Arrow + Sniper | +10% range both |
| Arcane Surge | Tesla + Mage | 0.8× fire rate (faster) |
| Fortified | Cannon + Arrow | +10% damage |
| Arctic Precision | Ice + Sniper | +12% damage |

Visual: double-drawn golden dashed glow lines between synergy towers.
Buffs recalculated every frame. Max of each buff type applied (not additive from multiple sources).

## 11. Duck Soldier System

Spawned by Harry's Duck Farm tower every 4 seconds (only during combat with enemies alive).

**Duck Stats:**
- HP: 80, Damage: 15, Speed: 1.8 tiles/sec
- Attack range: 1.8 tiles, Attack rate: 0.8s
- Lifetime: 20 seconds

**Behavior:**
- Seeks nearest ground enemy, moves toward it
- On attack hit: deals damage + applies 50% slow for 0.3s
- **Passive blocking slow:** enemies within 2.5 tiles of any duck get 30% slow for 0.3s
- **Enemy counterattack:** ground enemies within 1.5 tiles deal `maxHP × 3% × dt` damage to duck

**Mega Duck (Spec B):** 1 duck with 3× HP (240), 3× damage (45), size 48px

**Duck Army (Spec A):** Spawns 3 ducks at once

## 12. Workshop — Meta-Progression

Essence currency earned after each game. Spent on upgrades, unlocks, and mastery.

### Global Upgrades

| Upgrade | Effect | Max | Costs |
|---------|--------|-----|-------|
| Starting Economy | +50g starting gold/level | 3 | 100, 250, 500 |
| Better Lives | +5 starting lives/level | 2 | 200, 400 |
| Interest Rate | +5 interest cap/level | 4 | 150, 300, 500, 800 |
| Salvage Expert | +10% sell refund/level | 2 | 300, 600 |

### Tower Unlocks

| Tower | Cost | Unlock |
|-------|------|--------|
| Mage | 200 | Energy damage tower |
| Aura | 400 | Support buff tower |

### Tower Mastery (11 towers, 4 levels each)

| Tower | Effect per Level | Costs |
|-------|-----------------|-------|
| Arrow | -5% cost | 100, 200, 400, 700 |
| Cannon | +0.3 AoE radius | 150, 300, 500, 800 |
| Mage | +5% damage | 150, 300, 500, 800 |
| Ice | +0.3s slow duration | 100, 200, 400, 700 |
| Sky-Hunter | +0.5 range | 120, 250, 450, 750 |
| Flame | +10% burn damage | 120, 250, 450, 750 |
| Tesla | +1 chain target | 150, 300, 500, 800 |
| Sniper | +8% damage | 150, 300, 500, 800 |
| Harry's Farm | +15% duck HP | 200, 350, 550, 850 |
| Aura | +0.5 buff radius | 200, 350, 550, 850 |
| Gold Mine | +1g per tick | 100, 200, 400, 700 |

### Essence Calculation
`essence = (waves_completed × 10 + bosses_killed × 100 + (500 if won)) × challenge_mult`

## 13. Challenge Modifiers

Toggleable on map select screen. Stack multiplicatively for essence.

| Modifier | Effect | Essence Mult |
|----------|--------|-------------|
| Speed Demon | Enemies +25% speed, +50% gold | ×1.3 |
| Iron Man | Cannot sell towers | ×1.2 |
| Minimalist | Max 10 towers | ×1.5 |
| Glass Cannon | 2× tower damage, 5 lives | ×1.4 |

## 14. Bestiary — Enemy Encyclopedia

Accessible from main menu. 2-column layout, 5 rows per column. 120px tall cards.

Each enemy entry shows:
- Colored circle with initial letter
- Name + ability badge
- Stats: HP, Speed, Armor, Reward
- Flavor text (italic)
- Weakness info (green) + strength info (red)

Enemies discovered when first spawned in gameplay. Progress saved to localStorage.

**Flavor text per enemy:**
- Grunt: "The backbone of every horde. Simple but relentless."
- Runner: "Blinding speed makes up for fragile bodies."
- Tank: "Heavily plated. Shrugs off physical attacks."
- Ghost: "Ethereal beings that phase through debuffs."
- Healer: "Mends wounded allies within range every 3 seconds."
- Wasp: "Flying enemies that ignore ground paths entirely."
- Disruptor: "Emits pulses that disable nearby towers."
- Summoner: "Spawns 3 Imps on death. The gift that keeps giving."
- Imp: "Tiny, fast, and worthless. Spawned by Summoners."
- Boss: "Stuns all towers in range every 8 seconds. Costs 5 lives."

## 15. Map Editor

Tile painting tool with 8-tile palette:
- Grass, Path, Water, Tree, Rock, Spawn, Exit, High Ground
- Left-click to paint, right-click to erase (set to Grass)
- Drag painting supported (mousedown held state tracking)

**Validation checks:**
- At least 1 spawn (on left edge, x=0)
- At least 1 exit (on right edge, x=29)
- BFS path connectivity from each spawn to at least one exit
- Buildable area ≥ 20%

**Features:** Generate random map, Undo (Ctrl+Z, 50 steps), Save/Load to localStorage, Validate

Custom maps appear in map select with "[Custom]" prefix.

## 16. Companion Duck (Harry)

A decorative companion that adds personality to gameplay.

**During PREP:**
- Waddles around visiting towers
- Pauses to inspect each one (1.5-3s)
- Shows speech bubbles per tower type:
  - Arrow: "Nice aim!", "Pew pew!", "Sharp!"
  - Cannon: "BOOM!", "Big gun!", "Kaboom!"
  - Ice: "Brrr!", "Chilly!", "Cool!"
  - Gold Mine: "Ka-ching!", "Rich!", "Shiny!"
  - (etc. for all 12 types)
- Reacts to new towers: "Ooh, new!", "Nice pick!", "Good spot!"
- Reacts to upgrades: "Leveled up!", "Stronger!", "Growing!"
- Idle murmurs: "Quack!", "*waddle*", "La la la~"

**During COMBAT:** Hides behind strongest tower

**On Victory:** Dance animation with musical notes, "We won!", "Hooray!"

**Visual:** Yellow duck with tiny golden crown, orange beak/feet, waddle animation, white speech bubble with tail

## 17. UI Design — Complete Specification

### Top Bar (HUD)
- Gradient background (lighter top → darker bottom)
- Accent line at bottom edge
- Custom drawn icons: gold coin (circle + "$"), red heart shape, blue flag + pole, gray skull
- Labels: 14px, values: bold 22px monospace
- Speed indicator: bold 28px accent color
- Pause button: top-right, border-radius 6, "| |" text

### Bottom Bar
- Gradient background (opposite direction from top)
- START WAVE button: accent bg (PREP), muted (COMBAT), border-radius 6
- Speed buttons: [1x] [2x] [4x], active = highlighted
- Wave preview during PREP: colored circles with enemy initials + count
- Wave info during COMBAT: "Wave X: Y enemies" right-aligned

### Shop Panel (280px sidebar)
- Title: "TOWERS" bold 22px accent, centered
- 12 tower buttons: 50px height, 54px spacing, border-radius 4
- Each button: 32×32 sprite + name (17px) + cost (right-aligned, gold) + 2 stat lines (14px)
- Selected: accent background, black text
- Affordable: BG_LIGHT background, white text
- Unaffordable: dark background, dim text + "Need Xg more" warning
- Locked (Mage/Aura): grayed sprite, lock icon, "Unlock in Workshop"

### Tower Info (selected placed tower)
- Name: bold 22px accent, left-aligned
- Level pips: 8 squares, tiered colors (dim → green → blue → accent → purple)
- Stats: Damage, Range, Fire Rate, Type, Splash (17px each line)
- Targeting mode button (border-radius 3)
- Upgrade button (accent if affordable) OR Specialization cards (two 46px cards) OR MAX LEVEL badge
- Sell button: danger red, rounded
- Level 6 hint: "Lv 8: Choose spec!"
- Upgrade preview: shows stat changes

### Menu Buttons
- Shadow at (+2,+2), body with border-radius 10
- Top-third highlight overlay (rgba white 6%)
- Text: 22px centered

### Tooltips
- 0.3s hover delay, 5px movement resets timer
- Dark panel (rgba 20,20,40,0.92), 1px border, max 250px
- Shows context-specific info for towers, enemies, tiles

## 18. Visual Polish & Effects

### Tower Rendering
- Rotation toward target (attacking towers)
- Drop shadow (elliptical, rgba 0,0,0,0.25)
- Attack animation: 1.1× scale pulse for 0.15s
- Disabled overlay: rgba(0,0,0,0.4) + stun stars (3 animated yellow circles)
- Aura towers: translucent range circle
- Undo grace period: pulsing white border for 3s
- High ground: tile sprite rendered under tower

### Enemy Rendering
- Drop shadow (larger offset for flying)
- Status tints: slow=blue (rgba 102,204,255,0.24), burn=orange (rgba 255,51,0,0.20), armor_break=yellow (rgba 255,255,0,0.16)
- Hit flash: brightness(2) filter for 0.1s
- HP bar: 2-tone gradient (green/yellow/red), damage preview bar (dark red), armor type dot (plated=silver, ethereal=purple, resistant=gold)

### Projectiles
- Trail: 8-point history, gradient opacity, tower-color matched
- Glow halo behind projectile

### Effects System
- Particles: gravity 60 px/s², fade out, 2-4s lifetime
- Tower fire particles: cannon smoke, flame fire, tesla sparks, sniper tracer, ice frost, mage arcane, doom shockwave
- Floating text: upward drift, fade out (gold=1.5s, damage=1s)
- Expanding rings: splash/AoE visualization
- Lightning arcs: jagged lines for chain
- Screen shake: duration + intensity (boss death: 0.5s, 8px)
- Combo kills: x3!, x4!, x5 FRENZY!, x8 MEGA KILL! with particles
- Portal particles: red swirling inward at spawn points
- Day/night tint: sinusoidal warm/cool cycle based on wave progression

### Synergy Lines
- Double-drawn glow: outer (lineWidth 3, alpha 0.31) + inner (lineWidth 1, alpha 0.63)
- Dashed pattern [4, 4]

## 19. Save System

localStorage-based. Key: `tower_defense_save`

```json
{
    "essence": 0,
    "upgrades": {
        "starting_economy": 0,
        "better_lives": 0,
        "interest_rate": 0,
        "salvage_expert": 0
    },
    "unlocks": {
        "mage_tower": false,
        "aura_tower": false
    },
    "mastery": {
        "arrow": 0, "cannon": 0, "mage": 0, "ice": 0, "sky_hunter": 0,
        "flame": 0, "tesla": 0, "sniper": 0, "harry_duck": 0, "aura": 0, "gold_mine": 0
    },
    "stats": {
        "games_played": 0,
        "best_wave": 0,
        "total_kills": 0,
        "discovered": {}
    }
}
```

Custom maps saved as `custom_map_{name}` keys.

**Reset command (browser console):** `localStorage.removeItem('tower_defense_save'); location.reload();`

## 20. Input & Controls

### Mouse
- Left click: place tower, select tower, click UI buttons, start painting (editor)
- Right click: deselect tower, cancel placement, erase (editor)
- Hover (0.3s): show tooltip
- Drag: paint/erase in map editor

### Keyboard

| Key | Action |
|-----|--------|
| 1-9 | Quick-select tower from shop |
| F | Cycle speed (1× → 2× → 4× → 1×) |
| U | Upgrade selected tower |
| S | Sell selected tower |
| T | Cycle targeting mode |
| Escape | Deselect / Cancel / Pause / Exit screen |
| Ctrl+Z | Undo tower placement (3s grace) or undo in editor |
| R | (planned) Quick restart |

### Map Editor Keys
| V | Validate | C | Clear | G | Generate random |
| 0-7 | Select palette tile | Ctrl+Z | Undo |

## 21. Fonts & Colors Reference

### Font Stacks
- **UI:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif`
- **Monospace:** `'SF Mono', 'Cascadia Code', 'Consolas', 'Menlo', monospace`

### Font Sizes
| Name | Size | Weight | Use |
|------|------|--------|-----|
| title | 44px | bold | Game title |
| heading | 28px | bold | Section headers |
| subheading | 22px | bold | Panel titles, HUD stats |
| body | 17px | normal | Names, labels |
| body_small | 14px | normal | Stats, descriptions |
| caption | 12px | normal | Hints, footnotes |
| stat_large | 22px | bold mono | HUD numbers |

### Colors (RGB → Hex)

| Name | Hex | Use |
|------|-----|-----|
| BG | #1a1a2e | Main background |
| BG_LIGHT | #282846 | Button background |
| PANEL | #1e1e37 | Panel background |
| PANEL_BORDER | #3c3c64 | Borders |
| ACCENT | #e6b800 | Gold accent, titles |
| DANGER | #ff4444 | Red alerts |
| TEXT | #ffffff | Primary text |
| TEXT_DIM | #c8c8c8 | Secondary text |
| TEXT_DARK | #969696 | Tertiary text |
| GOLD | #ffd700 | Gold amounts |
| ENERGY | #9933ff | Essence, purple |
| HP_GREEN | #00c800 | Healthy |
| HP_YELLOW | #ffff00 | Warning |
| HP_RED | #ff0000 | Critical |

### Tile Colors
Grass: #4a7c2e/#5a9e37, Path: #c4a663, Water: #3d85c6, Tree: #2d5a1e/#3b7a28, Rock: #888/#666, High Ground: #d4a03c, Spawn: #ff6464, Exit: #64ff64

### Tower Colors
Arrow: #a07838, Cannon: #646464, Mage: #823cc8, Ice: #64b4f0, Sky-Hunter: #b48c50, Flame: #dc5a1e, Tesla: #3cb4dc, Sniper: #5a4638, Harry's Farm: #f0d23c, Aura: #e6c83c, Gold Mine: #c8aa32, Doom Spire: #b428dc

### Enemy Colors
Grunt: #50b43c, Runner: #3c8cdc, Tank: #c83c3c, Ghost: #b4a0dc, Healer: #78c850, Wasp: #e6c832, Disruptor: #8c3cb4, Summoner: #3ca08c, Imp: #dc5050, Boss: #7828b4

## 22. Design Principles

1. **Peaceful "set up and watch" gameplay** — no active abilities, no frantic clicking required. Place towers, start wave, enjoy watching.
2. **No external assets** — all sprites generated procedurally via Canvas2D. All fonts are system fonts. Zero network requests.
3. **Progressive complexity** — early waves teach basics, later waves introduce abilities. Bestiary and tooltips provide discovery.
4. **Emotional connection** — Harry the companion duck adds personality. Tower names and kill tracking create attachment. Victory/defeat screens celebrate the journey.
5. **Respect player time** — undo placement (Ctrl+Z), speed controls (1x-4x), persistent save data, workshop progression.
6. **Visual clarity** — tooltips on everything, wave preview, range circles, synergy highlights, danger indicators. The game teaches itself.
7. **Version:** Auto-increment patch (v0.2.X) with every code change. Minor (v0.3) only on explicit request.
