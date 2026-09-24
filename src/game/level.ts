// Turns the stage layouts in content.ts into one long tile map plus entity spawn lists.
import { stages, type Builder, type ThemeId } from './content';

export const TILE = 16;
export const ROWS = 15;
export const GROUND_Y = 13 * TILE;

export const T = {
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  BLOCK: 3,
  USED: 4,
  PLAT: 5,
  PIPE_L: 6,
  PIPE_R: 7,
  PIPE_TL: 8,
  PIPE_TR: 9,
  CANDLE_G: 10,
  CANDLE_R: 11,
  STONE: 12,
} as const;

//                    0      1     2     3     4     5      6     7     8     9     10    11    12
export const SOLID = [false, true, true, true, true, false, true, true, true, true, true, true, true];

export interface Zone { index: number; x0: number; x1: number; theme: ThemeId } // pixels
export interface EnemySpawn { kind: 'bug' | 'virus'; x: number; y: number }
export interface GemSpawn { x: number; y: number; skill: string; stage: number }
export interface Sign { x: number; y: number; text: string; stage: number }
export interface Label { x: number; y: number; text: string }
export interface Flag { x: number; stage: number; up: boolean; raised: number }
export interface Wick { x: number; y: number; up: boolean }

export class Level {
  W: number;
  tiles: Uint8Array;
  colZone: Uint8Array;
  zones: Zone[] = [];
  blocks = new Map<number, string>(); // tile index -> achievement key
  blockIndex = new Map<string, number>(); // achievement key -> tile index
  enemies: EnemySpawn[] = [];
  gems: GemSpawn[] = [];
  signs: Sign[] = [];
  labels: Label[] = [];
  flags: Flag[] = [];
  wicks: Wick[] = [];
  foxes: { x: number; y: number }[] = [];
  door: { x: number; y: number; w: number; h: number } | null = null;
  stageSkills: string[][] = [];

  constructor() {
    this.W = stages.reduce((sum, s) => sum + s.width, 0);
    this.tiles = new Uint8Array(this.W * ROWS);
    this.colZone = new Uint8Array(this.W);
    let x0 = 0;
    stages.forEach((stage, i) => {
      this.zones.push({ index: i, x0: x0 * TILE, x1: (x0 + stage.width) * TILE, theme: stage.theme });
      for (let x = x0; x < x0 + stage.width; x++) {
        this.colZone[x] = i;
        this.set(x, 13, T.GROUND);
        this.set(x, 14, T.GROUND);
      }
      this.stageSkills.push([]);
      stage.build(this.builder(i, x0));
      if (i < stages.length - 1) this.flags.push({ x: (x0 + stage.width - 4) * TILE, stage: i, up: false, raised: 0 });
      for (const ach of stage.achievements) {
        if (!this.blockIndex.has(ach.key)) console.warn(`achievement ${ach.key} has no block`);
      }
      x0 += stage.width;
    });
  }

  set(x: number, y: number, t: number) {
    if (x >= 0 && x < this.W && y >= 0 && y < ROWS) this.tiles[y * this.W + x] = t;
  }

  get(x: number, y: number): number {
    if (x < 0 || x >= this.W) return T.STONE; // walls at both ends of the map
    if (y < 0 || y >= ROWS) return T.EMPTY;
    return this.tiles[y * this.W + x];
  }

  zoneAtPx(px: number): number {
    const col = Math.max(0, Math.min(this.W - 1, Math.floor(px / TILE)));
    return this.colZone[col];
  }

  private builder(stage: number, x0: number): Builder {
    const L = this;
    const col = (x: number, h: number, t: number) => {
      for (let r = 13 - h; r <= 12; r++) L.set(x0 + x, r, t);
    };
    return {
      pit(from, to) {
        for (let x = from; x <= to; x++) { L.set(x0 + x, 13, T.EMPTY); L.set(x0 + x, 14, T.EMPTY); }
      },
      bricks(x, row, n = 1) {
        for (let i = 0; i < n; i++) L.set(x0 + x + i, row, T.BRICK);
      },
      block(x, row, key) {
        L.set(x0 + x, row, T.BLOCK);
        const idx = row * L.W + x0 + x;
        L.blocks.set(idx, key);
        L.blockIndex.set(key, idx);
      },
      plat(x, row, n) {
        for (let i = 0; i < n; i++) L.set(x0 + x + i, row, T.PLAT);
      },
      column(x, h) { col(x, h, T.STONE); },
      stairsUp(x, n) { for (let i = 0; i < n; i++) col(x + i, i + 1, T.STONE); },
      stairsDown(x, n) { for (let i = 0; i < n; i++) col(x + i, n - i, T.STONE); },
      pipe(x, h, label) {
        const top = 13 - h;
        L.set(x0 + x, top, T.PIPE_TL);
        L.set(x0 + x + 1, top, T.PIPE_TR);
        for (let r = top + 1; r <= 12; r++) { L.set(x0 + x, r, T.PIPE_L); L.set(x0 + x + 1, r, T.PIPE_R); }
        if (label) L.labels.push({ x: (x0 + x + 1) * TILE, y: top * TILE - 11, text: label });
      },
      candle(x, h, up) {
        col(x, h, up ? T.CANDLE_G : T.CANDLE_R);
        L.wicks.push({ x: (x0 + x) * TILE + 7, y: (13 - h) * TILE, up });
      },
      gem(x, row, skill) {
        L.gems.push({ x: (x0 + x) * TILE + 3, y: row * TILE + 4, skill, stage });
        L.stageSkills[stage].push(skill);
      },
      bug(x) { L.enemies.push({ kind: 'bug', x: (x0 + x) * TILE + 1, y: GROUND_Y - 10 }); },
      virus(x, row) { L.enemies.push({ kind: 'virus', x: (x0 + x) * TILE + 2, y: row * TILE + 2 }); },
      sign(x, text) { L.signs.push({ x: (x0 + x) * TILE + 1, y: GROUND_Y - 16, text, stage }); },
      fox(x) { L.foxes.push({ x: (x0 + x) * TILE, y: GROUND_Y - 12 }); },
      door(x) { L.door = { x: (x0 + x) * TILE, y: 11 * TILE, w: 2 * TILE, h: 2 * TILE }; },
    };
  }
}
