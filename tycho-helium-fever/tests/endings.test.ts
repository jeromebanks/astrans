import { describe, it, expect } from 'vitest';
import { createSim, tick } from '../src/sim/sim';
import { createCampaign, finishRun } from '../src/sim/campaign';
import { buildEnding, evaluateMastery } from '../src/sim/endings';
import * as C from '../src/sim/constants';

describe('win / loss evaluation', () => {
  it('a qualifying solvent shipment wins', () => {
    const s = createSim(50);
    s.shipped = true;
    s.shippedGrams = 80;
    s.shippedPurity = 0.1;
    s.money = 200_000;
    finishRun(s);
    expect(s.won).toBe(true);
  });

  it('shipping but ending insolvent loses, with an explanation', () => {
    const s = createSim(51);
    s.shipped = true;
    s.shippedGrams = 80;
    s.shippedPurity = 0.1;
    s.money = -5;
    finishRun(s);
    expect(s.won).toBe(false);
    expect(s.lossDetail).toMatch(/underwater/);
  });

  it('missing both windows loses to the loan at the hard deadline', () => {
    const s = createSim(52);
    s.t = C.HARD_DEADLINE - 1;
    s.battery = s.batteryCap;
    tick(s);
    expect(s.ended).toBe(true);
    expect(s.lossReason).toBe('insolvent');
    expect(s.lossDetail).toMatch(/rendezvous windows/);
  });

  it('mastery goals reflect the run', () => {
    const clean = createSim(53);
    clean.shippedPurity = 0.13;
    clean.scores.ethics = 3;
    const m = evaluateMastery(clean);
    expect(m.find((x) => x.id === 'm_ls')?.achieved).toBe(true);
    expect(m.find((x) => x.id === 'm_purity')?.achieved).toBe(true);
    expect(m.find((x) => x.id === 'm_ethics')?.achieved).toBe(true);

    const messy = createSim(54);
    messy.stats.injuries = 1;
    messy.machines.extractor.wear = 90;
    messy.machines.crawler.wear = 80;
    messy.machines.recycler.wear = 40;
    const m2 = evaluateMastery(messy);
    expect(m2.find((x) => x.id === 'm_injury')?.achieved).toBe(false);
    expect(m2.find((x) => x.id === 'm_wear')?.achieved).toBe(false);
  });

  it('ending text varies with the ethics track', () => {
    const c = createCampaign();
    const clean = createSim(55);
    clean.shipped = true; clean.shippedGrams = 80; clean.shippedPurity = 0.1; clean.money = 100_000;
    clean.scores.ethics = 3;
    finishRun(clean);
    const cleanEnd = buildEnding(clean, c);
    expect(cleanEnd.paragraphs.join(' ')).toMatch(/clean/i);

    const dirty = createSim(56);
    dirty.shipped = true; dirty.shippedGrams = 80; dirty.shippedPurity = 0.1; dirty.money = 100_000;
    dirty.scores.ethics = -3;
    const c2 = createCampaign();
    c2.decisions['claim'] = 'strip';
    finishRun(dirty);
    const dirtyEnd = buildEnding(dirty, c2);
    expect(dirtyEnd.paragraphs.join(' ')).toMatch(/Ocean State will remember/);
    expect(dirtyEnd.paragraphs.join(' ')).not.toBe(cleanEnd.paragraphs.join(' '));
  });

  it('loss endings explain exactly why the run ended', () => {
    const s = createSim(57);
    s.t = C.DAY_END + C.SOLAR_RAMP;
    s.battery = 2;
    while (!s.ended && s.t < C.NIGHT_END) tick(s);
    expect(s.ended).toBe(true);
    const end = buildEnding(s, createCampaign());
    expect(end.title).toMatch(/Moon/);
    expect(end.paragraphs[0]).toBe(s.lossDetail);
    expect(end.paragraphs[0].length).toBeGreaterThan(30);
  });

  it('both crews teased in the epilogue: victory text always previews the next stage', () => {
    const s = createSim(58);
    s.shipped = true; s.shippedGrams = 90; s.shippedPurity = 0.27; s.money = 400_000;
    finishRun(s);
    const end = buildEnding(s, createCampaign());
    const all = end.paragraphs.join(' ');
    expect(all).toMatch(/cableway/i);
    expect(all).toMatch(/distiller|ovens/i);
    expect(all).toMatch(/name/i); // Tan's Cantina tease
  });
});
