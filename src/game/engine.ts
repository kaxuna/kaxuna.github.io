// Game simulation: player physics, tile collisions, enemies, pickups, camera.
// Runs at a fixed 120 Hz step; rendering reads the state.
import { Level, T, TILE, ROWS, SOLID, GROUND_Y, type Sign } from './level';

const G = 1450;
const JUMP = 460;
const MAX_RUN = 140;
const ACC_GROUND = 1100;
const ACC_AIR = 760;
const FRICTION = 1400;
const SKID = 2200;
const MAX_FALL = 520;
const BUMP_TIME = 0.18;

export interface Controls {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  takeJump(): boolean;
}

export type GameEvent =
  | { type: 'unlock'; key: string }
  | { type: 'gem'; skill: string }
  | { type: 'stomp' }
  | { type: 'bump' }
  | { type: 'break' }
  | { type: 'jump' }
  | { type: 'hurt' }
  | { type: 'fall' }
  | { type: 'flag'; stage: number }
  | { type: 'zone'; stage: number }
  | { type: 'end' };

interface Body { x: number; y: number; w: number; h: number; vx: number; vy: number; onGround: boolean }

export interface Player extends Body {
  facing: number;
  coyote: number;
  buffer: number;
  invuln: number;
  stun: number;
  anim: number;
}

export interface Enemy extends Body {
  kind: 'bug' | 'virus';
  alive: boolean;
  dead: number; // seconds left to show the death animation
  flat: boolean;
  active: boolean;
  dir: number;
  t: number;
  x0: number;
  y0: number;
}

export interface Gem { x: number; y: number; skill: string; stage: number; taken: boolean }

export interface Particle {
  kind: 'debris' | 'star' | 'dust' | 'spark' | 'text';
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  color: string;
  text?: string;
}

