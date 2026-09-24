// Hero and dog art. Heads and torsos are hand-drawn grids with 3-tone shading; the hero's arms,
// legs and beard are drawn per pose so the walk cycle swings and the beard can grow.
// Every frame gets an automatic 1px outline.
//
// The hero ages through the stages: a kid at school, clean-shaven in Lund, stubble and a mask in
// 2020, then the beard gets longer with every job.

type Pal = Record<string, string>;

const HERO: Pal = {
  H: '#d9ad6c', h: '#a87a3f', L: '#f2d39a', // hair
  S: '#f4c9a3', s: '#d9a07c', p: '#f7a9a0', // skin, shadow, blush
  r: '#8a5a2c', E: '#1d1410', W: '#ffffff', // brows, pupils/mouth, eye whites
  G: '#22b35e', g: '#16864a', l: '#4fd184', // t-shirt
  V: '#7a5cff', v: '#b7a6ff', // cube logo
  K: '#3a2a20', w: '#d8c9a8', // belt, buckle
  J: '#3a5a8a', j: '#26406a', // jeans
  R: '#d64545', q: '#9e2f2f', // backpack
};
const KID_HAIR: Pal = { ...HERO, H: '#ecc684', h: '#bf924f', L: '#fbe3b0' };
const BEARD = { base: '#c07435', dark: '#8f5226', light: '#dc9152', stubble: '#c89a78' };
const SHOE = '#2e2622';
const SOLE = '#ece6da';
const HERO_LINE = '#24160f';

// ----- adult: 24 wide, head rows 0-14, torso 15-23 -----
const ADULT_HEAD = [
  '.........hHHLLH.........',
  '.......hHHHLLLHHH.......',
  '......hHHHHHLLHHHH......',
  '......hHHHHHHHHHHHh.....',
  '......hhHHHHHHHHHHh.....',
  '......hhHSSSSSSSSSS.....',
  '......hhHSSrrSSSrrS.....',
  '......hhsSSWESSSWES.....',
  '......hhsSSSSSSSSSSS....',
  '......hhsSSSSSSSSSSs....',
  '......hsSSSSSSSSESSS....',
  '.......sSSSSSSSSSSSS....',
  '........sSSSSSSSSSSs....',
  '.........sSSSSSSSSs.....',
  '...........sSSSSSs......',
];
const ADULT_TORSO = [
  '........GGGGGGGGG.......',
  '.......lGGGGGGGGGg......',
  '.......lGGGGGGGGGg......',
  '.......lGGGGGVvGGg......',
  '.......lGGGGGVVGGg......',
  '.......GGGGGGGGGGg......',
  '.......gGGGGGGGGgg......',
  '.......KKKKKKKwKKK......',
  '.......jJJJJJJJJJj......',
];

// ----- kid: bigger head, shorts, backpack -----
const KID_HEAD = [
  '.........HHLLH..........',
  '.......hHHHLLHHH........',
  '......hHHHHHHHHHH.......',
  '......hHHHHHHHHHHh......',
  '......hhHHHHHHHHHh......',
  '......hhHSSSSSSSSS......',
  '......hhSSWESSSWES......',
  '......hhSSWESSSWESS.....',
  '......hhsSSSSSSSSSS.....',
  '.......hsSSpSSSEES......',
  '........sSSSSSSSSs......',
  '..........sSSSSs........',
];
const KID_TORSO = [
  '........lGGGGGGGg.......',
  '.......lGGGGGGGGGg......',
  '.......lGGGGVvGGGg......',
  '.......lGGGGVVGGGg......',
  '.......gGGGGGGGGgg......',
  '.......jJJJJJJJJJj......',
];
const BACKPACK = [
  '....qRRq',
  '...qRRRR',
  '...RRRRq',
  '...RRRRq',
  '...qRRq.',
];

interface Rig {
  head: string[];
  blink: [number, string][];
  torso: string[];
  torsoY: number;
  hipY: number;
  thigh: number;
  shin: number;
  shinSkin: boolean;
  shoulderY: number;
  upper: number;
  fore: number;
  backpack: boolean;
  pal: Pal;
  height: number;
}

