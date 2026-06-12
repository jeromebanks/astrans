import type { SimState } from './types';
import type { CampaignState } from './campaign';

export interface Mastery {
  id: string;
  label: string;
  achieved: boolean;
}

export function evaluateMastery(s: SimState): Mastery[] {
  const avgWear = (s.machines.crawler.wear + s.machines.extractor.wear + s.machines.recycler.wear) / 3;
  return [
    { id: 'm_ls', label: 'No life-support emergency', achieved: s.stats.lsEmergencies === 0 },
    { id: 'm_injury', label: 'No serious injury', achieved: s.stats.injuries === 0 },
    { id: 'm_purity', label: `High-purity shipment (≥ 12%)`, achieved: s.shippedPurity >= 0.12 },
    { id: 'm_wear', label: 'Low equipment wear (avg < 50%)', achieved: avgWear < 50 },
    { id: 'm_ethics', label: 'Ethical operation', achieved: s.scores.ethics >= 2 },
  ];
}

export interface EndingText {
  title: string;
  paragraphs: string[];
  masteries: Mastery[];
}

export function buildEnding(s: SimState, c: CampaignState): EndingText {
  if (!s.won) {
    return {
      title: 'The Moon didn’t care',
      paragraphs: [
        s.lossDetail || 'The operation failed.',
        lossCoda(s, c),
        'Seeded reruns change the floor grades and the trouble. The crater is still there.',
      ],
      masteries: [],
    };
  }
  const m = evaluateMastery(s);
  const paras: string[] = [];
  paras.push(
    `The deposit cleared a week later: ${s.shippedGrams.toFixed(1)} g of ³He at ${(s.shippedPurity * 100).toFixed(1)}% purity. `
    + `After Helion serviced the loan, the account read $${Math.max(0, Math.round(s.money)).toLocaleString()}. `
    + `Debt remaining: $${Math.round(s.debt).toLocaleString()}. It’s a number that shrinks now instead of growing.`,
  );
  paras.push(relationshipPara(s, c));
  paras.push(operationPara(s));
  paras.push(
    'Li is already pricing the next cycle: a fractional distiller running full-time, thermal ovens that crack regolith '
    + 'at a thousand degrees, a cableway over the rim so other miners’ bags carry themselves to her floor. Somewhere in the '
    + 'welded cluster of secondhand huts there is going to be a kitchen, and music, and a sign over the airlock. '
    + 'The miners will butcher her name when they paint it. She’ll keep it that way.',
  );
  return { title: 'First shipment', paragraphs: paras, masteries: m };
}

function relationshipPara(s: SimState, c: CampaignState): string {
  const e = s.scores.ethics;
  const stripped = c.decisions['claim'] === 'strip';
  const helped = c.decisions['miner'] === 'help';
  if (e >= 2) {
    return 'Darrin reads the assay twice, the way he reads everything twice, and grins. "We did this clean, Li. All of it." '
      + (helped ? 'Kessler’s spare crate sits in the corner like a testimonial. ' : '')
      + 'Li looks out the Earth window a long moment. "Clean is a luxury. But it was a good one."';
  }
  if (stripped && e <= -2) {
    return 'Darrin doesn’t toast. He runs his thumb along the table edge and says, "Ocean State will remember your name now." '
      + 'Li doesn’t look up from the ledger. "They already did." It sits between them, the way Ball Crater sits between them — '
      + 'the same lesson, learned from opposite sides.';
  }
  return 'They eat algae biscuit soup with the good flavor packets, and argue, comfortably, about whether the second bottle '
    + 'goes faster with more panels or more batteries. Li says panels. Darrin says maintenance. They are both right, '
    + 'which is why this works.';
}

function operationPara(s: SimState): string {
  const bits: string[] = [];
  if (s.stats.lsEmergencies === 0) bits.push('life support never once went to a countdown');
  else bits.push(`${s.stats.lsEmergencies} life-support emergenc${s.stats.lsEmergencies === 1 ? 'y' : 'ies'} went into the log`);
  if (s.stats.injuries === 0) bits.push('nobody bled');
  else bits.push(`${s.stats.injuries} suit accident${s.stats.injuries === 1 ? '' : 's'} taped over`);
  if (s.stats.breakdowns === 0) bits.push('and not one machine seized — Darrin keeps that page of the log like a photograph');
  else bits.push(`and ${s.stats.breakdowns} breakdown${s.stats.breakdowns === 1 ? '' : 's'} repaired in the dust`);
  return `The first cycle’s ledger, the one that matters: ${bits.join(', ')}. `
    + `${Math.round(s.stats.tonsProcessed)} tons of regolith went through the RF.`;
}

function lossCoda(s: SimState, c: CampaignState): string {
  if (s.lossReason === 'insolvent') {
    return c.decisions['push'] === 'stand'
      ? 'Darrin stands by the cold extractor he insisted on servicing. It runs beautifully. It belongs to Helion now.'
      : 'Li reads the seizure notice twice, then once more, the way she once read a claim that turned out to be worthless paper.';
  }
  if (s.lossReason === 'cold' || s.lossReason === 'o2' || s.lossReason === 'co2') {
    return 'On the next rendezvous, Andrei will carry your ordered packages back out of the hold and offer them to whoever '
      + 'is still working. It happens on every rendezvous. Somebody will set the water container facing inward.';
  }
  if (s.lossReason === 'equipment') {
    return 'A crawler that doesn’t move and an extractor that doesn’t hum are just claim markers. Eventually someone '
      + 'will follow the old tracks in, pry the hatch, and take what they need. The Moon doesn’t care. It never did.';
  }
  return 'The claim map updates within the week.';
}
