// pathfinding.js — BFS pathfinding for enemy routes

import { TileType } from './constants.js';

// BFS from a spawn to nearest exit, returns array of {x, y} waypoints
export function findRoute(tiles, spawn, exits) {
    const height = tiles.length;
    const width = tiles[0].length;
    const visited = Array.from({ length: height }, () => new Array(width).fill(false));
    const parent = Array.from({ length: height }, () => new Array(width).fill(null));

    const queue = [{ x: spawn[0], y: spawn[1] }];
    visited[spawn[1]][spawn[0]] = true;

    const exitSet = new Set(exits.map(e => `${e[0]},${e[1]}`));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    let found = null;
    while (queue.length > 0) {
        const cur = queue.shift();
        if (exitSet.has(`${cur.x},${cur.y}`)) {
            found = cur;
            break;
        }
        for (const [dx, dy] of dirs) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            if (visited[ny][nx]) continue;
            const tile = tiles[ny][nx];
            if (tile !== TileType.PATH && tile !== TileType.SPAWN && tile !== TileType.EXIT) continue;
            visited[ny][nx] = true;
            parent[ny][nx] = { x: cur.x, y: cur.y };
            queue.push({ x: nx, y: ny });
        }
    }

    if (!found) return [];

    // Reconstruct path
    const path = [];
    let cur = found;
    while (cur) {
        path.unshift({ x: cur.x, y: cur.y });
        cur = parent[cur.y][cur.x];
    }
    return path;
}

// Find all routes from each spawn to its nearest exit
export function findAllRoutes(tiles, spawns, exits) {
    const routes = {};
    for (const spawn of spawns) {
        const key = `${spawn[0]},${spawn[1]}`;
        routes[key] = findRoute(tiles, spawn, exits);
    }
    return routes;
}

// Get flying path (straight line from spawn to nearest exit)
export function getFlyingPath(spawn, exits) {
    let nearest = exits[0];
    let minDist = Infinity;
    for (const exit of exits) {
        const dx = exit[0] - spawn[0];
        const dy = exit[1] - spawn[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            nearest = exit;
        }
    }
    return [
        { x: spawn[0], y: spawn[1] },
        { x: nearest[0], y: nearest[1] },
    ];
}
