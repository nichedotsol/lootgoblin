# Loot Goblin

A tiny Three.js browser minigame about hunting compute tokens through 3D side-scroller loot worlds.

## Play

Open `index.html` in a browser.

Controls:

- `WASD` or arrow keys to move
- `Shift` to dash
- `R` or the restart button to restart

## Goal

Collect loot, grab ability upgrades, and reach the portal shard before time runs out. Each portal advances to the next world.

## World Model

The side-scroller pass defines 10 worlds:

1. Mossy Terminal Ruins
2. Neon Data Cave
3. Amber Audit Foundry
4. Crystal Cache Forest
5. Corrupted Firewall Swamp
6. Deep Packet Mine
7. Cloud Server Skybridges
8. Glitch Market Alley
9. Blacksite Vault Corridor
10. Overclocked Core Chamber

Difficulty adapts during a run from the current world, time pressure, and collection pace. Higher difficulty increases hazard rhythm pressure and world speed tuning.

Loot includes score items and collection upgrades: magnet aura, speed boots, bigger satchel, scanner ping, shield battery, double-loot multiplier, time shard, jump booster, and portal shards.

## Tech

This version is intentionally static and build-free:

- HTML/CSS app shell
- Three.js-rendered 3D side-scroller world, camera, physics, lit platforms, hazards, and pickups
- Generated sprite atlas for 10 worlds used as background, prop, and surface-detail art over 3D geometry
- Generated transparent loot/power-up and HUD sprite sheets
- Three.js loaded as an ES module from jsDelivr
- Authored level data, loot tables, ability upgrades, and adaptive difficulty rules
- No build step