const ADULT: Rig = {
  head: ADULT_HEAD, blink: [[7, '......hhsSSssSSSssS.....']], torso: ADULT_TORSO, torsoY: 15,
  hipY: 24, thigh: 3, shin: 3, shinSkin: false, shoulderY: 16, upper: 3, fore: 3, backpack: false, pal: HERO, height: 34,
};
const KID: Rig = {
  head: KID_HEAD, blink: [[6, '......hhSSssSSSssS......'], [7, '......hhSSSSSSSSSSS.....']], torso: KID_TORSO, torsoY: 12,
  hipY: 18, thigh: 2, shin: 3, shinSkin: true, shoulderY: 13, upper: 2, fore: 3, backpack: true, pal: KID_HAIR, height: 27,
};

interface Pose {
  armF: number; armB: number; // shoulder angle in degrees; 0 = hanging down, + = forward
  elbowF?: number; elbowB?: number;
  legF: number; legB: number; // hip angle
  kneeF?: number; kneeB?: number; // + bends the shin backwards
  blink?: boolean;
}

export interface Look { kid?: boolean; beard: number; mask?: boolean }

/** How the hero looks in each stage (index = stage). */
export const LOOKS: Look[] = [
  { kid: true, beard: 0 },
  { beard: 0 },
  { beard: 1, mask: true },
  { beard: 2 },
  { beard: 3 },
  { beard: 4 },
  { beard: 5 },
  { beard: 6 },
  { beard: 7 },
  { beard: 8 },
];

/** Hitbox height for the hero in a given stage (the kid is shorter). */
export const hitHeight = (stage: number) => (LOOKS[Math.max(0, stage)]?.kid ? 23 : 30);

const O = 1; // outline margin
export const HERO_W = 26;
export const HERO_CX = 13; // torso centre column, lines up with the hitbox centre

function grid(ctx: CanvasRenderingContext2D, rows: string[], pal: Pal, x: number, y: number) {
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const col = pal[row[c]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x + c, y + r, 1, 1);
    }
  });
}

/** Thick pixel line from (x, y) at `ang` degrees (0 = down, + = towards +x). Returns the end point. */
function seg(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, thick: number, color: string): [number, number] {
  const r = (ang * Math.PI) / 180;
  const dx = Math.sin(r);
  const dy = Math.cos(r);
  const off = Math.floor(thick / 2);
  ctx.fillStyle = color;
  for (let i = 0; i <= len * 2; i++) {
    const t = i / 2;
    ctx.fillRect(Math.round(x + dx * t) - off, Math.round(y + dy * t) - off, thick, thick);
  }
  return [x + dx * len, y + dy * len];
}

function legEnd(rig: Rig, ang: number, knee: number): number {
  return rig.hipY + Math.cos((ang * Math.PI) / 180) * rig.thigh + Math.cos(((ang - knee) * Math.PI) / 180) * rig.shin;
}

function drawLeg(ctx: CanvasRenderingContext2D, rig: Rig, hx: number, hy: number, ang: number, knee: number, front: boolean) {
  const pal = rig.pal;
  const [kx, ky] = seg(ctx, hx, hy, ang, rig.thigh, 3, front ? pal.J : pal.j);
  const shinCol = rig.shinSkin ? (front ? pal.S : pal.s) : front ? pal.J : pal.j;
  const [fx, fy] = seg(ctx, kx, ky, ang - knee, rig.shin, rig.shinSkin ? 2 : 3, shinCol);
  const x = Math.round(fx);
  const y = Math.round(fy);
  ctx.fillStyle = SHOE;
  ctx.fillRect(x - 1, y, 5, 1);
  ctx.fillStyle = SOLE;
  ctx.fillRect(x - 1, y + 1, 5, 1);
}

function drawArm(ctx: CanvasRenderingContext2D, rig: Rig, sx: number, sy: number, ang: number, elbow: number, front: boolean) {
  const pal = rig.pal;
  const [ex, ey] = seg(ctx, sx, sy, ang, rig.upper, 3, front ? pal.l : pal.g);
  const skin = front ? pal.S : pal.s;
  const [hx, hy] = seg(ctx, ex, ey, ang + elbow, rig.fore, 2, skin);
  ctx.fillStyle = skin;
  ctx.fillRect(Math.round(hx) - 1, Math.round(hy), 2, 2);
}

// Beard shape on the adult face: [row, fromCol, toCol].
const JAW: [number, number, number][] = [
  [10, 7, 8], [10, 12, 19], [11, 7, 19], [12, 8, 19], [13, 9, 18], [14, 11, 17],
];