const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class World {
  level = new Level();
  viewW = 320;
  t = 0;
  playTime = 0;
  camX = 0;
  private lookX = 0;

  p: Player = { x: 40, y: GROUND_Y - 22, w: 12, h: 22, vx: 0, vy: 0, onGround: true, facing: 1, coyote: 0, buffer: 0, invuln: 0, stun: 0, anim: 0 };
  dog = { x: 22, y: GROUND_Y, facing: 1, anim: 0, moving: false };
  private trail: { x: number; y: number; f: number }[] = [];

  enemies: Enemy[];
  gems: Gem[];
  particles: Particle[] = [];
  bumps = new Map<number, number>();

  stage = -1;
  private checkpoint = { x: 40, y: GROUND_Y - 22 };
  collected = new Set<string>();
  skills = new Set<string>();
  bugs = 0;
  activeSign: Sign | null = null;
  private atDoor = false;
  events: GameEvent[] = [];

  constructor() {
    this.enemies = this.level.enemies.map((s) => ({
      kind: s.kind, x: s.x, y: s.y, x0: s.x, y0: s.y,
      w: s.kind === 'bug' ? 14 : 10, h: s.kind === 'bug' ? 10 : 10,
      vx: 0, vy: 0, onGround: false, alive: true, dead: 0, flat: false, active: false, dir: -1, t: Math.random() * 6,
    }));
    this.gems = this.level.gems.map((g) => ({ ...g, taken: false }));
    this.updateZone();
  }

  /** Restore progress from a previous visit: used blocks stay used, taken gems stay taken. */
  restore(ach: string[], skills: string[], bugs: number) {
    for (const key of ach) {
      const idx = this.level.blockIndex.get(key);
      if (idx === undefined) continue;
      this.collected.add(key);
      this.level.tiles[idx] = T.USED;
    }
    for (const s of skills) {
      this.skills.add(s);
      for (const g of this.gems) if (g.skill === s) g.taken = true;
    }
    this.bugs = bugs;
  }

  warp(stage: number) {
    const z = this.level.zones[stage];
    this.p.x = z.x0 + 40;
    this.p.y = GROUND_Y - this.p.h;
    this.p.vx = 0;
    this.p.vy = 0;
    this.p.facing = 1;
    this.trail = [];
    this.dog.x = this.p.x - 18;
    this.dog.y = GROUND_Y;
    this.camX = this.clampCam(this.p.x - this.viewW * 0.42);
    this.updateZone();
  }

  private emit(e: GameEvent) { this.events.push(e); }

  solid(tx: number, ty: number): boolean { return SOLID[this.level.get(tx, ty)]; }

  // ---------------- simulation ----------------

  step(dt: number, c: Controls) {
    this.t += dt;
    this.playTime += dt;
    const p = this.p;
    const dir = (c.right ? 1 : 0) - (c.left ? 1 : 0);

    if (p.stun > 0) {
      p.stun -= dt;
    } else if (dir !== 0) {
      const skidding = p.onGround && p.vx !== 0 && Math.sign(p.vx) === -dir;
      const acc = p.onGround ? (skidding ? SKID : ACC_GROUND) : ACC_AIR;
      p.vx += dir * acc * dt;
      p.facing = dir;
      if (Math.abs(p.vx) > MAX_RUN) p.vx = Math.sign(p.vx) * MAX_RUN;
    } else if (p.onGround) {
      const d = FRICTION * dt;
      p.vx = Math.abs(p.vx) <= d ? 0 : p.vx - Math.sign(p.vx) * d;
    }

    if (c.takeJump()) p.buffer = 0.12;
    if (p.buffer > 0) p.buffer -= dt;
    p.coyote = p.onGround ? 0.09 : p.coyote - dt;
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -JUMP;
      p.buffer = 0;
      p.coyote = 0;
      p.onGround = false;
      this.emit({ type: 'jump' });
    }

    // Short hops when the button is released early; slightly heavier fall.
    const g = p.vy < 0 && !c.jumpHeld ? G * 2.4 : p.vy > 0 ? G * 1.15 : G;
    p.vy = Math.min(MAX_FALL, p.vy + g * dt);

    const res = this.move(p, dt, true);
    if (res.ceil >= 0) this.hitFromBelow(res.ceil);

    if (p.invuln > 0) p.invuln -= dt;
    p.anim += Math.abs(p.vx) * dt;

    if (p.y > ROWS * TILE + 40) {
      this.respawn();
      this.emit({ type: 'fall' });
    }

    this.updateEnemies(dt, c);
    this.updateGems();
    this.updateFlags(dt);
    this.updateDoorAndSigns();
    this.updateZone();
    this.updateDog(dt);
    this.updateParticles(dt);
    for (const [idx, left] of this.bumps) {
      if (left - dt <= 0) this.bumps.delete(idx); else this.bumps.set(idx, left - dt);
    }
    this.updateCamera(dt);
  }

  /** Called while paused (title screen, modals) so the scene stays alive. */
  idle(dt: number) {
    this.t += dt;
    this.updateParticles(dt);
    this.updateFlags(dt);
  }

  private move(b: Body, dt: number, oneway: boolean): { wall: boolean; ceil: number } {
    const L = this.level;
    let wall = false;
    let ceil = -1;

    b.x += b.vx * dt;
    if (b.x < 0) { b.x = 0; b.vx = 0; wall = true; }
    const maxX = L.W * TILE - b.w;
    if (b.x > maxX) { b.x = maxX; b.vx = 0; wall = true; }
    const top = Math.floor(b.y / TILE);
    const bot = Math.floor((b.y + b.h - 0.001) / TILE);
    if (b.vx > 0) {
      const tx = Math.floor((b.x + b.w - 0.001) / TILE);
      for (let ty = top; ty <= bot; ty++) if (this.solid(tx, ty)) { b.x = tx * TILE - b.w; b.vx = 0; wall = true; break; }
    } else if (b.vx < 0) {
      const tx = Math.floor(b.x / TILE);
      for (let ty = top; ty <= bot; ty++) if (this.solid(tx, ty)) { b.x = (tx + 1) * TILE; b.vx = 0; wall = true; break; }
    }

    const prevBottom = b.y + b.h;
    b.y += b.vy * dt;
    b.onGround = false;
    const left = Math.floor(b.x / TILE);
    const right = Math.floor((b.x + b.w - 0.001) / TILE);
    if (b.vy >= 0) {
      const ty = Math.floor((b.y + b.h) / TILE);
      for (let tx = left; tx <= right; tx++) {
        const t = L.get(tx, ty);
        if (SOLID[t] || (oneway && t === T.PLAT && prevBottom <= ty * TILE + 0.5)) {
          b.y = ty * TILE - b.h;
          b.vy = 0;
          b.onGround = true;
          break;
        }
      }
    } else {
      const ty = Math.floor(b.y / TILE);
      let best = -1;
      let bestOverlap = 0;
      for (let tx = left; tx <= right; tx++) {
        if (!this.solid(tx, ty)) continue;
        const ov = Math.min(b.x + b.w, (tx + 1) * TILE) - Math.max(b.x, tx * TILE);
        if (ov > bestOverlap) { bestOverlap = ov; best = ty * L.W + tx; }
      }
      if (best >= 0) {
        b.y = (ty + 1) * TILE;
        b.vy = 0;
        ceil = best;
      }
    }
    return { wall, ceil };
  }

  private hitFromBelow(idx: number) {
    const L = this.level;
    const t = L.tiles[idx];
    const tx = idx % L.W;
    const ty = Math.floor(idx / L.W);
    if (t === T.BLOCK) {
      L.tiles[idx] = T.USED;
      this.bumps.set(idx, BUMP_TIME);
      const key = L.blocks.get(idx);
      this.particles.push({ kind: 'star', x: tx * TILE + 3, y: ty * TILE - 6, vx: 0, vy: -90, g: 0, life: 0.9, max: 0.9, color: '' });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.particles.push({ kind: 'spark', x: tx * TILE + 8, y: ty * TILE, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 30, g: 120, life: 0.5, max: 0.5, color: '#f7b733' });
      }
      if (key && !this.collected.has(key)) {
        this.collected.add(key);
        this.emit({ type: 'unlock', key });
      }
      this.killOnTop(tx, ty);
    } else if (t === T.BRICK) {
      L.tiles[idx] = T.EMPTY;
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          kind: 'debris', x: tx * TILE + (i % 2) * 8 + 2, y: ty * TILE + Math.floor(i / 2) * 8 + 2,
          vx: (i % 2 ? 1 : -1) * (50 + Math.random() * 30), vy: -220 + Math.floor(i / 2) * 80, g: 1100, life: 1, max: 1, color: '',
        });
      }
      this.emit({ type: 'break' });
      this.killOnTop(tx, ty);
    } else {
      this.emit({ type: 'bump' });
    }
  }

  private killOnTop(tx: number, ty: number) {
    const top = ty * TILE;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const bottom = e.y + e.h;
      if (bottom >= top - 4 && bottom <= top + 2 && e.x + e.w > tx * TILE && e.x < (tx + 1) * TILE) this.killEnemy(e, false);
    }
  }

  private killEnemy(e: Enemy, stomped: boolean) {
    e.alive = false;
    e.flat = stomped && e.kind === 'bug';
    e.dead = e.flat ? 0.5 : 1.2;
    e.vy = e.flat ? 0 : -180;
    this.bugs++;
    this.emit({ type: 'stomp' });
    for (let i = 0; i < 5; i++) {
      this.particles.push({ kind: 'dust', x: e.x + e.w / 2, y: e.y + e.h, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 60, g: 200, life: 0.4, max: 0.4, color: '#ffffff' });
    }
  }

  private updateEnemies(dt: number, c: Controls) {
    const p = this.p;
    for (const e of this.enemies) {
      if (!e.alive) {
        if (e.dead > 0) {
          e.dead -= dt;
          if (!e.flat) { e.vy += G * dt; e.y += e.vy * dt; }
        }
        continue;
      }
      if (!e.active) {
        if (e.x < this.camX + this.viewW + 24 && e.x + e.w > this.camX - 24) e.active = true;
        else continue;
      }
      e.t += dt;
      if (e.kind === 'bug') {
        e.vx = 26 * e.dir;
        e.vy = Math.min(MAX_FALL, e.vy + G * dt);
        const r = this.move(e, dt, true);
        if (r.wall) {
          e.dir *= -1;
        } else if (e.onGround) {
          const fx = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
          const below = this.level.get(Math.floor(fx / TILE), Math.floor((e.y + e.h + 2) / TILE));
          if (!SOLID[below] && below !== T.PLAT) e.dir *= -1;
        }
        if (e.y > ROWS * TILE + 32) { e.alive = false; e.dead = 0; }
      } else {
        e.x = e.x0 + Math.sin(e.t * 0.8) * 20;
        e.y = e.y0 + Math.sin(e.t * 2.1) * 12;
      }

      if (!overlap(p, e)) continue;
      const stomp = p.vy > 0 && p.y + p.h - e.y < 10;
      if (stomp) {
        this.killEnemy(e, true);
        p.vy = c.jumpHeld ? -JUMP * 0.85 : -300;
      } else if (p.invuln <= 0) {
        p.invuln = 1.4;
        p.stun = 0.25;
        p.vx = (p.x + p.w / 2 < e.x + e.w / 2 ? -1 : 1) * 170;
        p.vy = -220;
        this.emit({ type: 'hurt' });
      }
    }
  }

  private updateGems() {
    const p = this.p;
    for (const g of this.gems) {
      if (g.taken) continue;
      const gy = g.y + Math.sin(this.t * 3 + g.x * 0.05) * 2;
      if (!overlap(p, { x: g.x - 3, y: gy - 3, w: 16, h: 14 })) continue;
      g.taken = true;
      this.skills.add(g.skill);
      this.emit({ type: 'gem', skill: g.skill });
      this.particles.push({ kind: 'text', x: g.x + 5, y: gy - 4, vx: 0, vy: -28, g: 0, life: 1.4, max: 1.4, color: '#37d6c0', text: '+' + g.skill });
      for (let i = 0; i < 6; i++) {
        this.particles.push({ kind: 'spark', x: g.x + 5, y: gy + 4, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.8) * 90, g: 60, life: 0.45, max: 0.45, color: '#c8fff6' });
      }
    }
  }

  private updateFlags(dt: number) {
    for (const f of this.level.flags) {
      if (!f.up && this.p.x > f.x + 4) { f.up = true; this.emit({ type: 'flag', stage: f.stage }); }
      if (f.up && f.raised < 1) f.raised = Math.min(1, f.raised + dt * 1.4);
    }
  }

  private updateDoorAndSigns() {
    const p = this.p;
    const d = this.level.door;
    if (d) {
      const inside = overlap(p, { x: d.x + 6, y: d.y, w: d.w - 12, h: d.h });
      if (inside && !this.atDoor) this.emit({ type: 'end' });
      this.atDoor = inside;
    }
    const cx = p.x + p.w / 2;
    let best: Sign | null = null;
    let bestD = 44;
    for (const s of this.level.signs) {
      const dd = Math.abs(s.x + 7 - cx);
      if (dd < bestD) { bestD = dd; best = s; }
    }
    this.activeSign = best;
  }

  private updateZone() {
    const z = this.level.zoneAtPx(this.p.x + this.p.w / 2);
    if (z === this.stage) return;
    this.stage = z;
    this.checkpoint = { x: this.level.zones[z].x0 + 40, y: GROUND_Y - this.p.h };
    this.emit({ type: 'zone', stage: z });
  }

  private respawn() {
    const p = this.p;
    p.x = this.checkpoint.x;
    p.y = this.checkpoint.y;
    p.vx = 0;
    p.vy = 0;
    p.invuln = 1.2;
    this.trail = [];
    this.dog.x = p.x - 18;
    this.dog.y = GROUND_Y;
    this.camX = this.clampCam(p.x - this.viewW * 0.42);
  }

  private updateDog(dt: number) {
    const p = this.p;
    this.trail.push({ x: p.x, y: p.y + p.h, f: p.facing });
    if (this.trail.length > 32) this.trail.shift();
    const lag = this.trail[0];
    const desired = lag.x + p.w / 2 - lag.f * 17 - 6;
    const dx = desired - this.dog.x;
    const maxStep = 175 * dt;
    this.dog.x += Math.max(-maxStep, Math.min(maxStep, dx));
    this.dog.y = lag.y;
    this.dog.moving = Math.abs(dx) > 0.4;
    if (this.dog.moving) this.dog.facing = dx > 0 ? 1 : -1;
    else this.dog.facing = p.x + p.w / 2 > this.dog.x + 6 ? 1 : -1;
    if (this.dog.moving) this.dog.anim += dt;
  }

  private updateParticles(dt: number) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i];
      q.life -= dt;
      if (q.life <= 0) { ps.splice(i, 1); continue; }
      q.vy += q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
  }

  private clampCam(x: number): number {
    return Math.max(0, Math.min(this.level.W * TILE - this.viewW, x));
  }

  private updateCamera(dt: number) {
    const p = this.p;
    this.lookX += (p.facing * 22 - this.lookX) * Math.min(1, dt * 2.5);
    const target = p.x + p.w / 2 - this.viewW * 0.42 + this.lookX;
    this.camX = this.clampCam(this.camX + (target - this.camX) * Math.min(1, dt * 7));
  }

  snapCamera() {
    this.camX = this.clampCam(this.p.x + this.p.w / 2 - this.viewW * 0.42);
  }
}
