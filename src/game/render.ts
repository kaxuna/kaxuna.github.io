// Draws the world: themed parallax backdrops per stage, tiles, props, sprites, weather.
import type { World } from './engine';
import { T, TILE, ROWS, GROUND_Y } from './level';
import type { ThemeId } from './content';
import { sprites, drawText, textWidth } from './sprites';

export const VIEW_H = ROWS * TILE; // 240

// ---------------- palettes ----------------

interface GroundPal { top: string; hi: string; dirt: string; dark: string; light: string }
interface ThemeDef {
  sky: [string, string];
  ground: GroundPal;
  brick: [string, string, string]; // base, dark, mortar
  stone: [string, string, string]; // base, light, dark
  plank: [string, string];
  weather: 'snow' | 'rain' | 'bubbles' | null;
  minimap: string;
}

const THEMES: Record<ThemeId, ThemeDef> = {
  school: {
    sky: ['#6ec6f2', '#c4ecff'], ground: { top: '#5cc85c', hi: '#a3eca3', dirt: '#b8773d', dark: '#8a5528', light: '#d49a5c' },
    brick: ['#c8643c', '#8e3f22', '#5a2a18'], stone: ['#b98a5a', '#dcb488', '#7a5530'], plank: ['#c68a4e', '#6b4423'], weather: null, minimap: '#5cc85c',
  },
  lund: {
    sky: ['#9fb8cf', '#e3edf5'], ground: { top: '#f4f8ff', hi: '#ffffff', dirt: '#7d6a58', dark: '#5e4e40', light: '#9a8672' },
    brick: ['#a0785a', '#6e5038', '#4a3424'], stone: ['#9aa6b2', '#c9d2db', '#66717d'], plank: ['#b0875e', '#5e4430'], weather: 'snow', minimap: '#dfe9f2',
  },
  covid: {
    sky: ['#6b7280', '#a6abb4'], ground: { top: '#7f8791', hi: '#a3aab3', dirt: '#5b6068', dark: '#464a51', light: '#737982' },
    brick: ['#7a6e6e', '#554b4b', '#3b3434'], stone: ['#8a8f99', '#adb2ba', '#61666f'], plank: ['#8c8478', '#4e4940'], weather: 'rain', minimap: '#8a8f99',
  },
  tbilisi: {
    sky: ['#ef9a55', '#ffd9a0'], ground: { top: '#d49b52', hi: '#f0c07a', dirt: '#a8653a', dark: '#7e4a2a', light: '#c6844f' },
    brick: ['#c0703f', '#86472a', '#5a2d1a'], stone: ['#c9a27a', '#e6c7a2', '#8f6c49'], plank: ['#b87b45', '#5e3a1e'], weather: null, minimap: '#ef9a55',
  },
  azry: {
    sky: ['#7fc7e6', '#d4f0fb'], ground: { top: '#4a4d55', hi: '#f5c542', dirt: '#2f3238', dark: '#24262b', light: '#3e4149' },
    brick: ['#b0513e', '#7a3326', '#4a1f17'], stone: ['#8d949e', '#b5bcc5', '#5f656e'], plank: ['#d9dde2', '#6f7680'], weather: null, minimap: '#e8483c',
  },
  bank: {
    sky: ['#7fb6e8', '#d2e8fa'], ground: { top: '#b9c2cc', hi: '#e2e8ee', dirt: '#8d97a3', dark: '#6f7883', light: '#a7b0ba' },
    brick: ['#c46a3e', '#8a4526', '#5a2c18'], stone: ['#a3adb8', '#d0d7df', '#6f7883'], plank: ['#e07b39', '#7a3c14'], weather: null, minimap: '#ff7a2f',
  },
  trading: {
    sky: ['#0d1322', '#1c2644'], ground: { top: '#34405e', hi: '#4f8cff', dirt: '#1b2438', dark: '#141b2b', light: '#26314a' },
    brick: ['#3b4a6b', '#26314a', '#141b2b'], stone: ['#3b4a6b', '#56688f', '#222c44'], plank: ['#4f8cff', '#1f3a7a'], weather: null, minimap: '#2ecc71',
  },
  warsaw: {
    sky: ['#8ec5f5', '#dcedfd'], ground: { top: '#62bd6c', hi: '#a6e6ac', dirt: '#8f6a4a', dark: '#6b4c33', light: '#ad8764' },
    brick: ['#c26446', '#88402a', '#592818'], stone: ['#b9b3a6', '#dcd7cc', '#827c70'], plank: ['#37d6c0', '#127a6c'], weather: null, minimap: '#4f8cff',
  },
  night: {
    sky: ['#0b1130', '#28336e'], ground: { top: '#2f6b4f', hi: '#4f9a75', dirt: '#3a2a24', dark: '#2a1e1a', light: '#4c3830' },
    brick: ['#7a4a3a', '#4e2e24', '#2f1b15'], stone: ['#4a5478', '#6a76a0', '#2f3654'], plank: ['#f08a2e', '#7a3f10'], weather: 'bubbles', minimap: '#f08a2e',
  },
  finale: {
    sky: ['#7cc3f0', '#ffd08a'], ground: { top: '#5cc85c', hi: '#a3eca3', dirt: '#b8773d', dark: '#8a5528', light: '#d49a5c' },
    brick: ['#c8643c', '#8e3f22', '#5a2a18'], stone: ['#b98a5a', '#dcb488', '#7a5530'], plank: ['#c68a4e', '#6b4423'], weather: null, minimap: '#f7b733',
  },
};

export const themeColor = (t: ThemeId) => THEMES[t].minimap;

// ---------------- small helpers ----------------

function hash(n: number): number {
  n = (n ^ 61) ^ (n >>> 16);
  n = n + (n << 3);
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}

function rgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function mix(a: string, b: string, t: number): string {
  const A = rgb(a), B = rgb(b);
  const c = A.map((x, i) => Math.round(x + (B[i] - x) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function tile(draw: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = TILE;
  cv.height = TILE;
  draw(cv.getContext('2d')!);
  return cv;
}

// ---------------- tiles ----------------

interface TileSet {
  groundTop: HTMLCanvasElement;
  ground: HTMLCanvasElement;
  brick: HTMLCanvasElement;
  stone: HTMLCanvasElement;
  plat: HTMLCanvasElement;
}

const tileCache = new Map<ThemeId, TileSet>();

function dirt(c: CanvasRenderingContext2D, g: GroundPal, from: number) {
  c.fillStyle = g.dirt;
  c.fillRect(0, from, 16, 16 - from);
  for (let y = from; y < 16; y++) {
    for (let x = 0; x < 16; x += 2) {
      const h = hash(x * 31 + y * 17 + 7);
      if (h < 0.1) { c.fillStyle = g.dark; c.fillRect(x, y, 2, 1); }
      else if (h > 0.93) { c.fillStyle = g.light; c.fillRect(x, y, 2, 1); }
    }
  }
}

function tileset(theme: ThemeId): TileSet {
  const hit = tileCache.get(theme);
  if (hit) return hit;
  const th = THEMES[theme];
  const g = th.ground;
  const ts: TileSet = {
    groundTop: tile((c) => {
      dirt(c, g, 4);
      c.fillStyle = g.top;
      c.fillRect(0, 0, 16, 4);
      if (theme === 'azry') {
        c.fillStyle = g.hi;
        c.fillRect(2, 1, 6, 1); // road stripe
      } else {
        c.fillStyle = g.hi;
        c.fillRect(0, 0, 16, 1);
      }
      c.fillStyle = g.top;
      for (let x = 0; x < 16; x += 3) if (hash(x * 13 + 5) > 0.45) c.fillRect(x, 4, 2, 1 + Math.floor(hash(x + 91) * 2));
      c.fillStyle = g.dark;
      c.fillRect(0, 15, 16, 1);
    }),
    ground: tile((c) => dirt(c, g, 0)),
    brick: tile((c) => {
      const [base, dark, mortar] = th.brick;
      c.fillStyle = base;
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = mortar;
      c.fillRect(0, 0, 16, 1);
      c.fillRect(0, 8, 16, 1);
      c.fillRect(7, 1, 1, 7);
      c.fillRect(15, 1, 1, 7);
      c.fillRect(3, 9, 1, 7);
      c.fillRect(11, 9, 1, 7);
      c.fillStyle = dark;
      c.fillRect(0, 7, 16, 1);
      c.fillRect(0, 15, 16, 1);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect(0, 1, 7, 1);
      c.fillRect(8, 1, 7, 1);
      c.fillRect(4, 9, 7, 1);
    }),
    stone: tile((c) => {
      const [base, light, dark] = th.stone;
      c.fillStyle = base;
      c.fillRect(0, 0, 16, 16);
      c.fillStyle = light;
      c.fillRect(0, 0, 16, 1);
      c.fillRect(0, 0, 1, 16);
      c.fillStyle = dark;
      c.fillRect(0, 15, 16, 1);
      c.fillRect(15, 0, 1, 16);
      c.fillRect(3, 3, 1, 1);
      c.fillRect(12, 3, 1, 1);
      c.fillRect(3, 12, 1, 1);
      c.fillRect(12, 12, 1, 1);
    }),
    plat: tile((c) => {
      const [wood, edge] = th.plank;
      c.fillStyle = wood;
      c.fillRect(0, 0, 16, 5);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(0, 0, 16, 1);
      c.fillStyle = edge;
      c.fillRect(0, 5, 16, 1);
      c.fillRect(7, 1, 1, 4);
      c.fillRect(2, 6, 2, 2);
      c.fillRect(12, 6, 2, 2);
    }),
  };
  tileCache.set(theme, ts);
  return ts;
}

const BLOCK_LINE = '#7a4a0a';
const PIPE = { line: '#0b3d38', body: '#2dbfa9', light: '#8ff5e4', dark: '#157f70' };
function drawBlock(c: CanvasRenderingContext2D, glyph: string, shine: number) {
  c.fillStyle = BLOCK_LINE;
  c.fillRect(0, 0, 16, 16);
  c.fillStyle = '#f7b733';
  c.fillRect(1, 1, 14, 14);
  c.fillStyle = '#ffd875';
  c.fillRect(1, 1, 14, 1);
  c.fillRect(1, 1, 1, 14);
  c.fillStyle = '#c98a17';
  c.fillRect(1, 14, 14, 1);
  c.fillRect(14, 1, 1, 14);
  c.fillStyle = BLOCK_LINE;
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) c.fillRect(x, y, 1, 1);
  // "{ }" glyph
  c.fillStyle = glyph;
  const brace = ['.##', '.#.', '.#.', '#..', '.#.', '.#.', '.##'];
  brace.forEach((row, r) => {
    for (let i = 0; i < 3; i++) {
      if (row[i] === '#') { c.fillRect(4 + i, 4 + r, 1, 1); c.fillRect(11 - i, 4 + r, 1, 1); }
    }
  });
  if (shine >= 0) {
    c.fillStyle = '#fff4c9';
    c.fillRect(shine, 2, 1, 2);
  }
}

const SHARED = {
  block: [
    tile((c) => drawBlock(c, BLOCK_LINE, -1)),
    tile((c) => drawBlock(c, '#a8680f', 3)),
    tile((c) => drawBlock(c, BLOCK_LINE, 12)),
  ],
  used: tile((c) => {
    c.fillStyle = '#4a3624';
    c.fillRect(0, 0, 16, 16);
    c.fillStyle = '#9a7b56';
    c.fillRect(1, 1, 14, 14);
    c.fillStyle = '#b89872';
    c.fillRect(1, 1, 14, 1);
    c.fillStyle = '#4a3624';
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) c.fillRect(x, y, 1, 1);
  }),
  pipeTL: tile((c) => pipeTop(c, true)),
  pipeTR: tile((c) => pipeTop(c, false)),
  pipeL: tile((c) => pipeBody(c, true)),
  pipeR: tile((c) => pipeBody(c, false)),
  candleG: tile((c) => candle(c, '#2ecc71', '#8ff0b6', '#0e5a31')),
  candleR: tile((c) => candle(c, '#e5484d', '#ff9ea1', '#6e1a1d')),
};

function pipeTop(c: CanvasRenderingContext2D, left: boolean) {
  c.fillStyle = PIPE.line;
  c.fillRect(0, 0, 16, 8);
  c.fillStyle = PIPE.body;
  if (left) c.fillRect(1, 1, 15, 6); else c.fillRect(0, 1, 15, 6);
  c.fillStyle = PIPE.light;
  if (left) c.fillRect(3, 1, 2, 6);
  c.fillStyle = PIPE.dark;
  if (!left) c.fillRect(11, 1, 3, 6);
  pipeBody(c, left, 8);
}
function pipeBody(c: CanvasRenderingContext2D, left: boolean, from = 0) {
  const h = 16 - from;
  c.fillStyle = PIPE.line;
  if (left) c.fillRect(2, from, 14, h); else c.fillRect(0, from, 14, h);
  c.fillStyle = PIPE.body;
  if (left) c.fillRect(3, from, 13, h); else c.fillRect(0, from, 13, h);
  c.fillStyle = PIPE.light;
  if (left) c.fillRect(5, from, 2, h);
  c.fillStyle = PIPE.dark;
  if (!left) c.fillRect(9, from, 3, h);
}
function candle(c: CanvasRenderingContext2D, body: string, light: string, line: string) {
  c.fillStyle = line;
  c.fillRect(2, 0, 12, 16);
  c.fillStyle = body;
  c.fillRect(3, 0, 10, 16);
  c.fillStyle = light;
  c.fillRect(4, 0, 1, 16);
}

// ---------------- backdrops ----------------

// Each stage paints its own backdrop, masked to the part of the screen where that stage is.
// Layer coords: screen x = lx - cam. [a, b] is the range the layer ever needs while the stage is visible.
interface Layer {
  c: CanvasRenderingContext2D;
  a: number;
  b: number;
  cam: number;
  vw: number;
  seed: number;
  t: number;
  zw: number; // stage width in px
  f: number; // parallax factor
  K: number; // layer offset so the whole stage span is covered
}

function makeLayer(c: CanvasRenderingContext2D, zw: number, local: number, f: number, vw: number, seed: number, t: number): Layer {
  const K = zw * (1 - f);
  return { c, a: 0, b: zw * (2 - f) + vw, cam: local * f + K, vw, seed, t, zw, f, K };
}

const FAR = 0.3;
const NEAR = 0.6;

function span(L: Layer, step: number): [number, number] {
  const from = Math.max(L.a, Math.floor(L.cam / step) * step);
  const to = Math.min(L.b, L.cam + L.vw + step);
  return [from, to];
}
const onScreen = (L: Layer, lx: number, w: number) => lx + w > L.cam && lx < L.cam + L.vw;

function hillTop(L: Layer, lx: number, baseY: number, amp: number, freq: number): number {
  const h = amp * (0.55 + 0.3 * Math.sin(lx * freq + L.seed) + 0.15 * Math.sin(lx * freq * 2.3 + L.seed * 1.7));
  return Math.round(baseY - h);
}

function hills(L: Layer, baseY: number, amp: number, freq: number, color: string, step = 2) {
  const [from, to] = span(L, step);
  L.c.fillStyle = color;
  for (let lx = from; lx < to; lx += step) {
    const y = hillTop(L, lx, baseY, amp, freq);
    L.c.fillRect(Math.round(lx - L.cam), y, step, VIEW_H - y);
  }
}

interface Box { x: number; w: number; h: number; k: number }
const layoutCache = new Map<string, Box[]>();
function boxes(name: string, a: number, b: number, minW: number, maxW: number, minH: number, maxH: number, gap: number): Box[] {
  const key = `${name}:${Math.round(a)}:${Math.round(b)}`;
  const hit = layoutCache.get(key);
  if (hit) return hit;
  const out: Box[] = [];
  let x = a + 4;
  let i = 0;
  while (x < b - minW) {
    const r = hash(i * 97 + name.length * 13);
    const w = Math.round(minW + r * (maxW - minW));
    const h = Math.round(minH + hash(i * 53 + 11 + name.length) * (maxH - minH));
    if (x + w > b) break;
    out.push({ x, w, h, k: i });
    x += w + Math.round(gap * hash(i * 7 + 3));
    i++;
  }
  layoutCache.set(key, out);
  return out;
}

function skyline(L: Layer, key: string, baseY: number, body: string, win: string | null, minW: number, maxW: number, minH: number, maxH: number, gap: number, lit = 0.55) {
  const c = L.c;
  for (const bx of boxes(key, L.a, L.b, minW, maxW, minH, maxH, gap)) {
    if (!onScreen(L, bx.x, bx.w)) continue;
    const sx = Math.round(bx.x - L.cam);
    c.fillStyle = body;
    c.fillRect(sx, baseY - bx.h, bx.w, VIEW_H);
    if (!win) continue;
    for (let wy = baseY - bx.h + 4; wy < baseY - 4; wy += 6) {
      for (let wx = 3; wx < bx.w - 3; wx += 5) {
        if (hash(bx.k * 131 + wx * 7 + wy) > lit) continue;
        c.fillStyle = win;
        c.fillRect(sx + wx, wy, 2, 3);
      }
    }
  }
}

function pines(L: Layer, key: string, baseY: number, color: string, snow: string | null, scale: number) {
  const c = L.c;
  for (const bx of boxes(key, L.a, L.b, 10 * scale, 16 * scale, 20 * scale, 34 * scale, 4)) {
    if (!onScreen(L, bx.x, bx.w)) continue;
    const sx = Math.round(bx.x - L.cam);
    const cx = sx + Math.floor(bx.w / 2);
    for (let y = 0; y < bx.h; y += 2) {
      const half = Math.max(1, Math.round(((y % 12) / 12 + y / bx.h) * bx.w * 0.35));
      c.fillStyle = color;
      c.fillRect(cx - half, baseY - bx.h + y, half * 2, 2);
      if (snow && y % 12 === 0) { c.fillStyle = snow; c.fillRect(cx - half, baseY - bx.h + y, half * 2, 1); }
    }
    c.fillStyle = '#4a3a2c';
    c.fillRect(cx - 1, baseY, 2, 4);
  }
}

function trees(L: Layer, key: string, baseY: number, leaf: string, leafDark: string) {
  const c = L.c;
  for (const bx of boxes(key, L.a, L.b, 14, 24, 16, 28, 40)) {
    if (!onScreen(L, bx.x, bx.w)) continue;
    const sx = Math.round(bx.x - L.cam);
    c.fillStyle = '#5b3a1e';
    c.fillRect(sx + Math.floor(bx.w / 2) - 1, baseY - 8, 3, 8);
    c.fillStyle = leafDark;
    c.fillRect(sx, baseY - bx.h + 4, bx.w, bx.h - 10);
    c.fillStyle = leaf;
    c.fillRect(sx + 2, baseY - bx.h, bx.w - 4, bx.h - 10);
    c.fillRect(sx + 1, baseY - bx.h + 3, bx.w - 2, bx.h - 14);
  }
}

/** Layer x of a landmark that sits mid-screen when the camera is `p` of the way through the stage. */
function atL(L: Layer, p: number) { return L.K + (p * L.zw - L.vw / 2) * L.f + L.vw / 2; }
function at(L: Layer, p: number) { return Math.round(atL(L, p) - L.cam); }

function schoolhouse(L: Layer, frac: number, baseY: number) {
  const x = at(L, frac);
  if (x > L.vw + 10 || x < -80) return;
  const c = L.c;
  c.fillStyle = '#a5503a';
  c.fillRect(x, baseY - 42, 70, 42);
  c.fillStyle = '#6d2f22';
  c.fillRect(x - 4, baseY - 46, 78, 5);
  c.fillRect(x + 25, baseY - 62, 20, 16);
  c.fillStyle = '#f3ecd8';
  c.fillRect(x + 30, baseY - 58, 10, 10);
  c.fillStyle = '#2a2a2a';
  c.fillRect(x + 35, baseY - 56, 1, 4);
  c.fillRect(x + 35, baseY - 53, 3, 1);
  c.fillStyle = '#bfe3f5';
  for (let i = 0; i < 5; i++) { c.fillRect(x + 5 + i * 13, baseY - 36, 7, 9); c.fillRect(x + 5 + i * 13, baseY - 20, 7, 9); }
  c.fillStyle = '#4a2a1e';
  c.fillRect(x + 31, baseY - 14, 8, 14);
  drawText(c, 'SCHOOL', x + 23, baseY - 44 + 0, '#f3ecd8');
}

function cathedral(L: Layer, frac: number, baseY: number) {
  const x = at(L, frac);
  if (x > L.vw + 10 || x < -80) return;
  const c = L.c;
  const stone = '#b3a48a';
  const roof = '#5e6b62';
  c.fillStyle = stone;
  c.fillRect(x, baseY - 72, 16, 72);
  c.fillRect(x + 26, baseY - 72, 16, 72);
  c.fillRect(x + 14, baseY - 46, 14, 46);
  c.fillRect(x + 42, baseY - 34, 40, 34);
  c.fillStyle = roof;
  for (let i = 0; i < 9; i++) { c.fillRect(x + i, baseY - 72 - (9 - i) * 2 + 2, 16 - i * 2, 2); c.fillRect(x + 26 + i, baseY - 72 - (9 - i) * 2 + 2, 16 - i * 2, 2); }
  c.fillRect(x + 42, baseY - 40, 40, 6);
  c.fillStyle = '#6d6150';
  for (let i = 0; i < 4; i++) { c.fillRect(x + 5, baseY - 64 + i * 14, 5, 7); c.fillRect(x + 31, baseY - 64 + i * 14, 5, 7); }
  c.fillRect(x + 18, baseY - 20, 6, 20);
}

function tvTower(L: Layer, frac: number, baseY: number) {
  const x = at(L, frac);
  if (x > L.vw + 10 || x < -30) return;
  const c = L.c;
  for (let i = 0; i < 90; i += 2) {
    const w = Math.max(1, Math.round(10 - i / 10));
    c.fillStyle = Math.floor(i / 10) % 2 ? '#e8e2d8' : '#d6453b';
    c.fillRect(x + 6 - Math.floor(w / 2), baseY - i, w, 2);
  }
  c.fillStyle = '#d6453b';
  c.fillRect(x + 5, baseY - 104, 2, 14);
}

function oilTanks(L: Layer, baseY: number) {
  const c = L.c;
  for (const bx of boxes('tanks', L.a, L.b, 24, 40, 18, 32, 50)) {
    if (!onScreen(L, bx.x, bx.w)) continue;
    const sx = Math.round(bx.x - L.cam);
    c.fillStyle = '#c3c9d1';
    c.fillRect(sx, baseY - bx.h, bx.w, bx.h);
    c.fillRect(sx + 2, baseY - bx.h - 2, bx.w - 4, 2);
    c.fillStyle = '#9aa1ab';
    c.fillRect(sx, baseY - bx.h + 6, bx.w, 2);
    c.fillStyle = '#e8483c';
    c.fillRect(sx + 3, baseY - bx.h + 10, bx.w - 6, 3);
    if (bx.k % 3 === 0) {
      c.fillStyle = '#8d949e';
      c.fillRect(sx + bx.w + 4, baseY - bx.h - 26, 4, bx.h + 26);
      c.fillStyle = L.t % 0.4 < 0.2 ? '#ffb13b' : '#ff7b2f';
      c.fillRect(sx + bx.w + 4, baseY - bx.h - 31, 4, 4);
    }
  }
}

function fuelStation(L: Layer, frac: number, baseY: number) {
  const x = at(L, frac);
  if (x > L.vw + 10 || x < -100) return;
  const c = L.c;
  c.fillStyle = '#e8483c';
  c.fillRect(x, baseY - 46, 90, 7);
  c.fillStyle = '#f3ecd8';
  c.fillRect(x, baseY - 39, 90, 2);
  c.fillStyle = '#b8bec6';
  c.fillRect(x + 10, baseY - 37, 3, 37);
  c.fillRect(x + 77, baseY - 37, 3, 37);
  for (const px of [28, 56]) {
    c.fillStyle = '#f2f2f2';
    c.fillRect(x + px, baseY - 20, 9, 20);
    c.fillStyle = '#e8483c';
    c.fillRect(x + px, baseY - 20, 9, 4);
    c.fillStyle = '#2a2a2a';
    c.fillRect(x + px + 2, baseY - 13, 5, 3);
  }
  drawText(c, 'FUEL', x + 37, baseY - 45, '#f3ecd8');
}

function palace(L: Layer, frac: number, baseY: number) {
  const x = at(L, frac);
  if (x > L.vw + 10 || x < -80) return;
  const c = L.c;
  const s = '#cdbf9f';
  const d = '#a8987a';
  c.fillStyle = s;
  c.fillRect(x, baseY - 36, 70, 36);
  c.fillRect(x + 12, baseY - 58, 46, 22);
  c.fillRect(x + 22, baseY - 82, 26, 24);
  c.fillRect(x + 28, baseY - 100, 14, 18);
  c.fillRect(x + 32, baseY - 108, 6, 8);
  c.fillStyle = '#d8d0bd';
  c.fillRect(x + 34, baseY - 128, 2, 20);
  c.fillStyle = d;
  for (let wy = baseY - 32; wy < baseY - 4; wy += 6) for (let wx = x + 3; wx < x + 68; wx += 4) c.fillRect(wx, wy, 1, 3);
  for (let wy = baseY - 54; wy < baseY - 38; wy += 5) for (let wx = x + 15; wx < x + 56; wx += 4) c.fillRect(wx, wy, 1, 3);
  for (let wy = baseY - 78; wy < baseY - 60; wy += 5) for (let wx = x + 25; wx < x + 46; wx += 4) c.fillRect(wx, wy, 1, 3);
  c.fillStyle = '#e9e2d0';
  c.fillRect(x + 32, baseY - 96, 6, 6);
}

function bankFront(L: Layer, frac: number, baseY: number) {
  const x = at(L, frac);
  if (x > L.vw + 10 || x < -90) return;
  const c = L.c;
  c.fillStyle = '#28324a';
  c.fillRect(x, baseY - 60, 80, 60);
  c.fillStyle = '#ff7a2f';
  c.fillRect(x, baseY - 60, 80, 9);
  drawText(c, 'BANK OF GEORGIA', x + 11, baseY - 58, '#ffffff');
  c.fillStyle = '#8fc4ef';
  for (let wy = baseY - 46; wy < baseY - 12; wy += 9) for (let wx = x + 5; wx < x + 76; wx += 9) c.fillRect(wx, wy, 6, 6);
  c.fillStyle = '#1a2133';
  c.fillRect(x + 34, baseY - 12, 12, 12);
}

function houses(L: Layer, key: string, baseY: number, walls: string[], roof: string, win: string, lit: boolean) {
  const c = L.c;
  for (const bx of boxes(key, L.a, L.b, 22, 34, 22, 40, 10)) {
    if (!onScreen(L, bx.x, bx.w)) continue;
    const sx = Math.round(bx.x - L.cam);
    c.fillStyle = walls[bx.k % walls.length];
    c.fillRect(sx, baseY - bx.h, bx.w, bx.h);
    c.fillStyle = roof;
    c.fillRect(sx - 2, baseY - bx.h - 3, bx.w + 4, 3);
    for (let wy = baseY - bx.h + 5; wy < baseY - 8; wy += 10) {
      for (let wx = sx + 3; wx < sx + bx.w - 5; wx += 8) {
        const on = !lit || hash(bx.k * 41 + wx * 3 + wy) > 0.35;
        c.fillStyle = on ? win : '#1a2040';
        c.fillRect(wx, wy, 4, 5);
      }
      if (!lit) { c.fillStyle = '#6b4423'; c.fillRect(sx + 1, wy + 6, bx.w - 2, 2); } // wooden balconies
    }
  }
}

function candleChart(L: Layer, baseY: number) {
  const c = L.c;
  const [from, to] = span(L, 12);
  c.fillStyle = '#1c2744';
  for (let gx = Math.floor(from / 24) * 24; gx < to; gx += 24) c.fillRect(Math.round(gx - L.cam), 20, 1, baseY - 20);
  for (let gy = 30; gy < baseY; gy += 24) c.fillRect(0, gy, L.vw, 1);
  for (let lx = from; lx < to; lx += 12) {
    const i = Math.floor(lx / 12);
    const mid = baseY - 70 - Math.sin(i * 0.21 + L.seed) * 34 - Math.sin(i * 0.05) * 20;
    const up = hash(i * 17) > 0.45;
    const h = 6 + hash(i * 29) * 18;
    const sx = Math.round(lx - L.cam);
    c.fillStyle = up ? '#1f7a4c' : '#8a2e33';
    c.fillRect(sx + 4, Math.round(mid - h / 2 - 6), 1, Math.round(h + 12));
    c.fillRect(sx + 2, Math.round(mid - h / 2), 5, Math.round(h));
  }
}

function stars(L: Layer) {
  const c = L.c;
  const [from, to] = span(L, 6);
  for (let lx = from; lx < to; lx += 6) {
    const h = hash(Math.floor(lx) * 7 + 3);
    if (h > 0.35) continue;
    const y = Math.floor(hash(Math.floor(lx) * 13) * 130) + 6;
    const tw = Math.sin(L.t * 2 + lx) > 0.6;
    c.fillStyle = tw ? '#ffffff' : '#aab4e8';
    c.fillRect(Math.round(lx - L.cam), y, 1, 1);
  }
}

function moon(L: Layer, frac: number) {
  const x = at(L, frac);
  if (x > L.vw + 10 || x < -30) return;
  const c = L.c;
  c.fillStyle = '#f4f1d9';
  const rows = [6, 10, 12, 14, 14, 14, 14, 12, 10, 6];
  rows.forEach((w, i) => c.fillRect(x + 7 - w / 2, 22 + i * 2, w, 2));
  c.fillStyle = '#d9d4b4';
  c.fillRect(x + 3, 28, 3, 2);
  c.fillRect(x + 8, 34, 2, 2);
}

function drawBackdrop(ctx: CanvasRenderingContext2D, theme: ThemeId, Lf: Layer, Ln: Layer) {
  switch (theme) {
    case 'school':
      hills(Lf, 205, 55, 0.012, '#8fd0a8');
      hills(Ln, 214, 22, 0.03, '#6fbf85');
      schoolhouse(Ln, 0.3, 208);
      trees(Ln, 'school-trees', 208, '#4fae5f', '#3b8a4a');
      break;
    case 'lund':
      pines(Lf, 'lund-far', 200, '#a9bccb', null, 1);
      cathedral(Lf, 0.45, 200);
      pines(Ln, 'lund-near', 210, '#5d7f6f', '#ffffff', 1.4);
      break;
    case 'covid':
      skyline(Lf, 'covid-far', 205, '#7c828c', '#626873', 18, 34, 40, 90, 6, 0.5);
      skyline(Ln, 'covid-near', 212, '#5f656f', '#3f444c', 26, 44, 30, 60, 30, 0.6);
      {
        const x = at(Ln, 0.35);
        if (x > -40 && x < Ln.vw) {
          ctx.fillStyle = '#b8352f';
          ctx.fillRect(x, 150, 32, 11);
          drawText(ctx, 'CLOSED', x + 5, 153, '#ffffff');
        }
      }
      break;
    case 'tbilisi':
      hills(Lf, 190, 85, 0.009, '#9b7fa8');
      tvTower(Lf, 0.62, hillTop(Lf, atL(Lf, 0.62) + 6, 190, 85, 0.009) + 2);
      houses(Ln, 'tbilisi-houses', 210, ['#e9c07d', '#d9876a', '#86b3c4', '#c9a0d0', '#f0dcb0'], '#7a3f2a', '#5a7a99', false);
      bankFront(Ln, 0.08, 210);
      break;
    case 'azry':
      oilTanks(Lf, 205);
      fuelStation(Ln, 0.2, 212);
      fuelStation(Ln, 0.72, 212);
      break;
    case 'bank':
      skyline(Lf, 'bank-far', 205, '#9ec3e6', '#c9e0f5', 18, 30, 50, 110, 8, 0.7);
      bankFront(Ln, 0.1, 212);
      trees(Ln, 'bank-trees', 212, '#5bb56b', '#408f50');
      break;
    case 'trading':
      candleChart(Lf, 205);
      break;
    case 'warsaw':
      skyline(Lf, 'waw-far', 205, '#a9c6e3', '#d7e7f6', 16, 28, 50, 120, 10, 0.6);
      palace(Lf, 0.4, 205);
      trees(Ln, 'waw-trees', 212, '#4fae5f', '#3b8a4a');
      break;
    case 'night':
      stars(Lf);
      moon(Lf, 0.7);
      hills(Lf, 205, 40, 0.014, '#1b2550');
      houses(Ln, 'night-houses', 212, ['#23315a', '#2b3a6a', '#1f2a4e'], '#141c38', '#f5c542', true);
      break;
    case 'finale':
      hills(Lf, 205, 50, 0.011, '#a7d9b0');
      hills(Ln, 214, 20, 0.03, '#7cc68e');
      break;
  }
}

// ---------------- weather (screen space) ----------------

interface Flake { x: number; y: number; v: number; s: number }
const weather: Flake[] = [];

function drawWeather(ctx: CanvasRenderingContext2D, kind: ThemeDef['weather'], vw: number, dt: number, reduce: boolean) {
  if (!kind || reduce) { weather.length = 0; return; }
  const want = kind === 'bubbles' ? 14 : kind === 'rain' ? 60 : 50;
  while (weather.length < want) weather.push({ x: Math.random() * vw, y: Math.random() * VIEW_H, v: 0.6 + Math.random() * 0.8, s: Math.random() });
  weather.length = want;
  for (const f of weather) {
    if (kind === 'snow') {
      f.y += 22 * f.v * dt;
      f.x += Math.sin(f.y * 0.05 + f.s * 6) * 6 * dt;
      ctx.fillStyle = f.s > 0.7 ? '#ffffff' : '#e8f0f8';
      ctx.fillRect(Math.round(f.x), Math.round(f.y), f.s > 0.8 ? 2 : 1, f.s > 0.8 ? 2 : 1);
    } else if (kind === 'rain') {
      f.y += 220 * f.v * dt;
      f.x -= 30 * dt;
      ctx.fillStyle = 'rgba(200,210,225,0.55)';
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 4);
    } else {
      f.y -= 14 * f.v * dt;
      f.x += Math.sin(f.y * 0.04 + f.s * 6) * 8 * dt;
      const r = 2 + Math.round(f.s * 3);
      ctx.fillStyle = 'rgba(190,230,255,0.35)';
      ctx.fillRect(Math.round(f.x) - r, Math.round(f.y), r * 2, 1);
      ctx.fillRect(Math.round(f.x) - r, Math.round(f.y) + r * 2, r * 2, 1);
      ctx.fillRect(Math.round(f.x) - r - 1, Math.round(f.y) + 1, 1, r * 2 - 1);
      ctx.fillRect(Math.round(f.x) + r, Math.round(f.y) + 1, 1, r * 2 - 1);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(Math.round(f.x) - r + 1, Math.round(f.y) + 1, 1, 1);
    }
    if (f.y > VIEW_H + 4) { f.y = -4; f.x = Math.random() * vw; }
    if (f.y < -12) { f.y = VIEW_H + 4; f.x = Math.random() * vw; }
    if (f.x < -4) f.x += vw + 8;
    if (f.x > vw + 4) f.x -= vw + 8;
  }
}

