import Phaser from 'phaser';
import type { Shell } from '../shell';
import { MAP_W, MAP_H, BASE_X, BASE_Y, BUILD_RADIUS, RDV_A_OPEN, RDV_A_CLOSE, RDV_B_OPEN, RDV_B_CLOSE } from '../sim/constants';
import { daylightFactor, isNight } from '../sim/sim';
import { TILE_PX } from './art';

const W = MAP_W * TILE_PX;
const H = MAP_H * TILE_PX;

/** Top-down crater floor: baked regolith ground, per-tile overlays, buildings,
 * the crawler, drifting dust, and the day/night light. Camera pans + zooms. */
export class GameScene extends Phaser.Scene {
  declare shell: Shell;
  private overlay!: Phaser.GameObjects.Graphics;
  private nightRect!: Phaser.GameObjects.Rectangle;
  private earthGlow!: Phaser.GameObjects.PointLight | Phaser.GameObjects.Arc;
  private crawlerSpr!: Phaser.GameObjects.Image;
  private buildingSprs = new Map<string, Phaser.GameObjects.Image>();
  private workLight!: Phaser.GameObjects.Arc;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private tracks!: Phaser.GameObjects.Graphics;
  private trackPts: { x: number; y: number }[] = [];
  private dragStart: { x: number; y: number; cx: number; cy: number } | null = null;
  private dragged = false;

  constructor() {
    super('game');
  }

