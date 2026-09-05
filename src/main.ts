import './style.css';
import { profile, headlineStats, experiences, skills, formatPeriod, type Experience } from './data';
import { mountPipeline, sinkDescription, warehouseDescription, type PipelineSelection } from './pipeline';
import { mountSql } from './sql';
import { mountTerminal } from './terminal';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------- hero ----------
$('hero-name').textContent = profile.name;
$('hero-title').textContent = profile.title;
$('hero-summary').textContent = profile.summary;
$('hero-links').innerHTML = [
  ['GitHub', profile.github],
  ['LinkedIn', profile.linkedin],
  ['LeetCode', profile.leetcode],
  ['Email', `mailto:${profile.email}`],
].map(([l, h]) => `<a href="${h}" target="_blank" rel="noopener">${l} ↗</a>`).join('');
const photo = $<HTMLImageElement>('hero-photo');
photo.addEventListener('load', () => { photo.hidden = false; photo.alt = profile.name; });
if (photo.complete && photo.naturalWidth > 0) { photo.hidden = false; photo.alt = profile.name; }
$('hero-stats').innerHTML = headlineStats.map((s) => `<li><b>${s.value}</b><span>${s.label}</span></li>`).join('');

// ---------- tabs ----------
const views = Array.from(document.querySelectorAll<HTMLElement>('.view'));
const tabs = Array.from(document.querySelectorAll<HTMLAnchorElement>('.tab[data-tab]'));
let sqlWarmed = false;
function showView(name: string) {
  const known = views.some((v) => v.dataset.view === name);
  const target = known ? name : 'pipeline';
  for (const v of views) v.hidden = v.dataset.view !== target;
  for (const t of tabs) t.classList.toggle('active', t.dataset.tab === target);
  document.title = `Kakha Philauri · ${target === 'sql' ? 'SQL console' : target[0].toUpperCase() + target.slice(1)}`;
  if (target === 'sql' && !sqlWarmed) { sqlWarmed = true; void sql.warm(); }
}
window.addEventListener('hashchange', () => showView(location.hash.slice(1)));

// ---------- detail panel ----------
const panel = $('panel');
const panelBody = $('panel-body');
const backdrop = $('panel-backdrop');
function openPanel(html: string) {
  panelBody.innerHTML = html;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  backdrop.classList.add('show');
  panel.scrollTop = 0;
}
function closePanel() {
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  backdrop.classList.remove('show');
  pipeline.clearSelection();
}
$('panel-close').addEventListener('click', closePanel);
backdrop.addEventListener('click', closePanel);
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && panel.classList.contains('open')) closePanel(); });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function experienceHtml(e: Experience): string {
  return `
    <p class="kicker">${esc(formatPeriod(e))} · ${esc(e.location)}</p>
    <h3>${esc(e.company)}</h3>
    <p class="role">${esc(e.role)}</p>
    <p class="tagline">${esc(e.tagline)}</p>
    ${e.metrics ? `<div class="metrics">${e.metrics.map((m) => `<div><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join('')}</div>` : ''}
    <ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
    <div class="chips">${e.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
    ${e.link ? `<a class="ext" href="${e.link}" target="_blank" rel="noopener">${esc(e.link.replace(/^https?:\/\//, ''))} ↗</a>` : ''}
  `;
}

function onSelect(sel: PipelineSelection) {
  if (sel.kind === 'experience' && sel.experience) return openPanel(experienceHtml(sel.experience));
  if (sel.kind === 'warehouse' && sel.warehouse) {
    const [specific, common] = warehouseDescription(sel.warehouse.id);
    return openPanel(`
      <p class="kicker">source warehouse</p>
      <h3>${esc(sel.warehouse.label)}</h3>
      <p class="tagline">Extracted by the Dumper, assessed by the BigQuery Migration Service.</p>
      <ul><li>${esc(specific)}</li><li>${esc(common)}</li></ul>
      <a class="ext" href="https://github.com/google/dwh-migration-tools" target="_blank" rel="noopener">github.com/google/dwh-migration-tools ↗</a>
    `);
  }
  if (sel.kind === 'sink' && sel.sink) {
    const d = sinkDescription(sel.sink.id);
    return openPanel(`
      <p class="kicker">landing zone</p>
      <h3>${esc(d.title)}</h3>
      <ul>${d.body.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      ${sel.sink.id === 'fixfox-live' ? '<a class="ext" href="https://fixfox.ge" target="_blank" rel="noopener">fixfox.ge ↗</a>' : ''}
    `);
  }
}

// ---------- pipeline ----------
const pipeline = mountPipeline($<HTMLCanvasElement>('pipeline-canvas'), onSelect);
$('pipeline-legend').innerHTML = [
  ['#4f8cff', 'career'],
  ['#2dd4bf', 'Google · BigQuery'],
  ['#ff8a3d', 'side project'],
  ['#f5b82e', 'source warehouses'],
].map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('');
$('pipeline-fallback').innerHTML = experiences.map((e) => `<li><b>${esc(e.company)}</b> — ${esc(e.role)}, ${esc(formatPeriod(e))}</li>`).join('');

// ---------- sql ----------
const sql = mountSql({
  input: $<HTMLTextAreaElement>('sql-input'), run: $<HTMLButtonElement>('sql-run'), translate: $<HTMLButtonElement>('sql-translate'),
  translateOut: $('sql-translate-out'), status: $('sql-status'), presets: $('sql-presets'), result: $('sql-result'),
  meta: $('sql-meta'), chart: $('sql-chart'), schema: $('sql-schema'),
});

// ---------- skills ----------
const groups: Record<string, string> = { language: 'Languages', framework: 'Frameworks', data: 'Data', infra: 'Infra & delivery', ai: 'AI tooling', practice: 'Practice' };
const whereUsed = (name: string) => {
  const key = name.split(' ')[0].replace(/[^a-z]/gi, '').toLowerCase();
  return experiences.filter((e) => e.skills.some((s) => s.toLowerCase().includes(key))).map((e) => e.company);
};
$('skills-grid').innerHTML = Object.entries(groups).map(([k, title]) => {
  const list = skills.filter((s) => s.category === k);
  if (!list.length) return '';
  return `<div class="skill-group"><h3>${title}</h3>${list.map((s) => {
    const where = whereUsed(s.name);
    return `<div class="skill"><div><div class="name">${esc(s.name)}</div><div class="track"><div class="fill" data-w="${(s.years / 5) * 100}"></div></div><div class="skill-where">${where.length ? 'used at ' + esc([...new Set(where)].join(', ')) : 'since ' + s.since}</div></div><div class="yrs">~${s.years}y</div></div>`;
  }).join('')}</div>`;
}).join('');
requestAnimationFrame(() => document.querySelectorAll<HTMLElement>('.skill .fill').forEach((f) => { f.style.width = `${f.dataset.w}%`; }));

// ---------- terminal ----------
mountTerminal($('terminal'), $('terminal-screen'), $('terminal-close'), $('open-terminal'));

showView(location.hash.slice(1) || 'pipeline');
