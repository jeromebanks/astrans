/** Deterministic seedable RNG (mulberry32). State is a plain object so it
 * serializes with the rest of the sim and replays identically after load. */
export interface RngState {
  s: number;
}

export function makeRng(seed: number): RngState {
  return { s: seed >>> 0 };
}

export function next(r: RngState): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function range(r: RngState, min: number, max: number): number {
  return min + next(r) * (max - min);
}

export function int(r: RngState, min: number, maxInclusive: number): number {
  return Math.floor(range(r, min, maxInclusive + 1));
}

export function chance(r: RngState, p: number): boolean {
  return next(r) < p;
}

export function pick<T>(r: RngState, arr: readonly T[]): T {
  return arr[Math.min(arr.length - 1, Math.floor(next(r) * arr.length))];
}

/** Stateless hash-noise in [0,1) for map generation: same (seed,a,b) → same value. */
export function hashNoise(seed: number, a: number, b: number): number {
  let h = (seed ^ (a * 374761393) ^ (b * 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0; // keep unsigned: xor alone yields signed int32
  return h / 4294967296;
}
