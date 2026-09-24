// Hand-drawn pixel art as character grids, rasterized once to small canvases.
// Props and enemies. The hero and the dog live in characters.ts.

type Pal = Record<string, string>;

export function makeSprite(rows: string[], pal: Pal): HTMLCanvasElement {
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = rows.length;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const col = pal[row[x] ?? '.'];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

const BUG: Pal = { R: '#e5484d', r: '#9e2a2f', W: '#ffffff', K: '#111111', A: '#4a1518', L: '#4a1518' };
const BUG_TOP = [
  '..A..........A..',
  '...A........A...',
  '....RRRRRRRR....',
  '...RRRRRRRRRR...',
  '..RRrRRRRRRrRR..',
  '..RWKRRRRRRWKR..',
  '..RRRRRRRRRRRR..',
  '..RRRRRrrRRRRR..',
  '...RRRRrrRRRR...',
  '....RRRRRRRR....',
];
const BUG_A = [...BUG_TOP, '...L..L..L..L...', '..L..L..L..L....'];
const BUG_B = [...BUG_TOP, '....L..L..L..L..', '.....L..L..L..L.'];
const BUG_FLAT = [
  '...RRRRRRRRRR...',
  '..RRWKRRRRWKRR..',
  '..RRRRRRRRRRRR..',
  '...L.L.L.L.L.L..',
];

const VIRUS: Pal = { C: '#d65a8a', c: '#9c3a62', v: '#ffb3cf' };
const VIRUS_ART = [
  '.....v......',
  '.v...v...v..',
  '..v.CCCC.v..',
  '...CCCCCC...',
  '..CCcCCCCC..',
  'vvCCCCCCcCvv',
  '..CCCCCCCC..',
  '..CCCcCCCC..',
  '...CCCCCC...',
  '..v.CCCC.v..',
  '.v...v...v..',
  '.....v......',
];

const STAR: Pal = { Y: '#f7b733', y: '#b77a0c' };
const STAR_ART = [
  '....Y....',
  '...YYY...',
  'YYYYYYYYY',
  '.YYYYYYY.',
  '..YYYYY..',
  '..YYYYY..',
  '.YYYyYYY.',
  '.YY...YY.',
  'Y.......Y',
];

const GEM: Pal = { T: '#37d6c0', t: '#c8fff6', d: '#1b8f80' };
const GEM_ART = [
  '...TTTT...',
  '..TtTTTT..',
  '.TtTTTTTT.',
  'TTTTTTTTTT',
  '.TTTTTTTd.',
  '..TTTTTd..',
  '...TTTd...',
  '....Td....',
];

const SIGN: Pal = { O: '#5b3a1e', o: '#c68a4e', L: '#8a5a30' };
const SIGN_ART = [
  'OOOOOOOOOOOOOO',
  'OooooooooooooO',
  'OoLLLLLLLLLLoO',
  'OooooooooooooO',
  'OoLLLLLLLooooO',
  'OooooooooooooO',
  'OOOOOOOOOOOOOO',
  '......OO......',
  '......OO......',
  '......OO......',
  '......OO......',
  '......OO......',
  '......OO......',
  '......OO......',
  '......OO......',
  '......OO......',
];

const FOX: Pal = { O: '#f08a2e', W: '#fff4e6', k: '#2a1a10' };
const FOX_ART = [
  '........O...O.',
  '........OO.OO.',
  '........OOOOO.',
  '.......OOkOOOO',
  '.......OWWWWk.',
  '..OO...OOWWW..',
  '.OOOO.OOOOO...',
  'OOWWOOOOOOO...',
  'OWWW.OOOOOO...',
  '.WW..OOWOOO...',
  '.....OOWOOO...',
  '.....kk.kk....',
];

export interface Sprites {
  bugA: HTMLCanvasElement;
  bugB: HTMLCanvasElement;
  bugFlat: HTMLCanvasElement;
  virus: HTMLCanvasElement;
  star: HTMLCanvasElement;
  gem: HTMLCanvasElement;
  sign: HTMLCanvasElement;
  fox: HTMLCanvasElement;
}

let cache: Sprites | null = null;

export function sprites(): Sprites {
  if (cache) return cache;
  cache = {
    bugA: makeSprite(BUG_A, BUG),
    bugB: makeSprite(BUG_B, BUG),
    bugFlat: makeSprite(BUG_FLAT, BUG),
    virus: makeSprite(VIRUS_ART, VIRUS),
    star: makeSprite(STAR_ART, STAR),
    gem: makeSprite(GEM_ART, GEM),
    sign: makeSprite(SIGN_ART, SIGN),
    fox: makeSprite(FOX_ART, FOX),
  };
  return cache;
}

/** Upscaled data URL of a sprite, for crisp HUD icons in the DOM. */
export function iconURL(src: HTMLCanvasElement, scale = 4): string {
  const c = document.createElement('canvas');
  c.width = src.width * scale;
  c.height = src.height * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL();
}

// ---------- 3x5 pixel font for in-world labels ----------
const GLYPHS: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '##.'],
  '.': ['...', '...', '...', '...', '.#.'], '-': ['...', '...', '###', '...', '...'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'],
  ':': ['...', '.#.', '...', '.#.', '...'], '/': ['..#', '..#', '.#.', '#..', '#..'],
  '+': ['...', '.#.', '###', '.#.', '...'], '%': ['#.#', '..#', '.#.', '#..', '#.#'],
  '>': ['#..', '.#.', '..#', '.#.', '#..'], "'": ['.#.', '.#.', '...', '...', '...'],
  ',': ['...', '...', '...', '.#.', '#..'], '·': ['...', '...', '.#.', '...', '...'],
};

export function textWidth(text: string, scale = 1): number {
  return Math.max(0, text.length * 4 - 1) * scale;
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale = 1) {
  ctx.fillStyle = color;
  let cx = Math.round(x);
  const cy = Math.round(y);
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch];
    if (g) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) if (g[r][c] === '#') ctx.fillRect(cx + c * scale, cy + r * scale, scale, scale);
      }
    }
    cx += 4 * scale;
  }
}
