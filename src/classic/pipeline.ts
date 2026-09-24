// Animated career pipeline on <canvas>. Nodes are clickable; particles flow along pipes.
import { experiences, warehouses, formatPeriod, type Experience } from '../data';

export interface PipelineSelection {
  kind: 'experience' | 'warehouse' | 'sink';
  experience?: Experience;
  warehouse?: { id: string; label: string; color: string };
  sink?: { id: string; label: string };
}

type Side = 'left' | 'right' | 'top' | 'bottom';

interface PNode {
  id: string;
  label: string;
  sub: string;
  period: string;
  lx: number; // logical x, horizontal layout (0..LW)
  ly: number; // logical y, horizontal layout (0..LH)
  vx: number; // logical x, vertical layout (0..VW)
  vy: number; // logical y, vertical layout (0..VH)
  w: number; // base width, horizontal layout
  h: number;
  vw: number; // base width, vertical layout
  vh: number;
  color: string;
  size: 'small' | 'normal' | 'hub';
  pulse?: boolean;
  select: PipelineSelection;
  // screen-space state
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  homeX: number; // slot the node springs back to
  homeY: number;
  velX: number;
  velY: number;
}

interface Particle { t: number; speed: number; r: number; }

interface Pipe {
  from: PNode;
  to: PNode;
  fromSide: Side;
  toSide: Side;
  vFromSide: Side;
  vToSide: Side;
  toOff: number; // anchor offset along the target side, fraction of node size (horizontal layout)
  vToOff: number; // same, vertical layout
  color: string;
  width: number;
  particles: Particle[];
  // computed each frame (screen space cubic bezier)
  p0: [number, number]; p1: [number, number]; p2: [number, number]; p3: [number, number];
  length: number;
}

const LW = 1000;
const LH = 440;
const VW = 440;
const VH = 830;
const CAREER = '#4f8cff';
const TEAL = '#2dd4bf';
const ORANGE = '#ff8a3d';

const BQ_SINK = { id: 'bigquery', label: 'BigQuery' };
const FF_SINK = { id: 'fixfox-live', label: 'fixfox.ge · live' };

export function sinkDescription(id: string): { title: string; body: string[] } {
  if (id === 'bigquery') {
    return {
      title: 'BigQuery',
      body: [
        'Where everything lands. The BigQuery Migration Service takes DDL metadata and query logs extracted by the Dumper, assesses the workload, translates SQL, and moves enterprises off legacy warehouses.',
        'I own two of the three stages of that assessment pipeline: extraction and the customer-facing assessment reports.',
      ],
    };
  }
  return {
    title: 'fixfox.ge in production',
    body: [
      'A live cleaning-marketplace business in Georgia, built and operated by one engineer. Payments, ledger, reconciliation, CI/CD with visual-regression and real-Postgres migration gates, and an LLM content pipeline that posts weekly.',
    ],
  };
}

export function warehouseDescription(id: string): string[] {
  const common =
    'The Dumper connects over JDBC, pulls DDL metadata and query logs, and packages them for the BigQuery Migration Service to assess and translate.';
  const specifics: Record<string, string> = {
    teradata: 'Teradata: the most common legacy source in enterprise migrations. Query-log extraction from DBQL tables, plus metadata for assessment and SQL translation.',
    redshift: 'Amazon Redshift: system tables and STL query history feed workload assessment before moving to BigQuery.',
    snowflake: 'Snowflake: where canonicalized query hashing paid off most. Semantically equivalent queries deduplicate to a single hash, cutting redundant processing over 3x.',
    oracle: 'Oracle: DDL and workload extraction for assessment; my earlier Bank of Georgia work consolidating Oracle stored procedures made this one feel familiar.',
  };
  return [specifics[id] ?? '', common];
}

