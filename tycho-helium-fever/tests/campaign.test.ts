import { describe, it, expect } from 'vitest';
import { createSim, tick, applyDecisionEffect, dispatchShipment, canDispatchShipment } from '../src/sim/sim';
import {
  createCampaign, completeCutscene, updateCampaign, isUnlocked, activeObjectives,
} from '../src/sim/campaign';
import { buildSchedule, dueEvent, resolveEvent, EVENT_CARDS } from '../src/sim/events';
import { fireDialogue } from '../src/data/dialogue';
import * as C from '../src/sim/constants';

describe('act state machine', () => {
  it('chains intro cutscenes and unlocks mechanics exactly once', () => {
    const c = createCampaign();
    expect(c.act).toBe('tokaplex');
    expect(c.pendingCutscene).toBe('cs_tokaplex');

    completeCutscene(c, 'cs_tokaplex');
    expect(c.act).toBe('recruit');
    expect(isUnlocked(c, 'survey')).toBe(true);

    completeCutscene(c, 'cs_recruit');
    expect(c.act).toBe('ballcrater');
    expect(isUnlocked(c, 'assign')).toBe(true);
    expect(isUnlocked(c, 'tuning')).toBe(true);

    completeCutscene(c, 'cs_ballcrater');
    expect(c.act).toBe('tycho');

    completeCutscene(c, 'cs_tycho');
    expect(c.act).toBe('tycho');
    expect(isUnlocked(c, 'build')).toBe(true);

    // replaying or double-completing must not duplicate anything
    const unlockedBefore = [...c.unlocked];
    const milestonesBefore = [...c.milestonesDone];
    completeCutscene(c, 'cs_tycho');
    completeCutscene(c, 'cs_tokaplex');
    expect(c.unlocked).toEqual(unlockedBefore);
    expect(c.milestonesDone).toEqual(milestonesBefore);
  });

  it('skipping a cutscene produces identical state to watching it', () => {
    // the shell calls the same completeCutscene either way; verify idempotence
    const watched = createCampaign();
    const skipped = createCampaign();
    completeCutscene(watched, 'cs_tokaplex');
    completeCutscene(skipped, 'cs_tokaplex'); // skip path = same call
    expect(JSON.stringify(watched)).toBe(JSON.stringify(skipped));
  });

  it('moves to night at sunset and to shipment at dawn via sim time', () => {
    const c = createCampaign();
    for (const id of ['cs_tokaplex', 'cs_recruit', 'cs_ballcrater', 'cs_tycho']) completeCutscene(c, id);
    const s = createSim(1);
    s.t = C.DAY_END;
    let sig = updateCampaign(c, s);
    expect(sig).toEqual([{ kind: 'cutscene', id: 'cs_night' }]);
    expect(c.act).toBe('night');
    completeCutscene(c, 'cs_night');
    expect(isUnlocked(c, 'shipping')).toBe(true);

    s.t = C.NIGHT_END;
    sig = updateCampaign(c, s);
    expect(sig).toEqual([{ kind: 'cutscene', id: 'cs_shipment' }]);
    completeCutscene(c, 'cs_shipment');
    expect(isUnlocked(c, 'distiller')).toBe(true);
    expect(isUnlocked(c, 'cableway')).toBe(true);

    // deliver a bottle, then the epilogue must fire and evaluate the run
    s.shipped = true;
    s.shippedGrams = 80;
    s.shippedPurity = 0.1;
    s.money = 50_000;
    sig = updateCampaign(c, s);
    expect(sig).toEqual([{ kind: 'cutscene', id: 'cs_epilogue' }]);
    expect(s.ended).toBe(true);
    expect(s.won).toBe(true);
  });

  it('a window-A shipment during the night jumps straight to the epilogue at dawn', () => {
    const c = createCampaign();
    for (const id of ['cs_tokaplex', 'cs_recruit', 'cs_ballcrater', 'cs_tycho', 'cs_night']) completeCutscene(c, id);
    c.act = 'night';
    c.pendingCutscene = '';
    const s = createSim(2);
    s.t = C.NIGHT_END;
    s.shipped = true;
    s.shippedGrams = 75;
    s.shippedPurity = 0.09;
    s.money = 10_000;
    const sig = updateCampaign(c, s);
    expect(sig).toEqual([{ kind: 'cutscene', id: 'cs_epilogue' }]);
    expect(c.act).toBe('epilogue');
    expect(s.won).toBe(true);
  });

  it('objectives complete from sim state and stay completed', () => {
    const c = createCampaign();
    for (const id of ['cs_tokaplex', 'cs_recruit', 'cs_ballcrater', 'cs_tycho']) completeCutscene(c, id);
    const s = createSim(3);
    s.stats.peakYieldRate = 300;
    activeObjectives(c, s);
    expect(c.objectivesDone).toContain('obj_tune');
    s.stats.peakYieldRate = 0; // even if the rate drops, the objective stays done
    activeObjectives(c, s);
    expect(c.objectivesDone).toContain('obj_tune');
    // unfinished objectives are listed first so the display stays actionable
    const list = activeObjectives(c, s);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].done).toBe(false);
  });
});

