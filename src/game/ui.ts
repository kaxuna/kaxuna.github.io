// DOM side of the game: HUD, minimap, sign bubble, banners, toasts, portrait dock, logbook, ending.
import type { World } from './engine';
import { stages, allAchievements } from './content';
import { TILE } from './level';
import { themeColor } from './render';
import { sprites, iconURL } from './sprites';
import { profile } from '../data';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export class UI {
  private w: World;
  private icons: { star: string; gem: string; bug: string };
  private marker: HTMLElement;
  private segs: HTMLButtonElement[] = [];
  private bubble = $('bubble');
  private bubbleFor: unknown = null;
  private bannerTimer = 0;
  private latestKey: string | null = null;
  totalSkills: number;

  constructor(w: World, onWarp: (stage: number) => void) {
    this.w = w;
    const sp = sprites();
    this.icons = { star: iconURL(sp.star), gem: iconURL(sp.gem), bug: iconURL(sp.bugA) };
    ($('ic-star') as HTMLImageElement).src = this.icons.star;
    ($('ic-gem') as HTMLImageElement).src = this.icons.gem;
    ($('ic-bug') as HTMLImageElement).src = this.icons.bug;
    this.totalSkills = w.level.stageSkills.reduce((n, s) => n + s.length, 0);
    $('c-ach-t').textContent = String(allAchievements.length);
    $('c-gem-t').textContent = String(this.totalSkills);

    const mm = $('minimap');
    stages.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.flexGrow = String(s.width);
      b.style.setProperty('--seg', themeColor(s.theme));
      b.title = `Stage ${i + 1}: ${s.title} · ${s.role}`;
      b.setAttribute('aria-label', `Jump to stage ${i + 1}, ${s.title}`);
      b.addEventListener('click', () => onWarp(i));
      mm.appendChild(b);
      this.segs.push(b);
    });
    this.marker = document.createElement('span');
    this.marker.className = 'mm-marker';
    mm.appendChild(this.marker);
    this.counts();
  }

  // ---------- per frame ----------
  frame() {
    const w = this.w;
    const total = w.level.W * TILE;
    this.marker.style.left = `${((w.p.x + w.p.w / 2) / total) * 100}%`;

    const s = w.activeSign;
    if (s) {
      if (this.bubbleFor !== s) { this.bubble.textContent = s.text; this.bubbleFor = s; }
      this.bubble.hidden = false;
      // Keep the whole bubble on screen: clamp its centre by its real pixel width.
      const W = this.bubble.parentElement!.clientWidth;
      const half = this.bubble.offsetWidth / 2;
      const want = ((s.x + 7 - w.camX) / w.viewW) * W;
      this.bubble.style.left = `${Math.max(half + 6, Math.min(W - half - 6, want))}px`;
      this.bubble.style.top = `${((s.y - 2) / 240) * 100}%`;
    } else if (!this.bubble.hidden) {
      this.bubble.hidden = true;
      this.bubbleFor = null;
    }
  }

  // ---------- counters ----------
  counts(pop?: 'ach' | 'gem' | 'bug') {
    const w = this.w;
    $('c-ach').textContent = String(w.collected.size);
    $('c-gem').textContent = String(w.skills.size);
    $('c-bug').textContent = String(w.bugs);
    if (pop) {
      const el = $(`c-${pop}`).parentElement!;
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    }
    stages.forEach((st, i) => {
      const done = st.achievements.length > 0 && st.achievements.every((a) => w.collected.has(a.key));
      this.segs[i].classList.toggle('done', done);
    });
    this.dock();
  }

  // ---------- stage change ----------
  stage(i: number, showBanner: boolean) {
    const s = stages[i];
    $('hud-num').textContent = String(i + 1);
    $('hud-title').textContent = s.title;
    $('hud-period').textContent = `${s.role} · ${s.period}`;
    this.segs.forEach((b, j) => b.classList.toggle('here', j === i));
    this.dock();
    if (showBanner) {
      this.banner(i);
      const t = $('dock-title');
      t.classList.remove('flash');
      void t.offsetWidth;
      t.classList.add('flash');
    }
  }

  private banner(i: number) {
    const s = stages[i];
    const el = $('banner');
    $('banner-kicker').textContent = `Stage ${i + 1} of ${stages.length}`;
    $('banner-title').textContent = s.title;
    $('banner-meta').textContent = `${s.role} · ${s.period} · ${s.place}`;
    el.classList.remove('out');
    el.hidden = false;
    void el.offsetWidth;
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => {
      el.classList.add('out');
      this.bannerTimer = window.setTimeout(() => { el.hidden = true; }, 320);
    }, 2300);
  }

  private dock() {
    const w = this.w;
    const i = Math.max(0, w.stage);
    const s = stages[i];
    $('dock-kicker').textContent = `Stage ${i + 1} of ${stages.length} · ${s.period}`;
    $('dock-title').textContent = s.title;
    $('dock-meta').textContent = `${s.role} · ${s.place}`;
    $('dock-blurb').textContent = s.blurb;
    const found = s.achievements.filter((a) => w.collected.has(a.key)).length;
    const skills = w.level.stageSkills[i];
    const got = skills.filter((k) => w.skills.has(k)).length;
    const parts: string[] = [];
    if (s.achievements.length) parts.push(`<b>${found}/${s.achievements.length}</b> achievements here`);
    if (skills.length) parts.push(`<b>${got}/${skills.length}</b> skills`);
    $('dock-progress').innerHTML = parts.join(' · ') || 'Walk right to the door.';
    const latest = this.latestKey ? allAchievements.find((a) => a.key === this.latestKey) : null;
    const box = $('dock-latest');
    if (latest) {
      box.innerHTML = `<b>${esc(latest.title)}</b>${esc(latest.short)}`;
      box.hidden = false;
    } else box.hidden = true;
  }

  // ---------- toasts ----------
  toast(key: string, onOpen: (key: string) => void) {
    const ach = allAchievements.find((a) => a.key === key);
    if (!ach) return;
    this.latestKey = key;
    const box = $('toasts');
    while (box.children.length >= 2) box.firstElementChild!.remove();
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'toast';
    t.innerHTML = `<img src="${this.icons.star}" alt=""><span class="t-kicker">Achievement · ${esc(stages[ach.stage].title)}</span><span class="t-title">${esc(ach.title)}</span><span class="t-text">${esc(ach.short)}</span>`;
    t.addEventListener('click', () => onOpen(key));
    box.appendChild(t);
    window.setTimeout(() => {
      t.classList.add('out');
      window.setTimeout(() => t.remove(), 320);
    }, 4800);
    this.dock();
  }

  // ---------- logbook ----------
  renderLogbook(showAll: boolean, onWarp: (stage: number) => void, focusKey?: string) {
    const w = this.w;
    const body = $('log-body');
    $('log-summary').textContent = `${w.collected.size}/${allAchievements.length} achievements · ${w.skills.size}/${this.totalSkills} skills · ${w.bugs} bugs`;
    body.innerHTML = stages.map((s, i) => {
      const items = s.achievements.map((a) => {
        const got = w.collected.has(a.key);
        const show = got || showAll;
        return `<li class="log-item ${got ? '' : 'locked'}" data-key="${a.key}"><img src="${this.icons.star}" alt="${got ? 'Found' : 'Not found yet'}"><div><b>${show ? esc(a.title) : '? ? ?'}</b><p>${show ? esc(a.full) : 'Hidden in a block in this stage.'}${!got && showAll ? ' <em>(not found in the game yet)</em>' : ''}</p></div></li>`;
      }).join('');
      const skills = w.level.stageSkills[i];
      const chips = skills.map((k) => {
        const got = w.skills.has(k);
        return `<span class="chip ${got ? 'got' : ''}">${got || showAll ? esc(k) : '?'}</span>`;
      }).join('');
      return `<section class="log-stage">
        <div class="log-stage-head"><span class="log-stage-num">${i + 1}</span><h3>${esc(s.title)}</h3><button type="button" data-warp="${i}">Play this stage</button></div>
        <p class="log-meta">${esc(s.role)} · ${esc(s.period)} · ${esc(s.place)}</p>
        ${items ? `<ul class="log-items">${items}</ul>` : `<p class="log-meta">${esc(s.blurb)}</p>`}
        ${chips ? `<div class="log-skills">${chips}</div>` : ''}
      </section>`;
    }).join('');
    body.querySelectorAll<HTMLButtonElement>('[data-warp]').forEach((b) => b.addEventListener('click', () => onWarp(Number(b.dataset.warp))));
    if (focusKey) {
      const el = body.querySelector<HTMLElement>(`[data-key="${focusKey}"]`);
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ block: 'center' }));
        el.classList.add('flash');
      }
    }
  }

  // ---------- ending ----------
  renderEnd() {
    const w = this.w;
    const mins = Math.floor(w.playTime / 60);
    const secs = Math.floor(w.playTime % 60).toString().padStart(2, '0');
    $('end-stats').innerHTML = [
      [`${w.collected.size}/${allAchievements.length}`, 'achievements'],
      [`${w.skills.size}/${this.totalSkills}`, 'skills'],
      [String(w.bugs), 'bugs squashed'],
      [`${mins}:${secs}`, 'play time'],
    ].map(([v, l]) => `<li><b>${v}</b><span>${l}</span></li>`).join('');
    $('end-links').innerHTML = [
      ['Email', `mailto:${profile.email}`, 'primary'],
      ['LinkedIn', profile.linkedin, ''],
      ['GitHub', profile.github, ''],
      ['LeetCode', profile.leetcode, ''],
    ].map(([l, h, cls]) => `<a class="btn small ${cls}" href="${h}" ${h.startsWith('mailto') ? '' : 'target="_blank" rel="noopener"'}>${l}</a>`).join('');
  }
}
