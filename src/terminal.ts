// Terminal easter egg. Fake zsh over a virtual filesystem generated from data.ts.
import { experiences, skills, leetcode, profile, formatPeriod, monthsBetween } from './data';

interface FileEntry { name: string; content: string; }

function md(e: (typeof experiences)[number]): string {
  return [
    `# ${e.company} — ${e.role}`,
    `${formatPeriod(e)} · ${e.location} · ${monthsBetween(e.start, e.end)} months`,
    '',
    `> ${e.tagline}`,
    '',
    ...e.bullets.map((b) => `- ${b}`),
    '',
    `skills: ${e.skills.join(', ')}`,
    e.link ? `link: ${e.link}` : '',
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}

const files: FileEntry[] = [
  { name: 'README.md', content: `# ${profile.name}\n${profile.title}\n${profile.location}\n\n${profile.summary}\n\nemail: ${profile.email}\ngithub: ${profile.github}\nlinkedin: ${profile.linkedin}\nleetcode: ${profile.leetcode}` },
  ...experiences.map((e) => ({ name: `${e.id}.md`, content: md(e) })),
  { name: 'skills.txt', content: skills.map((s) => `${s.name.padEnd(34)} ${s.category.padEnd(10)} ~${s.years}y (since ${s.since})`).join('\n') },
  { name: 'languages.txt', content: profile.languages.map((l) => `${l.name.padEnd(10)} ${l.level}`).join('\n') },
  { name: 'interests.txt', content: profile.interests.join('\n') },
  { name: '.secret', content: 'You found it. The real secret: I read the whole error message before googling it.' },
];

const commands = ['help', 'ls', 'cat', 'git', 'top', 'curl', 'leetcode', 'whoami', 'pwd', 'man', 'clear', 'exit', 'piano', 'climb', 'sudo', 'echo', 'date', 'uptime', 'contact', 'open'];

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function linkify(s: string): string {
  return esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

function gitLog(): string {
  const sorted = [...experiences].sort((a, b) => (a.start < b.start ? 1 : -1));
  const lines: string[] = [];
  for (const e of sorted) {
    const hash = Array.from(e.id).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16).slice(0, 7).padStart(7, '0');
    const isBranch = e.kind === 'branch';
    const branch = isBranch ? ' (side-project)' : e.end === null ? ' (HEAD -> main)' : '';
    const star = isBranch ? '| *' : '*  ';
    lines.push(`<span class="hl">${star} ${hash}</span><span class="blue">${branch}</span> <span class="cmd">${esc(e.company)}</span>: ${esc(e.role)}`);
    lines.push(`<span class="dim">${isBranch ? '|/' : '|'}    ${formatPeriod(e)} · ${esc(e.location)}</span>`);
    if (!isBranch) for (const b of e.bullets.slice(0, 2)) lines.push(`<span class="dim">|</span>      <span class="out">${esc(b.length > 110 ? b.slice(0, 107) + '…' : b)}</span>`);
    lines.push('<span class="dim">|</span>');
  }
  lines.push('<span class="hl">*  0000000</span> <span class="cmd">Initial commit</span>: born curious');
  return lines.join('\n');
}

function top(): string {
  const head = `<span class="dim">Processes: ${skills.length} total, ${skills.length} running · Load Avg: 5.00, 4.20, 3.14 · CPU usage: 100% engineering</span>\n\n` +
    `<span class="hl">${'PID'.padEnd(6)}${'COMMAND'.padEnd(34)}${'%CPU'.padStart(6)}  ${'TIME'.padStart(7)}  CATEGORY</span>`;
  const rows = [...skills].sort((a, b) => b.years - a.years).map((s, i) => {
    const cpu = Math.min(99, Math.round((s.years / 5) * 99));
    return `${String(1000 + i).padEnd(6)}${esc(s.name).padEnd(34)}${String(cpu).padStart(6)}  ${`${s.years}y`.padStart(7)}  <span class="dim">${s.category}</span>`;
  });
  return head + '\n' + rows.join('\n');
}

async function curlGithub(): Promise<string> {
  const u = profile.githubUser;
  const [user, repos] = await Promise.all([
    fetch(`https://api.github.com/users/${u}`).then((r) => r.json()),
    fetch(`https://api.github.com/users/${u}/repos?per_page=100&sort=pushed`).then((r) => r.json()),
  ]);
  if (!user || !user.login) return `<span class="err">GitHub API rate-limited or unreachable. Try ${profile.github} directly.</span>`;
  const lines = [
    `<span class="ok">HTTP/2 200</span>`,
    `${'login'.padEnd(14)}${esc(user.login)}`,
    `${'name'.padEnd(14)}${esc(user.name ?? '')}`,
    `${'public_repos'.padEnd(14)}${user.public_repos}`,
    `${'followers'.padEnd(14)}${user.followers}`,
    `${'created_at'.padEnd(14)}${String(user.created_at).slice(0, 10)}`,
    '',
    `<span class="hl">recently pushed</span>`,
  ];
  if (Array.isArray(repos)) {
    for (const r of repos.slice(0, 8)) {
      lines.push(`  ${esc(r.name).padEnd(32)} ${esc(r.language ?? '—').padEnd(12)} ${String(r.pushed_at).slice(0, 10)}  <span class="dim">${esc(r.description ?? '')}</span>`);
    }
  }
  lines.push('', `<span class="dim">maintainer of</span> https://github.com/google/dwh-migration-tools <span class="dim">(Google org, not counted above)</span>`);
  return linkify(lines.join('\n')).replace(/&lt;span class="(\w+)"&gt;/g, '<span class="$1">').replace(/&lt;\/span&gt;/g, '</span>');
}

function leet(): string {
  const total = leetcode.solved.reduce((a, s) => a + s.count, 0);
  const bar = (n: number, t: number) => {
    const w = 30, f = Math.round((n / t) * w * 6); // scaled so bars are visible
    return '<span class="ok">' + '█'.repeat(Math.min(w, f)) + '</span>' + '<span class="dim">' + '░'.repeat(Math.max(0, w - f)) + '</span>';
  };
  return [
    `<span class="hl">${profile.leetcode}</span>`,
    `solved ${total} · ranking #${leetcode.ranking.toLocaleString()} · snapshot ${leetcode.snapshotDate}`,
    '',
    ...leetcode.solved.map((s) => `${s.difficulty.padEnd(8)} ${bar(s.count, s.total)} ${String(s.count).padStart(4)} / ${s.total}`),
  ].join('\n');
}

let audio: AudioContext | null = null;
function piano(): string {
  try {
    audio ??= new AudioContext();
    const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 261.63]; // C E G C G E C
    const t0 = audio.currentTime;
    notes.forEach((f, i) => {
      const o = audio!.createOscillator();
      const g = audio!.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + i * 0.22 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.22 + 0.5);
      o.connect(g).connect(audio!.destination);
      o.start(t0 + i * 0.22);
      o.stop(t0 + i * 0.22 + 0.55);
    });
    return '<span class="ok">♪ C major arpeggio</span> <span class="dim">(WebAudio, triangle wave, no samples)</span>\n' +
      '<span class="dim">Real piano available on request. Usually after 20:00.</span>';
  } catch {
    return '<span class="err">no audio device</span>';
  }
}

