# Claude Code One-Shot Prompt: Tycho Helium Fever

You are working in `/Users/jeromebanks/dev/asstrans`. Build a complete, polished,
playable browser game in a new subdirectory named `tycho-helium-fever`.

Do not merely scaffold, write a design document, or stop after a prototype.
Implement the game, run it, test it, fix errors, and leave clear launch
instructions. Make reasonable decisions autonomously. Do not ask me questions
unless an external blocker makes completion impossible.

## Source Material

This game is an unofficial adaptation of the hard-SF novel in `./astrans.md`.
Preserve its grounded industrial tone and use its technology and terminology,
but do not waste context reading all 114,000 words.

First inspect:

- Chapter 2, "Helium Fever", beginning near line 129
- Chapter 3, "The Moon is Hard", beginning near line 355
- Chapter 4, "Cold Storage", beginning near line 689
- Chapter 6, "Beyond Helium", beginning near line 1151

Use targeted `rg` searches elsewhere for details such as RF extractors,
regolith, lunar night, batteries, solar panels, oxygen, water, crawlers,
Lunar Tug, cableways, the refinery, and Tan's Cantina. Do not reproduce long
passages from the manuscript.

## Product

Create **Tycho: Helium Fever**, a single-player, 2D, top-down lunar industrial
survival and automation game. Its feel should sit between Factorio, Frostpunk,
and a compact management game, but it must have its own identity and be
finishable in a 20-30 minute session.

The player directs the Tycho mining operation after Li Yun Tan and Darrin
Brooks establish a claim in Tycho Crater. Li and Darrin are authored characters,
not player avatars: they advise the player, disagree with decisions, perform
assigned work, and react to how the operation is run. The campaign must
bootstrap a helium-3 operation, survive the first lunar night, fill a shipment
bottle, and send it to Lunar Tug before debt and system failures consume the
operation.

The central design principle is:

> Every kilogram launched from Earth is expensive, every joule must be planned,
> lunar dust damages everything, and survival competes with production.

## Technology And Repository Constraints

- Use Vite, TypeScript, and Phaser 3 as the only game framework.
- Use Phaser scenes, cameras, input, animation, audio, and tile/map rendering
  rather than a custom raw Canvas engine.
- Use regular HTML/CSS for HUD, menus, dialogs, overlays, and tooltips.
- Keep dependencies minimal. Do not add React or another game/UI framework.
- The game must run with `npm install` and `npm run dev`.
- Add `npm run build`, `npm run test`, and `npm run lint` or equivalent checks.
- Persist settings, the current campaign, decisions, and the best result in
  `localStorage`. A saved run must restore the correct narrative act, unlocked
  mechanics, character state, and pending milestone.
- Do not require a backend, API key, account, network service, or paid asset.
- Create all character portraits, environmental panels, procedural/vector/CSS
  visuals, project assets, and simple generated sound effects locally. Do not
  depend on copyrighted game assets or remote image URLs.
- Keep all work inside `tycho-helium-fever`.

## Core Game Loop

The player begins with:

- A tiny buried habitat with an Earth window
- One crawler
- One RF helium extractor
- A modest solar array and battery bank
- Limited oxygen, water, spare parts, and money
- A large debt owed to Helion Dynamics

The playable map is a compact section of Tycho Crater containing terrain with
different helium-3 concentration, travel cost, dust abrasion, and solar access.

The player repeatedly:

1. Surveys lunar tiles to reveal helium-3 concentration.
2. Assigns the crawler to sweep regolith from selected zones.
3. Routes regolith into the RF extractor.
4. Tunes extractor magnetic field strength to maximize helium-3 purity and
   yield without wasting power.
5. Stores concentrate in a shipment bottle.
6. Expands solar, batteries, storage, maintenance capacity, and automation.
7. Repairs dust-damaged equipment and replaces worn components.
8. Allocates power among life support, heat, extraction, charging, and repairs.
9. Prepares for a long lunar night with no solar generation.
10. Ships a full bottle at rendezvous and pays down the transit loan.

## Essential Systems

Implement these as interacting systems rather than decorative meters:

- **Time:** A compressed lunar light/dark cycle. Clearly forecast sunset,
  sunrise, and rendezvous.
- **Power:** Solar generation varies with terrain and daylight. Batteries have
  capacity and discharge limits. Brownouts force automatic prioritization.