function drawBeard(ctx: CanvasRenderingContext2D, level: number, x0: number, y0: number) {
  if (level <= 0) return;
  const px = (x: number, y: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x0 + x, y0 + y, 1, 1); };
  if (level === 1) {
    for (const [r, a, b] of JAW) for (let x = a; x <= b; x++) if ((x + r) % 2 === 0 && r > 10) px(x, r, BEARD.stubble);
    for (let x = 14; x <= 18; x++) if (x % 2 === 0) px(x, 9, BEARD.stubble);
    return;
  }
  // Rows below the chin grow by two per level from level 4 upwards, tapering to a point.
  const rows: [number, number, number][] = JAW.filter(([r]) => level >= 3 || r <= 13).map(([r, a, b]) => (level === 2 && r === 13 ? [r, 10, 17] : [r, a, b]));
  const extra = Math.max(0, (level - 3) * 2);
  let a = 11;
  let b = 17;
  for (let i = 0; i < extra; i++) {
    if (i % 2 === 1 && b - a > 2) { a++; b--; }
    const wobble = i === extra - 1 ? 1 : 0;
    rows.push([15 + i, a + wobble, b - wobble]);
  }
  const last = rows[rows.length - 1][0];
  for (const [r, from, to] of rows) {
    for (let x = from; x <= to; x++) {
      let c = BEARD.base;
      if (x === from || r === last || (r > 14 && x === to)) c = BEARD.dark;
      else if ((x * 7 + r * 3) % 9 === 0) c = BEARD.light;
      px(x, r, c);
    }
  }
  for (let x = 14; x <= 18; x++) px(x, 9, x === 14 ? BEARD.dark : BEARD.base); // moustache
  px(16, 10, BEARD.dark); // mouth
}

function drawMask(ctx: CanvasRenderingContext2D, x0: number, y0: number) {
  const c = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x0 + x, y0 + y, w, h); };
  c(10, 9, 10, 4, '#a9dcf5');
  c(10, 10, 10, 1, '#7fbfe3');
  c(10, 12, 10, 1, '#7fbfe3');
  c(8, 8, 2, 1, '#e8f4fb'); // ear loop
  c(9, 9, 1, 1, '#e8f4fb');
}

function hero(rig: Rig, look: Look, pose: Pose): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = HERO_W;
  c.height = rig.height;
  const ctx = c.getContext('2d')!;
  const kneeF = pose.kneeF ?? 0;
  const kneeB = pose.kneeB ?? 0;
  // Drop the body so the lower foot rests on the ground line.
  const ground = rig.hipY + rig.thigh + rig.shin;
  const lowest = Math.max(legEnd(rig, pose.legF, kneeF), legEnd(rig, pose.legB, kneeB));
  const y0 = O + Math.round(ground - lowest);

  if (rig.backpack) grid(ctx, BACKPACK, rig.pal, O, y0 + rig.torsoY);
  drawArm(ctx, rig, O + 8, y0 + rig.shoulderY, pose.armB, pose.elbowB ?? 12, false);
  drawLeg(ctx, rig, O + 10, y0 + rig.hipY, pose.legB, kneeB, false);
  grid(ctx, rig.torso, rig.pal, O, y0 + rig.torsoY);
  const head = pose.blink ? rig.head.map((r, i) => rig.blink.find(([j]) => j === i)?.[1] ?? r) : rig.head;
  grid(ctx, head, rig.pal, O, y0);
  if (!look.kid) drawBeard(ctx, look.beard, O, y0);
  if (look.mask) drawMask(ctx, O, y0);
  if (rig.backpack) { ctx.fillStyle = rig.pal.q; ctx.fillRect(O + 8, y0 + rig.torsoY, 1, 4); } // strap
  drawLeg(ctx, rig, O + 15, y0 + rig.hipY, pose.legF, kneeF, true);
  drawArm(ctx, rig, O + 16, y0 + rig.shoulderY, pose.armF, pose.elbowF ?? 12, true);
  outline(c, HERO_LINE);
  return c;
}

export function outline(c: HTMLCanvasElement, color: string) {
  const ctx = c.getContext('2d')!;
  const { width: w, height: h } = c;
  const img = ctx.getImageData(0, 0, w, h);
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3]);
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a(x, y)) continue;
      if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) ctx.fillRect(x, y, 1, 1);
    }
  }
}

