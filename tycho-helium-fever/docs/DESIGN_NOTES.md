# Tycho: Helium Fever — internal design note

Facts pulled from the manuscript (`../astrans.md`, chapters 2, 3, 4, 6) that drive
the design. Do not reproduce manuscript prose in game text; paraphrase.

## Source facts used

- ³He price $8,000,000/kg; Helion Dynamics offers a 2-year price guarantee and a
  transit loan up to $1M at 20% interest, repayable in ³He.
- Claims: one square mile per person; Li files two square miles in Ball Crater by
  including Darrin. Paperwork proves worthless — claim-jumpers with survey lasers
  hold the ground. "The law only matters if someone shows up to enforce it."
- Li: ex Arizona Public Service power engineer, ambitious, territorial
  ("This crater is mine. Not some of it. All of it."). Lost parents at twelve in
  Kuala Lumpur (gridlock, ambulances late — why she cares about power).
  Misfiled name: everyone calls her "Tan"; only Darrin gets it right.
- Darrin Brooks: North Sea turbine maintainer, logged every inspection, checked
  each seal twice. Cautious, maintenance-minded; anticipates failures (vibration
  = loose bolt, half-degree drift = degrading seal).
- RF extractor: Larmor resonance; magnets tune which atoms the RF excites.
  You never see the right field strength directly — you watch a mass-spec trace
  of ³He/⁴He/H peaks. Field too weak → hydrogen floods out; too strong → energy
  heats rock and ⁴He climbs. Live in the sweet spot; keep adjusting; purity falls
  after ~half the ³He is extracted, then swap batches. ~5–10% ³He is a good ratio.
  First load was 4.7 mg; "We hit eight!" was the target rate.
- Tycho is young (~100 My) → poor grades: 3.2 ppb west floor, 4.8 near central
  peak (vs ~15 typical lunar). One bottle per cycle is the goal, ~100 g scale.
  First shipment cleared $730k, $146k loan service.
- Lunar night: 14 days; temp −170 °C in hours; panels on the rim get ~10 extra
  hours per cycle vs the floor. They let CO₂ climb to 4000 ppm to cut algae-loop
  power. Batteries: Li budgeted +20%. Crews that gamble on "one more load"
  darkside — battery dies, heat, then oxygen.
- Hut: tiny Quonset, buried in regolith, Earth window aligned by tidal lock,
  algae loop (oxygen + heat + edible biomass), small airlock because every cycle
  loses oxygen.
- Dust: fine as smoke, sharp as broken glass; never weathered; creeps into every
  gap, abrades moving parts, shorts contacts. Constant maintenance.
- Counterfeit parts kill (Mare Serenitatis suit failures).
- Local Band radio: AM, natural overlapping speech, heterodyne squeal when two
  systems first meet. Encoded FM for private channels ("copy").
- Andrei Volkov: ferry pilot turned founder of Lunar Tug (Miami). At rendezvous
  he weighs bottles, distributes ordered packages, and gives away packages whose
  buyers darksided. Rendezvous: cargo ship lands ~20 h before dawn.
- Ocean State Resources: filed from Earth a rectangular plat overlapping ~10
  acres of Tycho's floor. Li strips the overlap before they land and dusts it
  with processed tailings so a shallow assay reads barren. Standoff with survey
  lasers; Darrin dug into a ridge as overwatch. They later become refinery
  customers (at a surcharge).
- Fractional distiller: separates ³He from ⁴He etc.; purified bottles carry
  ~10× the ³He per kg of freight; shipping drops from ~15% of income to ~2%.
- Future stage (epilogue tease): the OK-550 reactor, thermal ovens at 1000 °C,
  Tan's Refinery with QR-coded bags, Rook's Dyneema cableway over the rim,
  cableway network, Tan's Cantina.
- "Cheechako" = greenhorn. "Darksided" = died in lunar night.

## Game shape

- Pure deterministic sim core in `src/sim` (no Phaser imports) ticked at
  1 sim-minute steps; Phaser + DOM are views. Seeded RNG lives in the state.
- Timeline (sim minutes from Tycho arrival): day 0–360, night 360–600, dawn 600.
  Rendezvous window A 540–570 (in the night, ~"20 h before dawn"), window B
  760–790. Hard insolvency at 800 if nothing shipped. 1× = 1 sim-min/s.
- Acts 1–3 (Tokaplex, recruiting Darrin, Ball Crater) are cutscenes with the
  wreck-salvage decision; acts 4–7 are the playable operation, night, shipment,
  epilogue. Milestones are an explicit state machine in `campaign.ts`;
  unlock effects apply exactly once and survive save/load.
- Four hidden tracks — production, safety, debt, ethics — gate later radio
  dialogue, Li/Darrin tension, mastery results, and ending text.
- Compression: tile "grade" is shown in ppb (2.5–6.5, matching the novel's
  Tycho numbers) but yield is scaled (grade × 60 mg per ton) so a ~80 g bottle
  is achievable in a session. Bottle purity lives in the novel's 4–12% RF band;
  the distiller pushes it toward ~30%.