- **Life support:** Oxygen, water, habitat heat, and carbon dioxide. Failure
  creates escalating warnings and eventual loss, not instant surprise death.
- **Mining:** Surveyed tile grade, crawler travel time, payload, and dust wear.
- **Extraction:** Regolith throughput, power draw, field tuning, purity, yield,
  hopper backlog, and bottle capacity.
- **Maintenance:** Dust and operating hours degrade moving machinery. Preventive
  maintenance costs downtime and spares; neglect risks breakdowns.
- **Economy:** Shipment value depends on helium-3 quantity and purity. Track
  debt, operating expenses, supply orders, and delivery delay.
- **Human workload:** Li and Darrin can each perform one assignment at a time.
  The player assigns operational priorities rather than directly role-playing
  either character. Fatigue reduces performance and raises accident risk. Rest
  matters.
- **Events:** Use a small deterministic-seeded deck of grounded events such as
  a worn seal, crawler jam, counterfeit part, micrometeoroid damage, stranded
  miner request, disputed claim, or an unexpected cache from a darksided crew.

Avoid a giant recipe tree. The interesting complexity should come from timing,
power, maintenance, logistics, and difficult tradeoffs.

## Building And Upgrade Set

Include a focused set with clear costs and functions:

- Solar panel
- Battery bank
- Regolith stockpile/hopper
- RF extractor upgrade
- Fractional distiller
- Spare-parts bench
- Additional oxygen/water storage
- Improved recycler
- Crawler cargo or durability upgrade
- Cableway segment or automated haul route

Buildings should be placeable on a grid and connected logically where needed.
Placement must matter, but belt-level micromanagement is out of scope.

## Player Experience

Create an intentional visual identity:

- Stark lunar blue-gray, warm sodium work lights, amber warnings, green
  instrument traces, and Earth hanging above the horizon
- Fine regolith texture, long moving shadows, machinery tracks, cable lines,
  drifting dust, and a visible transition into blue earthshine at night
- Industrial typography and dense but legible instrumentation
- A restrained ambient soundscape: machinery hum, radio clicks, warning tones,
  and near-silence outside
- Smooth camera pan and zoom, clear selection states, useful tooltips, and
  readable feedback for every player action
- Responsive layout for normal desktop/laptop screens; mobile is not required

Do not make it look like a generic neon sci-fi dashboard. It should feel
functional, improvised, dusty, and physically constrained.

## Structure And Onboarding

- Teach through 5-7 concise contextual objectives, not a wall of text.
- Pause the simulation while important modal decisions are open.
- Support pause plus at least three time speeds.
- Include a compact help/reference panel accessible throughout play.
- Provide clear warnings early enough for the player to recover.

## Campaign Acts And Story Milestones

Organize the 20-30 minute campaign into compact narrative acts. Novel events
must drive progression: each milestone introduces or unlocks a mechanic exactly
once, then lets the player use it under pressure. Do not expose every system at
the start.

Use this progression:

1. **Tokaplex breakthrough:** A short opening cutscene establishes Li's
   technical insight and unlocks surveying and helium-grade overlays.
2. **Li recruits Darrin:** Introduce their working relationship, task
   assignments, maintenance advice, and RF extractor tuning.
3. **Ball Crater conflict:** Rival miners occupy the expected claim, forcing
   the move to Tycho and introducing claim ethics, salvage decisions, and
   reputation consequences.
4. **Arrival at Tycho:** Begin the main playable operation with power routing,
   crawler hauling, extraction, and debt pressure.
5. **First lunar night:** Escalate battery, heat, life-support, fatigue, and
   preventive-maintenance pressure.
6. **First shipment:** Unlock final production upgrades and cableway
   automation, then require a qualifying shipment and Lunar Tug rendezvous.
7. **Epilogue:** Resolve debt, relationships, safety, ethics, and mastery
   results, then preview the next industrial stage.

Story milestones must be explicit state-machine transitions, not events inferred
from UI state. Reloading a saved run must resume the same act without replaying
one-time rewards, duplicate dialogue, or unlock effects.

## Cutscenes

Include short illustrated cutscenes for the Tokaplex breakthrough, Li recruiting
Darrin, the Ball Crater conflict, arrival at Tycho, the first lunar night, the
shipment, and the epilogue.

- Each cutscene should last roughly 15-45 seconds when watched normally.
- Use original character portraits, caption cards, environmental panels,
  crossfades, camera drift, restrained parallax, instrument animation, and
  limited sound cues instead of expensive full character animation.
