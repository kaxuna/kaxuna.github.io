// In-browser SQL console over the resume, powered by DuckDB-WASM (loaded lazily from jsDelivr).
import { experiences, skills, warehouses, leetcode, profile, monthsBetween } from '../data';

type Duck = typeof import('@duckdb/duckdb-wasm');
type Conn = import('@duckdb/duckdb-wasm').AsyncDuckDBConnection;

const q = (s: string | null | undefined) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

export const presets: { label: string; sql: string }[] = [
  { label: 'longest stints', sql: `SELECT company, role, months\nFROM experience\nORDER BY months DESC;` },
  { label: 'skills by years', sql: `SELECT name, category, years\nFROM skills\nORDER BY years DESC, name;` },
  { label: 'what happened at Google', sql: `SELECT n, highlight\nFROM highlights\nWHERE experience_id = 'google'\nORDER BY n;` },
  { label: 'grep LLM', sql: `SELECT e.company, h.highlight\nFROM highlights h\nJOIN experience e ON e.id = h.experience_id\nWHERE h.highlight ILIKE '%LLM%';` },
  { label: 'running months (window fn)', sql: `SELECT company, role, start_date,\n       SUM(months) OVER (ORDER BY start_date) AS cumulative_months\nFROM experience\nORDER BY start_date;` },
  { label: 'skills per job', sql: `SELECT e.company, COUNT(*) AS n_skills,\n       STRING_AGG(s.skill, ', ' ORDER BY s.skill) AS skills\nFROM experience_skills s\nJOIN experience e ON e.id = s.experience_id\nGROUP BY e.company\nORDER BY n_skills DESC;` },
  { label: 'leetcode', sql: `SELECT difficulty, solved, total,\n       ROUND(100.0 * solved / total, 1) AS pct_of_all\nFROM leetcode;` },
  { label: 'warehouses', sql: `SELECT * FROM warehouses;` },
  { label: 'hire?', sql: `SELECT 'yes' AS answer,\n       ${q(profile.email)} AS contact,\n       'Warsaw / remote' AS location;` },
];

export const schemaText = `experience(id, company, role, location, start_date DATE, end_date DATE, months INT, kind, tagline, link)
highlights(experience_id, n INT, highlight)
experience_skills(experience_id, skill)
skills(name, category, years INT, since INT)
projects(name, url, role, description, stack)
warehouses(name, extracted_by, feeds, notes)
leetcode(difficulty, solved INT, total INT, snapshot_date DATE)
languages(name, level)
interests(name)`;

