import * as C from './constants';
import type { SimState } from './types';
import { bottleQualifies } from './sim';

/** Narrative acts. Transitions are explicit state-machine moves performed by
 * completeCutscene / update — never inferred from UI state. */
export type ActId =
  | 'tokaplex' | 'recruit' | 'ballcrater' | 'tycho' | 'night' | 'shipment' | 'epilogue';

export const ACT_ORDER: ActId[] = ['tokaplex', 'recruit', 'ballcrater', 'tycho', 'night', 'shipment', 'epilogue'];

export type Mechanic =
  | 'survey' | 'assign' | 'tuning' | 'build' | 'shipping' | 'distiller' | 'cableway';

export interface CampaignState {
  act: ActId;
  /** cutscene currently owed for the act, '' if none pending */
  pendingCutscene: string;
  milestonesDone: string[];
  unlocked: Mechanic[];
  decisions: Record<string, string>;
  eventsFired: string[];
  dialogueFired: string[];
  objectivesDone: string[];
}

const ACT_CUTSCENE: Record<ActId, string> = {
  tokaplex: 'cs_tokaplex',
  recruit: 'cs_recruit',
  ballcrater: 'cs_ballcrater',
  tycho: 'cs_tycho',
  night: 'cs_night',
  shipment: 'cs_shipment',
  epilogue: 'cs_epilogue',
};

/** Milestone → mechanics granted, exactly once. */
const MILESTONE_UNLOCKS: Record<string, Mechanic[]> = {
  cs_tokaplex: ['survey'],
  cs_recruit: ['assign', 'tuning'],
  cs_ballcrater: [],
  cs_tycho: ['build'],
  cs_night: ['shipping'],
  cs_shipment: ['distiller', 'cableway'],
  cs_epilogue: [],
};

export function createCampaign(): CampaignState {
  return {
    act: 'tokaplex',
    pendingCutscene: ACT_CUTSCENE.tokaplex,
    milestonesDone: [],
    unlocked: [],
    decisions: {},
    eventsFired: [],
    dialogueFired: [],
    objectivesDone: [],
  };
}

export function isUnlocked(c: CampaignState, m: Mechanic): boolean {
  return c.unlocked.includes(m);
}

/** Called when a cutscene finishes (watched OR skipped — identical effects).
 * Applies the milestone exactly once and advances the act machine. */
export function completeCutscene(c: CampaignState, id: string): void {
  if (c.pendingCutscene !== id) return; // replay or stale call: no double rewards
  c.pendingCutscene = '';
  if (!c.milestonesDone.includes(id)) {
    c.milestonesDone.push(id);
    for (const m of MILESTONE_UNLOCKS[id] ?? []) {
      if (!c.unlocked.includes(m)) c.unlocked.push(m);
    }
  }
  // pre-gameplay acts chain straight into the next cutscene
  if (c.act === 'tokaplex') { c.act = 'recruit'; c.pendingCutscene = ACT_CUTSCENE.recruit; }
  else if (c.act === 'recruit') { c.act = 'ballcrater'; c.pendingCutscene = ACT_CUTSCENE.ballcrater; }
  else if (c.act === 'ballcrater') { c.act = 'tycho'; c.pendingCutscene = ACT_CUTSCENE.tycho; }
  else if (c.act === 'tycho' && id === 'cs_tycho') { /* gameplay begins; next act by sim time */ }
}

export interface CampaignSignal {
  kind: 'cutscene' | 'end';
  id: string;
}

/** Drive time-based act transitions from sim state. Returns signals the shell
 * must act on (launch cutscene / show end screen). Idempotent per state. */