function makeNodes(): PNode[] {
  const byId = (id: string) => experiences.find((e) => e.id === id)!;
  const blank = { sx: 0, sy: 0, sw: 0, sh: 0, homeX: 0, homeY: 0, velX: 0, velY: 0 };
  const exp = (id: string, lx: number, ly: number, vx: number, vy: number, size: 'normal' | 'hub', color: string, w = 122, h = 58, vw = 190, vh = 60): PNode => {
    const e = byId(id);
    return {
      id, label: e.company, sub: e.role, period: formatPeriod(e), lx, ly, vx, vy, w, h, vw, vh, color, size,
      pulse: e.end === null,
      select: { kind: 'experience', experience: e }, ...blank,
    };
  };
  const nodes: PNode[] = [
    exp('lund', 70, 250, 135, 60, 'normal', '#8b98ad'),
    exp('bog-analyst', 200, 250, 135, 165, 'normal', CAREER),
    exp('azry', 320, 250, 135, 270, 'normal', CAREER),
    exp('bog-swe', 450, 250, 135, 375, 'normal', CAREER),
    exp('devexperts', 580, 250, 135, 480, 'normal', CAREER),
    exp('google', 760, 250, 135, 640, 'hub', TEAL, 176, 84, 200, 90),
    exp('fixfox', 650, 370, 335, 430, 'normal', ORANGE, 134, 58, 150, 60),
    {
      id: 'bigquery', label: 'BigQuery', sub: 'landing zone', period: '', lx: 925, ly: 250, vx: 335, vy: 640, w: 112, h: 62, vw: 150, vh: 62,
      color: TEAL, size: 'normal', select: { kind: 'sink', sink: BQ_SINK }, ...blank,
    },
    {
      id: 'fixfox-live', label: 'fixfox.ge', sub: 'in production', period: '', lx: 925, ly: 370, vx: 335, vy: 525, w: 112, h: 48, vw: 150, vh: 48,
      color: ORANGE, size: 'normal', select: { kind: 'sink', sink: FF_SINK }, ...blank,
    },
  ];
  warehouses.forEach((w, i) => {
    nodes.push({
      id: w.id, label: w.label, sub: '', period: '', lx: 640, ly: 60 + i * 45, vx: 58 + i * 108, vy: 770, w: 96, h: 32, vw: 100, vh: 34, color: w.color,
      size: 'small', select: { kind: 'warehouse', warehouse: w }, ...blank,
    });
  });
  return nodes;
}

function makePipes(nodes: PNode[]): Pipe[] {
  const n = (id: string) => nodes.find((x) => x.id === id)!;
  const mk = (from: string, to: string, h: [Side, Side], v: [Side, Side], color: string, width = 6, toOff = 0, vToOff = 0): Pipe => ({
    from: n(from), to: n(to), fromSide: h[0], toSide: h[1], vFromSide: v[0], vToSide: v[1], toOff, vToOff, color, width, particles: [],
    p0: [0, 0], p1: [0, 0], p2: [0, 0], p3: [0, 0], length: 1,
  });
  const chain: [Side, Side] = ['right', 'left'];
  const vchain: [Side, Side] = ['bottom', 'top'];
  return [
    mk('lund', 'bog-analyst', chain, vchain, CAREER),
    mk('bog-analyst', 'azry', chain, vchain, CAREER),
    mk('azry', 'bog-swe', chain, vchain, CAREER),
    mk('bog-swe', 'devexperts', chain, vchain, CAREER),
    mk('devexperts', 'google', chain, vchain, CAREER, 7),
    mk('google', 'bigquery', chain, ['right', 'left'], TEAL, 9),
    mk('bog-swe', 'fixfox', ['bottom', 'left'], ['right', 'left'], ORANGE, 5),
    mk('fixfox', 'fixfox-live', chain, ['bottom', 'top'], ORANGE, 5),
    ...warehouses.map((w, i) => mk(w.id, 'google', ['right', 'top'], ['top', 'bottom'], w.color, 4, -0.28, -0.3 + i * 0.2)),
  ];
}