describe('decisions and consequences', () => {
  it('the claim decision changes ethics, tile access, and later events', () => {
    const sStrip = createSim(4);
    applyDecisionEffect(sStrip, 'claim', 'strip');
    expect(sStrip.claimDecision).toBe('strip');
    expect(sStrip.scores.ethics).toBe(-2);

    const sRespect = createSim(4);
    applyDecisionEffect(sRespect, 'claim', 'respect');
    expect(sRespect.scores.ethics).toBe(2);

    // os_payback consequences differ by branch
    const c = createCampaign();
    resolveEvent(EVENT_CARDS.os_payback, sStrip, c, 'ok');
    resolveEvent(EVENT_CARDS.os_payback, sRespect, c, 'ok');
    expect(sStrip.money).toBeLessThan(createSim(4).money); // billed
    expect(sRespect.spares).toBeGreaterThan(createSim(4).spares); // gifted
  });

  it('decision-dependent dialogue: dawn line differs by claim choice', () => {
    const mk = (choice: string) => {
      const c = createCampaign();
      const s = createSim(5);
      c.decisions['claim'] = choice;
      s.claimDecision = choice as 'strip' | 'respect';
      s.t = C.NIGHT_END + 6;
      // drain unrelated earlier lines until the dawn line fires
      for (let i = 0; i < 40; i++) fireDialogue(s, c);
      return s.radio.map((r) => r.text).join(' | ');
    };
    const strip = mk('strip');
    const respect = mk('respect');
    expect(strip).toContain('overlap corner paid');
    expect(respect).toContain('Not everyone made it');
  });

  it('the push decision trades wear risk against the early window', () => {
    const s = createSim(6);
    s.t = 470;
    s.machines.extractor.wear = 60;
    applyDecisionEffect(s, 'push', 'stand');
    expect(s.standDownUntil).toBe(530);
    expect(s.machines.extractor.wear).toBe(30);
    const s2 = createSim(6);
    applyDecisionEffect(s2, 'push', 'push');
    expect(s2.pushRisk).toBe(true);
  });

  it('seeded event schedules differ between runs but stay deterministic', () => {
    const a1 = buildSchedule(100);
    const a2 = buildSchedule(100);
    const b = buildSchedule(200);
    expect(JSON.stringify(a1)).toBe(JSON.stringify(a2));
    expect(JSON.stringify(a1)).not.toBe(JSON.stringify(b));
  });

  it('events fire once and decision events record their choice', () => {
    const c = createCampaign();
    const s = createSim(7);
    const schedule = buildSchedule(7);
    const sealTime = schedule.find((e) => e.id === 'seal')!.t;
    s.t = sealTime;
    const card = dueEvent(schedule, s, c);
    expect(card?.id).toBe('seal');
    resolveEvent(card!, s, c, 'fix');
    expect(dueEvent(schedule, s, c)?.id).not.toBe('seal');

    s.t = schedule.find((e) => e.id === 'miner')!.t;
    let next = dueEvent(schedule, s, c);
    while (next && next.id !== 'miner') next = dueEvent(schedule, s, c);
    expect(next?.id).toBe('miner');
    resolveEvent(next!, s, c, 'help');
    expect(c.decisions['miner']).toBe('help');
    expect(s.crew.darrin.busyUntil).toBeGreaterThan(s.t);
  });
});

describe('shipment dispatch', () => {
  it('refuses a sub-spec bottle with a reason, accepts a qualifying one', () => {
    const s = createSim(8);
    s.t = C.RDV_B_OPEN - 40;
    s.bottleHe3 = 10;
    s.bottleImp = 200;
    expect(canDispatchShipment(s, 'B')).toMatch(/below spec/);
    s.bottleHe3 = 80;
    s.bottleImp = 700; // ~10.3%
    expect(canDispatchShipment(s, 'B')).toBeNull();
    expect(dispatchShipment(s, 'B')).toBeNull();
    expect(s.crawler.phase).toBe('shipment');
    expect(s.bottleHe3).toBe(0);
    // deliver
    while (s.t < C.RDV_B_OPEN + 1) tick(s);
    expect(s.shipped).toBe(true);
    expect(s.money).toBeGreaterThan(C.MONEY_START); // value minus payment, minus drip
  });

  it('refuses when the window cannot be reached in time', () => {
    const s = createSim(9);
    s.t = C.RDV_A_CLOSE - 5;
    s.bottleHe3 = 80;
    s.bottleImp = 700;
    expect(canDispatchShipment(s, 'A')).toMatch(/Too late/);
  });
});
