import type { SimState } from './types';
import type { CampaignState } from './campaign';

export const SAVE_KEY = 'thf-save-v1';
export const SETTINGS_KEY = 'thf-settings-v1';
export const BEST_KEY = 'thf-best-v1';
const VERSION = 1;

export interface SaveGame {
  version: number;
  savedAt: number;
  sim: SimState;
  campaign: CampaignState;
}

export interface Settings {
  volume: number; // 0..1
  ambient: boolean;
}

export interface BestResult {
  won: boolean;
  grams: number;
  purity: number;
  money: number;
  masteries: string[];
  seed: number;
}

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function storage(custom?: StorageLike): StorageLike | null {
  if (custom) return custom;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function saveGame(sim: SimState, campaign: CampaignState, store?: StorageLike): void {
  const st = storage(store);
  if (!st) return;
  // strip non-serializable scratch fields (the powered-set cache)
  const simCopy = JSON.parse(JSON.stringify(sim)) as SimState;
  delete (simCopy as unknown as Record<string, unknown>)['_powered'];
  const data: SaveGame = { version: VERSION, savedAt: Date.now(), sim: simCopy, campaign };
  st.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadGame(store?: StorageLike): SaveGame | null {
  const st = storage(store);
  if (!st) return null;
  const raw = st.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveGame;
    if (data.version !== VERSION || !data.sim || !data.campaign) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave(store?: StorageLike): void {
  storage(store)?.removeItem(SAVE_KEY);
}

export function loadSettings(store?: StorageLike): Settings {
  const st = storage(store);
  const fallback: Settings = { volume: 0.6, ambient: true };
  if (!st) return fallback;
  try {
    const raw = st.getItem(SETTINGS_KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Settings) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveSettings(sett: Settings, store?: StorageLike): void {
  storage(store)?.setItem(SETTINGS_KEY, JSON.stringify(sett));
}

export function loadBest(store?: StorageLike): BestResult | null {
  const st = storage(store);
  if (!st) return null;
  try {
    const raw = st.getItem(BEST_KEY);
    return raw ? (JSON.parse(raw) as BestResult) : null;
  } catch {
    return null;
  }
}

/** Keep the best result: a win beats a loss; among wins, more grams×purity wins. */
export function recordBest(result: BestResult, store?: StorageLike): BestResult {
  const prev = loadBest(store);
  const better = !prev
    || (result.won && !prev.won)
    || (result.won === prev.won && result.grams * result.purity > prev.grams * prev.purity);
  if (better) storage(store)?.setItem(BEST_KEY, JSON.stringify(result));
  return better ? result : prev!;
}
