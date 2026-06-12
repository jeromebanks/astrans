import { describe, it, expect } from 'vitest';
import {
  createSim, tick, fieldEfficiency, bottlePurity, purityPriceFactor, shipmentValue,
} from '../src/sim/sim';

describe('RF field tuning', () => {
  it('peaks at the hidden optimal and falls off both sides', () => {
    expect(fieldEfficiency(40, 40)).toBe(1);
    expect(fieldEfficiency(20, 40)).toBeLessThan(1);
    expect(fieldEfficiency(60, 40)).toBeLessThan(1);
    expect(fieldEfficiency(0, 80)).toBe(0.25); // clamped floor
  });

  it('well-tuned extraction yields more He-3 at higher purity than mistuned', () => {
    const tuned = createSim(11);
    tuned.extractorOn = true;
    tuned.hopper = 60;
    tuned.field = tuned.fieldOptimal;
    const mistuned = createSim(11);
    mistuned.extractorOn = true;
    mistuned.hopper = 60;
    mistuned.field = 100;
    // hold the sweet spot still so the comparison is fair
    for (let i = 0; i < 30; i++) {
      tuned.field = tuned.fieldOptimal;
      mistuned.field = 100;
      mistuned.fieldOptimal = tuned.fieldOptimal;
      tick(tuned);
      tick(mistuned);
    }
    expect(tuned.bottleHe3).toBeGreaterThan(mistuned.bottleHe3 * 1.5);
    expect(bottlePurity(tuned)).toBeGreaterThan(bottlePurity(mistuned));
  });

  it('an assigned operator chases the drifting sweet spot', () => {
    const s = createSim(5);
    s.extractorOn = true;
    s.hopper = 200;
    s.field = 20;
    s.fieldOptimal = 70;
    s.crew.li.assignment = 'extractor';
    for (let i = 0; i < 60; i++) tick(s);
    expect(Math.abs(s.field - s.fieldOptimal)).toBeLessThan(10);
  });

  it('drains the hopper while producing', () => {
    const s = createSim(9);
    s.extractorOn = true;
    s.hopper = 10;
    for (let i = 0; i < 20; i++) tick(s);
    expect(s.hopper).toBeLessThan(10);
    expect(s.bottleHe3).toBeGreaterThan(0);
    expect(s.stats.tonsProcessed).toBeGreaterThan(5);
  });
});

describe('purity economics', () => {
  it('prices purity tiers monotonically', () => {
    expect(purityPriceFactor(0.30)).toBeGreaterThan(purityPriceFactor(0.13));
    expect(purityPriceFactor(0.13)).toBeGreaterThan(purityPriceFactor(0.10));
    expect(purityPriceFactor(0.10)).toBeGreaterThan(purityPriceFactor(0.075));
    expect(purityPriceFactor(0.05)).toBe(0.5);
    expect(shipmentValue(80, 0.10)).toBe(80 * 8000);
  });

  it('the fractional distiller vents impurity and raises purity toward ~30%', () => {
    const s = createSim(3);
    s.bottleHe3 = 10;
    s.bottleImp = 200; // ~4.8% purity
    s.buildings.push({ id: 'distiller', tx: 7, ty: 4, readyAt: 0 });
    const p0 = bottlePurity(s);
    for (let i = 0; i < 300; i++) tick(s);
    const p1 = bottlePurity(s);
    expect(p1).toBeGreaterThan(p0);
    expect(p1).toBeLessThanOrEqual(0.31);
    expect(s.bottleImp).toBeGreaterThanOrEqual(s.bottleHe3 * 2.3 - 1e-9);
  });
});