function seedSql(): string {
  const stmts: string[] = [];
  stmts.push(`CREATE TABLE experience(id VARCHAR, company VARCHAR, role VARCHAR, location VARCHAR, start_date DATE, end_date DATE, months INTEGER, kind VARCHAR, tagline VARCHAR, link VARCHAR);`);
  stmts.push(`INSERT INTO experience VALUES ` + experiences.map((e) =>
    `(${q(e.id)}, ${q(e.company)}, ${q(e.role)}, ${q(e.location)}, DATE '${e.start}-01', ${e.end ? `DATE '${e.end}-01'` : 'NULL'}, ${monthsBetween(e.start, e.end)}, ${q(e.kind)}, ${q(e.tagline)}, ${q(e.link ?? null)})`).join(',\n') + ';');

  stmts.push(`CREATE TABLE highlights(experience_id VARCHAR, n INTEGER, highlight VARCHAR);`);
  stmts.push(`INSERT INTO highlights VALUES ` + experiences.flatMap((e) => e.bullets.map((b, i) => `(${q(e.id)}, ${i + 1}, ${q(b)})`)).join(',\n') + ';');

  stmts.push(`CREATE TABLE experience_skills(experience_id VARCHAR, skill VARCHAR);`);
  stmts.push(`INSERT INTO experience_skills VALUES ` + experiences.flatMap((e) => e.skills.map((s) => `(${q(e.id)}, ${q(s)})`)).join(',\n') + ';');

  stmts.push(`CREATE TABLE skills(name VARCHAR, category VARCHAR, years INTEGER, since INTEGER);`);
  stmts.push(`INSERT INTO skills VALUES ` + skills.map((s) => `(${q(s.name)}, ${q(s.category)}, ${s.years}, ${s.since})`).join(',\n') + ';');

  const ff = experiences.find((e) => e.id === 'fixfox')!;
  stmts.push(`CREATE TABLE projects(name VARCHAR, url VARCHAR, role VARCHAR, description VARCHAR, stack VARCHAR);`);
  stmts.push(`INSERT INTO projects VALUES (${q('FixFox')}, ${q('https://fixfox.ge')}, ${q(ff.role)}, ${q(ff.bullets[0])}, ${q(ff.skills.join(', '))}),
    (${q('google/dwh-migration-tools')}, ${q('https://github.com/google/dwh-migration-tools')}, ${q('Maintainer of the Dumper')}, ${q('Open-source extraction layer of the BigQuery Migration Service: DDL metadata and query logs from Teradata, Redshift, Snowflake and Oracle.')}, ${q('Java, JDBC, GitHub Actions')}),
    (${q('this website')}, ${q(profile.github + '/kaxuna.github.io')}, ${q('Author')}, ${q('Interactive portfolio: canvas pipeline, DuckDB-WASM SQL console, terminal easter egg. No backend.')}, ${q('TypeScript, Vite, canvas, DuckDB-WASM')});`);

  stmts.push(`CREATE TABLE warehouses(name VARCHAR, extracted_by VARCHAR, feeds VARCHAR, notes VARCHAR);`);
  const notes: Record<string, string> = {
    teradata: 'DBQL query logs + DDL metadata',
    redshift: 'system tables + query history',
    snowflake: 'over 3x fewer redundant queries after canonical hashing',
    oracle: 'DDL + workload extraction',
  };
  stmts.push(`INSERT INTO warehouses VALUES ` + warehouses.map((w) => `(${q(w.label)}, 'Dumper (google/dwh-migration-tools)', 'BigQuery Migration Service', ${q(notes[w.id])})`).join(',\n') + ';');

  stmts.push(`CREATE TABLE leetcode(difficulty VARCHAR, solved INTEGER, total INTEGER, snapshot_date DATE);`);
  stmts.push(`INSERT INTO leetcode VALUES ` + leetcode.solved.map((s) => `(${q(s.difficulty)}, ${s.count}, ${s.total}, DATE '${leetcode.snapshotDate}')`).join(',\n') + ';');

  stmts.push(`CREATE TABLE languages(name VARCHAR, level VARCHAR);`);
  stmts.push(`INSERT INTO languages VALUES ` + profile.languages.map((l) => `(${q(l.name)}, ${q(l.level)})`).join(',\n') + ';');

  stmts.push(`CREATE TABLE interests(name VARCHAR);`);
  stmts.push(`INSERT INTO interests VALUES ` + profile.interests.map((i) => `(${q(i)})`).join(', ') + ';');
  return stmts.join('\n');
}

let connPromise: Promise<Conn> | null = null;

