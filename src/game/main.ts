import './game.css';
import { World } from './engine';
import { render, VIEW_H } from './render';
import { Input } from './input';
import { Sfx } from './audio';
import { UI } from './ui';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const SAVE_KEY = 'kp-quest-v1';

interface Save { ach: string[]; skills: string[]; bugs: number; stage: number }

function load(): Save | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as Save) : null;
  } catch {
    return null;
  }
}
function save(w: World) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ach: [...w.collected], skills: [...w.skills], bugs: w.bugs, stage: Math.max(0, w.stage) }));
  } catch { /* storage blocked */ }
}

const canvas = $<HTMLCanvasElement>('screen');
const ctx = canvas.getContext('2d')!;
const wrap = $('screen-wrap');
const stageEl = $('stage');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let world = new World();
const saved = load();
if (saved) world.restore(saved.ach ?? [], saved.skills ?? [], saved.bugs ?? 0);
world.events.length = 0;

const input = new Input();
const sfx = new Sfx();
let ui = new UI(world, (i) => warp(i));

type Mode = 'title' | 'play' | 'modal';
let mode: Mode = 'title';
let openModal: HTMLElement | null = $('title-screen');
let backToTitle = false; // logbook opened from the title screen returns there

// ---------- layout ----------
function layout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const portrait = vh > vw * 1.1;
  document.body.classList.toggle('portrait', portrait);
  let stageH = vh;
  if (portrait) {
    const touch = document.body.classList.contains('touch');
    stageH = Math.round(Math.min(vw * 0.95, vh * (touch ? 0.5 : 0.62)));
    document.documentElement.style.setProperty('--stage-h', `${stageH}px`);
  }
  const stageW = stageEl.clientWidth || vw;
  stageH = portrait ? stageH : stageEl.clientHeight || vh;
  const viewW = Math.round(Math.min(426, Math.max(208, (VIEW_H * stageW) / stageH)));
  let scale = stageH / VIEW_H;
  if (viewW * scale > stageW) scale = stageW / viewW;
  canvas.width = viewW;
  canvas.height = VIEW_H;
  wrap.style.width = `${Math.floor(viewW * scale)}px`;
  wrap.style.height = `${Math.floor(VIEW_H * scale)}px`;
  wrap.style.setProperty('--u', `${scale}px`);
  world.viewW = viewW;
  world.snapCamera();
}

const markTouch = () => {
  if (document.body.classList.contains('touch')) return;
  document.body.classList.add('touch');
  layout();
};
if (window.matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
window.addEventListener('touchstart', markTouch, { passive: true, once: true });
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));
input.bindTouch($('dpad'), $('btn-jump'), () => sfx.unlock());

// ---------- modes ----------
function show(el: HTMLElement) {
  if (openModal && openModal !== el) openModal.hidden = true;
  openModal = el;
  el.hidden = false;
  if (mode !== 'title') mode = 'modal';
  input.reset();
  input.enabled = false;
  (el.querySelector<HTMLElement>('button, a') ?? el).focus({ preventScroll: true });
}
function closeModal() {
  if (!openModal) return;
  if (backToTitle && openModal.id === 'logbook') {
    backToTitle = false;
    show($('title-screen'));
    return;
  }
  backToTitle = false;
  openModal.hidden = true;
  openModal = null;
  mode = 'play';
  input.enabled = true;
  input.reset();
  (document.activeElement as HTMLElement | null)?.blur();
}

function start(stage: number | null) {
  sfx.unlock();
  backToTitle = false;
  mode = 'modal';
  closeModal();
  if (stage !== null) warp(stage);
  else ui.stage(Math.max(0, world.stage), true);
}

function warp(i: number) {
  sfx.unlock();
  world.warp(i);
  drainEvents();
  ui.stage(i, true);
  backToTitle = false;
  if (openModal) { mode = 'modal'; closeModal(); }
  (document.activeElement as HTMLElement | null)?.blur();
}

function openLogbook(focusKey?: string) {
  const all = $<HTMLInputElement>('log-all');
  ui.renderLogbook(all.checked, (i) => warp(i), focusKey);
  show($('logbook'));
}

