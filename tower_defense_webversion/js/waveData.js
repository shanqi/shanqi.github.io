import { EnemyType } from './constants.js';

// Wave definitions for 20 waves of tower defense.
// Each wave has: subwaves (array), bonus_gold, and optional delay_between_subwaves (default 2.5).
// Each subwave has: enemy_type, count, spawn_delay, and optional spawn_index (default 0).

export const WAVE_DATA = [
    // Wave 1
    {
        subwaves: [
            { enemy_type: EnemyType.GRUNT, count: 20, spawn_delay: 0.6 },
        ],
        bonus_gold: 10,
    },
    // Wave 2
    {
        subwaves: [
            { enemy_type: EnemyType.GRUNT, count: 12, spawn_delay: 0.5 },
            { enemy_type: EnemyType.RUNNER, count: 8, spawn_delay: 0.3 },
        ],
        bonus_gold: 12,
    },
    // Wave 3
    {
        subwaves: [
            { enemy_type: EnemyType.GRUNT, count: 15, spawn_delay: 0.5 },
            { enemy_type: EnemyType.TANK, count: 6, spawn_delay: 0.8 },
        ],
        bonus_gold: 14,
    },
    // Wave 4
    {
        subwaves: [
            { enemy_type: EnemyType.RUNNER, count: 10, spawn_delay: 0.3 },
            { enemy_type: EnemyType.GHOST, count: 10, spawn_delay: 0.5 },
            { enemy_type: EnemyType.GRUNT, count: 8, spawn_delay: 0.4 },
        ],
        bonus_gold: 16,
    },
    // Wave 5 — first boss
    {
        subwaves: [
            { enemy_type: EnemyType.GRUNT, count: 24, spawn_delay: 0.4 },
            { enemy_type: EnemyType.TANK, count: 8, spawn_delay: 0.7 },
            { enemy_type: EnemyType.BOSS, count: 1, spawn_delay: 1.0 },
        ],
        bonus_gold: 30,
    },
    // Wave 6
    {
        subwaves: [
            { enemy_type: EnemyType.WASP, count: 15, spawn_delay: 0.4 },
            { enemy_type: EnemyType.GRUNT, count: 12, spawn_delay: 0.5 },
            { enemy_type: EnemyType.RUNNER, count: 6, spawn_delay: 0.3 },
        ],
        bonus_gold: 20,
    },
    // Wave 7
    {
        subwaves: [
            { enemy_type: EnemyType.GRUNT, count: 10, spawn_delay: 0.5 },
            { enemy_type: EnemyType.HEALER, count: 8, spawn_delay: 0.6 },
            { enemy_type: EnemyType.TANK, count: 12, spawn_delay: 0.7 },
        ],
        bonus_gold: 22,
    },
    // Wave 8
    {
        subwaves: [
            { enemy_type: EnemyType.RUNNER, count: 15, spawn_delay: 0.3 },
            { enemy_type: EnemyType.DISRUPTOR, count: 6, spawn_delay: 0.8 },
            { enemy_type: EnemyType.GHOST, count: 10, spawn_delay: 0.5 },
        ],
        bonus_gold: 24,
    },
    // Wave 9
    {
        subwaves: [
            { enemy_type: EnemyType.SUMMONER, count: 8, spawn_delay: 0.8 },
            { enemy_type: EnemyType.GRUNT, count: 15, spawn_delay: 0.4 },
            { enemy_type: EnemyType.WASP, count: 10, spawn_delay: 0.4 },
        ],
        bonus_gold: 26,
    },
    // Wave 10 — double boss
    {
        subwaves: [
            { enemy_type: EnemyType.TANK, count: 20, spawn_delay: 0.5 },
            { enemy_type: EnemyType.GHOST, count: 12, spawn_delay: 0.5 },
            { enemy_type: EnemyType.BOSS, count: 2, spawn_delay: 2.0 },
        ],
        bonus_gold: 50,
    },
    // Wave 11
    {
        subwaves: [
            { enemy_type: EnemyType.RUNNER, count: 30, spawn_delay: 0.2 },
            { enemy_type: EnemyType.HEALER, count: 8, spawn_delay: 0.6 },
        ],
        bonus_gold: 30,
    },
    // Wave 12
    {
        subwaves: [
            { enemy_type: EnemyType.DISRUPTOR, count: 15, spawn_delay: 0.5 },
            { enemy_type: EnemyType.GRUNT, count: 20, spawn_delay: 0.3 },
            { enemy_type: EnemyType.WASP, count: 12, spawn_delay: 0.35 },
        ],
        bonus_gold: 32,
    },
    // Wave 13
    {
        subwaves: [
            { enemy_type: EnemyType.SUMMONER, count: 12, spawn_delay: 0.7 },
            { enemy_type: EnemyType.TANK, count: 15, spawn_delay: 0.5 },
            { enemy_type: EnemyType.GHOST, count: 8, spawn_delay: 0.5 },
        ],
        bonus_gold: 34,
    },
    // Wave 14
    {
        subwaves: [
            { enemy_type: EnemyType.RUNNER, count: 25, spawn_delay: 0.2 },
            { enemy_type: EnemyType.DISRUPTOR, count: 10, spawn_delay: 0.5 },
            { enemy_type: EnemyType.WASP, count: 15, spawn_delay: 0.3 },
        ],
        bonus_gold: 36,
    },
    // Wave 15 — triple boss
    {
        subwaves: [
            { enemy_type: EnemyType.TANK, count: 20, spawn_delay: 0.4 },
            { enemy_type: EnemyType.GHOST, count: 15, spawn_delay: 0.4 },
            { enemy_type: EnemyType.HEALER, count: 10, spawn_delay: 0.5 },
            { enemy_type: EnemyType.BOSS, count: 3, spawn_delay: 2.0 },
        ],
        bonus_gold: 70,
    },
    // Wave 16
    {
        subwaves: [
            { enemy_type: EnemyType.GRUNT, count: 35, spawn_delay: 0.15 },
            { enemy_type: EnemyType.RUNNER, count: 20, spawn_delay: 0.2 },
            { enemy_type: EnemyType.DISRUPTOR, count: 12, spawn_delay: 0.5 },
        ],
        bonus_gold: 42,
    },
    // Wave 17
    {
        subwaves: [
            { enemy_type: EnemyType.SUMMONER, count: 15, spawn_delay: 0.6 },
            { enemy_type: EnemyType.TANK, count: 20, spawn_delay: 0.4 },
            { enemy_type: EnemyType.WASP, count: 15, spawn_delay: 0.3 },
        ],
        bonus_gold: 44,
    },
    // Wave 18
    {
        subwaves: [
            { enemy_type: EnemyType.GHOST, count: 30, spawn_delay: 0.25 },
            { enemy_type: EnemyType.HEALER, count: 15, spawn_delay: 0.4 },
            { enemy_type: EnemyType.RUNNER, count: 20, spawn_delay: 0.2 },
        ],
        bonus_gold: 46,
    },
    // Wave 19
    {
        subwaves: [
            { enemy_type: EnemyType.DISRUPTOR, count: 20, spawn_delay: 0.4 },
            { enemy_type: EnemyType.TANK, count: 25, spawn_delay: 0.35 },
            { enemy_type: EnemyType.WASP, count: 20, spawn_delay: 0.3 },
            { enemy_type: EnemyType.SUMMONER, count: 10, spawn_delay: 0.6 },
        ],
        bonus_gold: 48,
    },
    // Wave 20 — final wave
    {
        subwaves: [
            { enemy_type: EnemyType.TANK, count: 30, spawn_delay: 0.3 },
            { enemy_type: EnemyType.GHOST, count: 20, spawn_delay: 0.3 },
            { enemy_type: EnemyType.RUNNER, count: 25, spawn_delay: 0.2 },
            { enemy_type: EnemyType.HEALER, count: 15, spawn_delay: 0.4 },
            { enemy_type: EnemyType.DISRUPTOR, count: 15, spawn_delay: 0.4 },
            { enemy_type: EnemyType.SUMMONER, count: 10, spawn_delay: 0.5 },
            { enemy_type: EnemyType.WASP, count: 20, spawn_delay: 0.3 },
            { enemy_type: EnemyType.BOSS, count: 4, spawn_delay: 2.0 },
            { enemy_type: EnemyType.GRUNT, count: 30, spawn_delay: 0.15 },
        ],
        bonus_gold: 100,
    },
];
