# Loot Goblin

A tiny Three.js browser minigame about hunting compute tokens in a cursed terminal ruin.

## Play

Open `index.html` in a browser.

Controls:

- `WASD` or arrow keys to move
- `Shift` to dash
- `R` or the restart button to restart

## Goal

Collect all 15 compute tokens before time runs out. Audit beams burn time and score, so watch their rhythm and dash through the gaps.

## Tech

This version is intentionally static and build-free:

- HTML/CSS app shell
- Three.js-rendered 3D world, props, player, hazards, particles, and collectibles
- Three.js loaded as an ES module from jsDelivr
- Authored artifact registries for compute tokens, ruin objects, and audit beams
- No build step
