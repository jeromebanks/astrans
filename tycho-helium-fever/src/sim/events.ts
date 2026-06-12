import { hashNoise } from './rng';
import { addAlert, addRadio, applyDecisionEffect } from './sim';
import type { SimState } from './types';
import type { CampaignState } from './campaign';

export interface EventOption {
  id: string;
  label: string;
  detail: string;
}

export interface EventCard {
  id: string;
  title: string;
  speaker: string;
  body: (s: SimState, c: CampaignState) => string;
  options: EventOption[];
  /** apply the chosen option's mechanical consequences */
  resolve: (s: SimState, c: CampaignState, choice: string) => void;
  /** decision events are recorded in campaign.decisions */
  decisionId?: string;
}

export interface ScheduledEvent {
  id: string;
  t: number;
  condition?: (s: SimState, c: CampaignState) => boolean;
}

/** Build the seeded schedule. Times jitter ±18 min per seed so reruns differ. */
export function buildSchedule(seed: number): ScheduledEvent[] {
  const j = (k: number) => Math.round((hashNoise(seed, k, 911) - 0.5) * 36);
  return [
    { id: 'seal', t: 58 + j(1) },
    { id: 'claim', t: 145 + j(2) },
    { id: 'counterfeit', t: 215 + j(3) },
    { id: 'miner', t: 265 + j(4) },
    { id: 'os_arrives', t: 385 + j(5), condition: (s) => s.claimDecision === 'strip' },
    { id: 'micrometeoroid', t: 425 + j(6) },
    { id: 'push', t: 468 + j(7) },
    { id: 'kessler_return', t: 520 + j(8), condition: (_s, c) => c.decisions['miner'] === 'help' },
    { id: 'kessler_cold', t: 520 + j(8), condition: (_s, c) => c.decisions['miner'] === 'refuse' },
    { id: 'cache', t: 615 + j(9), condition: (s) => !s.shipped },
    { id: 'os_payback', t: 640 + j(10), condition: (s) => s.claimDecision !== '' },
  ];
}