$('btn-start').addEventListener('click', () => start(saved?.stage ? 0 : null));
if (saved && saved.stage > 0) {
  const b = $('btn-continue');
  b.hidden = false;
  b.textContent = `Continue · Stage ${saved.stage + 1}`;
  b.addEventListener('click', () => start(saved.stage));
}
$('btn-title-log').addEventListener('click', () => { backToTitle = true; openLogbook(); });
$('btn-log').addEventListener('click', () => openLogbook());
$('dock-log').addEventListener('click', () => openLogbook());
$('log-close').addEventListener('click', () => closeModal());
$('log-all').addEventListener('change', () => ui.renderLogbook($<HTMLInputElement>('log-all').checked, (i) => warp(i)));
$('log-reset').addEventListener('click', () => {
  if (!window.confirm('Reset achievements, skills and bug count?')) return;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  world = new World();
  layout();
  $('minimap').innerHTML = '';
  ui = new UI(world, (i) => warp(i));
  world.events.length = 0;
  ui.stage(0, false);
  ui.renderLogbook($<HTMLInputElement>('log-all').checked, (i) => warp(i));
});
$('end-log').addEventListener('click', () => openLogbook());
$('end-replay').addEventListener('click', () => warp(0));
$('end-close').addEventListener('click', () => closeModal());

const soundBtn = $('btn-sound');
const paintSound = () => {
  soundBtn.textContent = sfx.muted ? 'Sound off' : 'Sound on';
  soundBtn.setAttribute('aria-pressed', String(!sfx.muted));
};
paintSound();
soundBtn.addEventListener('click', () => { sfx.unlock(); sfx.setMuted(!sfx.muted); paintSound(); soundBtn.blur(); });

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openModal && openModal.id !== 'title-screen') { closeModal(); return; }
  if (openModal?.id === 'title-screen' && e.code === 'KeyL') { backToTitle = true; openLogbook(); return; }
  if (mode === 'title' && (e.key === 'Enter' || e.code === 'Space') && document.activeElement === document.body) {
    e.preventDefault();
    start(null);
    return;
  }
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === 'KeyL') { if (openModal?.id === 'logbook') closeModal(); else if (mode !== 'title') openLogbook(); }
  if (e.code === 'KeyM') { sfx.unlock(); sfx.setMuted(!sfx.muted); paintSound(); }
});

// ---------- events from the simulation ----------
function drainEvents() {
  for (const e of world.events) {
    switch (e.type) {
      case 'unlock':
        sfx.play('unlock');
        ui.toast(e.key, (k) => openLogbook(k));
        ui.counts('ach');
        save(world);
        break;
      case 'gem': sfx.play('gem'); ui.counts('gem'); save(world); break;
      case 'stomp': sfx.play('stomp'); ui.counts('bug'); break;
      case 'bump': sfx.play('bump'); break;
      case 'break': sfx.play('break'); break;
      case 'jump': sfx.play('jump'); break;
      case 'hurt': sfx.play('hurt'); break;
      case 'fall': sfx.play('fall'); break;
      case 'flag': sfx.play('flag'); break;
      case 'zone': ui.stage(e.stage, mode === 'play'); save(world); break;
      case 'end':
        sfx.play('end');
        save(world);
        ui.renderEnd();
        show($('end-screen'));
        break;
    }
  }
  world.events.length = 0;
}

// ---------- loop ----------
const STEP = 1 / 120;
let last = performance.now();
let acc = 0;
function frame(now: number) {
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
  last = now;
  if (!document.hidden) {
    if (mode === 'play') {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 12) { world.step(STEP, input); acc -= STEP; n++; }
      if (n === 12) acc = 0;
      drainEvents();
    } else {
      world.idle(dt);
    }
    render(ctx, world, reduceMotion);
    ui.frame();
  }
  requestAnimationFrame(frame);
}

layout();
ui.stage(Math.max(0, world.stage), false);
requestAnimationFrame(frame);

// Test hook for tools/game-test.mjs: open the page with ?debug.
if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { __game: unknown }).__game = { get world() { return world; }, warp, start, get mode() { return mode; } };
}