function climb(): string {
  const wall = [
    '            <span class="ok">⚑</span>  Google · BigQuery (2024–)',
    '          ●',
    '        ●     DevExperts (2024)',
    '      ●',
    '    ●         Bank of Georgia · SWE (2022–24)',
    '  ●           Azry (2022)',
    '●             Bank of Georgia · Data Analyst (2021)',
    '<span class="dim">▔▔▔▔▔▔▔▔▔▔▔▔▔▔</span> Lund University (2019–21)',
    '',
    '<span class="dim">Rock climbing: real. Career: also mostly vertical.</span>',
  ];
  return wall.join('\n');
}

export function mountTerminal(root: HTMLElement, screen: HTMLElement, closeBtn: HTMLElement, openBtn: HTMLElement) {
  let inputEl: HTMLInputElement | null = null;
  const history: string[] = [];
  let hIdx = -1;

  function print(html: string, cls = 'out') {
    const d = document.createElement('div');
    d.className = `line ${cls}`;
    d.innerHTML = html;
    screen.appendChild(d);
  }
  function scroll() { screen.scrollTop = screen.scrollHeight; }

  function prompt() {
    const line = document.createElement('div');
    line.className = 'line terminal-input-line';
    line.innerHTML = `<span class="prompt">kakha@bigquery</span><span class="dim">:~$ </span>`;
    const inp = document.createElement('input');
    inp.className = 'terminal-input';
    inp.autocomplete = 'off';
    inp.autocapitalize = 'off';
    inp.spellcheck = false;
    inp.setAttribute('aria-label', 'terminal input');
    line.appendChild(inp);
    screen.appendChild(line);
    inputEl = inp;
    inp.focus();
    scroll();
    inp.addEventListener('keydown', onKey);
  }

  function freezeInput() {
    if (!inputEl) return;
    const v = inputEl.value;
    const span = document.createElement('span');
    span.className = 'cmd';
    span.textContent = v;
    inputEl.replaceWith(span);
    inputEl = null;
  }

  async function onKey(ev: KeyboardEvent) {
    const inp = ev.target as HTMLInputElement;
    if (ev.key === 'Enter') {
      const raw = inp.value;
      freezeInput();
      if (raw.trim()) { history.push(raw); hIdx = history.length; }
      await run(raw.trim());
      if (root.hidden) return;
      prompt();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (history.length) { hIdx = Math.max(0, hIdx - 1); inp.value = history[hIdx] ?? ''; }
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      hIdx = Math.min(history.length, hIdx + 1);
      inp.value = history[hIdx] ?? '';
    } else if (ev.key === 'Tab') {
      ev.preventDefault();
      const parts = inp.value.split(/\s+/);
      const last = parts[parts.length - 1];
      const pool = parts.length === 1 ? commands : files.map((f) => f.name);
      const m = pool.filter((c) => c.startsWith(last));
      if (m.length === 1) { parts[parts.length - 1] = m[0]; inp.value = parts.join(' ') + (parts.length === 1 && m[0] === 'cat' ? ' ' : ''); }
      else if (m.length > 1) { freezeInput(); print(m.join('  '), 'dim'); prompt(); inputEl!.value = inp.value; }
    } else if (ev.key === 'c' && ev.ctrlKey) {
      freezeInput(); print('^C', 'dim'); prompt();
    } else if (ev.key === 'l' && ev.ctrlKey) {
      ev.preventDefault(); screen.innerHTML = ''; prompt();
    } else if (ev.key === 'Escape') {
      close();
    }
  }

  async function run(cmdline: string) {
    if (!cmdline) return;
    const [cmd, ...args] = cmdline.split(/\s+/);
    switch (cmd) {
      case 'help':
        print([
          '<span class="hl">commands</span>',
          '  ls                 list files',
          '  cat &lt;file&gt;         read a file (try cat google.md)',
          '  git log --graph    career as a commit graph',
          '  top                skills as running processes',
          '  curl github        live stats from the GitHub API',
          '  leetcode           solved problems (snapshot)',
          '  whoami · contact · man kakha',
          '  piano · climb      interests, interactively',
          '  open &lt;pipeline|sql|skills&gt;   jump to a section',
          '  clear · exit       (esc also closes)',
          '<span class="dim">tab completes, ↑↓ history, ctrl+l clears</span>',
        ].join('\n'));
        break;
      case 'ls':
        print(files.filter((f) => args.includes('-a') || !f.name.startsWith('.')).map((f) => f.name.endsWith('.md') ? `<span class="blue">${f.name}</span>` : f.name).join('  '));
        break;
      case 'cat': {
        if (!args[0]) { print('usage: cat &lt;file&gt;', 'err'); break; }
        const f = files.find((x) => x.name === args[0] || x.name === args[0] + '.md');
        if (!f) print(`cat: ${esc(args[0])}: No such file or directory`, 'err');
        else print(linkify(f.content));
        break;
      }
      case 'git':
        if (args[0] === 'log') print(gitLog());
        else if (args[0] === 'status') print('On branch main\nYour branch is up to date.\n\nnothing to commit, shipping clean');
        else if (args[0] === 'blame') print('It was DNS.');
        else print(`git: '${esc(args.join(' '))}' is not a git command. Try: git log --graph`, 'err');
        break;
      case 'top': print(top()); break;
      case 'curl':
        if (/github/i.test(args.join(' '))) {
          print('<span class="dim">GET https://api.github.com/users/kaxuna …</span>');
          try { print(await curlGithub()); } catch { print(`curl: (7) Failed to connect to api.github.com (blocked or offline). See ${profile.github}`, 'err'); }
        }
        else if (/leetcode/i.test(args.join(' '))) print(leet());
        else print(`curl: (6) Could not resolve host: ${esc(args[0] ?? '')}. Try: curl github`, 'err');
        break;
      case 'leetcode': print(leet()); break;
      case 'whoami': print(`${profile.name} · ${profile.title} · ${profile.location}`); break;
      case 'contact': print(linkify(`email     ${profile.email}\ngithub    ${profile.github}\nlinkedin  ${profile.linkedin}\nleetcode  ${profile.leetcode}`)); break;
      case 'pwd': print('/home/kakha'); break;
      case 'date': print(new Date().toString()); break;
      case 'uptime': print(`up ${monthsBetween('2021-05', null)} months at work, load average: two on-call rotations`); break;
      case 'echo': print(esc(args.join(' '))); break;
      case 'man':
        if (args[0] === 'kakha') print(`<span class="hl">KAKHA(1)</span>\n\n<span class="hl">NAME</span>\n    kakha - backend engineer, data infrastructure\n\n<span class="hl">SYNOPSIS</span>\n    kakha [--java] [--bigquery] [--on-call] [--llm-tooling] [--interview]\n\n<span class="hl">DESCRIPTION</span>\n    ${esc(profile.summary)}\n\n<span class="hl">SEE ALSO</span>\n    git log --graph, cat google.md, curl github`);
        else print(`No manual entry for ${esc(args[0] ?? '')}. Try: man kakha`, 'err');
        break;
      case 'piano': print(piano()); break;
      case 'climb': print(climb()); break;
      case 'sudo': print('kakha is not in the sudoers file. This incident will be reported to… nobody. No backend.', 'err'); break;
      case 'open': {
        const t = args[0];
        if (t === 'pipeline' || t === 'sql' || t === 'skills') { close(); location.hash = t; }
        else print('usage: open &lt;pipeline|sql|skills&gt;', 'err');
        break;
      }
      case 'clear': screen.innerHTML = ''; break;
      case 'exit': close(); break;
      default:
        print(`zsh: command not found: ${esc(cmd)}. Type <span class="cmd">help</span>.`, 'err');
    }
    scroll();
  }

  function open() {
    if (!root.hidden) return;
    root.hidden = false;
    if (!screen.childElementCount) {
      print(`<span class="hl">Welcome.</span> This is a ${'fake'} shell over my resume. Type <span class="cmd">help</span> to start.`);
      print(`<span class="dim">Last login: ${new Date().toDateString()} on ttys000</span>`);
    }
    prompt();
  }
  function close() {
    root.hidden = true;
    freezeInput();
  }

  document.addEventListener('keydown', (ev) => {
    const target = ev.target as HTMLElement | null;
    const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    if ((ev.key === '~' || ev.key === '`') && !typing && root.hidden) { ev.preventDefault(); open(); }
    else if (ev.key === 'Escape' && !root.hidden) close();
  });
  root.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).tagName !== 'A') inputEl?.focus();
  });
  closeBtn.addEventListener('click', close);
  openBtn.addEventListener('click', open);

  return { open, close };
}