export const EVENT_CARDS: Record<string, EventCard> = {
  seal: {
    id: 'seal',
    title: 'Worn seal',
    speaker: 'Darrin',
    body: () =>
      'Half-degree temperature drift on the recycler loop. That means a seal is going. '
      + 'I can pull it now — costs us a spare and twenty minutes of my time — or we ride it and hope.',
    options: [
      { id: 'fix', label: 'Replace the seal now', detail: '−1 spare, Darrin busy 20 min. Recycler wear −10.' },
      { id: 'ride', label: 'Ride it', detail: 'No cost now. Recycler wear +18 and Darrin will remember this.' },
    ],
    resolve: (s, _c, choice) => {
      if (choice === 'fix' && s.spares > 0) {
        s.spares -= 1;
        s.crew.darrin.busyUntil = s.t + 20;
        s.crew.darrin.busyLabel = 'Replacing a recycler seal';
        s.machines.recycler.wear = Math.max(0, s.machines.recycler.wear - 10);
        s.scores.safety += 1;
        addRadio(s, 'Darrin', 'Seal’s out. Edge was glazed right through. Cheap insurance.');
      } else {
        s.machines.recycler.wear = Math.min(100, s.machines.recycler.wear + 18);
        s.scores.safety -= 1;
        addRadio(s, 'Darrin', 'Logged it. For the record: I check each seal twice, and this one is on the record.');
      }
    },
  },

  claim: {
    id: 'claim',
    title: 'Ocean State Resources',
    speaker: 'Li',
    decisionId: 'claim',
    body: () =>
      'New filing on the claim map. Ocean State Resources — a rectangular plat drawn from an office on Earth — '
      + 'and it overlaps the northwest corner of OUR crater floor. Survey says that corner runs rich. '
      + 'They land in a few hours of daylight. We can strip it clean before they arrive and dust it with tailings '
      + 'so a shallow assay reads barren. Or we stand off and let paperwork win for once.',
    options: [
      { id: 'strip', label: 'Strip the overlap', detail: 'NW corner becomes sweepable (rich grades). Ethics −2. Ocean State will respond.' },
      { id: 'respect', label: 'Respect the claim', detail: 'Corner stays locked. Ethics +2. Li will not forgive the paperwork. Ocean State may deal fairly later.' },
    ],
    resolve: (s, _c, choice) => {
      applyDecisionEffect(s, 'claim', choice);
      if (choice === 'strip') {
        addRadio(s, 'Li', 'This crater is mine. Not some of it. All of it. Sweep fast — daylight is the deadline.');
        addRadio(s, 'Darrin', 'Li… we both remember Ball Crater. I’m just saying we remember different halves of it.');
      } else {
        addRadio(s, 'Li', 'Fine. We let the paperwork win. The day paperwork stops a laser, you can tell me you told me so.');
        addRadio(s, 'Darrin', 'It’s their legal claim. We hold the rest of the crater, and we hold it clean.');
      }
    },
  },

  counterfeit: {
    id: 'counterfeit',
    title: 'Counterfeit part',
    speaker: 'Darrin',
    body: (s) =>
      `Bad news from the bench. One of our pressure spares has a re-stamped casting — counterfeit, like the seals that killed that crew at Mare Serenitatis. ${s.spares > 1 ? 'I’m scrapping it.' : 'It was our last one.'} `
      + 'Do you want me to spend time re-inspecting the rest of the stock, or trust the supplier manifest?',
    options: [
      { id: 'inspect', label: 'Inspect everything', detail: 'Darrin busy 25 min. Safety up; future breakdown odds improve (extractor wear −8).' },
      { id: 'trust', label: 'Trust the manifest', detail: 'No downtime. Safety down.' },
    ],
    resolve: (s, _c, choice) => {
      s.spares = Math.max(0, s.spares - 1);
      if (choice === 'inspect') {
        s.crew.darrin.busyUntil = s.t + 25;
        s.crew.darrin.busyLabel = 'Re-inspecting the spares stock';
        s.machines.extractor.wear = Math.max(0, s.machines.extractor.wear - 8);
        s.scores.safety += 2;
        addRadio(s, 'Darrin', 'Every valve, every casting. It’s the only way I know how to do it.');
      } else {
        s.scores.safety -= 2;
        addRadio(s, 'Darrin', 'Noted. I’ll be the one wearing the suit that part goes into.');
      }
    },
  },

  miner: {
    id: 'miner',
    title: 'Local Band — weak signal',
    speaker: 'Radio',
    decisionId: 'miner',
    body: () =>
      '“—anyone on this band. Name’s Kessler, solo claim ten miles east. Crawler’s down and my oxygen margin '
      + 'won’t cover the walk home. I can see your lights. I’ll pay what I have, which is nothing.” '
      + 'Darrin is already reaching for his helmet. Li is looking at the oxygen gauge.',
    options: [
      { id: 'help', label: 'Send Darrin with oxygen', detail: '−6 kg O₂, Darrin away 45 min. Ethics +2. Kessler owes you one.' },
      { id: 'refuse', label: 'Refuse — margins are margins', detail: 'No cost. Ethics −2. The Local Band hears everything.' },
    ],
    resolve: (s, _c, choice) => {
      applyDecisionEffect(s, 'miner', choice);
      if (choice === 'help') {
        addRadio(s, 'Darrin', 'On my way, Kessler. Keep your breathing slow and stay with the machine.');
        addRadio(s, 'Li', 'Six kilos of oxygen is six kilos. He pays it back or his claim does.');
      } else {
        addRadio(s, 'Li', 'We are not a rescue service. Our margins keep US alive.');
        addRadio(s, 'Darrin', '…He was ten miles out, Li. I’ll be outside checking the lines.');
      }
    },
  },

  os_arrives: {
    id: 'os_arrives',
    title: 'Ocean State lands',
    speaker: 'Radio',
    body: () =>
      '“Unidentified operation, this is Ocean State Resources. Our assay team finds the overlap section… barren. '
      + 'Noted for the record: tailings don’t settle in neat layers, Tan. We know what you did. '
      + 'Stay east of the line and we won’t make it a problem this season.” The channel clicks dead.',
    options: [
      { id: 'ok', label: 'Log it', detail: 'They’ll bill you for it eventually.' },
    ],
    resolve: (s) => {
      addRadio(s, 'Li', 'They climbed nothing. They risked nothing. The helium was never going to be theirs.');
      addRadio(s, 'Darrin', 'They knew, Li. Paper people always know. They just also know what a survey laser costs.');
    },
  },

  micrometeoroid: {
    id: 'micrometeoroid',
    title: 'Micrometeoroid strike',
    speaker: 'Darrin',
    body: () =>
      'Felt that through the floor. Something sand-grain sized hit the array field at orbital speed — '
      + 'one string is reading ragged and there’s ejecta dust across the panels. No hull damage. '
      + 'The array needs a cleaning pass when someone can suit up.',
    options: [
      { id: 'ok', label: 'Acknowledged', detail: 'Solar array dust film +15%. Assign Maintain → Solar array to recover output.' },
    ],
    resolve: (s) => {
      s.machines.solar.wear = Math.min(35, s.machines.solar.wear + 15);
      addAlert(s, 'meteoroid', '✶', 'Array string damaged — solar output reduced until cleaned', 'warn');
    },
  },

  push: {
    id: 'push',
    title: 'The maintenance window',
    speaker: 'Darrin',
    decisionId: 'push',
    body: (s) =>
      `RF wear is at ${Math.round(s.machines.extractor.wear)}%. There’s a vibration in the housing I don’t like — that’s a bolt working loose, and on this machine that’s how breakdowns start. `
      + 'I want it cold for an hour, now, while I can still fix it cheap. Li wants every gram before the Tug window. '
      + 'Andrei’s ship lands twenty hours before dawn — rendezvous A. Stand the extractor down and we probably watch that window close.',
    options: [
      { id: 'push', label: 'Push through the night', detail: 'Extractor keeps running. Wear ×1.6 and double breakdown risk until dawn. Keeps rendezvous A alive. Safety −1.' },
      { id: 'stand', label: 'Stand down for maintenance', detail: 'Extractor off 60 min, wear −30. Safer machine, but rendezvous A is likely lost (window B costs $40k more interest).' },
    ],
    resolve: (s, _c, choice) => {
      applyDecisionEffect(s, 'push', choice);
      if (choice === 'push') {
        addRadio(s, 'Li', 'We can fix machines with money. We can’t fix a missed window with anything.');
        addRadio(s, 'Darrin', 'Logged under protest. When it lets go, I want it on record that it was a bolt, not bad luck.');
      } else {
        addRadio(s, 'Darrin', 'Thank you. One hour. You’ll have it back smoother than new.');
        addRadio(s, 'Li', 'One hour. I’m counting it in grams.');
      }
    },
  },

  kessler_return: {
    id: 'kessler_return',
    title: 'Kessler pays his debt',
    speaker: 'Radio',
    body: () =>
      '“Tan operation, Kessler. I don’t carry money, but I carry maps. My old crew surveyed your floor grid '
      + 'before they pulled out — transmitting the sheet now. And there’s a crate of certified spares on your line. '
      + 'You kept your margins thin for a stranger. People hear about that out here.”',
    options: [
      { id: 'ok', label: 'Accept with thanks', detail: '+2 spares; the 5 richest unsurveyed tiles are revealed.' },
    ],
    resolve: (s) => {
      s.spares += 2;
      const unsurveyed = s.tiles.filter((t) => !t.surveyed).sort((a, b) => b.grade - a.grade).slice(0, 5);
      for (const t of unsurveyed) t.surveyed = true;
      s.scores.ethics += 1;
      addRadio(s, 'Li', 'Huh. Generosity with a yield curve. I can respect that.');
    },
  },

  kessler_cold: {
    id: 'kessler_cold',
    title: 'Local Band — overheard',
    speaker: 'Radio',
    body: () =>
      'Two distant voices on the open band, not addressed to you, not encrypted either: '
      + '“—Kessler made it back on suit bottles, barely. Tycho outfit watched him walk.” '
      + '“The crater queen? Figures. Don’t break down east of the wall, is the lesson.” '
      + 'The conversation fades with distance.',
    options: [
      { id: 'ok', label: 'Close the channel', detail: 'Reputation noted. Rendezvous prices won’t be friendly.' },
    ],
    resolve: (s) => {
      s.money -= 8_000;
      addRadio(s, 'Darrin', 'That’s the thing about the Local Band. It’s AM. Everything adds together, and everyone is listening.');
      addAlert(s, 'rep-cost', '$', 'Suppliers quoting you "stranger rates": −$8,000', 'warn');
    },
  },

  cache: {
    id: 'cache',
    title: 'Andrei’s manifest',
    speaker: 'Andrei',
    decisionId: 'cache',
    body: () =>
      '“Tan, Darrin — Lunar Tug. I land at your rendezvous flat for window B. Listen: I am carrying water, oxygen, '
      + 'batteries — packages paid for by a crew out of Lexell. They darksided two weeks ago. It happens on every rendezvous. '
      + 'I have no reason to haul it back to LEO. You want it? Someone should get use from it.”',
    options: [
      { id: 'accept', label: 'Accept the packages', detail: '+6 kg O₂, +30 kg water, +2 spares. They paid; they’re gone; this is how the Moon works.' },
      { id: 'decline', label: 'Decline', detail: 'Ask Andrei to find the next of kin. Ethics +1.' },
    ],
    resolve: (s, _c, choice) => {
      applyDecisionEffect(s, 'cache', choice);
      if (choice === 'accept') {
        addRadio(s, 'Li', 'There’s a family photo laminated to the water container. Turn it inward. We never got to say goodbye either.');
      } else {
        s.scores.ethics += 1;
        addRadio(s, 'Andrei', 'I will try, Tan. The Moon does not keep good addresses. You are strange people. Good strange.');
      }
    },
  },

  os_payback: {
    id: 'os_payback',
    title: 'Ocean State, again',
    speaker: 'Radio',
    body: (s) =>
      s.claimDecision === 'strip'
        ? '“Tan operation — Ocean State billing department, believe it or not. Arbitration filing for the overlap section: '
        + 'twenty thousand, or we put a survey team and two lawyers on your rim. Cheaper than what you took. Pay it.”'
        : '“Tan operation — Ocean State logistics. You stood off our plat when you didn’t have to. Management noticed. '
        + 'We over-ordered certified spares and a water bladder this rendezvous. Sending the surplus down your line at cost — call it neighbor rates.”',
    options: [
      { id: 'ok', label: 'Acknowledge', detail: 'Consequences arrive whether acknowledged or not.' },
    ],
    resolve: (s) => {
      if (s.claimDecision === 'strip') {
        s.money -= 20_000;
        addAlert(s, 'os-bill', '$', 'Ocean State arbitration: −$20,000', 'warn');
        addRadio(s, 'Li', 'Worth it. Every gram of it.');
      } else {
        s.spares += 2;
        s.water += 30;
        addAlert(s, 'os-gift', '▸', 'Ocean State surplus: +2 spares, +30 kg water', 'info');
        addRadio(s, 'Darrin', 'See? Sometimes the paperwork people remember a favor.');
      }
    },
  },
};

/** Fire due events. Returns the card to show (modal pauses the sim), if any. */
export function dueEvent(schedule: ScheduledEvent[], s: SimState, c: CampaignState): EventCard | null {
  for (const ev of schedule) {
    if (s.t < ev.t || c.eventsFired.includes(ev.id)) continue;
    if (ev.condition && !ev.condition(s, c)) {
      // condition permanently false (e.g. mutually exclusive branch): mark as
      // fired once its alternative fired, so we don't re-check forever
      if (s.t > ev.t + 120) c.eventsFired.push(ev.id);
      continue;
    }
    c.eventsFired.push(ev.id);
    return EVENT_CARDS[ev.id] ?? null;
  }
  return null;
}

export function resolveEvent(card: EventCard, s: SimState, c: CampaignState, choice: string): void {
  if (card.decisionId) c.decisions[card.decisionId] = choice;
  card.resolve(s, c, choice);
}
