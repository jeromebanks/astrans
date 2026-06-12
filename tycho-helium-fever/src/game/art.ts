/** All visuals are generated locally on canvas: map textures, building and
 * vehicle sprites, character portraits, and the illustrated cutscene panels.
 * Palette: lunar blue-gray, sodium work lights, amber warnings, green traces,
 * earthshine blue. */

import { hashNoise } from '../sim/rng';

export const PAL = {
  regolith: '#8b8f99',
  regolithDark: '#565a64',
  night: '#1a2233',
  earthshine: '#3a5a8c',
  sodium: '#ffb347',
  amber: '#ffaa00',
  trace: '#5dd47e',
  steel: '#aab2bf',
  rust: '#7d6b58',
  black: '#05070c',
  visor: '#1d2738',
};

type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

// ------------------------------------------------------------- map texture

export const TILE_PX = 48;

/** Bake the whole crater floor into one texture, regolith grain + craterlets. */
export function bakeGround(seed: number, w: number, h: number): HTMLCanvasElement {
  const [cv, g] = makeCanvas(w * TILE_PX, h * TILE_PX);
  g.fillStyle = PAL.regolith;
  g.fillRect(0, 0, cv.width, cv.height);
  // fine grain
  for (let i = 0; i < cv.width * cv.height / 38; i++) {
    const x = hashNoise(seed, i, 1) * cv.width;
    const y = hashNoise(seed, i, 2) * cv.height;
    const v = hashNoise(seed, i, 3);
    g.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(10,12,20,0.08)';
    g.fillRect(x, y, 1 + v * 2, 1 + v * 2);
  }
  // craterlets with sun-side highlight (long morning shadows)
  for (let i = 0; i < 90; i++) {
    const x = hashNoise(seed, i, 4) * cv.width;
    const y = hashNoise(seed, i, 5) * cv.height;
    const r = 3 + hashNoise(seed, i, 6) * 14;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = 'rgba(20,24,34,0.25)';
    g.fill();
    g.beginPath();
    g.arc(x - r * 0.25, y - r * 0.25, r * 0.8, 0, Math.PI * 2);
    g.fillStyle = 'rgba(220,225,235,0.10)';
    g.fill();
  }
  // subtle tile seams
  g.strokeStyle = 'rgba(255,255,255,0.04)';
  for (let x = 0; x <= w; x++) { g.beginPath(); g.moveTo(x * TILE_PX, 0); g.lineTo(x * TILE_PX, cv.height); g.stroke(); }
  for (let y = 0; y <= h; y++) { g.beginPath(); g.moveTo(0, y * TILE_PX); g.lineTo(cv.width, y * TILE_PX); g.stroke(); }
  return cv;
}

// ------------------------------------------------------------- sprites

function spr(w: number, h: number, draw: (g: Ctx) => void): HTMLCanvasElement {
  const [cv, g] = makeCanvas(w, h);
  draw(g);
  return cv;
}

