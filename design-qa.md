# Design QA: Loot Goblin

Source visual: `C:\Users\ball1\AppData\Local\Temp\codex-clipboard-b52849ab-62bb-446e-b8ee-1f588cdbeb81.png`

Prototype checked: local static preview at `http://127.0.0.1:8788/`

## Comparison

- HUD: Updated from three generic readouts to a five-panel CRT header with single-line title, score, tokens, time, and CPU signal panel.
- Goal count: Updated from 12 to 15 compute tokens to match the reference.
- World density: Added layered isometric slabs, circular platform rings, moss patches, wall shards, cables, plants, terminal monuments, shrine block, crystal obelisk, data node, warning signs, and chunkier audit-beam machinery.
- Collectibles and hazards: Cyan compute tokens and orange audit beams remain interactive and visually closer to the render.
- Bottom controls: Rebuilt as six CRT command panels: move, dash, avoid, collect, directive, and restart.
- Responsive state: Desktop matches the reference target most closely. Mobile fits without horizontal overflow, but the art direction is intentionally optimized for a wide desktop game viewport.

## Intentional Deviation

The objects are custom canvas-rendered game objects instead of pasted/generated bitmap sprites. This keeps the game interactive, dependency-free, and editable while moving the art direction toward the supplied render.

## Verification

- `node --check src/game.js`: passed.
- Browser local preview: passed, canvas rendered, no captured console errors.
- Restart control: passed, reset score/tokens/timer.
- Mobile layout: passed, no horizontal overflow.

Final result: passed
