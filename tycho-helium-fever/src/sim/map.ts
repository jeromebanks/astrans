import { hashNoise } from './rng';
import { MAP_W, MAP_H, TILE_MASS, BASE_X, BASE_Y } from './constants';
import type { Tile } from './types';

/** Seeded Tycho floor section. Grades echo the novel: ~3 ppb on the open floor,
 * climbing toward ~5-6 near the central-peak side (east edge of the map). A few
 * noise pockets make surveying worthwhile. NW corner is the Ocean State overlap. */
export function genMap(seed: number): Tile[] {
  const tiles: Tile[] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      const peakBias = (x / (MAP_W - 1)) * 1.6; // central peak side richer
      const pocket = hashNoise(seed, x, y) * 2.2;
      const lowFreq = hashNoise(seed, Math.floor(x / 3), Math.floor(y / 3) + 97) * 1.4;
      let grade = 2.6 + peakBias + pocket * 0.55 + lowFreq;
      grade = Math.round(grade * 10) / 10;
      const dust = 0.7 + hashNoise(seed, x + 31, y + 57) * 0.9;
      const dist = Math.abs(x - BASE_X) + Math.abs(y - BASE_Y);
      const rough = hashNoise(seed, x + 71, y + 13) > 0.82 && dist > 2;
      const disputed = x <= 2 && y <= 3; // NW corner: Ocean State plat overlap
      tiles.push({
        i, x, y,
        grade: Math.min(6.5, grade),
        dust: Math.round(dust * 100) / 100,
        dist,
        surveyed: false,
        mass: TILE_MASS,
        disputed,
        rough,
      });
    }
  }
  // the disputed corner is noticeably richer — that's the temptation
  for (const t of tiles) {
    if (t.disputed) t.grade = Math.min(6.5, Math.round((t.grade + 1.5) * 10) / 10);
  }
  // a small surveyed halo around the hut so the first objective reads instantly
  for (const t of tiles) {
    if (t.dist <= 2) t.surveyed = true;
  }
  return tiles;
}

export function tileAt(tiles: Tile[], x: number, y: number): Tile | undefined {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return undefined;
  return tiles[y * MAP_W + x];
}
