import { describe, it, expect } from 'vitest';
import { createSim, tick, daylightFactor, isNight } from '../src/sim/sim';
import * as C from '../src/sim/constants';

describe('daylight cycle', () => {
  it('is full sun during the day and zero at deep night', () => {
    expect(daylightFactor(0)).toBe(1);
    expect(daylightFactor(C.DAY_END - 1)).toBe(1);
    expect(daylightFactor(C.DAY_END + C.SOLAR_RAMP + 1)).toBe(0);
    expect(daylightFactor((C.DAY_END + C.NIGHT_END) / 2)).toBe(0);
    expect(daylightFactor(C.NIGHT_END + 1)).toBe(1);
  });
  it('ramps at the terminators (rim panels linger)', () => {
    const mid = daylightFactor(C.DAY_END + C.SOLAR_RAMP / 2);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(isNight(C.DAY_END + 1)).toBe(true);
    expect(isNight(C.NIGHT_END)).toBe(false);
  });
});

describe('power balance', () => {
  it('charges the battery from surplus solar during the day', () => {
    const s = createSim(42);
    s.extractorOn = false;
    const before = s.battery;
    for (let i = 0; i < 60; i++) tick(s);
    expect(s.battery).toBeGreaterThan(before);
    expect(s.brownout).toBe(false);
  });

  it('drains the battery at night and sheds the extractor before life support', () => {
    const s = createSim(42);
    s.t = C.DAY_END + C.SOLAR_RAMP; // deep night
    s.battery = 0.3; // enough for life support + heater this minute, not the RF
    s.extractorOn = true;
    s.hopper = 20;
    tick(s);
    // extractor must be shed while life support still runs
    expect(s.shed).toContain('extractor');
    expect(s.shed).not.toContain('life');
    expect(s.shed).not.toContain('heater');
  });

  it('sheds everything when the battery is empty and goes brownout', () => {
    const s = createSim(7);
    s.t = C.DAY_END + C.SOLAR_RAMP;
    s.battery = 0.05;
    for (let i = 0; i < 10; i++) tick(s);
    expect(s.brownout).toBe(true);
    expect(s.shed).toContain('heater');
  });

  it('stays numerically stable across a full campaign of ticks', () => {
    const s = createSim(123);
    s.extractorOn = true;
    for (let i = 0; i < C.HARD_DEADLINE + 50 && !s.ended; i++) tick(s);
    expect(Number.isFinite(s.battery)).toBe(true);
    expect(Number.isFinite(s.habTemp)).toBe(true);
    expect(Number.isFinite(s.o2)).toBe(true);
    expect(s.battery).toBeGreaterThanOrEqual(0);
    expect(s.battery).toBeLessThanOrEqual(s.batteryCap + 1e-9);
  });
});