export interface HeroFrames {
  idle: HTMLCanvasElement;
  blink: HTMLCanvasElement;
  walk: HTMLCanvasElement[];
  jump: HTMLCanvasElement;
  fall: HTMLCanvasElement;
  skid: HTMLCanvasElement;
  hurt: HTMLCanvasElement;
  /** Sprite row of the shoe soles; drawn on the hitbox bottom. */
  foot: number;
}

const heroCache = new Map<string, HeroFrames>();

export function heroFrames(look: Look): HeroFrames {
  const key = JSON.stringify(look);
  const hit = heroCache.get(key);
  if (hit) return hit;
  const rig = look.kid ? KID : ADULT;
  const f = (p: Pose) => hero(rig, look, p);
  const idle: Pose = { armF: 6, armB: -6, legF: 6, legB: -6 };
  const frames: HeroFrames = {
    idle: f(idle),
    blink: f({ ...idle, blink: true }),
    walk: [
      f({ armF: -28, armB: 30, legF: 28, legB: -26, kneeB: 18 }),
      f({ armF: -8, armB: 10, legF: 4, legB: -10, kneeB: 55 }),
      f({ armF: 30, armB: -28, legF: -26, legB: 28, kneeF: 18 }),
      f({ armF: 10, armB: -8, legF: -10, legB: 4, kneeF: 55 }),
    ],
    jump: f({ armF: 150, elbowF: -10, armB: -40, legF: 55, kneeF: 80, legB: -18, kneeB: 25 }),
    fall: f({ armF: 115, elbowF: -20, armB: 120, elbowB: -20, legF: 18, kneeF: 20, legB: -14, kneeB: 10 }),
    skid: f({ armF: -40, armB: -55, legF: 38, legB: 14, kneeB: 10 }),
    hurt: f({ armF: 155, armB: 160, legF: 20, legB: -20, blink: true }),
    foot: O + rig.hipY + rig.thigh + rig.shin + 1,
  };
  heroCache.set(key, frames);
  return frames;
}

// ---------------- dog: a Maltese with a topknot ----------------

const DOG: Pal = {
  W: '#fdfaf4', w: '#e6ded1', x: '#c9bdab',
  E: '#1a1210', N: '#1a1210', T: '#ff8fa3', P: '#ff5f97',
};
const DOG_LINE = '#4a3f38';
const DOG_BODY = [
  '.............wWWw...',
  '..ww.........wPPw...',
  '.wWWw.......wWWWWw..',
  '.wWWWw.....wWWWWWWw.',
  '..wWWWw....xWWWWWEWW',
  '...wWWWwwwwxxWWWWEWN',
  '..wWWWWWWWWxxwWWWWT.',
  '.wWWWWWWWWWxxxwWWw..',
  '.wWWWWWWWWWWxxwWw...',
  '.wWWWWWWWWWWWxww....',
  '..wWWWWWWWWWWWww....',
  '..xwWwwWWwwWWwwx....',
];
const DOG_LEGS = [
  ['...xx..xx..xx.xx....', '...WW..WW..WW.WW....'],
  ['....xx..xx.xx..xx...', '....WW..WW.WW..WW...'],
  ['..xx...xx..xx..xx...', '..WW...WW...WW.WW...'],
];
// Tail wag: the plume sways between two positions.
const TAIL_ALT: [number, string][] = [
  [1, '...ww........wPPw...'],
  [2, '..wWWw......wWWWWw..'],
  [3, '..wWWWw....wWWWWWWw.'],
];

export const DOG_W = 22;
export const DOG_H = 16;
export const DOG_FOOT = 14; // row of the paws

function dog(legs: number, wag: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = DOG_W;
  c.height = DOG_H;
  const ctx = c.getContext('2d')!;
  const body = DOG_BODY.slice();
  if (wag) for (const [i, row] of TAIL_ALT) body[i] = row;
  grid(ctx, [...body, ...DOG_LEGS[legs]], DOG, 1, 1);
  outline(c, DOG_LINE);
  return c;
}

export interface DogFrames { idle: HTMLCanvasElement[]; run: HTMLCanvasElement[] }

let dogCache: DogFrames | null = null;
export function dogFrames(): DogFrames {
  dogCache ??= {
    idle: [dog(0, false), dog(0, true)],
    run: [dog(1, false), dog(2, true), dog(1, true), dog(2, false)],
  };
  return dogCache;
}