export function makeSprites(): Record<string, HTMLCanvasElement> {
  const S: Record<string, HTMLCanvasElement> = {};

  S.hut = spr(64, 64, (g) => {
    // buried quonset mound with airlock + earth-window tube
    g.fillStyle = '#6c7079';
    g.beginPath(); g.ellipse(32, 34, 26, 18, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7c8089';
    g.beginPath(); g.ellipse(30, 31, 20, 13, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = PAL.steel;
    g.fillRect(50, 28, 10, 12); // airlock
    g.fillStyle = PAL.sodium;
    g.fillRect(52, 31, 6, 6); // warm light in the lock window
    g.fillStyle = '#2c3850';
    g.beginPath(); g.arc(28, 26, 5, 0, Math.PI * 2); g.fill(); // earth window tube
    g.strokeStyle = '#9fb6e0';
    g.lineWidth = 2;
    g.beginPath(); g.arc(28, 26, 5, 0, Math.PI * 2); g.stroke();
  });

  S.extractor = spr(64, 64, (g) => {
    // RF extractor on stilts with hopper
    g.strokeStyle = '#3b4150'; g.lineWidth = 3;
    for (const [x1, x2] of [[16, 12], [48, 52], [20, 18], [44, 46]]) {
      g.beginPath(); g.moveTo(x1, 38); g.lineTo(x2, 56); g.stroke();
    }
    g.fillStyle = PAL.steel;
    g.fillRect(12, 20, 40, 20);
    g.fillStyle = '#822';
    g.fillRect(14, 22, 8, 6); // RF emitter housing
    g.fillStyle = PAL.trace;
    g.fillRect(40, 24, 8, 4); // instrument strip
    g.fillStyle = '#6c707a';
    g.beginPath(); g.moveTo(20, 20); g.lineTo(44, 20); g.lineTo(38, 6); g.lineTo(26, 6); g.closePath(); g.fill(); // hopper funnel
    g.strokeStyle = PAL.sodium; g.lineWidth = 1.5;
    g.strokeRect(12, 20, 40, 20);
  });

  S.solar = spr(48, 48, (g) => {
    g.fillStyle = '#16243d';
    g.fillRect(6, 10, 36, 28);
    g.strokeStyle = '#3c5a8c'; g.lineWidth = 1;
    for (let x = 12; x < 42; x += 6) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 38); g.stroke(); }
    for (let y = 17; y < 38; y += 7) { g.beginPath(); g.moveTo(6, y); g.lineTo(42, y); g.stroke(); }
    g.strokeStyle = PAL.steel; g.lineWidth = 2;
    g.strokeRect(6, 10, 36, 28);
  });

  S.battery = spr(48, 48, (g) => {
    g.fillStyle = '#3a3f4a';
    g.fillRect(8, 14, 32, 24);
    g.fillStyle = PAL.trace;
    g.fillRect(12, 18, 6, 16); g.fillRect(21, 18, 6, 16); g.fillRect(30, 18, 6, 16);
    g.strokeStyle = PAL.steel; g.lineWidth = 2; g.strokeRect(8, 14, 32, 24);
    g.fillStyle = PAL.amber; g.fillRect(18, 10, 12, 4);
  });

  S.hopper = spr(48, 48, (g) => {
    g.fillStyle = '#6c707a';
    g.beginPath(); g.moveTo(8, 12); g.lineTo(40, 12); g.lineTo(32, 40); g.lineTo(16, 40); g.closePath(); g.fill();
    g.strokeStyle = '#454a55'; g.lineWidth = 2; g.stroke();
    g.fillStyle = PAL.regolithDark;
    g.beginPath(); g.ellipse(24, 14, 14, 4, 0, 0, Math.PI * 2); g.fill();
  });

  S.distiller = spr(48, 48, (g) => {
    g.fillStyle = PAL.steel;
    g.fillRect(14, 8, 8, 34); g.fillRect(28, 14, 8, 28);
    g.fillStyle = '#cfd6e2';
    g.beginPath(); g.arc(18, 8, 4, Math.PI, 0); g.fill();
    g.beginPath(); g.arc(32, 14, 4, Math.PI, 0); g.fill();
    g.strokeStyle = PAL.trace; g.lineWidth = 2;
    g.beginPath(); g.moveTo(22, 18); g.lineTo(28, 22); g.stroke();
    g.fillStyle = '#2c3850'; g.fillRect(15, 30, 6, 4); g.fillRect(29, 30, 6, 4);
  });

  S.bench = spr(48, 48, (g) => {
    g.fillStyle = '#5a5142';
    g.fillRect(8, 18, 32, 8);
    g.fillStyle = '#3b4150';
    g.fillRect(10, 26, 5, 14); g.fillRect(33, 26, 5, 14);
    g.fillStyle = PAL.sodium; g.fillRect(12, 12, 10, 5); // work light
    g.fillStyle = PAL.steel; g.fillRect(26, 14, 6, 3); g.fillRect(34, 13, 4, 4);
  });

  S.tank = spr(48, 48, (g) => {
    g.fillStyle = '#d8dde6';
    g.beginPath(); g.ellipse(17, 26, 8, 14, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9fc4e8';
    g.beginPath(); g.ellipse(33, 28, 7, 12, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#454a55'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(17, 26, 8, 14, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(33, 28, 7, 12, 0, 0, Math.PI * 2); g.stroke();
  });

  S.recycler = spr(48, 48, (g) => {
    g.fillStyle = '#2f4a38';
    g.fillRect(10, 12, 28, 28);
    g.fillStyle = '#57b07a';
    g.beginPath(); g.arc(24, 26, 9, 0, Math.PI * 2); g.fill(); // algae column window
    g.strokeStyle = PAL.steel; g.lineWidth = 2; g.strokeRect(10, 12, 28, 28);
  });

  S.pylon = spr(48, 48, (g) => {
    g.strokeStyle = '#454a55'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(24, 44); g.lineTo(24, 8); g.stroke();
    g.beginPath(); g.moveTo(10, 14); g.lineTo(38, 14); g.stroke();
    g.fillStyle = PAL.amber; g.fillRect(22, 6, 4, 4);
    g.strokeStyle = '#666c78'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(24, 44); g.lineTo(14, 46); g.stroke();
    g.beginPath(); g.moveTo(24, 44); g.lineTo(34, 46); g.stroke();
  });

  S.crawler = spr(40, 40, (g) => {
    // top-down tracked crawler, nose pointing +x
    g.fillStyle = '#23262e';
    g.fillRect(4, 6, 32, 8); g.fillRect(4, 26, 32, 8); // treads
    g.fillStyle = '#4a4f5a';
    for (let x = 6; x < 36; x += 5) { g.fillRect(x, 7, 2, 6); g.fillRect(x, 27, 2, 6); }
    g.fillStyle = PAL.steel;
    g.fillRect(8, 12, 24, 16); // hull
    g.fillStyle = '#2c3850';
    g.fillRect(26, 14, 6, 12); // cab glass at nose
    g.fillStyle = PAL.regolithDark;
    g.fillRect(10, 14, 12, 12); // cargo bed
    g.fillStyle = PAL.sodium;
    g.fillRect(32, 16, 3, 3); g.fillRect(32, 21, 3, 3); // headlights
  });

  S.bottle = spr(24, 24, (g) => {
    g.fillStyle = '#d8dde6';
    g.beginPath(); g.ellipse(12, 13, 6, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#454a55'; g.fillRect(9, 2, 6, 4);
    g.strokeStyle = '#454a55'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(12, 13, 6, 9, 0, 0, Math.PI * 2); g.stroke();
  });

  return S;
}

// ------------------------------------------------------------- portraits

export interface PortraitSpec {
  skin: string;
  hair: string;
  hairStyle: 'bob' | 'short' | 'buzz' | 'cap' | 'visor' | 'none';
  suit: string;
  beard?: boolean;
  glyph?: 'radio' | 'news';
}

const PORTRAITS: Record<string, PortraitSpec> = {
  'Li': { skin: '#e8c39a', hair: '#15151c', hairStyle: 'bob', suit: '#b46a32' },
  'Darrin': { skin: '#caa183', hair: '#5a4632', hairStyle: 'short', suit: '#46627e', beard: true },
  'Andrei': { skin: '#d8b28e', hair: '#8e8e93', hairStyle: 'buzz', suit: '#5d5d66' },
  'Vendor': { skin: '#b98a64', hair: '#2e2620', hairStyle: 'cap', suit: '#6e5b41' },
  'Claim-jumper': { skin: '#000', hair: '#000', hairStyle: 'visor', suit: '#3c4046' },
  'Radio': { skin: '#000', hair: '#000', hairStyle: 'none', suit: '#30343c', glyph: 'radio' },
  'Newsfeed': { skin: '#000', hair: '#000', hairStyle: 'none', suit: '#30343c', glyph: 'news' },
};

export function makePortrait(name: string): HTMLCanvasElement {
  const p = PORTRAITS[name] ?? PORTRAITS['Radio'];
  return spr(96, 96, (g) => {
    // panel
    g.fillStyle = '#11151f';
    g.fillRect(0, 0, 96, 96);
    g.strokeStyle = '#2c3548'; g.lineWidth = 2; g.strokeRect(1, 1, 94, 94);

    if (p.glyph === 'radio') {
      g.strokeStyle = PAL.trace; g.lineWidth = 2;
      g.beginPath();
      for (let x = 14; x <= 82; x += 2) {
        const y = 48 + Math.sin(x * 0.5) * (x > 30 && x < 66 ? 18 : 5);
        x === 14 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
      g.fillStyle = '#56607a'; g.font = '10px monospace';
      g.fillText('LOCAL BAND', 22, 84);
      return;
    }
    if (p.glyph === 'news') {
      g.fillStyle = '#1d2738'; g.fillRect(14, 20, 68, 44);
      g.fillStyle = PAL.sodium; g.fillRect(18, 26, 26, 18);
      g.fillStyle = '#56607a';
      g.fillRect(48, 28, 30, 3); g.fillRect(48, 34, 30, 3); g.fillRect(48, 40, 22, 3);
      g.fillRect(18, 50, 60, 3); g.fillRect(18, 56, 44, 3);
      return;
    }

    // suit shoulders + helmet ring
    g.fillStyle = p.suit;
    g.beginPath(); g.moveTo(8, 96); g.quadraticCurveTo(48, 60, 88, 96); g.closePath(); g.fill();
    g.strokeStyle = '#9aa3b2'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(48, 78, 26, 10, 0, Math.PI, 0); g.stroke();

    if (p.hairStyle === 'visor') {
      // mirrored visor: no face, only a hard reflection
      g.fillStyle = '#caa84a';
      g.beginPath(); g.ellipse(48, 44, 22, 26, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath(); g.ellipse(40, 34, 10, 14, -0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#7fff8a';
      g.beginPath(); g.arc(58, 52, 2.5, 0, Math.PI * 2); g.fill(); // a green dot, reflected
      return;
    }

    // head
    g.fillStyle = p.skin;
    g.beginPath(); g.ellipse(48, 44, 19, 23, 0, 0, Math.PI * 2); g.fill();
    // hair
    g.fillStyle = p.hair;
    if (p.hairStyle === 'bob') {
      g.beginPath(); g.ellipse(48, 36, 21, 19, 0, Math.PI, 0); g.fill();
      g.fillRect(27, 36, 7, 24); g.fillRect(62, 36, 7, 24);
    } else if (p.hairStyle === 'short') {
      g.beginPath(); g.ellipse(48, 32, 19, 13, 0, Math.PI, 0); g.fill();
    } else if (p.hairStyle === 'buzz') {
      g.beginPath(); g.ellipse(48, 30, 18, 9, 0, Math.PI, 0); g.fill();
    } else if (p.hairStyle === 'cap') {
      g.fillRect(28, 20, 40, 14);
      g.fillRect(24, 30, 48, 5);
    }
    if (p.beard) {
      g.fillStyle = p.hair;
      g.beginPath(); g.ellipse(48, 58, 13, 9, 0, 0, Math.PI); g.fill();
    }
    // eyes + brows + mouth
    g.fillStyle = '#1a1d26';
    g.fillRect(38, 44, 6, 2.5); g.fillRect(53, 44, 6, 2.5);
    g.fillRect(37, 39, 8, 2); g.fillRect(52, 39, 8, 2);
    g.fillRect(43, p.beard ? 56 : 58, 10, 2);
  });
}

// ------------------------------------------------------------- cutscene art

function sky(g: Ctx, top: string, bottom: string, h = 540): void {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  g.fillStyle = gr;
  g.fillRect(0, 0, 960, h);
}

function stars(g: Ctx, n = 140, hMax = 360): void {
  for (let i = 0; i < n; i++) {
    const x = hashNoise(7, i, 1) * 960;
    const y = hashNoise(7, i, 2) * hMax;
    const a = 0.3 + hashNoise(7, i, 3) * 0.7;
    g.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
    g.fillRect(x, y, hashNoise(7, i, 4) > 0.92 ? 2 : 1, 1);
  }
}

function ground(g: Ctx, y: number, color: string): void {
  g.fillStyle = color;
  g.fillRect(0, y, 960, 540 - y);
  for (let i = 0; i < 500; i++) {
    const x = hashNoise(13, i, 1) * 960;
    const yy = y + hashNoise(13, i, 2) * (540 - y);
    g.fillStyle = hashNoise(13, i, 3) > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
    g.fillRect(x, yy, 2, 2);
  }
}

function earthDisc(g: Ctx, x: number, y: number, r: number): void {
  g.fillStyle = '#0a1a3a';
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  const grad = g.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
  grad.addColorStop(0, '#9fd0f0'); grad.addColorStop(0.5, '#3a78c2'); grad.addColorStop(1, '#10243f');
  g.fillStyle = grad;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.3, r * 0.5, r * 0.22, 0.6, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x + r * 0.3, y + r * 0.25, r * 0.35, r * 0.15, -0.4, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(80,140,60,0.65)';
  g.beginPath(); g.ellipse(x - r * 0.15, y + r * 0.1, r * 0.3, r * 0.2, 0.3, 0, Math.PI * 2); g.fill();
}

function figure(g: Ctx, x: number, y: number, s: number, suit: string): void {
  g.fillStyle = suit;
  g.beginPath(); g.arc(x, y - 26 * s, 8 * s, 0, Math.PI * 2); g.fill(); // helmet
  g.fillRect(x - 7 * s, y - 20 * s, 14 * s, 18 * s); // torso
  g.fillRect(x - 7 * s, y - 3 * s, 5 * s, 14 * s); // legs
  g.fillRect(x + 2 * s, y - 3 * s, 5 * s, 14 * s);
  g.fillStyle = PAL.visor;
  g.beginPath(); g.arc(x + 2 * s, y - 26 * s, 5 * s, 0, Math.PI * 2); g.fill();
}

function crawlerSide(g: Ctx, x: number, y: number, s: number): void {
  g.fillStyle = '#23262e';
  g.beginPath(); g.ellipse(x, y, 46 * s, 12 * s, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3c4046';
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.arc(x + i * 12 * s, y, 7 * s, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = PAL.steel;
  g.fillRect(x - 40 * s, y - 34 * s, 80 * s, 24 * s);
  g.fillStyle = '#2c3850';
  g.fillRect(x + 16 * s, y - 30 * s, 18 * s, 14 * s);
  g.fillStyle = PAL.sodium;
  g.fillRect(x + 38 * s, y - 24 * s, 5 * s, 5 * s);
}

function craterWall(g: Ctx, baseY: number, peakY: number, color: string): void {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, baseY);
  for (let x = 0; x <= 960; x += 40) {
    const y = peakY + hashNoise(29, x, 1) * (baseY - peakY) * 0.35;
    g.lineTo(x, y);
  }
  g.lineTo(960, baseY);
  g.closePath();
  g.fill();
}

const ART: Record<string, (g: Ctx) => void> = {
  art_city: (g) => {
    sky(g, '#050810', '#1a2030', 400);
    stars(g, 80, 220);
    // city blocks at night
    for (let i = 0; i < 26; i++) {
      const x = i * 38 + hashNoise(3, i, 1) * 10;
      const h = 80 + hashNoise(3, i, 2) * 170;
      g.fillStyle = '#0c1018';
      g.fillRect(x, 400 - h, 30, h + 140);
      g.fillStyle = 'rgba(255,179,71,0.8)';
      for (let wy = 0; wy < h - 12; wy += 12) {
        for (let wx = 4; wx < 24; wx += 8) {
          if (hashNoise(3, i * 100 + wy, wx) > 0.45) g.fillRect(x + wx, 400 - h + wy + 4, 4, 6);
        }
      }
    }
    // the fusion plant glow on the horizon — one steady point, brighter than all
    const gl = g.createRadialGradient(700, 330, 2, 700, 330, 130);
    gl.addColorStop(0, 'rgba(220,240,255,0.95)'); gl.addColorStop(1, 'rgba(120,180,255,0)');
    g.fillStyle = gl; g.fillRect(560, 200, 290, 270);
    g.fillStyle = '#eef6ff'; g.beginPath(); g.arc(700, 330, 5, 0, Math.PI * 2); g.fill();
  },

  art_apartment: (g) => {
    sky(g, '#0b0e16', '#0b0e16');
    // dark room, a window with city light, a screen
    g.fillStyle = '#141821'; g.fillRect(0, 0, 960, 540);
    g.fillStyle = '#0a1322'; g.fillRect(80, 80, 320, 260); // window
    g.fillStyle = '#1c2c44';
    for (let i = 0; i < 14; i++) {
      const x = 90 + hashNoise(5, i, 1) * 290;
      g.fillRect(x, 200 + hashNoise(5, i, 2) * 120, 14, 140);
    }
    g.fillStyle = 'rgba(255,179,71,0.5)';
    for (let i = 0; i < 60; i++) g.fillRect(95 + hashNoise(5, i, 3) * 290, 220 + hashNoise(5, i, 4) * 110, 2, 3);
    g.strokeStyle = '#2c3548'; g.lineWidth = 6; g.strokeRect(80, 80, 320, 260);
    // glowing slate on a table, the only warm light
    g.fillStyle = '#10141c'; g.fillRect(480, 330, 380, 24);
    g.fillStyle = '#1d2738'; g.fillRect(600, 240, 190, 120);
    g.fillStyle = PAL.sodium; g.fillRect(612, 252, 80, 50);
    g.fillStyle = '#56607a';
    g.fillRect(700, 254, 78, 4); g.fillRect(700, 264, 78, 4); g.fillRect(700, 274, 56, 4);
    g.fillStyle = PAL.trace; g.fillRect(612, 316, 166, 18); // APPLY bar
    g.fillStyle = '#06210e'; g.font = 'bold 13px monospace'; g.fillText('APPLY', 672, 330);
    // a single framed photo
    g.fillStyle = '#2c3548'; g.fillRect(508, 296, 44, 34);
    g.fillStyle = '#6b7488'; g.fillRect(512, 300, 36, 26);
  },

  art_claimmap: (g) => {
    sky(g, '#0a0d14', '#0a0d14');
    g.fillStyle = '#10141d'; g.fillRect(60, 50, 840, 440);
    g.strokeStyle = '#22304a'; g.lineWidth = 1;
    for (let x = 60; x <= 900; x += 42) { g.beginPath(); g.moveTo(x, 50); g.lineTo(x, 490); g.stroke(); }
    for (let y = 50; y <= 490; y += 42) { g.beginPath(); g.moveTo(60, y); g.lineTo(900, y); g.stroke(); }
    // the Moon, plotted: a big pale disc with claim clusters spreading
    g.fillStyle = '#222a3a';
    g.beginPath(); g.arc(480, 270, 190, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 160; i++) {
      const a = hashNoise(9, i, 1) * Math.PI * 2;
      const r = Math.sqrt(hashNoise(9, i, 2)) * 175;
      const cl = hashNoise(9, i, 3);
      g.fillStyle = cl > 0.85 ? PAL.amber : 'rgba(93,212,126,0.8)';
      g.fillRect(480 + Math.cos(a) * r, 270 + Math.sin(a) * r * 0.96, 4, 4);
    }
    g.strokeStyle = PAL.amber; g.lineWidth = 2;
    g.strokeRect(388, 330, 26, 26); // Ball Crater highlight
    g.fillStyle = '#56607a'; g.font = '12px monospace';
    g.fillText('BALL CRATER — TAN, LI YUN (2 mi²)', 420, 348);
    g.fillText('³He $8,000,000/kg · TRANSIT LOANS 20%', 80, 478);
  },

  art_northsea: (g) => {
    sky(g, '#3a4452', '#71798a', 330);
    g.fillStyle = '#2e3a46'; g.fillRect(0, 330, 960, 210); // cold sea
    for (let i = 0; i < 120; i++) {
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(hashNoise(11, i, 1) * 960, 335 + hashNoise(11, i, 2) * 200, 24, 2);
    }
    // turbine silhouettes
    for (const [x, s] of [[220, 1], [480, 0.7], [700, 1.2]] as const) {
      g.strokeStyle = '#cfd6e2'; g.lineWidth = 6 * s;
      g.beginPath(); g.moveTo(x, 340); g.lineTo(x, 340 - 180 * s); g.stroke();
      g.lineWidth = 4 * s;
      for (let b = 0; b < 3; b++) {
        const a = b * (Math.PI * 2 / 3) + 0.5;
        g.beginPath(); g.moveTo(x, 340 - 180 * s);
        g.lineTo(x + Math.cos(a) * 90 * s, 340 - 180 * s + Math.sin(a) * 90 * s); g.stroke();
      }
    }
    figure(g, 150, 360, 1.2, '#d8a23a'); // hi-vis maintainer
  },

  art_market: (g) => {
    sky(g, '#b7c4d6', '#e0d9c8', 300);
    g.fillStyle = '#b0a48e'; g.fillRect(0, 300, 960, 240); // desert lot
    // aircraft boneyard silhouettes far off
    g.fillStyle = 'rgba(90,95,105,0.5)';
    for (let i = 0; i < 8; i++) {
      const x = 60 + i * 120;
      g.beginPath(); g.ellipse(x, 295, 40, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(x - 4, 270, 8, 26);
    }
    // stalls with machines
    for (const [x, c] of [[140, PAL.steel], [400, '#6e5b41'], [660, PAL.steel]] as const) {
      g.fillStyle = '#5d564a'; g.fillRect(x, 310, 180, 10);
      g.fillStyle = '#3c4046'; g.fillRect(x, 250, 180, 14); // awning
      g.fillStyle = c; g.fillRect(x + 24, 330, 130, 80);
      g.strokeStyle = '#2a2d34'; g.lineWidth = 2; g.strokeRect(x + 24, 330, 130, 80);
    }
    // the RF extractor on stilts at center stall
    g.strokeStyle = '#2a2d34'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(430, 410); g.lineTo(420, 470); g.stroke();
    g.beginPath(); g.moveTo(540, 410); g.lineTo(550, 470); g.stroke();
    g.fillStyle = '#822'; g.fillRect(434, 340, 22, 16);
    g.fillStyle = PAL.trace; g.fillRect(506, 344, 24, 10);
    figure(g, 320, 470, 1.3, '#b46a32');
    figure(g, 600, 472, 1.35, '#46627e');
  },

  art_hut: (g) => {
    sky(g, '#c4ccda', '#dcd6c6', 300);
    g.fillStyle = '#b0a48e'; g.fillRect(0, 300, 960, 240);
    // quonset hut cross-section display
    g.fillStyle = PAL.steel;
    g.beginPath(); g.arc(480, 400, 150, Math.PI, 0); g.fill();
    g.fillStyle = '#10141c';
    g.beginPath(); g.arc(480, 400, 132, Math.PI, 0); g.fill();
    g.fillRect(348, 400, 264, 8);
    // warm interior: bunk, algae column, tiny kitchen
    g.fillStyle = PAL.sodium; g.fillRect(380, 360, 70, 38); // bunk glow
    g.fillStyle = '#57b07a'; g.fillRect(560, 310, 22, 88); // algae column
    g.fillStyle = 'rgba(87,176,122,0.35)'; g.fillRect(540, 300, 62, 100);
    g.fillStyle = '#46627e'; g.fillRect(470, 372, 50, 26);
    // the earth window, packed separately, leaning against the hut
    g.fillStyle = '#2c3850'; g.beginPath(); g.arc(700, 440, 30, 0, Math.PI * 2); g.fill();
    earthDisc(g, 700, 440, 24);
    g.strokeStyle = PAL.steel; g.lineWidth = 5;
    g.beginPath(); g.arc(700, 440, 30, 0, Math.PI * 2); g.stroke();
  },

  art_balllaser: (g) => {
    sky(g, PAL.black, '#15192a', 320);
    stars(g);
    craterWall(g, 330, 180, '#3c4252');
    ground(g, 330, '#6c707a');
    // the established rig: mats, huts, an extractor
    g.fillStyle = '#16243d';
    for (let i = 0; i < 4; i++) g.fillRect(180 + i * 70, 350, 56, 26);
    g.fillStyle = PAL.steel;
    g.beginPath(); g.arc(560, 392, 34, Math.PI, 0); g.fill();
    g.beginPath(); g.arc(650, 396, 28, Math.PI, 0); g.fill();
    g.fillStyle = '#822'; g.fillRect(742, 350, 16, 12);
    g.fillStyle = '#6c707a'; g.fillRect(730, 362, 44, 26);
    // jumpers in a line
    for (const x of [380, 430, 480]) figure(g, x, 470, 1.25, '#3c4046');
    figure(g, 760, 480, 1.3, '#46627e'); // Darrin holding paper
    g.fillStyle = '#e8e4d8'; g.fillRect(752, 432, 18, 12);
  },

  art_greendot: (g) => {
    sky(g, PAL.black, '#0d1018');
    stars(g, 60, 540);
    // extreme close: chest of a suit, the dot
    g.fillStyle = '#46627e'; g.fillRect(200, 100, 560, 440);
    g.strokeStyle = '#31475c'; g.lineWidth = 4;
    for (const y of [180, 280, 380]) { g.beginPath(); g.moveTo(200, y); g.lineTo(760, y); g.stroke(); }
    g.fillStyle = '#9aa3b2'; g.fillRect(420, 130, 120, 30); // name patch
    g.fillStyle = '#1a1d26'; g.font = 'bold 16px monospace'; g.fillText('BROOKS', 436, 151);
    const gl = g.createRadialGradient(480, 320, 1, 480, 320, 60);
    gl.addColorStop(0, 'rgba(127,255,138,1)'); gl.addColorStop(0.12, 'rgba(127,255,138,0.8)'); gl.addColorStop(1, 'rgba(127,255,138,0)');
    g.fillStyle = gl; g.fillRect(420, 260, 120, 120);
    g.fillStyle = '#eafff0'; g.beginPath(); g.arc(480, 320, 5, 0, Math.PI * 2); g.fill();
    // speckle
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(127,255,138,0.5)';
      const a = hashNoise(17, i, 1) * Math.PI * 2;
      const r = hashNoise(17, i, 2) * 14;
      g.fillRect(480 + Math.cos(a) * r, 320 + Math.sin(a) * r, 1.5, 1.5);
    }
  },

  art_wreck: (g) => {
    sky(g, PAL.black, '#11141f', 300);
    stars(g);
    ground(g, 300, '#5f636d');
    crawlerSide(g, 480, 430, 1.4);
    // broken panels, open hatch dark
    g.fillStyle = '#0a0d14'; g.fillRect(458, 372, 30, 22); // hatch hangs open
    g.strokeStyle = '#16243d'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(360, 380); g.lineTo(330, 350); g.lineTo(300, 372); g.stroke(); // shattered panel
    g.fillStyle = '#16243d';
    g.beginPath(); g.moveTo(560, 366); g.lineTo(620, 350); g.lineTo(628, 372); g.lineTo(570, 384); g.closePath(); g.fill();
    // two oxygen bottles in the rack
    g.fillStyle = '#d8dde6';
    g.beginPath(); g.ellipse(420, 388, 8, 16, 0.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(440, 390, 8, 16, -0.1, 0, Math.PI * 2); g.fill();
    earthDisc(g, 820, 90, 36);
  },

  art_wall: (g) => {
    sky(g, PAL.black, '#10131d', 420);
    stars(g, 160, 300);
    // Tycho's wall: enormous, white in the sun
    g.fillStyle = '#d9dce4';
    g.beginPath();
    g.moveTo(0, 420);
    for (let x = 0; x <= 960; x += 30) {
      g.lineTo(x, 150 + hashNoise(19, x, 1) * 90 - (x > 300 && x < 700 ? 60 : 0));
    }
    g.lineTo(960, 420); g.closePath(); g.fill();
    g.fillStyle = 'rgba(60,66,82,0.55)';
    g.beginPath();
    g.moveTo(0, 420);
    for (let x = 0; x <= 960; x += 30) g.lineTo(x, 240 + hashNoise(23, x, 1) * 120);
    g.lineTo(960, 420); g.closePath(); g.fill();
    ground(g, 420, '#6c707a');
    crawlerSide(g, 230, 470, 0.8);
  },

  art_climb: (g) => {
    sky(g, PAL.black, PAL.black);
    stars(g, 200, 540);
    // steep slope diagonal, crawler on winch lines
    g.fillStyle = '#c9ccd6';
    g.beginPath(); g.moveTo(0, 540); g.lineTo(960, 90); g.lineTo(960, 540); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,44,56,0.35)';
    for (let i = 0; i < 200; i++) {
      const t = hashNoise(31, i, 1);
      g.fillRect(t * 960, 540 - t * 450 + hashNoise(31, i, 2) * 60, 8, 3);
    }
    g.strokeStyle = '#e8e4d8'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(430, 330); g.lineTo(700, 200); g.stroke(); // winch line
    g.beginPath(); g.moveTo(430, 330); g.lineTo(660, 230); g.stroke();
    g.save();
    g.translate(420, 340); g.rotate(-0.42);
    crawlerSide(g, 0, 0, 1.0);
    g.restore();
    g.fillStyle = PAL.amber; g.fillRect(697, 196, 7, 7); // piton anchor
  },

  art_crater: (g) => {
    sky(g, PAL.black, '#0d1018', 250);
    stars(g, 140, 200);
    earthDisc(g, 700, 80, 40);
    // standing on the rim: vast floor below, central peak far away
    g.fillStyle = '#9b9fa9'; g.fillRect(0, 250, 960, 290);
    g.fillStyle = '#83878f';
    for (let i = 0; i < 60; i++) {
      const x = hashNoise(37, i, 1) * 960;
      const y = 270 + hashNoise(37, i, 2) * 240;
      const r = 4 + hashNoise(37, i, 3) * 26;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(20,24,34,0.18)';
      g.beginPath(); g.arc(x + r * 0.2, y + r * 0.2, r * 0.7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#83878f';
    }
    // central peak
    g.fillStyle = '#c9ccd6';
    g.beginPath(); g.moveTo(420, 290); g.lineTo(480, 240); g.lineTo(560, 295); g.closePath(); g.fill();
    // two figures on the rim edge, foreground
    g.fillStyle = '#2a2d36'; g.fillRect(0, 470, 960, 70);
    figure(g, 180, 490, 1.6, '#b46a32');
    figure(g, 250, 494, 1.6, '#46627e');
    // the green survey pulse across the crater
    g.strokeStyle = 'rgba(127,255,138,0.8)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(196, 432); g.lineTo(905, 262); g.stroke();
    g.fillStyle = '#bfffca'; g.beginPath(); g.arc(905, 262, 4, 0, Math.PI * 2); g.fill();
  },

  art_buried: (g) => {
    sky(g, PAL.black, '#0e1119', 320);
    stars(g);
    earthDisc(g, 480, 90, 46);
    ground(g, 320, '#6c707a');
    // buried hut mound with the window tube aimed at Earth
    g.fillStyle = '#7a7e88';
    g.beginPath(); g.ellipse(480, 420, 170, 70, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#2c3850';
    g.save(); g.translate(480, 360); g.rotate(-0.12);
    g.fillRect(-12, -34, 24, 40); g.restore(); // window tube
    g.fillStyle = '#9fb6e0'; g.beginPath(); g.arc(477, 326, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = PAL.steel; g.fillRect(625, 396, 26, 30); // airlock
    g.fillStyle = PAL.sodium; g.fillRect(631, 404, 13, 13);
    // survey numbers floating as instrument callouts
    g.fillStyle = PAL.trace; g.font = '14px monospace';
    g.fillText('W FLOOR  3.2 ppb', 90, 380);
    g.fillText('C PEAK   4.8 ppb', 700, 350);
    g.strokeStyle = 'rgba(93,212,126,0.5)';
    g.strokeRect(80, 364, 150, 24); g.strokeRect(690, 334, 150, 24);
  },

  art_sunset: (g) => {
    sky(g, PAL.black, '#0c1626', 300);
    stars(g, 120, 240);
    // last sliver of sun on the western rim
    craterWall(g, 320, 200, '#23283a');
    const gl = g.createRadialGradient(160, 230, 4, 160, 230, 120);
    gl.addColorStop(0, 'rgba(255,235,200,1)'); gl.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = gl; g.fillRect(40, 110, 260, 240);
    g.fillStyle = '#fff4dc'; g.beginPath(); g.arc(160, 230, 7, 0, Math.PI * 2); g.fill();
    ground(g, 320, '#39405a'); // floor already in earthshine blue
    g.fillStyle = 'rgba(58,90,140,0.25)'; g.fillRect(0, 300, 960, 240);
    g.fillStyle = '#7a7e88';
    g.beginPath(); g.ellipse(480, 420, 150, 60, 0, Math.PI, 0); g.fill();
    g.fillStyle = PAL.sodium; g.fillRect(596, 402, 12, 12);
    g.fillStyle = '#cfd6e2'; g.font = '13px monospace';
    g.fillText('-170 °C BY MIDNIGHT', 660, 470);
  },

  art_earthshine: (g) => {
    sky(g, PAL.black, '#0a1020', 280);
    stars(g, 160, 240);
    earthDisc(g, 480, 110, 56);
    ground(g, 280, '#2c3650');
    g.fillStyle = 'rgba(58,90,140,0.30)'; g.fillRect(0, 280, 960, 260);
    // the hut mound, batteries with green pips, everything blue
    g.fillStyle = '#3a4566';
    g.beginPath(); g.ellipse(420, 410, 150, 58, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#9fb6e0'; g.beginPath(); g.arc(417, 352, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#23262e'; g.fillRect(640, 380, 90, 44);
    g.fillStyle = PAL.trace; g.fillRect(648, 388, 10, 28); g.fillRect(664, 388, 10, 28);
    g.fillStyle = '#56607a'; g.fillRect(680, 388, 10, 28); g.fillRect(696, 388, 10, 28);
    g.fillStyle = '#cfd6e2'; g.font = '13px monospace';
    g.fillText('BATTERY 52%', 640, 444);
  },

  art_dawn: (g) => {
    sky(g, PAL.black, '#101626', 300);
    stars(g, 100, 200);
    craterWall(g, 320, 190, '#2a3046');
    // sun catching the rim panels first
    const gl = g.createRadialGradient(780, 205, 4, 780, 205, 160);
    gl.addColorStop(0, 'rgba(255,240,210,1)'); gl.addColorStop(1, 'rgba(255,210,140,0)');
    g.fillStyle = gl; g.fillRect(610, 60, 340, 300);
    g.fillStyle = '#16243d';
    for (let i = 0; i < 4; i++) {
      g.save(); g.translate(700 + i * 52, 218); g.rotate(-0.18);
      g.fillRect(0, 0, 44, 16); g.restore();
    }
    g.fillStyle = 'rgba(255,236,180,0.85)';
    for (let i = 0; i < 4; i++) g.fillRect(702 + i * 52, 210, 44, 4); // glare on panel edges
    ground(g, 320, '#4a5068');
    g.fillStyle = '#7a7e88';
    g.beginPath(); g.ellipse(330, 430, 150, 58, 0, Math.PI, 0); g.fill();
    g.fillStyle = PAL.sodium; g.fillRect(446, 412, 12, 12);
  },

  art_tug: (g) => {
    sky(g, PAL.black, '#0d1220', 360);
    stars(g);
    ground(g, 360, '#6c707a');
    // the Lunar Tug lander on the flat, cargo lights
    g.fillStyle = '#3c4046';
    g.fillRect(420, 200, 130, 120); // body
    g.fillStyle = PAL.steel; g.fillRect(430, 180, 110, 24);
    g.strokeStyle = '#2a2d34'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(430, 320); g.lineTo(400, 392); g.stroke();
    g.beginPath(); g.moveTo(540, 320); g.lineTo(570, 392); g.stroke();
    g.fillStyle = '#10141c'; g.fillRect(440, 240, 90, 60); // open cargo bay
    g.fillStyle = PAL.sodium; g.fillRect(444, 244, 82, 8); // bay light
    g.fillStyle = '#e8e4d8'; g.font = 'bold 18px monospace';
    g.fillText('LUNAR TUG', 432, 172);
    // bottles being weighed, miners in a quiet line
    g.fillStyle = '#d8dde6';
    g.beginPath(); g.ellipse(360, 420, 12, 20, 0, 0, Math.PI * 2); g.fill();
    figure(g, 300, 450, 1.2, '#5d5d66');
    figure(g, 250, 455, 1.2, '#46627e');
    figure(g, 200, 452, 1.2, '#b46a32');
    earthDisc(g, 840, 80, 34);
  },

  art_cantina: (g) => {
    sky(g, PAL.black, '#0a0f1c', 330);
    stars(g, 140, 280);
    earthDisc(g, 130, 80, 30);
    ground(g, 330, '#3a4054');
    g.fillStyle = 'rgba(58,90,140,0.22)'; g.fillRect(0, 330, 960, 210);
    // a welded cluster of quonsets, one big warm window, cable line passing
    for (const [x, w, h] of [[330, 110, 56], [430, 150, 70], [570, 120, 60], [380, 90, 44]] as const) {
      g.fillStyle = '#565a64';
      g.beginPath(); g.arc(x + w / 2, 400, w / 2, Math.PI, 0); g.fill();
      void h;
    }
    g.fillStyle = 'rgba(255,196,110,0.95)';
    g.fillRect(452, 358, 96, 40); // the mirrored-glass window, lit from inside
    g.fillStyle = 'rgba(255,179,71,0.18)';
    g.beginPath(); g.ellipse(500, 392, 180, 70, 0, 0, Math.PI * 2); g.fill();
    // cableway pylons with bags riding
    g.strokeStyle = '#9aa3b2'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 250); g.quadraticCurveTo(480, 300, 960, 230); g.stroke();
    for (const x of [120, 320, 640, 840]) {
      g.strokeStyle = '#454a55'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(x, 400); g.lineTo(x, 256); g.stroke();
    }
    g.fillStyle = PAL.regolithDark;
    for (const x of [240, 480, 730]) { g.beginPath(); g.arc(x, 282, 12, 0, Math.PI * 2); g.fill(); }
    // sign glow
    g.fillStyle = PAL.sodium; g.font = 'bold 15px monospace';
    g.fillText("TAN'S CANTINA", 446, 346);
    figure(g, 700, 470, 1.2, '#5d5d66');
  },
};

export function makePanelArt(key: string): HTMLCanvasElement {
  const [cv, g] = makeCanvas(960, 540);
  g.fillStyle = PAL.black;
  g.fillRect(0, 0, 960, 540);
  const fn = ART[key];
  if (fn) fn(g);
  // film grain + vignette for cohesion
  for (let i = 0; i < 1200; i++) {
    g.fillStyle = `rgba(${hashNoise(41, i, 1) > 0.5 ? '255,255,255' : '0,0,0'},0.03)`;
    g.fillRect(hashNoise(41, i, 2) * 960, hashNoise(41, i, 3) * 540, 2, 2);
  }
  const v = g.createRadialGradient(480, 270, 200, 480, 270, 620);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = v;
  g.fillRect(0, 0, 960, 540);
  return cv;
}