// ---------------- main render ----------------

let lastT = 0;
const bgCanvas = document.createElement('canvas');
const bgCtx = bgCanvas.getContext('2d')!;

export function render(ctx: CanvasRenderingContext2D, w: World, reduceMotion: boolean) {
  const vw = w.viewW;
  const camX = Math.round(w.camX);
  const L = w.level;
  const dt = Math.min(0.05, Math.max(0, w.t - lastT));
  lastT = w.t;
  const sp = sprites();
  ctx.imageSmoothingEnabled = false;

  // Sky: blend between neighbouring stages near a boundary.
  const cx = camX + vw / 2;
  const zi = L.zoneAtPx(cx);
  const z = L.zones[zi];
  const sky = THEMES[z.theme].sky;
  const blendW = 120;
  let other: [string, string] | null = null;
  let mixT = 0;
  if (cx - z.x0 < blendW && zi > 0) { other = THEMES[L.zones[zi - 1].theme].sky; mixT = 0.5 - (cx - z.x0) / (blendW * 2); }
  else if (z.x1 - cx < blendW && zi < L.zones.length - 1) { other = THEMES[L.zones[zi + 1].theme].sky; mixT = 0.5 - (z.x1 - cx) / (blendW * 2); }
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    const f = i / (bands - 1);
    let col = mix(sky[0], sky[1], f);
    if (other) {
      const oc = mix(other[0], other[1], f);
      const A = col.match(/\d+/g)!.map(Number);
      const B = oc.match(/\d+/g)!.map(Number);
      col = `rgb(${A.map((a, j) => Math.round(a + (B[j] - a) * mixT)).join(',')})`;
    }
    ctx.fillStyle = col;
    ctx.fillRect(0, Math.floor((i * VIEW_H) / bands), vw, Math.ceil(VIEW_H / bands) + 1);
  }

  // Parallax backdrops: each stage draws into an offscreen layer, masked to its own screen span
  // with a short crossfade at the seams, so the next stage's scenery never leaks in early.
  const FADE = 24;
  if (bgCanvas.width !== vw) { bgCanvas.width = vw; bgCanvas.height = VIEW_H; }
  for (const zone of L.zones) {
    const sx0 = zone.x0 - camX;
    const sx1 = zone.x1 - camX;
    if (sx1 + FADE <= 0 || sx0 - FADE >= vw) continue;
    const zw = zone.x1 - zone.x0;
    const local = camX - zone.x0;
    bgCtx.globalCompositeOperation = 'source-over';
    bgCtx.clearRect(0, 0, vw, VIEW_H);
    bgCtx.imageSmoothingEnabled = false;
    const Lf = makeLayer(bgCtx, zw, local, FAR, vw, zone.index * 1.7, w.t);
    const Ln = makeLayer(bgCtx, zw, local, NEAR, vw, zone.index * 2.3, w.t);
    drawBackdrop(bgCtx, zone.theme, Lf, Ln);
    const g0 = sx0 - FADE;
    const g1 = sx1 + FADE;
    const span = g1 - g0;
    const grad = bgCtx.createLinearGradient(g0, 0, g1, 0);
    const edge = Math.min(0.5, (2 * FADE) / span);
    grad.addColorStop(0, zone.index === 0 ? '#000' : 'rgba(0,0,0,0)');
    grad.addColorStop(edge, '#000');
    grad.addColorStop(1 - edge, '#000');
    grad.addColorStop(1, zone.index === L.zones.length - 1 ? '#000' : 'rgba(0,0,0,0)');
    bgCtx.globalCompositeOperation = 'destination-in';
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, vw, VIEW_H);
    bgCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(bgCanvas, 0, 0);
  }

  // Finale building, drawn in world space behind the tiles.
  if (L.door) {
    const d = L.door;
    const bx = d.x - 56 - camX;
    if (bx < vw && bx + 144 > 0) {
      ctx.fillStyle = '#2b3566';
      ctx.fillRect(bx, GROUND_Y - 120, 144, 120);
      ctx.fillStyle = '#394487';
      ctx.fillRect(bx + 8, GROUND_Y - 132, 128, 12);
      for (let i = 0; i < 6; i++) ctx.fillRect(bx + 8 + i * 24, GROUND_Y - 138, 12, 6);
      ctx.fillStyle = '#f7b733';
      for (let wy = GROUND_Y - 108; wy < GROUND_Y - 44; wy += 16) for (let wx = bx + 12; wx < bx + 136; wx += 20) if (wx < bx + 52 || wx > bx + 88) ctx.fillRect(wx, wy, 8, 9);
      ctx.fillStyle = '#10152e';
      ctx.fillRect(bx + 40, GROUND_Y - 76, 64, 13);
      drawText(ctx, 'NEXT STAGE', bx + 53, GROUND_Y - 72, '#f7b733');
      const dx = d.x - camX;
      ctx.fillStyle = '#f7b733';
      ctx.fillRect(dx - 2, d.y - 2, d.w + 4, d.h + 2);
      ctx.fillStyle = '#10152e';
      ctx.fillRect(dx, d.y, d.w, d.h);
      ctx.fillStyle = '#f7b733';
      ctx.fillRect(dx + d.w - 7, d.y + 16, 2, 2);
      const pulse = Math.floor(w.t * 3) % 2 === 0;
      drawText(ctx, pulse ? '>' : ' ', dx - 8, d.y + 13, '#ffffff');
      // Flag on the roof.
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(bx + 71, GROUND_Y - 162, 2, 24);
      ctx.fillStyle = '#37d6c0';
      ctx.fillRect(bx + 73, GROUND_Y - 162 + (Math.floor(w.t * 4) % 2), 14, 8);
    }
  }

  // Tiles.
  const c0 = Math.max(0, Math.floor(camX / TILE));
  const c1 = Math.min(L.W - 1, Math.floor((camX + vw) / TILE));
  const blockFrame = [0, 0, 0, 1, 2, 0][Math.abs(Math.floor(w.t * 6)) % 6];
  for (let tx = c0; tx <= c1; tx++) {
    const ts = tileset(L.zones[L.colZone[tx]].theme);
    for (let ty = 0; ty < ROWS; ty++) {
      const idx = ty * L.W + tx;
      const t = L.tiles[idx];
      if (t === T.EMPTY) continue;
      let img: HTMLCanvasElement;
      switch (t) {
        case T.GROUND: img = L.get(tx, ty - 1) === T.GROUND ? ts.ground : ts.groundTop; break;
        case T.BRICK: img = ts.brick; break;
        case T.BLOCK: img = SHARED.block[blockFrame]; break;
        case T.USED: img = SHARED.used; break;
        case T.PLAT: img = ts.plat; break;
        case T.PIPE_L: img = SHARED.pipeL; break;
        case T.PIPE_R: img = SHARED.pipeR; break;
        case T.PIPE_TL: img = SHARED.pipeTL; break;
        case T.PIPE_TR: img = SHARED.pipeTR; break;
        case T.CANDLE_G: img = SHARED.candleG; break;
        case T.CANDLE_R: img = SHARED.candleR; break;
        default: img = ts.stone;
      }
      const bump = w.bumps.get(idx);
      const dy = bump ? -Math.round(Math.sin((1 - bump / 0.18) * Math.PI) * 5) : 0;
      ctx.drawImage(img, tx * TILE - camX, ty * TILE + dy);
    }
  }

  // Candle wicks.
  for (const wk of L.wicks) {
    const sx = wk.x - camX;
    if (sx < -4 || sx > vw + 4) continue;
    ctx.fillStyle = wk.up ? '#2ecc71' : '#e5484d';
    ctx.fillRect(sx, wk.y - 7, 2, 7);
  }

  // Pipe labels.
  for (const lb of L.labels) {
    const tw = textWidth(lb.text);
    const sx = Math.round(lb.x - camX - tw / 2);
    if (sx > vw || sx + tw < 0) continue;
    ctx.fillStyle = '#0b3d38';
    ctx.fillRect(sx - 2, lb.y - 2, tw + 4, 9);
    drawText(ctx, lb.text, sx, lb.y, '#c8fff6');
  }

  // Signs.
  for (const s of L.signs) {
    const sx = s.x - camX;
    if (sx < -16 || sx > vw) continue;
    ctx.drawImage(sp.sign, sx, s.y);
    if (w.activeSign === s) {
      ctx.fillStyle = '#f7b733';
      ctx.fillRect(sx + 6, s.y - 6 + (Math.floor(w.t * 4) % 2), 2, 2);
    }
  }

  // Stage flags.
  for (const f of L.flags) {
    const sx = f.x + 7 - camX;
    if (sx < -20 || sx > vw + 4) continue;
    const topY = 4 * TILE;
    ctx.fillStyle = '#5a5f6a';
    ctx.fillRect(sx - 2, GROUND_Y - 4, 6, 4);
    ctx.fillStyle = '#e8ecf2';
    ctx.fillRect(sx, topY, 2, GROUND_Y - topY - 4);
    ctx.fillStyle = '#f7b733';
    ctx.fillRect(sx - 1, topY - 3, 4, 4);
    const low = GROUND_Y - 26;
    const fy = Math.round(low - (low - topY - 2) * f.raised);
    ctx.fillStyle = f.up ? '#37d6c0' : '#9aa6c4';
    ctx.fillRect(sx + 2, fy, 14, 10);
    ctx.fillRect(sx + 16, fy + 2, 2, 6);
    drawText(ctx, String(f.stage + 1), sx + 6, fy + 3, '#0b1020');
  }

  // FixFox mascot.
  for (const fx of L.foxes) {
    const sx = fx.x - camX;
    if (sx < -16 || sx > vw) continue;
    ctx.drawImage(sp.fox, sx, fx.y + (Math.floor(w.t * 2) % 2));
  }

  // Skill gems.
  for (const g of w.gems) {
    if (g.taken) continue;
    const sx = g.x - camX;
    if (sx < -12 || sx > vw) continue;
    const gy = g.y + Math.sin(w.t * 3 + g.x * 0.05) * 2;
    ctx.drawImage(sp.gem, sx, Math.round(gy));
  }

  // Enemies.
  for (const e of w.enemies) {
    if (!e.alive && e.dead <= 0) continue;
    const sx = Math.round(e.x - camX);
    if (sx < -20 || sx > vw + 4) continue;
    if (e.kind === 'bug') {
      if (!e.alive && e.flat) { ctx.drawImage(sp.bugFlat, sx - 1, Math.round(e.y + e.h - 4)); continue; }
      const img = Math.floor(w.t * 6) % 2 ? sp.bugA : sp.bugB;
      if (!e.alive) {
        ctx.save();
        ctx.translate(sx - 1, Math.round(e.y) + 12);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      } else {
        ctx.drawImage(img, sx - 1, Math.round(e.y) - 2);
      }
    } else {
      if (!e.alive) {
        ctx.globalAlpha = Math.max(0, e.dead / 1.2);
        ctx.drawImage(sp.virus, sx - 1, Math.round(e.y) - 1);
        ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(sp.virus, sx - 1, Math.round(e.y) - 1);
      }
    }
  }

  // Dog, then player.
  const dog = w.dog;
  const dimg = dog.moving && Math.floor(dog.anim * 9) % 2 ? sp.dogB : sp.dogA;
  drawFlipped(ctx, dimg, Math.round(dog.x - camX), Math.round(dog.y - dimg.height), dog.facing < 0);

  const p = w.p;
  const blink = p.invuln > 0 && Math.floor(w.t * 20) % 2 === 0;
  if (!blink) {
    let img = sp.heroIdle;
    if (!p.onGround) img = sp.heroJump;
    else if (Math.abs(p.vx) > 5) img = Math.floor(p.anim / 9) % 2 ? sp.heroRunA : sp.heroRunB;
    drawFlipped(ctx, img, Math.round(p.x - 2 - camX), Math.round(p.y - 2), p.facing < 0);
  }

  // Particles.
  for (const q of w.particles) {
    const sx = Math.round(q.x - camX);
    const sy = Math.round(q.y);
    const a = Math.max(0, q.life / q.max);
    switch (q.kind) {
      case 'debris': {
        const th = tileset(L.zones[L.zoneAtPx(q.x)].theme);
        ctx.drawImage(th.brick, 0, 0, 6, 6, sx, sy, 6, 6);
        break;
      }
      case 'star':
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.drawImage(sp.star, sx, sy);
        ctx.globalAlpha = 1;
        break;
      case 'text': {
        const tw = textWidth(q.text ?? '');
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.fillStyle = 'rgba(11,16,32,0.75)';
        ctx.fillRect(sx - Math.round(tw / 2) - 2, sy - 2, tw + 4, 9);
        drawText(ctx, q.text ?? '', sx - Math.round(tw / 2), sy, q.color);
        ctx.globalAlpha = 1;
        break;
      }
      default:
        ctx.globalAlpha = a;
        ctx.fillStyle = q.color;
        ctx.fillRect(sx, sy, q.kind === 'dust' ? 2 : 1, q.kind === 'dust' ? 2 : 1);
        ctx.globalAlpha = 1;
    }
  }

  drawWeather(ctx, THEMES[z.theme].weather, vw, dt, reduceMotion);
}

function drawFlipped(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, flip: boolean) {
  if (!flip) { ctx.drawImage(img, x, y); return; }
  ctx.save();
  ctx.translate(x + img.width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
