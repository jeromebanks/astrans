import type { SimState } from '../sim/types';
import type { CampaignState } from '../sim/campaign';
import * as C from '../sim/constants';
import { addRadio } from '../sim/sim';

/** One-shot contextual radio lines. Conditions read sim + campaign state so
 * earlier choices change what gets said later. Fired ids live in the campaign
 * save, so reloads never repeat them. */
interface Line {
  id: string;
  when: (s: SimState, c: CampaignState) => boolean;
  speaker: string;
  text: (s: SimState, c: CampaignState) => string;
}

const LINES: Line[] = [
  {
    id: 'd_open_li', when: (s) => s.t >= 2, speaker: 'Li',
    text: () => 'Power first, then survey. I want grade numbers on this floor before we burn daylight guessing. Click tiles to queue surveys.',
  },
  {
    id: 'd_open_darrin', when: (s) => s.t >= 4, speaker: 'Darrin',
    text: () => 'Hopper’s still half-loaded from the trip in. Flip the RF on whenever you want — and watch the trace, not the levers.',
  },
  {
    id: 'd_first_yield', when: (s) => s.lastYieldRate > 0, speaker: 'Darrin',
    text: () => 'There’s the hum. Too weak a field and hydrogen floods the trace; too strong and you’re heating rock and pulling ⁴He. Live between them.',
  },
  {
    id: 'd_good_tune', when: (s) => s.stats.peakYieldRate >= 250, speaker: 'Li',
    text: (s) => `${Math.round(s.stats.peakYieldRate)} milligrams a minute. That’s the target. Hold this and the bottle fills in one cycle.`,
  },
  {
    id: 'd_survey_rich', when: (s) => s.tiles.some((t) => t.surveyed && t.grade >= 5.8), speaker: 'Li',
    text: () => 'See that pocket? Young crater, thin helium — but the good seams are there if you map before you sweep. Sweep the best, skip the rest.',
  },
  {
    id: 'd_batt_advice', when: (s) => s.t >= 120 && s.batteryCap <= C.START_BATT_CAP, speaker: 'Li',
    text: () => 'I budgeted batteries plus twenty percent, and I’m telling you it isn’t enough. Night is 240 minutes with zero generation. Buy storage while we still have daylight to charge it.',
  },
  {
    id: 'd_dust', when: (s) => s.machines.crawler.wear > 40, speaker: 'Darrin',
    text: () => 'Crawler bearings are picking up grit. This dust never knew wind or water — it’s fine as smoke and sharp as glass. Preventive maintenance is cheaper than a tow.',
  },
  {
    id: 'd_sunset_soon', when: (s) => s.t >= C.DAY_END - 60 && s.t < C.DAY_END, speaker: 'Darrin',
    text: () => 'Sixty minutes of sun left on the floor. The rim panels will hold a little longer. Top the crawler off and decide what runs tonight.',
  },
  {
    id: 'd_night_eco', when: (s) => s.t >= C.DAY_END && !s.lsEconomy && s.battery < s.batteryCap * 0.5, speaker: 'Li',
    text: () => 'Battery’s under half. We can let CO₂ ride up to four thousand and cut the algae loop’s draw — it’ll cost us focus, not lives. Life-support economy toggle, left panel.',
  },
  {
    id: 'd_night_holding', when: (s) => s.t >= C.DAY_END + 120 && s.habTemp > 10, speaker: 'Darrin',
    text: () => 'Halfway through the dark and the hut’s holding warm. The regolith over the roof is doing its job. We’re better at this than the people who didn’t make it.',
  },
  {
    id: 'd_rdv_a', when: (s) => s.t >= C.RDV_A_OPEN - 45 && s.t < C.RDV_A_OPEN, speaker: 'Andrei',
    text: () => 'Tan, Darrin — Lunar Tug, on descent profile. Window A opens at 09:00 and I hold it thirty minutes, no more. If the bottle is riding, send it now; the flat is half an hour of crawler from your wall.',
  },
  {
    id: 'd_rdv_b', when: (s) => s.t >= C.RDV_B_OPEN - 45 && s.t < C.RDV_B_OPEN && !s.shipped, speaker: 'Andrei',
    text: () => 'Lunar Tug again, last pass this cycle: window B, 12:40, thirty minutes. After this I am back to LEO and your loan does not care about my schedule. Send the bottle.',
  },
  {
    id: 'd_dawn', when: (s) => s.t >= C.NIGHT_END + 5, speaker: 'Li',
    text: (_s, c) => c.decisions['claim'] === 'strip'
      ? 'Sun’s on the rim. We made it through — and the overlap corner paid for the batteries that got us here. I’d do it again.'
      : 'Sun’s on the rim. Panels are charging. Not everyone made it through their first night. We did.',
  },
  {
    id: 'd_fatigue_li', when: (s) => s.crew.li.fatigue > 85, speaker: 'Darrin',
    text: () => 'Li. You’ve been outside for two shifts. Exhausted people tear gloves on scoop arms. Rest. The regolith will still be there.',
  },
  {
    id: 'd_fatigue_darrin', when: (s) => s.crew.darrin.fatigue > 85, speaker: 'Li',
    text: () => 'Darrin, you’re no use to the machines asleep on your feet. Get inside. That’s not a suggestion, it’s scheduling.',
  },
  {
    id: 'd_bottle_close', when: (s) => s.bottleHe3 >= C.BOTTLE_MIN_G * 0.8 && !s.shipped, speaker: 'Li',
    text: (s) => `${s.bottleHe3.toFixed(0)} grams in the bottle. Almost a shipment. Almost doesn’t service a loan — keep the trace centered.`,
  },
  {
    id: 'd_distiller', when: (s, c) => c.unlocked.includes('distiller') && !s.buildings.some((b) => b.id === 'distiller'), speaker: 'Li',
    text: () => 'Shipping costs eat fifteen percent of every bottle. A fractional distiller strips the ⁴He and hydrogen — ten times the ³He per kilogram of freight. It pays for itself in one rendezvous. Build it.',
  },
  {
    id: 'd_cableway', when: (s, c) => c.unlocked.includes('cableway') && !s.buildings.some((b) => b.id === 'cableway'), speaker: 'Darrin',
    text: () => 'I keep sketching it: a cable loop on pylons, bags carrying themselves to the hopper while we sleep. One segment would automate a whole sweep zone. I already have the drum picked out.',
  },
  {
    id: 'd_broke_no_spares', when: (s) => s.spares === 0, speaker: 'Darrin',
    text: () => 'Spares shelf is empty. Out here that’s not a supply problem, it’s a countdown. Order parts or stop trusting machines.',
  },
  {
    id: 'd_shipped_a', when: (s) => s.shipped && s.shippedWindow === 'A', speaker: 'Andrei',
    text: (s) => `Bottle aboard and weighed: ${s.shippedGrams.toFixed(0)} grams. QR engraving reads clean. In the dark, through the night, with winches — you two are either the best new outfit on the Moon or the luckiest. Da, maybe both.`,
  },
  {
    id: 'd_shipped_b', when: (s) => s.shipped && s.shippedWindow === 'B', speaker: 'Andrei',
    text: (s) => `Bottle aboard: ${s.shippedGrams.toFixed(0)} grams to Helion’s dock. Assay takes a week, money follows. Tycho was supposed to be too far and too poor. Nobody tells Tan that, I think.`,
  },
];

export function fireDialogue(s: SimState, c: CampaignState): void {
  for (const line of LINES) {
    if (c.dialogueFired.includes(line.id)) continue;
    if (!line.when(s, c)) continue;
    c.dialogueFired.push(line.id);
    addRadio(s, line.speaker, line.text(s, c));
    break; // at most one new line per tick keeps the radio readable
  }
}
