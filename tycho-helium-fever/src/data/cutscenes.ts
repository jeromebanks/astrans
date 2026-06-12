export interface CutsceneLine {
  speaker: string;
  text: string;
}

export interface CutsceneDecision {
  id: string;
  prompt: string;
  options: { id: string; label: string; detail: string }[];
}

export interface CutscenePanel {
  art: string; // procedural art key, see game/art.ts
  title?: string;
  caption?: string;
  lines?: CutsceneLine[];
  duration: number; // seconds at normal watch speed
  decision?: CutsceneDecision; // pauses until chosen (skipped if already decided)
}

export interface CutsceneDef {
  id: string;
  name: string;
  panels: CutscenePanel[];
}

export const CUTSCENES: Record<string, CutsceneDef> = {
  cs_tokaplex: {
    id: 'cs_tokaplex',
    name: 'Helium Fever',
    panels: [
      {
        art: 'art_city',
        title: 'TYCHO: HELIUM FEVER',
        caption: 'Ilha Fusão, Lisbon. Eighteen months without a flicker. The tokaplex works — and it burns helium-3.',
        duration: 7,
      },
      {
        art: 'art_apartment',
        caption: 'Phoenix. Li Yun Tan, power engineer, alone with the financial news.',
        lines: [
          { speaker: 'Newsfeed', text: 'Helion Dynamics announces a two-year price guarantee: eight million dollars per kilogram of lunar helium-3. Transit loans available.' },
          { speaker: 'Li', text: 'No lease. No debt. Nobody to call. Savings plus vacation pay covers the gear. The loan covers the lift.' },
        ],
        duration: 9,
      },
      {
        art: 'art_claimmap',
        caption: 'She watched the claim clusters grow every night. The distribution is nearly uniform. It didn’t matter. The fever doesn’t run on geology.',
        lines: [
          { speaker: 'Li', text: 'APPLY.' },
        ],
        duration: 7,
      },
    ],
  },

  cs_recruit: {
    id: 'cs_recruit',
    name: 'An equipment operator',
    panels: [
      {
        art: 'art_northsea',
        caption: 'Craigslist, Resumes/Moonwork. Darrin Brooks: offshore turbines, North Sea. Years of logs. Every seal checked twice.',
        lines: [
          { speaker: 'Li', text: 'Contract, passage included. You maintain, I plan.' },
          { speaker: 'Darrin', text: '…I’m looking at the Moon right now, you know. Yes.' },
        ],
        duration: 8,
      },
      {
        art: 'art_market',
        caption: 'The Lunar Supply Market, Tucson. Surplus, salvage, and a few honest machines.',
        lines: [
          { speaker: 'Darrin', text: 'RF extractor. It doesn’t heat the rock, just the gas — Larmor resonance. You tune the field and watch a mass-spec trace.' },
          { speaker: 'Vendor', text: 'Too weak, hydrogen floods out. Too strong, you heat rock and pull ⁴He. You live in the sweet spot, and you never stop adjusting.' },
          { speaker: 'Li', text: 'Heavy. But built for easy repair. Fine, Darrin. This one.' },
        ],
        duration: 11,
      },
      {
        art: 'art_hut',
        caption: 'A nine-foot Quonset hut with dual recyclers, an algae loop, and an eighteen-inch window packed separately — to frame the Earth.',
        lines: [
          { speaker: 'Darrin', text: 'Small is better. Every airlock cycle loses oxygen.' },
        ],
        duration: 7,
      },
    ],
  },

  cs_ballcrater: {
    id: 'cs_ballcrater',
    name: 'Ball Crater',
    panels: [
      {
        art: 'art_balllaser',
        caption: 'Their claim in Ball Crater — filed, sealed, certified — already held by a crew that had been there for weeks.',
        lines: [
          { speaker: 'Darrin', text: 'This sector is Li Yun Tan’s claim. You need to pack up and move.' },
          { speaker: 'Claim-jumper', text: 'No.' },
        ],
        duration: 8,
      },
      {
        art: 'art_greendot',
        caption: 'A survey laser cut the paperwork in half while Darrin held it. Then a green dot settled on his chest.',
        lines: [
          { speaker: 'Li', text: 'Darrin. Get back in the crawler.' },
        ],
        duration: 7,
      },
      {
        art: 'art_wreck',
        caption: 'Southwest, past the last tracks: a wrecked crawler, hatch forced from outside. The crew darksided — batteries died two weeks before dawn.',
        lines: [
          { speaker: 'Darrin', text: 'Two oxygen bottles in the cargo rack. These folks don’t need theirs anymore. What do you say?' },
        ],
        duration: 8,
        decision: {
          id: 'wreck',
          prompt: 'The salvage question. The Moon will ask it again.',
          options: [
            { id: 'salvage', label: 'Take the bottles and a spare', detail: '+8 kg O₂, +1 spare. Practical. The dead don’t file complaints.' },
            { id: 'leave', label: 'Leave it untouched', detail: 'No gain. Some lines you keep, even out here.' },
          ],
        },
      },
      {
        art: 'art_wall',
        caption: 'They drove until there were no more tracks and no more claims. Then a wall a mile high rose out of the curve of the Moon.',
        lines: [
          { speaker: 'Li', text: 'Navigation says Tycho. Ancient. Huge. Empty.' },
        ],
        duration: 7,
      },
    ],
  },

  cs_tycho: {
    id: 'cs_tycho',
    name: 'The Moon is Hard',
    panels: [
      {
        art: 'art_climb',
        caption: 'Winches, pitons, fresh lines every twenty meters. The crawler walked up a wall a kilometer high.',
        lines: [
          { speaker: 'Darrin', text: 'Keep the pace slow. Too fast and we shear a line.' },
        ],
        duration: 7,
      },
      {
        art: 'art_crater',
        caption: 'Fifty miles of silent floor. Nothing had moved here in a hundred million years.',
        lines: [
          { speaker: 'Li', text: 'The rest of the Moon can keep its dust. That wall is our claim. Anyone who wants to contest it can climb it first.' },
          { speaker: 'Darrin', text: 'Panels go on the rim — ten extra hours of sun per cycle. I’ll run the cable down.' },
        ],
        duration: 9,
      },
      {
        art: 'art_buried',
        caption: 'They buried the hut under regolith and aligned the Earth window. The first survey came back: 3.2 parts per billion. Young crater. Thin helium.',
        lines: [
          { speaker: 'Li', text: 'One bottle per cycle. Maybe. We work hard and we work smart. Debt: $1.2 million. Clock’s running.' },
        ],
        duration: 9,
      },
    ],
  },

  cs_night: {
    id: 'cs_night',
    name: 'First Lunar Night',
    panels: [
      {
        art: 'art_sunset',
        caption: 'The sun dropped behind the western rim. No dusk. The world turned blue with earthshine, and outside fell toward −170 °C.',
        lines: [
          { speaker: 'Darrin', text: 'Rim panels will trickle a few more minutes. After that, everything we are is in the batteries.' },
        ],
        duration: 8,
      },
      {
        art: 'art_earthshine',
        caption: '240 minutes of night. No generation. Heat, air, and the loan clock all draw from the same bank.',
        lines: [
          { speaker: 'Li', text: 'If power gets thin: CO₂ can ride to four thousand ppm. Unpleasant buys watts.' },
          { speaker: 'Andrei', text: 'Lunar Tug schedule, all claims: window A opens at 09:00, twenty hours before your dawn. I weigh anything that reaches the flat.' },
        ],
        duration: 10,
      },
    ],
  },

  cs_shipment: {
    id: 'cs_shipment',
    name: 'Rendezvous',
    panels: [
      {
        art: 'art_dawn',
        caption: 'Day 14. The sun hit the rim panels ten hours before it reached the floor. The batteries began to climb. Not everyone’s did.',
        lines: [
          { speaker: 'Darrin', text: 'We made it through our first night. Now we finish the bottle.' },
        ],
        duration: 8,
      },
      {
        art: 'art_tug',
        caption: 'Lunar Tug holds window B at 12:40 for thirty minutes. Andrei weighs bottles; Helion assays on Earth; purity sets the price.',
        lines: [
          { speaker: 'Li', text: 'Shipping eats fifteen percent of a raw bottle. A fractional distiller fixes that. And Darrin keeps sketching cable pylons.' },
        ],
        duration: 9,
      },
    ],
  },

  cs_epilogue: {
    id: 'cs_epilogue',
    name: 'Beyond Helium',
    panels: [
      {
        art: 'art_tug',
        caption: 'Andrei weighed the bottle with no concern for what was in it. The QR code on the shell was engraved to her account.',
        duration: 7,
      },
      {
        art: 'art_earthshine',
        caption: 'A week for assay. A week to learn what every choice had been worth.',
        duration: 6,
      },
      {
        art: 'art_cantina',
        caption: 'Next cycle: thermal ovens, a refinery, cableways carrying other miners’ bags over the rim — and a welded cluster of huts with warm light and music. The sign will say TAN’S CANTINA.',
        duration: 9,
      },
    ],
  },
};