export function updateCampaign(c: CampaignState, s: SimState): CampaignSignal[] {
  const out: CampaignSignal[] = [];
  if (s.ended && !s.won) {
    out.push({ kind: 'end', id: 'loss' });
    return out;
  }
  if (c.act === 'tycho' && c.pendingCutscene === '' && s.t >= C.DAY_END) {
    c.act = 'night';
    c.pendingCutscene = ACT_CUTSCENE.night;
    out.push({ kind: 'cutscene', id: ACT_CUTSCENE.night });
    return out;
  }
  if (c.act === 'night' && c.pendingCutscene === '' && s.t >= C.NIGHT_END) {
    if (s.shipped) {
      // shipped during the night at window A: jump to the epilogue at dawn
      c.act = 'epilogue';
      c.pendingCutscene = ACT_CUTSCENE.epilogue;
      finishRun(s);
      out.push({ kind: 'cutscene', id: ACT_CUTSCENE.epilogue });
    } else {
      c.act = 'shipment';
      c.pendingCutscene = ACT_CUTSCENE.shipment;
      out.push({ kind: 'cutscene', id: ACT_CUTSCENE.shipment });
    }
    return out;
  }
  if (c.act === 'shipment' && c.pendingCutscene === '' && s.shipped && !s.pendingShipment.active) {
    c.act = 'epilogue';
    c.pendingCutscene = ACT_CUTSCENE.epilogue;
    finishRun(s);
    out.push({ kind: 'cutscene', id: ACT_CUTSCENE.epilogue });
    return out;
  }
  if (c.act === 'epilogue' && c.pendingCutscene === '' && s.ended) {
    out.push({ kind: 'end', id: s.won ? 'win' : 'loss' });
  }
  return out;
}

/** Evaluate victory at epilogue time. */
export function finishRun(s: SimState): void {
  if (s.ended) return;
  s.ended = true;
  s.won = s.shipped
    && s.shippedGrams >= C.BOTTLE_MIN_G
    && s.shippedPurity >= C.BOTTLE_MIN_PURITY
    && s.money >= 0;
  if (!s.won) {
    s.lossReason = 'insolvent';
    s.lossDetail = s.money < 0
      ? 'The bottle shipped, but after the loan payment the account was underwater. Helion gave the claim ninety days. The numbers gave it less.'
      : 'The shipment didn’t clear Helion’s assay floor. Salvage rates don’t service transit loans.';
  }
}

// ---------------------------------------------------------------- objectives

export interface Objective {
  id: string;
  text: string;
  acts: ActId[];
  done: (s: SimState, c: CampaignState) => boolean;
}

export const OBJECTIVES: Objective[] = [
  {
    id: 'obj_survey',
    text: 'Survey 6 tiles beyond the landing halo (assign someone to Survey; click tiles to queue)',
    acts: ['tycho'],
    done: (s) => s.tiles.filter((t) => t.surveyed && t.dist > 2).length >= 6,
  },
  {
    id: 'obj_sweep',
    text: 'Sweep regolith: set a sweep zone and put 20 t through the hopper',
    acts: ['tycho'],
    done: (s) => s.stats.tonsProcessed + s.hopper >= 20,
  },
  {
    id: 'obj_tune',
    text: 'Tune the RF field to the sweet spot: sustain ≥ 250 mg/min yield',
    acts: ['tycho'],
    done: (s) => s.stats.peakYieldRate >= 250,
  },
  {
    id: 'obj_nightprep',
    text: 'Prepare for sunset: ≥ 100 kWh battery capacity, charged above 75%',
    acts: ['tycho'],
    done: (s) => s.batteryCap >= 100 && s.battery >= 0.75 * s.batteryCap,
  },
  {
    id: 'obj_survive',
    text: 'Survive the lunar night: keep the hut above 5 °C and CO₂ under 6 000 ppm',
    acts: ['night'],
    done: (s) => s.t >= C.NIGHT_END,
  },
  {
    id: 'obj_bottle',
    text: `Fill the shipment bottle: ≥ ${C.BOTTLE_MIN_G} g of ³He at ≥ ${Math.round(C.BOTTLE_MIN_PURITY * 100)}% purity`,
    acts: ['tycho', 'night', 'shipment'],
    done: (s) => s.shipped || bottleQualifies(s),
  },
  {
    id: 'obj_ship',
    text: 'Dispatch the bottle to a Lunar Tug rendezvous window and stay solvent',
    acts: ['night', 'shipment'],
    done: (s) => s.shipped,
  },
];

export function activeObjectives(c: CampaignState, s: SimState): { obj: Objective; done: boolean }[] {
  const list: { obj: Objective; done: boolean }[] = [];
  for (const o of OBJECTIVES) {
    if (!o.acts.includes(c.act)) continue;
    const done = c.objectivesDone.includes(o.id) || o.done(s, c);
    if (done && !c.objectivesDone.includes(o.id)) c.objectivesDone.push(o.id);
    list.push({ obj: o, done });
  }
  // show unfinished first, cap at 4 for legibility
  list.sort((a, b) => Number(a.done) - Number(b.done));
  return list.slice(0, 4);
}