  create(): void {
    this.shell = this.registry.get('shell') as Shell;

    this.add.image(0, 0, 'ground').setOrigin(0, 0);
    this.tracks = this.add.graphics();
    this.overlay = this.add.graphics();

    // base structures: buried hut + RF extractor with hopper
    this.add.image(BASE_X * TILE_PX + 24, BASE_Y * TILE_PX + 24, 'spr_hut');
    this.add.image((BASE_X + 1) * TILE_PX + 24, BASE_Y * TILE_PX + 20, 'spr_extractor');
    this.workLight = this.add.circle(BASE_X * TILE_PX + 60, BASE_Y * TILE_PX + 24, 60, 0xffb347, 0.0);

    this.crawlerSpr = this.add.image(BASE_X * TILE_PX + 24, BASE_Y * TILE_PX + 24, 'spr_crawler');
    this.crawlerSpr.setDepth(5);

    this.dust = this.add.particles(0, 0, 'spr_dust', {
      speed: { min: 4, max: 18 },
      angle: { min: 200, max: 340 },
      alpha: { start: 0.35, end: 0 },
      scale: { start: 0.7, end: 1.6 },
      lifespan: 1800,
      frequency: -1,
    });
    this.dust.setDepth(6);

    this.nightRect = this.add.rectangle(W / 2, H / 2, W + 800, H + 800, 0x1a2742, 0);
    this.nightRect.setDepth(10);

    const cam = this.cameras.main;
    cam.setBounds(-160, -160, W + 320, H + 320);
    cam.setZoom(1.5);
    cam.centerOn(BASE_X * TILE_PX, BASE_Y * TILE_PX);
    cam.setRoundPixels(true);

    // -- input: drag to pan, click to select, wheel to zoom
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragStart = { x: p.x, y: p.y, cx: cam.scrollX, cy: cam.scrollY };
      this.dragged = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const wp = cam.getWorldPoint(p.x, p.y);
      this.shell.hoverTile = this.tileIndexAt(wp.x, wp.y);
      if (this.dragStart && p.isDown) {
        const dx = p.x - this.dragStart.x;
        const dy = p.y - this.dragStart.y;
        if (Math.abs(dx) + Math.abs(dy) > 8) this.dragged = true;
        if (this.dragged) {
          cam.scrollX = this.dragStart.cx - dx / cam.zoom;
          cam.scrollY = this.dragStart.cy - dy / cam.zoom;
        }
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.dragged && this.shell.modalDepth === 0 && !this.shell.cutsceneActive) {
        const wp = cam.getWorldPoint(p.x, p.y);
        const idx = this.tileIndexAt(wp.x, wp.y);
        if (idx >= 0) {
          this.shell.selectedTile = idx;
          this.shell.refreshUI();
        }
      }
      this.dragStart = null;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const z = Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.8, 2.6);
      cam.setZoom(z);
    });

    this.scale.on('resize', () => cam.setRoundPixels(true));
  }

  private tileIndexAt(wx: number, wy: number): number {
    const tx = Math.floor(wx / TILE_PX);
    const ty = Math.floor(wy / TILE_PX);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return -1;
    return ty * MAP_W + tx;
  }

  update(_time: number, delta: number): void {
    const sh = this.shell;
    if (!sh) return;
    const s = sh.sim;
    const cam = this.cameras.main;

    // keyboard pan
    const kb = this.input.keyboard;
    if (kb && sh.modalDepth === 0 && !sh.cutsceneActive) {
      const v = (delta / 1000) * 420 / cam.zoom;
      const keys = kb.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
      if (keys.A.isDown || keys.LEFT.isDown) cam.scrollX -= v;
      if (keys.D.isDown || keys.RIGHT.isDown) cam.scrollX += v;
      if (keys.W.isDown || keys.UP.isDown) cam.scrollY -= v;
      if (keys.S.isDown || keys.DOWN.isDown) cam.scrollY += v;
    }

    // crawler
    const cx = s.crawler.x * TILE_PX + 24;
    const cy = s.crawler.y * TILE_PX + 24;
    const dx = cx - this.crawlerSpr.x;
    const dy = cy - this.crawlerSpr.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.5) {
      this.crawlerSpr.rotation = Math.atan2(dy, dx);
      // leave tracks
      if (this.trackPts.length === 0
        || Phaser.Math.Distance.Between(cx, cy, this.trackPts[this.trackPts.length - 1].x, this.trackPts[this.trackPts.length - 1].y) > 10) {
        this.trackPts.push({ x: cx, y: cy });
        if (this.trackPts.length > 400) this.trackPts.shift();
        this.redrawTracks();
      }
    }
    this.crawlerSpr.x = cx;
    this.crawlerSpr.y = cy;
    this.crawlerSpr.setVisible(s.crawler.phase !== 'shipment');
    if (s.crawler.phase === 'sweeping' && !sh.paused() && Math.random() < 0.3) {
      this.dust.emitParticleAt(cx + (Math.random() - 0.5) * 30, cy + (Math.random() - 0.5) * 30, 1);
    }

    // buildings (delivered ones get sprites; pending shows ghost)
    const SPRITE: Record<string, string> = {
      solar: 'spr_solar', battery: 'spr_battery', hopper: 'spr_hopper',
      rf_upgrade: 'spr_extractor', distiller: 'spr_distiller', bench: 'spr_bench',
      tank: 'spr_tank', recycler: 'spr_recycler', crawler_upgrade: 'spr_bench',
      cableway: 'spr_pylon',
    };
    for (let i = 0; i < s.buildings.length; i++) {
      const b = s.buildings[i];
      const key = `b${i}`;
      let spr = this.buildingSprs.get(key);
      if (!spr) {
        spr = this.add.image(b.tx * TILE_PX + 24, b.ty * TILE_PX + 24, SPRITE[b.id] ?? 'spr_bench');
        spr.setDepth(3);
        this.buildingSprs.set(key, spr);
      }
      spr.setAlpha(b.readyAt <= s.t ? 1 : 0.4);
    }

    // light: day/night tint + work lights + earthshine
    const dl = daylightFactor(s.t);
    this.nightRect.fillAlpha = (1 - dl) * 0.5;
    this.nightRect.fillColor = 0x16213a;
    this.workLight.setAlpha((1 - dl) * 0.18);

    this.redrawOverlay();
  }

  private redrawTracks(): void {
    this.tracks.clear();
    this.tracks.lineStyle(3, 0x565a64, 0.5);
    for (let i = 1; i < this.trackPts.length; i++) {
      const a = this.trackPts[i - 1];
      const b = this.trackPts[i];
      if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) < 60) {
        this.tracks.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
  }

  private redrawOverlay(): void {
    const sh = this.shell;
    const s = sh.sim;
    const g = this.overlay;
    g.clear();

    for (const t of s.tiles) {
      const x = t.x * TILE_PX;
      const y = t.y * TILE_PX;
      if (!t.surveyed) {
        g.fillStyle(0x0a0d14, 0.42);
        g.fillRect(x, y, TILE_PX, TILE_PX);
        if (s.surveyQueue.includes(t.i)) {
          g.lineStyle(2, 0x5dd47e, 0.9);
          g.strokeRect(x + 6, y + 6, TILE_PX - 12, TILE_PX - 12);
        }
      } else {
        // grade heat: green trace alpha scaled by ppb
        const a = Phaser.Math.Clamp((t.grade - 2.5) / 4, 0, 1) * 0.30;
        g.fillStyle(0x5dd47e, a);
        g.fillRect(x, y, TILE_PX, TILE_PX);
        if (t.mass <= 0) {
          g.lineStyle(1, 0x9aa3b2, 0.5);
          g.lineBetween(x + 8, y + 8, x + TILE_PX - 8, y + TILE_PX - 8);
          g.lineBetween(x + TILE_PX - 8, y + 8, x + 8, y + TILE_PX - 8);
        }
      }
      if (t.disputed) {
        const locked = s.claimDecision !== 'strip';
        g.lineStyle(2, locked ? 0xffaa00 : 0xff5544, 0.8);
        g.strokeRect(x + 2, y + 2, TILE_PX - 4, TILE_PX - 4);
      }
    }

    // build radius hint while placing
    if (sh.placing && sh.placing !== 'cableway') {
      g.lineStyle(2, 0xffb347, 0.6);
      g.strokeCircle(BASE_X * TILE_PX + 24, BASE_Y * TILE_PX + 24, BUILD_RADIUS * TILE_PX);
    }
    // placement ghost
    if (sh.placing && sh.hoverTile >= 0) {
      const t = s.tiles[sh.hoverTile];
      const ok = sh.placing === 'cableway'
        ? t.surveyed && t.mass > 0 && t.dist > 1
        : t.dist > 0 && Math.hypot(t.x - BASE_X, t.y - BASE_Y) <= BUILD_RADIUS
          && !s.buildings.some((b) => b.tx === t.x && b.ty === t.y)
          && !(t.x === BASE_X + 1 && t.y === BASE_Y);
      g.fillStyle(ok ? 0x5dd47e : 0xff5544, 0.35);
      g.fillRect(t.x * TILE_PX, t.y * TILE_PX, TILE_PX, TILE_PX);
    }

    // selection + sweep target
    if (sh.selectedTile >= 0) {
      const t = s.tiles[sh.selectedTile];
      g.lineStyle(2.5, 0xffffff, 0.95);
      g.strokeRect(t.x * TILE_PX + 1, t.y * TILE_PX + 1, TILE_PX - 2, TILE_PX - 2);
    }
    if (s.crawler.targetTile >= 0) {
      const t = s.tiles[s.crawler.targetTile];
      g.lineStyle(2.5, 0xffb347, 0.95);
      g.strokeRect(t.x * TILE_PX + 4, t.y * TILE_PX + 4, TILE_PX - 8, TILE_PX - 8);
      g.lineBetween(t.x * TILE_PX + 12, t.y * TILE_PX + 24, t.x * TILE_PX + 36, t.y * TILE_PX + 24);
      g.lineBetween(t.x * TILE_PX + 24, t.y * TILE_PX + 12, t.x * TILE_PX + 24, t.y * TILE_PX + 36);
    }

    // cableway lines from source tiles to the hopper
    for (const b of s.buildings) {
      if (b.id !== 'cableway' || b.sourceTile === undefined) continue;
      const t = s.tiles[b.sourceTile];
      g.lineStyle(2, 0x9aa3b2, b.readyAt <= s.t ? 0.9 : 0.35);
      g.lineBetween(t.x * TILE_PX + 24, t.y * TILE_PX + 24, (BASE_X + 1) * TILE_PX + 24, BASE_Y * TILE_PX + 12);
    }

    // shipment route hint when a window is near/open
    const inA = s.t >= RDV_A_OPEN - 60 && s.t <= RDV_A_CLOSE;
    const inB = s.t >= RDV_B_OPEN - 60 && s.t <= RDV_B_CLOSE;
    if ((inA || inB) && !s.shipped) {
      g.lineStyle(2, 0x5dd47e, 0.5 + 0.3 * Math.sin(Date.now() / 300));
      const bx = BASE_X * TILE_PX + 24;
      const by = BASE_Y * TILE_PX + 24;
      g.lineBetween(bx, by, bx, -100);
      // arrow
      g.lineBetween(bx, -60, bx - 10, -42);
      g.lineBetween(bx, -60, bx + 10, -42);
    }
  }
}