- Keep dialogue concise and grounded in the novel's industrial setting.
- Every cutscene must be skippable immediately and on replay.
- Skipping must produce the same milestone state and mechanic unlocks as
  watching the full sequence.
- Cutscenes must transition cleanly into and out of Phaser gameplay scenes
  without resetting simulation or input state.

## Narrative And Decisions

Use cutscenes, brief radio messages, contracts, news items, and event cards to
characterize Li as ambitious and territorial, and Darrin as cautious and
maintenance-minded. They should advise, disagree with, and react to the player,
including expressing tension with each other, but the player never selects
dialogue as Li or Darrin.

Introduce Elin, Raines, Andrei, and rival miners through those channels. They
can affect contracts, information, reputation, and decisions, but do not add
separate playable locations or character campaigns.

Include at least three meaningful decisions with mechanical consequences:

- Strip a disputed area before another crew arrives, or respect the claim.
- Salvage supplies purchased by a crew that darksided, or leave them untouched.
- Push production through a dangerous maintenance window, or miss rendezvous.

Do not turn the game into a dialogue-heavy visual novel. Decisions must alter
resources, risk, reputation, or ending text.

Track player behavior across four campaign dimensions:

- **Production:** throughput, shipment quality, and operational efficiency
- **Safety:** life-support margins, injuries, fatigue, and maintenance choices
- **Debt:** solvency, spending discipline, and loan repayment
- **Ethics:** claims, salvage ownership, aid, and treatment of rivals

Use this state to vary later dialogue, Li and Darrin's relationship tension,
mastery results, and ending text. Consequences should be legible and should
appear later in the campaign rather than only as immediate meter changes.

## Win, Loss, And Replayability

Primary victory:

- Survive the lunar night.
- Produce a shipment bottle meeting minimum quantity and purity.
- Deliver it at rendezvous.
- Finish solvent after the first Helion Dynamics loan payment.

Optional mastery goals:

- No life-support emergency
- No serious injury
- High-purity shipment
- Low equipment wear
- Ethical operation

Loss conditions include fatal life-support failure, unserviceable critical
equipment, or insolvency. Always explain exactly why the run ended.

Use seeded map and event variation so another run changes site quality and
problems without requiring large amounts of content.

After victory, show a concise epilogue and tease the next industrial stage:
the refinery, cableway network, and Tan's Cantina. This may be a brief playable
preview or an illustrated cinematic, but the campaign ends after the successful
first shipment. Do not implement Mars, Ceres, Jupiter, combat, multiplayer,
separate playable settlements, or the rest of the novel campaign.

## Quality Bar

- The first meaningful decision must occur within two minutes.
- The game must have a complete start-to-win or start-to-loss loop.
- No dead buttons, placeholder panels, fake controls, or TODO text.
- Numbers must be tuned so a new player can plausibly win after learning from
  one failed run.
- The simulation must remain stable at maximum time speed.
- Phaser rendering must remain crisp after resize and on high-DPI displays.
- Keyboard and mouse controls must be documented and usable.
- Important status must not rely on color alone.
- Add automated tests for deterministic simulation logic, especially power,
  extraction, lunar-night progression, and win/loss evaluation.
- Add automated tests for narrative act transitions, exactly-once mechanic
  unlocks, save restoration, decision-dependent dialogue, and ending results.
- Test watched and skipped cutscene transitions into gameplay scenes.
- Perform a manual smoke test of every cutscene-to-gameplay and
  gameplay-to-cutscene transition, including skip behavior and replay.
- Verify a saved run restores the correct act and cannot collect a milestone
  reward or unlock twice.
- Verify production, safety, debt, and ethics choices change later dialogue,
  relationship tension, mastery results, and ending text.
- Ensure no cutscene blocks replayability or leaves input, audio, pause state,
  or time scale in an invalid state.

## Execution Order

1. Inspect the specified manuscript sections and summarize the relevant facts
   in a short internal design note inside the project.
2. Build the complete game.
3. Run tests, lint/type checks, and a production build.
4. Launch it locally and perform a manual smoke test of the full loop,
   including every watched and skipped cutscene transition.
5. Fix any errors or obviously broken balance/UI found during testing.
6. Write a concise `README.md` with controls, commands, architecture, and known
   limitations.

Spend your effort on a coherent, polished vertical slice. Favor a smaller game
whose systems genuinely interact over a broad collection of shallow features.