declare global { interface Window { __SANDBOXED_PREVIEW__?: boolean } }

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} timed out after ${ms / 1000}s`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export function getConnection(onStatus: (s: string) => void): Promise<Conn> {
  if (connPromise) return connPromise;
  connPromise = (async () => {
    if (window.__SANDBOXED_PREVIEW__) throw new Error('sandboxed preview');
    onStatus('loading DuckDB-WASM (a few MB, cached after first load)…');
    const duckdb: Duck = await import('@duckdb/duckdb-wasm');
    const bundles = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(bundles);
    const workerUrl = URL.createObjectURL(new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }));
    const worker = new Worker(workerUrl);
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
    await withTimeout(db.instantiate(bundle.mainModule, bundle.pthreadWorker), 45000, 'DuckDB download');
    URL.revokeObjectURL(workerUrl);
    const conn = await db.connect();
    onStatus('seeding tables…');
    for (const stmt of seedSql().split(';\n')) {
      const s = stmt.trim();
      if (s) await conn.query(s);
    }
    onStatus('ready');
    return conn;
  })();
  connPromise.catch(() => { connPromise = null; });
  return connPromise;
}

export interface QueryResult { columns: string[]; rows: unknown[][]; ms: number; }

function normalize(v: unknown, typeName: string): unknown {
  if (v == null) return null;
  if (typeof v === 'bigint') return Number(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (/Date/i.test(typeName) && typeof v === 'number') return new Date(v).toISOString().slice(0, 10);
  if (typeof v === 'object' && 'toArray' in (v as object)) return JSON.stringify((v as { toArray(): unknown[] }).toArray());
  return v;
}

export async function runQuery(conn: Conn, sql: string): Promise<QueryResult> {
  const t0 = performance.now();
  const res = await conn.query(sql);
  const ms = performance.now() - t0;
  const fields = res.schema.fields;
  const columns = fields.map((f) => f.name);
  const rows: unknown[][] = [];
  for (const row of res.toArray()) {
    const obj = row.toJSON() as Record<string, unknown>;
    rows.push(fields.map((f) => normalize(obj[f.name], f.type.toString())));
  }
  return { columns, rows, ms };
}

// Toy Teradata → BigQuery translator. Handful of rewrites, purely for fun.
export function translateTeradata(sql: string): { out: string; notes: string[] } {
  const notes: string[] = [];
  let out = sql;
  const rule = (re: RegExp, rep: string | ((...m: string[]) => string), note: string) => {
    if (re.test(out)) { out = out.replace(re, rep as string); notes.push(note); }
  };
  rule(/\bSEL\b/gi, 'SELECT', 'SEL → SELECT');
  rule(/\bZEROIFNULL\s*\(([^()]*)\)/gi, 'IFNULL($1, 0)', 'ZEROIFNULL(x) → IFNULL(x, 0)');
  rule(/\bNULLIFZERO\s*\(([^()]*)\)/gi, 'NULLIF($1, 0)', 'NULLIFZERO(x) → NULLIF(x, 0)');
  rule(/\bADD_MONTHS\s*\(([^,()]+),\s*([^()]+)\)/gi, 'DATE_ADD($1, INTERVAL $2 MONTH)', 'ADD_MONTHS → DATE_ADD … INTERVAL n MONTH');
  rule(/\(FORMAT\s+'[^']*'\)/gi, '', "(FORMAT '…') dropped, use FORMAT_DATE in BigQuery");
  rule(/\bCAST\s*\(\s*([^()]+?)\s+AS\s+DATE\s+FORMAT\s+'YYYY-MM-DD'\s*\)/gi, "PARSE_DATE('%Y-%m-%d', $1)", "CAST(... AS DATE FORMAT 'YYYY-MM-DD') → PARSE_DATE");
  rule(/\bSUBSTR\s*\(/gi, 'SUBSTR(', 'SUBSTR kept (BigQuery supports it)');
  rule(/\bINDEX\s*\(([^,()]+),\s*([^()]+)\)/gi, 'STRPOS($1, $2)', 'INDEX(s, sub) → STRPOS(s, sub)');
  rule(/\bCURRENT_DATE\b(?!\s*\()/gi, 'CURRENT_DATE()', 'CURRENT_DATE → CURRENT_DATE()');
  rule(/\b(\w+)\s*\*\*\s*(\w+)/g, 'POW($1, $2)', 'x ** y → POW(x, y)');
  rule(/\bMOD\b/gi, 'MOD', 'MOD kept: BigQuery has MOD(x, y)');
  rule(/\bSAMPLE\s+(\d+)\b/gi, 'LIMIT $1', 'SAMPLE n → LIMIT n (approximation)');
  rule(/\bQUALIFY\b/gi, 'QUALIFY', 'QUALIFY kept: BigQuery supports it natively');
  // TOP n → LIMIT n at the end
  const top = /\bSELECT\s+TOP\s+(\d+)\s+/i.exec(out);
  if (top) {
    out = out.replace(top[0], 'SELECT ');
    out = out.replace(/;?\s*$/, ` LIMIT ${top[1]};`);
    notes.push(`TOP ${top[1]} → LIMIT ${top[1]}`);
  }
  if (notes.length === 0) notes.push('nothing Teradata-specific found. Looks like it already speaks BigQuery.');
  return { out, notes };
}

export function mountSql(root: {
  input: HTMLTextAreaElement; run: HTMLButtonElement; translate: HTMLButtonElement; translateOut: HTMLElement;
  status: HTMLElement; presets: HTMLElement; result: HTMLElement; meta: HTMLElement; chart: HTMLElement; schema: HTMLElement;
}) {
  const { input, run, translate, translateOut, status, presets: presetBox, result, meta, chart, schema } = root;
  schema.textContent = schemaText;
  let busy = false;

  const setStatus = (s: string, cls: '' | 'ok' | 'err' = '') => { status.textContent = s; status.className = `status ${cls}`; };

  for (const p of presets) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.label;
    b.addEventListener('click', () => { input.value = p.sql; input.focus(); void execute(); });
    presetBox.appendChild(b);
  }
  input.value = presets[0].sql;

  function renderTable(r: QueryResult) {
    result.innerHTML = '';
    if (r.rows.length === 0) { result.innerHTML = '<div class="empty">0 rows</div>'; return; }
    const t = document.createElement('table');
    const thead = t.createTHead().insertRow();
    r.columns.forEach((c) => { const th = document.createElement('th'); th.textContent = c; thead.appendChild(th); });
    const tb = t.createTBody();
    for (const row of r.rows) {
      const tr = tb.insertRow();
      row.forEach((v) => {
        const td = tr.insertCell();
        const s = v == null ? 'NULL' : String(v);
        td.textContent = s;
        if (typeof v === 'number') td.className = 'num';
        else if (s.length > 60) td.className = 'long';
        if (v == null) td.style.color = 'var(--muted)';
        if (typeof v === 'string' && /^https?:\/\//.test(v)) { td.innerHTML = ''; const a = document.createElement('a'); a.href = v; a.target = '_blank'; a.rel = 'noopener'; a.textContent = v; td.appendChild(a); }
      });
    }
    result.appendChild(t);
  }

  function renderChart(r: QueryResult) {
    chart.hidden = true;
    if (r.rows.length < 2 || r.rows.length > 30 || r.columns.length < 2) return;
    const labelIdx = r.rows[0].findIndex((v) => typeof v === 'string');
    const numIdx = r.rows[0].findIndex((v) => typeof v === 'number');
    if (labelIdx < 0 || numIdx < 0) return;
    const max = Math.max(...r.rows.map((row) => Number(row[numIdx]) || 0));
    if (!(max > 0)) return;
    chart.innerHTML = `<div class="result-meta">${r.columns[numIdx]} by ${r.columns[labelIdx]}</div>`;
    for (const row of r.rows) {
      const v = Number(row[numIdx]) || 0;
      const d = document.createElement('div');
      d.className = 'row';
      d.innerHTML = `<span></span><div class="bar" style="width:${(100 * v) / max}%"></div><span></span>`;
      (d.children[0] as HTMLElement).textContent = String(row[labelIdx]);
      (d.children[2] as HTMLElement).textContent = Number.isInteger(v) ? String(v) : v.toFixed(1);
      chart.appendChild(d);
    }
    chart.hidden = false;
  }

  async function execute() {
    if (busy) return;
    const sql = input.value.trim();
    if (!sql) return;
    busy = true;
    try {
      let conn: Conn;
      try { conn = await getConnection((s) => setStatus(s)); } catch (e) { showLoadFailure(e); return; }
      setStatus('running…');
      const r = await runQuery(conn, sql);
      renderTable(r);
      renderChart(r);
      meta.textContent = `${r.rows.length} row${r.rows.length === 1 ? '' : 's'} · ${r.columns.length} col${r.columns.length === 1 ? '' : 's'} · ${r.ms.toFixed(1)} ms · DuckDB in your browser`;
      setStatus('ok', 'ok');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.innerHTML = '';
      const d = document.createElement('div'); d.className = 'error'; d.textContent = msg; result.appendChild(d);
      chart.hidden = true;
      meta.textContent = '';
      setStatus('error', 'err');
    } finally {
      busy = false;
    }
  }

  run.addEventListener('click', () => void execute());
  input.addEventListener('keydown', (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') { ev.preventDefault(); void execute(); }
  });
  translate.addEventListener('click', () => {
    const src = input.value.trim() || `SEL TOP 10 cust_id, ZEROIFNULL(spend) AS spend,\n    CAST(order_ts AS DATE FORMAT 'YYYY-MM-DD') AS d\nFROM orders\nWHERE ADD_MONTHS(order_ts, 3) > CURRENT_DATE\nQUALIFY ROW_NUMBER() OVER (PARTITION BY cust_id ORDER BY spend DESC) = 1`;
    if (!input.value.trim()) input.value = src;
    const { out, notes } = translateTeradata(src);
    translateOut.hidden = false;
    translateOut.innerHTML = '';
    const b = document.createElement('b'); b.textContent = '-- BigQuery (toy translator, the real one lives in the Migration Service)\n';
    translateOut.appendChild(b);
    translateOut.appendChild(document.createTextNode(out + '\n\n'));
    const n = document.createElement('span'); n.style.color = 'var(--muted)'; n.textContent = notes.map((x) => '• ' + x).join('\n');
    translateOut.appendChild(n);
  });

  return { execute, warm: () => getConnection((s) => setStatus(s)).catch(showLoadFailure) };

  function showLoadFailure(e: unknown) {
    {
      const msg = e instanceof Error ? e.message : String(e);
      const sandboxed = /sandboxed preview/.test(msg);
      setStatus(sandboxed ? 'unavailable in this preview' : 'DuckDB could not load', 'err');
      result.innerHTML = '';
      const d = document.createElement('div');
      d.className = 'error';
      d.textContent = sandboxed
        ? 'This preview sandbox blocks WebAssembly downloads, so the in-browser database cannot start here. On the deployed site this tab runs real DuckDB queries over the resume; see the presets on the left for what it does.'
        : `DuckDB-WASM failed to load (${msg}). Check your connection and try again.`;
      result.appendChild(d);
      run.disabled = sandboxed;
    }
  }
}
