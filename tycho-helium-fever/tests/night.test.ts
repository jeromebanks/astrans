import { describe, it, expect } from 'vitest';
import { createSim, tick } from '../src/sim/sim';
import * as C from '../src/sim/constants';

describe('lunar night progression', () => {
  it('a prepared base (charged batteries, loads shut down) survives to dawn', () => {
    const s = createSim(21);
    s.t = C.DAY_END - 1;
    s.battery = s.batteryCap; // fully charged, default 60 kWh
    s.extractorOn = false;
    s.crawler.battery = C.CRAWLER_BATT; // no charging draw
    s.crew.li.assignment = 'rest';
    s.crew.darrin.assignment = 'rest';
    while (s.t < C.NIGHT_END && !s.ended) tick(s);
    expect(s.ended).toBe(false);
    expect(s.habTemp).toBeGreaterThan(C.TEMP_WARN);
    expect(s.co2).toBeLessThan(C.CO2_WARN);
  });

  it('life-support economy mode spends less battery at the cost of CO₂', () => {
    const mk = () => {
      const s = createSim(22);
      s.t = C.DAY_END + C.SOLAR_RAMP;
      s.battery = s.batteryCap;
      s.extractorOn = false;
      s.crawler.battery = C.CRAWLER_BATT;
      return s;
    };
    const eco = mk();
    eco.lsEconomy = true;
    const normal = mk();
    for (let i = 0; i < 120; i++) { tick(eco); tick(normal); }
    expect(eco.battery).toBeGreaterThan(normal.battery);
    expect(eco.co2).toBeGreaterThan(normal.co2);
    expect(eco.co2).toBeLessThanOrEqual(C.CO2_ECONOMY + 1);
  });

  it('an unprepared base freezes: heater shed, then a cold countdown, then loss', () => {
    const s = createSim(23);
    s.t = C.DAY_END + C.SOLAR_RAMP;
    s.battery = 4;
    s.extractorOn = false;
    while (s.t < C.NIGHT_END && !s.ended) tick(s);
    expect(s.ended).toBe(true);
    expect(s.lossReason).toBe('cold');
    expect(s.lossDetail.length).toBeGreaterThan(20); // the run explains itself
    expect(s.stats.lsEmergencies).toBeGreaterThan(0);
  });

  it('running the extractor all night without extra banks is the darkside gamble', () => {
    const s = createSim(24);
    s.t = C.DAY_END + C.SOLAR_RAMP;
    s.battery = s.batteryCap; // 60 kWh, no extra banks
    s.extractorOn = true;
    s.hopper = 500;
    s.hopperGrade = 4;
    let sawShed = false;
    while (s.t < C.NIGHT_END && !s.ended) {
      tick(s);
      if (s.shed.includes('extractor')) sawShed = true;
    }
    // the bank cannot carry heater+LS+extractor for 240 min: the extractor
    // must get shed, and the base may or may not freeze afterwards.
    expect(sawShed).toBe(true);
  });
});
