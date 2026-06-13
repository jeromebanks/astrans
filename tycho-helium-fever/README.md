# Tycho: Helium Fever

A single-player, top-down lunar industrial survival/automation game — an
unofficial adaptation of the hard-SF novel *Astrans*. You direct Li Yun Tan and
Darrin Brooks' helium-3 operation at the bottom of Tycho Crater: survey thin
regolith, sweep it with one crawler, tune an RF extractor to its drifting
Larmor sweet spot, survive a 240-minute lunar night on batteries, fill one
shipment bottle, and make the first payment on a $1.2M Helion Dynamics transit
loan. A campaign runs 20–30 minutes.

## Run it

```bash
npm install
npm run dev      # open the printed localhost URL
```

Other commands:

```bash
npm run test     # vitest: 41 deterministic sim/campaign/save tests
npm run lint     # strict TypeScript check (tsc --noEmit)
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

No backend, accounts, API keys, or remote assets. Everything — map textures,
sprites, portraits, cutscene paintings, and sound — is generated locally at
runtime. Saves, settings, and your best result live in `localStorage`.

## Controls

| Input | Action |
| --- | --- |
| Click tile | Select (survey / set sweep zone / place building) |
| Drag, WASD, or arrow keys | Pan camera |
| Mouse wheel | Zoom |
| Space | Pause / resume |
| 1 / 2 / 3 | Speed ×1 / ×2 / ×4 |
| B | Build & order menu |
| H | Help / reference panel |
| Esc | Cancel placement, close selection, skip cutscene |

Cutscenes: click **Continue** or press Space/Enter to advance, **Skip** or Esc
to skip — skipping grants exactly the same milestone state as watching.

## How to win

1. **Survey** (assign a crew member; click tiles to queue) — Tycho is young and
   poor (~3–6 ppb), so finding the rich pockets matters.
2. **Sweep** — assign a driver, set a sweep zone; the crawler hauls regolith to
   the hopper. Dust wears everything; watch the wear bars.
3. **Extract** — run the RF and keep the field strength in the sweet spot. The
   mass-spec trace is your only instrument: a tall left peak (H₂) means the
   field is too weak; a tall right peak (⁴He) means too strong. An operator
   assigned to the extractor chases the drift automatically.
4. **Bank power before sunset** (06:00). Night is 240 min of zero generation;
   the heater alone needs 8 kW. Battery banks, the CO₂-economy mode, and
   turning the extractor off are your levers.
5. **Ship**: ≥ 70 g at ≥ 7% purity, dispatched to a Lunar Tug window —
   A (09:00, during the night, pays $240k loan service) or B (12:40, $280k).
   The crawler trip takes 30 min. Finish solvent and you win.

Losses always explain themselves. Each run is seeded: a new run gets new
grades, event timings, and trouble. Mastery goals (no life-support emergency,
no injury, ≥12% purity, low wear, ethical operation) are scored on the end
screen and kept as your best result.

## Architecture

```
src/
  sim/          Pure deterministic simulation — no Phaser imports, fully unit-tested
    constants.ts  All tuning numbers
    rng.ts        Seeded mulberry32 + hash noise (serializes with the save)
    map.ts        Seeded crater-floor generation
    sim.ts        1-minute tick: power/brownout shedding, life support, crawler,
                  RF extraction & purity, maintenance/breakdowns, crew fatigue,
                  economy, shipments, loss evaluation
    campaign.ts   Explicit act state machine, exactly-once milestone unlocks,
                  objectives, win evaluation
    events.ts     Seeded event deck + decision cards (claim strip, salvage,
                  stranded miner, maintenance-window push…)
    endings.ts    Mastery + decision/score-dependent epilogue text
    save.ts       Versioned localStorage save/load, settings, best result
  data/         Cutscene definitions and conditional radio dialogue
  game/         Phaser 3 layer: BootScene (procedural textures), GameScene
                (map, camera, crawler, light), CutsceneScene (panel player),
                art.ts (canvas-painted sprites/portraits/scene art), audio.ts
                (WebAudio hum/clicks/warnings)
  ui/hud.ts     DOM HUD: instruments, crew, build menu, event modals, help,
                end screen
  main.ts       Shell: title screen, fixed-step sim loop, campaign signals,
                autosave
tests/          power, extractor, lunar night, campaign/decisions, save, endings
docs/DESIGN_NOTES.md  Facts taken from the manuscript and how they map to design
```

The sim ticks one simulated minute at a time (1× = 1 min/s) and is fully
deterministic given its seed — the same state always replays the same way,
which is what the save/restore and campaign tests assert.

## Known limitations

- Desktop/laptop with a mouse is the target; touch is not supported.
- The cutscene paintings are stylized vector compositions, not illustration.
- Phaser is bundled whole (~380 kB gzipped JS).
- One sweep zone at a time (plus one auto-hauling cableway segment per
  purchase) — belt-level logistics are intentionally out of scope.
- The campaign ends after the first successful shipment; the refinery,
  cableway network, and Tan's Cantina appear only in the epilogue.
