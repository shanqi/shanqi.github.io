# Tower Defense — Web Version

Port of the Pygame tower defense game to HTML5 Canvas with ES6 modules. No build tools, no external assets — pure vanilla JS.

## How to Run

Serve the folder with any static HTTP server (ES6 module `import` requires it):

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080` (or whichever port) in a browser.

## Project Structure

```
tower_defense_webversion/
├── index.html              Entry point (loads js/main.js as module)
├── css/
│   └── style.css           Dark theme, responsive canvas scaling
└── js/
    ├── main.js             Game loop (requestAnimationFrame, dt capping)
    ├── constants.js        All enums, colors, dimensions, balance numbers
    ├── towerData.js        12 tower definitions, upgrade costs, specializations
    ├── enemyData.js        10 enemy types, wave-scaling functions
    ├── waveData.js         20 wave definitions (subwaves, bonus gold)
    ├── mapData.js          5 maps (30×20 tile grids, spawns, exits)
    ├── pathfinding.js      BFS route-finding, flying paths
    ├── sprites.js          Procedural Canvas2D sprite generation (~730 lines)
    ├── enemy.js            Enemy class (movement, status effects, animation)
    ├── tower.js            Tower class (targeting, upgrades, synergy buffs)
    ├── projectile.js       Projectile with trail history
    ├── duckSoldier.js      Duck soldier AI (seek, attack, lifetime)
    ├── combat.js           Damage calc, armor matrix, splash, chain, AoE pulse
    ├── effects.js          Particles, floating text, expanding rings, lightning, screen shake
    ├── renderer.js         Map/tower/enemy/projectile/duck rendering
    ├── ui.js               HUD, shop panel, menus (main, map select, pause, win/lose)
    ├── input.js            Mouse + keyboard input manager
    └── game.js             Core game state machine, all systems wired together
