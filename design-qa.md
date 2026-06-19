# Design QA: Loot Goblin

Source visual: `C:\Users\ball1\AppData\Local\Temp\codex-clipboard-b52849ab-62bb-446e-b8ee-1f588cdbeb81.png`

Prototype checked: local static preview at `http://127.0.0.1:8788/`

## Comparison

- HUD: Updated from three generic readouts to a five-panel CRT header with single-line title, score, tokens, time, and CPU signal panel.
- Goal count: Updated from 12 to 15 compute tokens to match the reference.
- World density: Added layered Three.js slabs, circular platform rings, moss patches, painted terrain decals, sprite wall strips, plants, terminal monuments, shrine block, crystal obelisk, data node, warning signs, and chunkier audit-beam machinery.
- Artifact model: Scene objects are now driven by named `COMPUTE_TOKEN_ARTIFACTS`, `RUIN_ARTIFACTS`, and `AUDIT_BEAM_ARTIFACTS` registries.
- Collectibles and hazards: Cyan compute tokens and orange audit beams now use generated sprite art while keeping the same interactive collision logic.
- Character art: The player is now a transparent generated sprite with idle, walk, and dash states instead of a mesh placeholder.
- Bottom controls: Rebuilt as six CRT command panels: move, dash, avoid, collect, directive, and restart.
- Responsive state: Desktop matches the reference target most closely. Mobile fits without horizontal overflow, but the art direction is intentionally optimized for a wide desktop game viewport.

## Intentional Deviation

Three.js still owns camera, lighting, collision, timing, and hit surfaces. The visible hero objects are now generated bitmap sprites layered into that scene so the game can stay interactive while looking closer to the supplied render.

## Verification

- `node --check src/game.js`: passed.
- Browser local preview: superseded by Vercel deployment verification for the sprite pass.
- Restart control: passed, reset score/tokens/timer.
- Mobile layout: passed, no horizontal overflow.

Final result: passed