function bez(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number): [number, number] {
  const mt = 1 - t;
  const a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

function hexToRgba(hex: string, a: number): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function mountPipeline(canvas: HTMLCanvasElement, onSelect: (sel: PipelineSelection) => void) {
  const ctx = canvas.getContext('2d')!;
  const nodes = makeNodes();
  const pipes = makePipes(nodes);
  const wrap = canvas.parentElement!;

  let cssW = 0, cssH = 0, dpr = 1, vertical = false, scale = 1;
  let hover: PNode | null = null;
  let selected: PNode | null = null;
  let dragging: PNode | null = null;
  let dragDX = 0, dragDY = 0, dragStartX = 0, dragStartY = 0, dragMoved = false;
  let boost = 0; // particle speed burst after a release
  let raf = 0;
  let last = performance.now();
  let running = true;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function anchor(n: PNode, side: Side, off: number): [number, number] {
    switch (side) {
      case 'left': return [n.sx - n.sw / 2, n.sy + off * n.sh];
      case 'right': return [n.sx + n.sw / 2, n.sy + off * n.sh];
      case 'top': return [n.sx + off * n.sw, n.sy - n.sh / 2];
      case 'bottom': return [n.sx + off * n.sw, n.sy + n.sh / 2];
    }
  }
  function ctrl(p: [number, number], side: Side, d: number): [number, number] {
    switch (side) {
      case 'left': return [p[0] - d, p[1]];
      case 'right': return [p[0] + d, p[1]];
      case 'top': return [p[0], p[1] - d];
      case 'bottom': return [p[0], p[1] + d];
    }
  }

  function layout() {
    const rect = wrap.getBoundingClientRect();
    cssW = Math.max(300, Math.floor(rect.width));
    vertical = cssW < 720;
    scale = vertical ? cssW / VW : cssW / LW;
    cssH = Math.round((vertical ? VH : LH) * scale);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const nodeScale = vertical ? Math.min(1.1, Math.max(0.7, scale)) : Math.min(1.15, Math.max(0.72, cssW / 1000));
    for (const n of nodes) {
      n.homeX = (vertical ? n.vx : n.lx) * scale;
      n.homeY = (vertical ? n.vy : n.ly) * scale;
      n.sx = n.homeX; n.sy = n.homeY; n.velX = 0; n.velY = 0;
      n.sw = (vertical ? n.vw : n.w) * nodeScale;
      n.sh = (vertical ? n.vh : n.h) * nodeScale;
    }
    routePipes(true);
  }

  // Recompute pipe curves from current node positions. Cheap; runs every frame while anything moves.
  function routePipes(resizeParticles: boolean) {
    for (const p of pipes) {
      const fromSide = vertical ? p.vFromSide : p.fromSide;
      const toSide = vertical ? p.vToSide : p.toSide;
      p.p0 = anchor(p.from, fromSide, 0);
      p.p3 = anchor(p.to, toSide, vertical ? p.vToOff : p.toOff);
      const dist = Math.hypot(p.p3[0] - p.p0[0], p.p3[1] - p.p0[1]);
      const d = Math.max(24, dist * 0.45);
      p.p1 = ctrl(p.p0, fromSide, d);
      p.p2 = ctrl(p.p3, toSide, d);
      let len = 0, prev = p.p0;
      for (let i = 1; i <= 16; i++) { const q = bez(p.p0, p.p1, p.p2, p.p3, i / 16); len += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
      p.length = len;
      if (resizeParticles) {
        const want = Math.max(2, Math.round(len / 34));
        while (p.particles.length < want) p.particles.push({ t: Math.random(), speed: 0.10 + Math.random() * 0.14, r: 1.8 + Math.random() * 1.6 });
        p.particles.length = want;
      }
    }
  }

  // Spring every released node back to its slot. Underdamped on purpose: a little overshoot reads as elastic.
  function physics(dt: number): boolean {
    const k = 170, c = 11;
    let moving = false;
    for (const n of nodes) {
      if (n === dragging) { moving = true; continue; }
      const dx = n.sx - n.homeX, dy = n.sy - n.homeY;
      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 && Math.abs(n.velX) < 0.5 && Math.abs(n.velY) < 0.5) {
        n.sx = n.homeX; n.sy = n.homeY; n.velX = 0; n.velY = 0;
        continue;
      }
      n.velX += (-k * dx - c * n.velX) * dt;
      n.velY += (-k * dy - c * n.velY) * dt;
      n.sx += n.velX * dt;
      n.sy += n.velY * dt;
      moving = true;
    }
    return moving;
  }

  function drawPipe(p: Pipe) {
    ctx.beginPath();
    ctx.moveTo(p.p0[0], p.p0[1]);
    ctx.bezierCurveTo(p.p1[0], p.p1[1], p.p2[0], p.p2[1], p.p3[0], p.p3[1]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = hexToRgba(p.color, 0.16);
    ctx.lineWidth = p.width + 6;
    ctx.stroke();
    ctx.strokeStyle = hexToRgba(p.color, 0.42);
    ctx.lineWidth = p.width;
    ctx.stroke();
    ctx.strokeStyle = hexToRgba(p.color, 0.18);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawParticles(p: Pipe) {
    for (const q of p.particles) {
      const [x, y] = bez(p.p0, p.p1, p.p2, p.p3, q.t);
      ctx.beginPath();
      ctx.fillStyle = hexToRgba(p.color, 0.22);
      ctx.arc(x, y, q.r * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.arc(x, y, q.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawNode(n: PNode, now: number) {
    const x = n.sx - n.sw / 2, y = n.sy - n.sh / 2;
    const isHover = hover === n, isSel = selected === n;
    const r = n.size === 'small' ? 8 : 12;

    if (n.pulse && !reduceMotion) {
      const k = ((now / 1600) % 1);
      ctx.beginPath();
      roundRect(ctx, x - 6 - k * 14, y - 6 - k * 14, n.sw + 12 + k * 28, n.sh + 12 + k * 28, r + 8);
      ctx.strokeStyle = hexToRgba(n.color, 0.35 * (1 - k));
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.save();
    if (isHover || isSel || dragging === n) {
      ctx.shadowColor = hexToRgba(n.color, dragging === n ? 0.9 : 0.6);
      ctx.shadowBlur = dragging === n ? 34 : 22;
    }
    roundRect(ctx, x, y, n.sw, n.sh, r);
    const g = ctx.createLinearGradient(x, y, x, y + n.sh);
    g.addColorStop(0, isHover ? '#1d2740' : '#161e30');
    g.addColorStop(1, '#0f1522');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();

    roundRect(ctx, x, y, n.sw, n.sh, r);
    ctx.strokeStyle = hexToRgba(n.color, isHover || isSel ? 1 : 0.55);
    ctx.lineWidth = isSel ? 2 : 1.2;
    ctx.stroke();

    // accent bar
    ctx.fillStyle = n.color;
    ctx.fillRect(x, n.sy - 8, 3, 16);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e6edf3';
    if (n.size === 'small') {
      ctx.font = `500 ${Math.round(12 * Math.min(1, n.sw / 96))}px 'IBM Plex Mono', monospace`;
      ctx.fillText(fitText(ctx, n.label, n.sw - 12), n.sx + 1, n.sy);
      return;
    }
    const f = n.sw / (vertical ? n.vw : n.w); // node scale
    const big = n.size === 'hub';
    const maxW = n.sw - 16;
    ctx.font = `600 ${Math.round((big ? 15 : 13) * f)}px Inter, system-ui, sans-serif`;
    ctx.fillText(fitText(ctx, n.label, maxW), n.sx + 1, n.sy - (n.period ? 12 : 6) * f);
    ctx.fillStyle = '#8b98ad';
    ctx.font = `400 ${Math.round(11 * f)}px Inter, system-ui, sans-serif`;
    ctx.fillText(fitText(ctx, n.sub, maxW), n.sx + 1, n.sy + (n.period ? 3 : 10) * f);
    if (n.period) {
      ctx.fillStyle = hexToRgba(n.color, 0.9);
      ctx.font = `500 ${Math.round(9 * f)}px 'IBM Plex Mono', monospace`;
      ctx.fillText(fitText(ctx, n.period, n.sw - 8), n.sx + 1, n.sy + 17 * f);
    }
  }

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, cssW, cssH);

    // faint grid
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    const step = 40 * scale * (vertical ? 1.2 : 1);
    ctx.beginPath();
    for (let gx = 0; gx < cssW; gx += step) { ctx.moveTo(gx, 0); ctx.lineTo(gx, cssH); }
    for (let gy = 0; gy < cssH; gy += step) { ctx.moveTo(0, gy); ctx.lineTo(cssW, gy); }
    ctx.stroke();

    if (physics(dt)) routePipes(false);
    boost *= Math.exp(-3 * dt);
    const speedMul = 1 + boost;

    for (const p of pipes) drawPipe(p);
    for (const p of pipes) {
      if (!reduceMotion) for (const q of p.particles) { q.t += (dt * q.speed * speedMul * 220) / p.length; if (q.t > 1) q.t -= 1; }
      drawParticles(p);
    }
    for (const n of nodes) drawNode(n, now);

    raf = requestAnimationFrame(frame);
  }

  function hit(x: number, y: number): PNode | null {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (Math.abs(x - n.sx) <= n.sw / 2 + 4 && Math.abs(y - n.sy) <= n.sh / 2 + 4) return n;
    }
    return null;
  }
  function pos(ev: PointerEvent): [number, number] {
    const r = canvas.getBoundingClientRect();
    return [ev.clientX - r.left, ev.clientY - r.top];
  }

  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    const [x, y] = pos(ev);
    const n = hit(x, y);
    if (!n) return;
    dragging = n;
    dragDX = x - n.sx; dragDY = y - n.sy;
    dragStartX = x; dragStartY = y; dragMoved = false;
    n.velX = 0; n.velY = 0;
    // Bring the dragged node to the top of the draw order.
    nodes.splice(nodes.indexOf(n), 1); nodes.push(n);
    canvas.setPointerCapture(ev.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (ev) => {
    const [x, y] = pos(ev);
    if (dragging) {
      if (!dragMoved && Math.hypot(x - dragStartX, y - dragStartY) > 6) dragMoved = true;
      if (dragMoved) {
        ev.preventDefault();
        // Clamp so the node stays visible.
        dragging.sx = Math.max(dragging.sw / 2, Math.min(cssW - dragging.sw / 2, x - dragDX));
        dragging.sy = Math.max(dragging.sh / 2, Math.min(cssH - dragging.sh / 2, y - dragDY));
        routePipes(false);
      }
      return;
    }
    hover = hit(x, y);
    canvas.style.cursor = hover ? 'grab' : 'default';
  });
  const release = (ev: PointerEvent) => {
    if (!dragging) return;
    const n = dragging;
    dragging = null;
    if (canvas.hasPointerCapture(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId);
    if (!dragMoved) {
      selected = n; onSelect(n.select);
    } else {
      // Fling: give the spring an initial kick proportional to displacement, then let it snap home.
      const dx = n.sx - n.homeX, dy = n.sy - n.homeY;
      const dist = Math.hypot(dx, dy);
      boost = Math.min(3, dist / 60);
      if (reduceMotion) { n.sx = n.homeX; n.sy = n.homeY; routePipes(false); }
    }
    const [x, y] = pos(ev);
    hover = hit(x, y);
    canvas.style.cursor = hover ? 'grab' : 'default';
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', (ev) => {
    if (!dragging) return;
    dragging = null;
    if (canvas.hasPointerCapture(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointerleave', () => { if (!dragging) hover = null; });

  const ro = new ResizeObserver(() => layout());
  ro.observe(wrap);
  layout();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
    else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  raf = requestAnimationFrame(frame);

  return {
    select(id: string) {
      const n = nodes.find((x) => x.id === id);
      if (n) { selected = n; onSelect(n.select); }
    },
    clearSelection() { selected = null; },
    nodes: nodes.map((n) => ({ id: n.id, label: n.label })),
  };
}
