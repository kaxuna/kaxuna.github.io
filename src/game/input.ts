// Keyboard and touch controls, merged into one Controls object the engine reads.
import type { Controls } from './engine';

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const JUMP = new Set(['ArrowUp', 'KeyW', 'Space', 'KeyZ', 'KeyK']);

export class Input implements Controls {
  left = false;
  right = false;
  jumpHeld = false;
  enabled = true;
  private queued = false;
  private keys = new Set<string>();
  private touchDir = new Map<number, -1 | 1>();
  private touchJump = new Set<number>();

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      const code = e.code;
      if (LEFT.has(code) || RIGHT.has(code) || JUMP.has(code) || code === 'ArrowDown') e.preventDefault();
      if (JUMP.has(code) && !e.repeat) this.queued = true;
      this.keys.add(code);
      this.sync();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.sync();
    });
    window.addEventListener('blur', () => this.reset());
  }

  takeJump(): boolean {
    const j = this.queued;
    this.queued = false;
    return j;
  }

  reset() {
    this.keys.clear();
    this.touchDir.clear();
    this.touchJump.clear();
    this.queued = false;
    this.sync();
  }

  private sync() {
    const k = this.keys;
    const dirs = [...this.touchDir.values()];
    this.left = [...LEFT].some((c) => k.has(c)) || dirs.includes(-1);
    this.right = [...RIGHT].some((c) => k.has(c)) || dirs.includes(1);
    this.jumpHeld = [...JUMP].some((c) => k.has(c)) || this.touchJump.size > 0;
  }

  /** A d-pad element split into left/right halves (sliding between them works) and a jump button. */
  bindTouch(dpad: HTMLElement, jump: HTMLElement, onFirstTouch: () => void) {
    const side = (e: PointerEvent): -1 | 1 => {
      const r = dpad.getBoundingClientRect();
      return e.clientX < r.left + r.width / 2 ? -1 : 1;
    };
    const paint = () => {
      dpad.dataset.dir = this.left ? 'l' : this.right ? 'r' : '';
      jump.classList.toggle('down', this.touchJump.size > 0);
    };
    dpad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onFirstTouch();
      try { dpad.setPointerCapture(e.pointerId); } catch { /* synthetic or stale pointer */ }
      this.touchDir.set(e.pointerId, side(e));
      this.sync();
      paint();
    });
    dpad.addEventListener('pointermove', (e) => {
      if (!this.touchDir.has(e.pointerId)) return;
      this.touchDir.set(e.pointerId, side(e));
      this.sync();
      paint();
    });
    const endDir = (e: PointerEvent) => {
      this.touchDir.delete(e.pointerId);
      this.sync();
      paint();
    };
    dpad.addEventListener('pointerup', endDir);
    dpad.addEventListener('pointercancel', endDir);

    jump.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onFirstTouch();
      try { jump.setPointerCapture(e.pointerId); } catch { /* synthetic or stale pointer */ }
      if (this.touchJump.size === 0) this.queued = true;
      this.touchJump.add(e.pointerId);
      this.sync();
      paint();
    });
    const endJump = (e: PointerEvent) => {
      this.touchJump.delete(e.pointerId);
      this.sync();
      paint();
    };
    jump.addEventListener('pointerup', endJump);
    jump.addEventListener('pointercancel', endJump);
    for (const el of [dpad, jump]) el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