```

## Screen Layout (1240 × 780)

```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR (50px) — gradient bg, gold/lives/wave/enemies      │
├─────────────────────────────────────┬───────────────────────┤
│                                     │  SHOP PANEL (280px)   │
│  GAME GRID (960 × 640)             │  - "TOWERS" title     │
│  30×20 tiles, 32px each            │  - 12 tower buttons   │
│  Offset: (0, 50)                   │    50px h, 54px gap   │
│                                     │  - or Tower Info view │
│                                     │    when tower selected│
├─────────────────────────────────────┴───────────────────────┤
│  BOTTOM BAR (50px) — gradient bg, start/speed/pause buttons │
├─────────────────────────────────────────────────────────────┤
│  EXTRA SPACE (40px)                                         │
└─────────────────────────────────────────────────────────────┘
```

Dimensions: `SCREEN_WIDTH = 30*32 + 280 = 1240`, `SCREEN_HEIGHT = 20*32 + 50 + 50 + 40 = 780`

## UI Details (matches Python version)

### Top Bar (HUD)
- Gradient background (lighter at top → darker)
- Custom drawn icons: gold coin (circle + `$`), red heart, blue flag + pole, gray skull
- Labels in 14px Arial, values in bold 22px monospace
- Positions: Gold@28, Lives@180, Wave@340, Enemies@510, Speed@660
- Pause button in top-right with rounded corners (border-radius 6)

### Bottom Bar
- Gradient background (opposite direction)
- "START WAVE" button (accent bg when PREP, muted when COMBAT)
- "2x" and "4x" speed buttons (accent/orange when active)
- All buttons: border-radius 6

### Shop Panel (280px right sidebar)
- Title: "TOWERS" in bold 22px accent, centered
- 12 tower buttons, each 50px tall, 54px spacing, border-radius 4
- Each button layout:
  - 32×32 tower sprite (dimmed at 0.4 opacity if can't afford)
  - Name (17px) left at x+38, Cost (17px, gold) right-aligned
  - Stats Line 1 (14px): always shown
    - Attacking: `Dmg:X  Rng:X.X  Spd:Xs`
    - Aura: `Buffs nearby towers`
    - Harry Duck: `Duck: Xdmg Xhp`
    - Gold Mine: `Xg every Xs` (gold colored)
  - Stats Line 2 (14px): only if affordable or selected
    - Attacking: damage type + traits (`Explosive  AoE:1.5`, `Energy  Chain:3`, `Burn`, `Air only`, `Pulse AoE`)
    - Aura: `Range: X.X`
    - Harry Duck: `Spawn every Xs`
    - Gold Mine: `(Xg/min)`
  - Warning: `Need Xg more` (rgb 160,80,80) replaces line 2 when can't afford
- Background colors: selected=accent, affordable=BG_LIGHT, unaffordable=rgb(30,30,40)

### Tower Info View (selected placed tower)
- Name in bold 22px accent, left-aligned
- Level pips (8 pips, tiered colors: dim → green → blue → accent → purple)
- "Level X / 8" text
- Specialization name + description if chosen
- Separator line
- Stats: Damage, Range, Fire Rate, Type, Splash (each on own line, 17px)
- Special handling: Harry Duck (duck HP/dmg/spawn), Aura (buff/range), Gold Mine (income/gpm)
- High ground indicator if applicable
- Targeting mode button (rounded, border-radius 3)
- Separator
- Upgrade button (accent bg if affordable) or Specialize cards (two 46px cards with name+desc+cost) or MAX LEVEL badge
- Sell button (danger red, rounded)
- "Total invested: Xg"

### Menu Buttons
- Shadow at (+2,+2), body with border-radius 10
- Top-third highlight overlay (rgba white 6%)
- Border in PANEL_BORDER color
- Text: 22px Arial, centered

### Main Menu
- Title: "TOWER DEFENSE" in bold 44px accent
- Subtitle: "A Strategic Battle" with flanking horizontal rules
- Producer credit: "Produced by" / "Harry the Duck" / "March 2026 | v0.1"
- Decorative separator lines
- 4 buttons: Play Game (accent), Workshop, Map Editor, Quit (320×58 each)
- Footer: keyboard shortcut hints

### Map Select
- Title: "SELECT MAP" in bold 28px accent
- 5 map buttons (400×60, border-radius 6) showing name + difficulty color + spawn/exit count
- Difficulty colors: Easy=green, Medium=yellow, Hard=red, Expert=purple
- Back button in bottom-left

### Pause Menu
- Semi-transparent overlay (rgba 0,0,0,0.59)
- "PAUSED" in bold 28px accent
- 3 buttons: Resume (accent), Restart, Quit to Menu (280×50 each)

### Win/Lose Screens
- Dark overlay (rgba 0,0,0,0.71)
- "VICTORY!" (accent) or "DEFEAT" (danger) in bold 44px
- "Waves Completed: X" stats
- "Continue" button

## Game Mechanics

### Towers (12 types)
Arrow, Cannon, Mage, Ice, Sky-Hunter, Flame, Tesla, Sniper, Harry Duck, Aura, Gold Mine, Doom Spire.
- 8 upgrade levels, costs defined per tower
- Level 8: choose specialization A or B (unique bonuses)
- Upgrade stat multipliers scale damage (1.0→2.5x), range (1.0→1.4x), fire rate (1.0→0.8x)

### Enemies (10 types)
Grunt, Runner, Tank, Ghost, Healer, Wasp, Disruptor, Summoner, Imp, Boss.
- Scale with wave: HP × (1 + (wave-1) × 0.18), Speed × min(1 + (wave-1) × 0.025, 1.5)
- Abilities: heal_aura, disable_tower, summon_on_death, tower_stun, debuff_immune

### Armor System
|          | Kinetic | Explosive | Energy | Frost | Fire |
|----------|---------|-----------|--------|-------|------|
| Unarmored| 1.0     | 1.0       | 1.0    | 1.0   | 1.0  |
| Plated   | 0.5     | 0.5       | 1.5    | 1.0   | 1.5  |
| Ethereal | 1.5     | 1.5       | 0.5    | 0.5   | 0.5  |
| Resistant| 0.75    | 0.75      | 0.75   | 0.75  | 0.75 |

### Combat
- Splash: 60% damage to nearby enemies within splash_radius
- Chain: 70% damage per hop, max 3.0 tile distance
- AoE Pulse (Doom Spire): hits ALL enemies in range simultaneously
- Status effects: Slow, Burn (DoT), Stun, Armor Break (×1.25)

### Synergies (adjacent towers within 2 tiles)
| Name           | Towers         | Buff                    |
|----------------|----------------|-------------------------|
| Steam          | Ice + Flame    | +15% damage both        |
| Marksman       | Arrow + Sniper | +10% range both         |
| Arcane Surge   | Tesla + Mage   | 0.8× fire rate (faster) |
| Fortified      | Cannon + Arrow | +10% damage             |
| Arctic Precision| Ice + Sniper  | +12% damage             |

### Economy
- Starting: 200 gold, 20 lives
- Income: enemy kills + wave bonus (8 + wave×2) + 2% interest (cap 10) + perfect wave bonus (10)
- Sell refund: 60% of total investment
- Gold Mine: 3g per 5s, max 10 mines

### Maps (5 pre-built)
| Map            | Spawns | Exits | Theme   |
|----------------|--------|-------|---------|
| First Stand    | 1      | 1     | Meadow  |
| The Pincer     | 2      | 1     | Meadow  |
| Split Decision | 1      | 2     | Forest  |
| Fly Zone       | 1      | 1     | Canyon  |
| The Citadel    | 3      | 2     | Canyon  |

### Waves (20 total)
- Waves 1–4: basic enemies
- Wave 5: first boss (1×)
- Waves 6–9: mixed abilities (wasps, healers, disruptors, summoners)
- Wave 10: double boss (2×)
- Waves 11–14: speed rushes, swarms
- Wave 15: triple boss (3×)
- Waves 16–19: everything at once
- Wave 20: final (4 bosses + 169 total enemies, 100 bonus gold)

## Keyboard Controls
| Key     | Action                                    |
|---------|-------------------------------------------|
| 1–9     | Quick-select tower from shop              |
| Space   | Start wave (PREP) / Pause (COMBAT)        |
| F       | Cycle speed (1× → 2× → 4× → 1×)         |
| U       | Upgrade selected tower                    |
| S       | Sell selected tower                       |
| T       | Cycle targeting mode                      |
| Escape  | Deselect / Cancel placement / Pause       |
| Right-click | Deselect tower / Cancel placement     |

## Colors Reference (RGB → Hex)
| Name         | RGB            | Hex     |
|--------------|----------------|---------|
| UI_BG        | (26, 26, 46)   | #1a1a2e |
| UI_BG_LIGHT  | (40, 40, 70)   | #282846 |
| UI_PANEL     | (30, 30, 55)   | #1e1e37 |
| UI_BORDER    | (60, 60, 100)  | #3c3c64 |
| UI_ACCENT    | (230, 184, 0)  | #e6b800 |
| UI_DANGER    | (255, 68, 68)  | #ff4444 |
| TEXT         | (255, 255, 255)| #ffffff |
| TEXT_DIM     | (200, 200, 200)| #c8c8c8 |
| TEXT_DARK    | (150, 150, 150)| #969696 |
| GOLD_TEXT    | (255, 215, 0)  | #ffd700 |

## Font Sizes
| Name        | Size   | Weight | Use                           |
|-------------|--------|--------|-------------------------------|
| title       | 44px   | bold   | Game title                    |
| heading     | 28px   | bold   | Section headers               |
| subheading  | 22px   | bold   | Panel titles                  |
| body_large  | 20px   | bold   | Tower names, button labels    |
| body        | 17px   | normal | Descriptions, labels          |
| body_small  | 14px   | normal | Secondary info, stats         |
| caption     | 12px   | normal | Hints, footnotes              |
| stat_large  | 22px   | bold   | HUD numbers (monospace)       |
