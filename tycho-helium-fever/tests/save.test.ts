import { describe, it, expect } from 'vitest';
import { createSim, tick } from '../src/sim/sim';
import { createCampaign, completeCutscene } from '../src/sim/campaign';
import {
  saveGame, loadGame, clearSave, recordBest, loadBest, loadSettings, saveSettings,
  type StorageLike,
} from '../src/sim/save';

function memStore(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

describe('save / restore', () => {
  it('round-trips sim and campaign, resuming the same act and unlocks', () => {
    const store = memStore();
    const s = createSim(77);
    const c = createCampaign();
    for (const id of ['cs_tokaplex', 'cs_recruit', 'cs_ballcrater', 'cs_tycho']) completeCutscene(c, id);
    c.decisions['wreck'] = 'leave';
    for (let i = 0; i < 50; i++) tick(s);
    saveGame(s, c, store);

    const loaded = loadGame(store)!;
    expect(loaded).not.toBeNull();
    expect(loaded.campaign.act).toBe('tycho');
    expect(loaded.campaign.unlocked).toEqual(c.unlocked);
    expect(loaded.campaign.decisions['wreck']).toBe('leave');
    expect(loaded.sim.t).toBe(50);
    expect(loaded.sim.money).toBe(s.money);
  });

  it('a restored run cannot collect a milestone twice', () => {
    const store = memStore();
    const s = createSim(78);
    const c = createCampaign();
    completeCutscene(c, 'cs_tokaplex');
    saveGame(s, c, store);
    const loaded = loadGame(store)!;
    const unlocksBefore = [...loaded.campaign.unlocked];
    completeCutscene(loaded.campaign, 'cs_tokaplex'); // replay attempt
    expect(loaded.campaign.unlocked).toEqual(unlocksBefore);
    expect(loaded.campaign.milestonesDone.filter((m) => m === 'cs_tokaplex')).toHaveLength(1);
  });

  it('a loaded sim continues deterministically like the original', () => {
    const store = memStore();
    const a = createSim(79);
    for (let i = 0; i < 30; i++) tick(a);
    saveGame(a, createCampaign(), store);
    const b = loadGame(store)!.sim;
    for (let i = 0; i < 30; i++) { tick(a); tick(b); }
    expect(b.battery).toBeCloseTo(a.battery, 10);
    expect(b.o2).toBeCloseTo(a.o2, 10);
    expect(b.rng.s).toBe(a.rng.s);
  });

  it('clearSave removes the run; corrupt saves load as null', () => {
    const store = memStore();
    saveGame(createSim(1), createCampaign(), store);
    expect(loadGame(store)).not.toBeNull();
    clearSave(store);
    expect(loadGame(store)).toBeNull();
    store.setItem('thf-save-v1', '{not json');
    expect(loadGame(store)).toBeNull();
  });

  it('best result keeps wins over losses and bigger shipments over smaller', () => {
    const store = memStore();
    recordBest({ won: false, grams: 0, purity: 0, money: -10, masteries: [], seed: 1 }, store);
    recordBest({ won: true, grams: 70, purity: 0.08, money: 100, masteries: [], seed: 2 }, store);
    recordBest({ won: false, grams: 90, purity: 0.2, money: 0, masteries: [], seed: 3 }, store);
    expect(loadBest(store)?.won).toBe(true);
    recordBest({ won: true, grams: 90, purity: 0.12, money: 100, masteries: ['m_purity'], seed: 4 }, store);
    expect(loadBest(store)?.grams).toBe(90);
  });

  it('settings persist', () => {
    const store = memStore();
    saveSettings({ volume: 0.2, ambient: false }, store);
    expect(loadSettings(store)).toEqual({ volume: 0.2, ambient: false });
  });
});
