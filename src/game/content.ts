// Everything the game says about Kakha lives here: stages, achievements, and level layouts.
// Long achievement texts come straight from the resume bullets in ../data.ts.
import { experiences } from '../data';

export type ThemeId =
  | 'school' | 'lund' | 'covid' | 'tbilisi' | 'azry'
  | 'bank' | 'trading' | 'warsaw' | 'night' | 'finale';

export interface Achievement {
  key: string;
  title: string;
  short: string; // one line, shown in the toast
  full: string; // shown in the logbook
}

/** Level-authoring API. x is in tiles from the stage's left edge, row 0 is the top, ground is rows 13–14. */
export interface Builder {
  pit(from: number, to: number): void;
  bricks(x: number, row: number, n?: number): void;
  block(x: number, row: number, key: string): void;
  plat(x: number, row: number, n: number): void;
  column(x: number, h: number): void;
  stairsUp(x: number, n: number): void;
  stairsDown(x: number, n: number): void;
  pipe(x: number, h: number, label?: string): void;
  candle(x: number, h: number, up: boolean): void;
  gem(x: number, row: number, skill: string): void;
  bug(x: number): void;
  virus(x: number, row: number): void;
  sign(x: number, text: string): void;
  fox(x: number): void;
  door(x: number): void;
}

export interface Stage {
  id: string;
  title: string;
  role: string;
  period: string;
  place: string;
  blurb: string;
  theme: ThemeId;
  width: number; // tiles
  achievements: Achievement[];
  build(b: Builder): void;
}

const bullet = (id: string, i: number): string => experiences.find((e) => e.id === id)?.bullets[i] ?? '';
const a = (key: string, title: string, short: string, full = short): Achievement => ({ key, title, short, full });

export const stages: Stage[] = [
  {
    id: 'school',
    title: 'High school',
    role: 'Mathematics Olympiad',
    period: 'Before 2019',
    place: 'Georgia',
    blurb: 'Where it started: competition maths, and a top-15 finish at the olympiad.',
    theme: 'school',
    width: 48,
    achievements: [
      a('olympiad', 'Olympiad winner · top 15', 'Top-15 finisher at the high-school Mathematics Olympiad.'),
    ],
    build(b) {
      b.sign(3, 'Hi, I’m Kakha. This is my career as a side-scroller. Walk right and jump into the blocks.');
      b.gem(8, 11, 'Mathematics');
      b.bricks(11, 9);
      b.block(12, 9, 'olympiad');
      b.bricks(13, 9);
      b.sign(18, 'That red thing is a bug. Jump on it. You’ll be doing this for a living.');
      b.bug(23);
      b.plat(27, 10, 4);
      b.gem(28, 7, 'Problem solving');
      b.stairsUp(34, 3);
      b.stairsDown(37, 3);
    },
  },
  {
    id: 'lund',
    title: 'Lund University',
    role: 'Computer Science',
    period: '2019 – 2021',
    place: 'Lund, Sweden',
    blurb: 'Moved to Sweden to study Computer Science at Lund University.',
    theme: 'lund',
    width: 64,
    achievements: [
      a('lund', 'Moved to Sweden', 'Computer Science at Lund University, from September 2019.'),
      a('swedish', 'Svenska: flytande', 'Swedish, fluent. One of four languages, with Georgian, English and Russian.'),
    ],
    build(b) {
      b.sign(3, 'Lund, Sweden. Autumn 2019. Computer Science at Lund University.');
      b.bricks(8, 9, 2);
      b.block(10, 9, 'lund');
      b.bricks(11, 9, 2);
      b.gem(10, 6, 'Algorithms');
      b.bug(16);
      b.pit(20, 22);
      b.plat(26, 9, 3);
      b.gem(27, 6, 'Data structures');
      b.block(34, 9, 'swedish');
      b.bug(38);
      b.bug(42);
      b.stairsUp(46, 4);
      b.column(50, 4);
      b.gem(50, 6, 'Swedish');
      b.stairsDown(51, 4);
    },
  },
  {
    id: 'covid',
    title: 'Plot twist',
    role: 'COVID-19',
    period: '2020 – 2021',
    place: 'Lund → Tbilisi',
    blurb: 'The pandemic closed campus in second year. Dropped out, went home, started working.',
    theme: 'covid',
    width: 52,
    achievements: [
      a(
        'pivot',
        'Plot twist',
        'COVID-19 hit in second year. Dropped out of Lund and headed home to Georgia.',
        'The pandemic closed campuses during my second year at Lund. I dropped out, went home to Georgia, and started working in data instead.',
      ),
    ],
    build(b) {
      b.sign(3, '2020. Campus closes and everything goes remote. Mind the viruses.');
      b.virus(10, 8);
      b.block(14, 9, 'pivot');
      b.virus(19, 6);
      b.pit(23, 25);
      b.virus(29, 8);
      b.virus(34, 7);
      b.sign(38, 'Dropped out in second year and flew home. Next stop: a first job in Tbilisi.');
      b.pipe(44, 2, 'TBILISI');
    },
  },
  {
    id: 'bog-analyst',
    title: 'Bank of Georgia',
    role: 'Data Analyst',
    period: '2021',
    place: 'Tbilisi, Georgia',
    blurb: 'First job. SQL, data mining, and reports people actually used.',
    theme: 'tbilisi',
    width: 52,
    achievements: [
      a('sql', 'First job: Data Analyst', 'SQL-based data mining and reporting at Bank of Georgia.', bullet('bog-analyst', 0)),
      a('reports', 'Reports that got used', 'Report Builder reports behind operational decisions.', bullet('bog-analyst', 1)),
    ],
    build(b) {
      b.sign(3, 'Tbilisi, May 2021. First job: Data Analyst at Bank of Georgia.');
      b.bricks(8, 9);
      b.block(9, 9, 'sql');
      b.bricks(10, 9);
      b.gem(9, 6, 'SQL');
      b.bug(15);
      b.plat(20, 10, 3);
      b.plat(24, 7, 3);
      b.block(25, 3, 'reports');
      b.gem(30, 11, 'Reporting');
      b.bug(34);
      b.bug(37);
    },
  },
  {
    id: 'azry',
    title: 'Azry',
    role: 'Software Engineer',
    period: '2022',
    place: 'Tbilisi, Georgia',
    blurb: 'First end-to-end product: a loyalty program for a major Georgian oil company.',
    theme: 'azry',
    width: 56,
    achievements: [
      a('loyalty', 'Loyalty program, end to end', 'Built a loyalty program for a major Georgian oil company.', bullet('azry', 0)),
      a('automation', 'Automation over busywork', 'REST APIs, unit tests, and automation that cut manual operations.', bullet('azry', 1)),
    ],
    build(b) {
      b.sign(3, 'January 2022. Azry. A loyalty program for a major Georgian oil company, end to end.');
      b.block(9, 9, 'loyalty');
      b.gem(13, 11, 'Java');
      b.gem(15, 11, 'Spring Boot');
      b.pipe(19, 2);
      b.bug(24);
      b.bricks(27, 9, 3);
      b.block(30, 9, 'automation');
      b.bricks(31, 9);
      b.gem(28, 6, 'React');
      b.gem(30, 6, 'Hibernate');
      b.pit(36, 38);
      b.gem(42, 11, 'Docker');
      b.bug(46);
    },
  },
  {
    id: 'bog-swe',
    title: 'Bank of Georgia',
    role: 'Software Engineer',
    period: '2022 – 2024',
    place: 'Tbilisi, Georgia',
    blurb: 'Back at the bank, now building its systems: credit risk, microservices, monitoring.',
    theme: 'bank',
    width: 80,
    achievements: [
      a('credit', 'Credit risk, from scratch', 'Architected the credit-risk evaluation system used by risk managers.', bullet('bog-swe', 0)),
      a('micro', 'Monolith → microservices', 'Built source-of-truth services and split legacy monolith code apart.', bullet('bog-swe', 1)),
      a('grafana', 'Eyes on production', 'Grafana monitoring, telemetry and alerting. Owned deploys to production.', bullet('bog-swe', 2)),
      a('lecturer', 'Java lecturer', 'Taught Java and Spring Boot to engineers coming from other stacks.', bullet('bog-swe', 3)),
    ],
    build(b) {
      b.sign(3, 'August 2022. Back at Bank of Georgia, this time as a Software Engineer.');
      b.block(8, 9, 'credit');
      b.gem(12, 11, 'Oracle');
      b.sign(15, 'A legacy monolith. Bricks break when you hit them from below. Split it up.');
      b.bricks(18, 9, 6);
      b.bricks(18, 8, 6);
      b.gem(21, 7, 'Microservices');
      b.block(27, 9, 'micro');
      b.bug(31);
      b.bug(34);
      b.plat(37, 9, 4);
      b.plat(42, 6, 4);
      b.block(43, 2, 'grafana');
      b.gem(45, 4, 'Grafana');
      b.pit(48, 50);
      b.stairsUp(54, 4);
      b.column(58, 4);
      b.column(59, 4);
      b.stairsDown(60, 4);
      b.block(58, 4, 'lecturer');
      b.gem(66, 11, 'Mentoring');
      b.bug(70);
    },
  },
  {
    id: 'devexperts',
    title: 'DevExperts',
    role: 'Software Engineer',
    period: '2024',
    place: 'Tbilisi, Georgia',
    blurb: 'Real-time financial charts, and a legacy codebase with many client forks.',
    theme: 'trading',
    width: 64,
    achievements: [
      a('charts', 'Real-time market charts', 'Maintained and extended dxcharts: live candlestick and OHLC charts.', bullet('devexperts', 0)),
      a('forks', 'Many forks, one codebase', 'Supported client-specific forks of a complex React/GWT legacy codebase.', bullet('devexperts', 1)),
    ],
    build(b) {
      b.sign(3, 'March 2024. DevExperts. The candles are platforms. Buy low, jump high.');
      b.candle(9, 1, true);
      b.candle(12, 2, true);
      b.candle(15, 3, true);
      b.candle(18, 4, true);
      b.candle(21, 2, false);
      b.candle(24, 1, false);
      b.block(18, 4, 'charts');
      b.gem(12, 8, 'Data visualization');
      b.bug(28);
      b.pit(31, 33);
      b.plat(36, 10, 3);
      b.gem(37, 7, 'GWT');
      b.block(42, 9, 'forks');
      b.candle(47, 3, false);
      b.candle(50, 2, false);
      b.candle(53, 1, true);
      b.gem(56, 11, 'TypeScript');
      b.bug(57);
    },
  },
  {
    id: 'google',
    title: 'Google · BigQuery',
    role: 'Software Engineer',
    period: '2024 – now',
    place: 'Warsaw, Poland',
    blurb: 'Maintainer of the Dumper. Legacy warehouses go in one end, BigQuery comes out the other.',
    theme: 'warsaw',
    width: 110,
    achievements: [
      a('dumper', 'Dumper maintainer', 'Maintainer of the Dumper, the extraction layer of the BigQuery Migration Service.', bullet('google', 0)),
      a('stages', 'Two of three stages', 'Own extraction and the customer-facing assessment reports.', bullet('google', 1)),
      a('oncall', 'On-call ×2', 'Two on-call rotations: incidents, release duty, customer escalations.', bullet('google', 2)),
      a('llmdocs', 'Docs that write themselves', 'An LLM pipeline that turns assessment data into design docs.', bullet('google', 3)),
      a('metrics', 'VP-level metrics', 'A metrics pipeline used to forecast migrations and scale BigQuery capacity.', bullet('google', 4)),
      a('hashing', '50% fewer redundant queries', 'Canonicalized query hashing. Over 3x less work on Snowflake workloads.', bullet('google', 5)),
      a('cicd', 'CI/CD from zero', 'The full GitHub Actions pipeline for dwh-migration-tools, with daily vulnerability scans.', bullet('google', 6)),
      a('vulns', '70+ critical vulns caught', 'An automated vulnerability lifecycle. Drove MOSS compliance across 6 teams.', bullet('google', 7)),
      a('cost', 'Questioned the cost model', 'Flagged an unsubstantiated DBU-to-BigQuery cost factor, then helped replace it.', bullet('google', 8)),
      a('interviewer', 'Calibrated interviewer', 'Coding interviews, the question pool, and mentoring new interviewers.', bullet('google', 9)),
    ],
    build(b) {
      b.sign(3, 'Warsaw, September 2024. Google, BigQuery. These pipes are legacy data warehouses.');
      b.pipe(8, 2, 'TERADATA');
      b.block(11, 9, 'dumper');
      b.gem(11, 6, 'JDBC');
      b.pipe(14, 3, 'REDSHIFT');
      b.block(17, 8, 'stages');
      b.pipe(20, 2, 'SNOWFLAKE');
      b.block(23, 9, 'oncall');
      b.gem(23, 6, 'Python');
      b.pipe(26, 3, 'ORACLE');
      b.sign(30, '70+ critical vulnerabilities caught before production. Squash these ones too.');
      b.bug(33);
      b.bug(36);
      b.plat(39, 9, 5);
      b.block(41, 5, 'llmdocs');
      b.gem(46, 11, 'LLM tooling');
      b.bricks(49, 9, 2);
      b.block(51, 9, 'metrics');
      b.bricks(52, 9, 2);
      b.gem(51, 6, 'BigQuery');
      b.pit(57, 59);
      b.bug(62);
      b.bug(65);
      b.block(64, 9, 'vulns');
      b.bug(67);
      b.stairsUp(70, 3);
      b.column(73, 3);
      b.column(74, 3);
      b.stairsDown(75, 3);
      b.block(74, 5, 'hashing');
      b.gem(81, 11, 'GitHub Actions');
      b.block(85, 9, 'cicd');
      b.bug(89);
      b.plat(92, 10, 3);
      b.plat(96, 7, 3);
      b.block(97, 3, 'cost');
      b.block(102, 9, 'interviewer');
      b.gem(104, 11, 'Security');
    },
  },
  {
    id: 'fixfox',
    title: 'FixFox',
    role: 'Founder, sole engineer',
    period: 'After hours',
    place: 'fixfox.ge',
    blurb: 'A cleaning marketplace in Georgia. Built and run by one engineer, in production.',
    theme: 'night',
    width: 64,
    achievements: [
      a('solo', 'A whole business, solo', 'Built and run fixfox.ge: Spring Boot, React/TypeScript, PostgreSQL.', bullet('fixfox', 0)),
      a('ledger', 'Money that adds up', 'Idempotent card payments, an append-only ledger, automated reconciliation.', bullet('fixfox', 1)),
      a('safety', 'Deploys with a safety net', 'Smoke-tested cutovers, visual-regression screenshots, migrations tested on real Postgres.', bullet('fixfox', 2)),
      a('content', 'Marketing on autopilot', 'An LLM pipeline that writes and posts localized content and video every week.', bullet('fixfox', 3)),
    ],
    build(b) {
      b.sign(3, 'After hours. FixFox: a cleaning marketplace in Georgia, built and run solo.');
      b.fox(6);
      b.block(10, 9, 'solo');
      b.gem(13, 11, 'Java 21');
      b.bug(17);
      b.plat(20, 9, 3);
      b.block(21, 5, 'ledger');
      b.gem(26, 11, 'PostgreSQL');
      b.pit(29, 31);
      b.bricks(35, 9);
      b.block(36, 9, 'safety');
      b.bricks(37, 9);
      b.gem(36, 6, 'Testcontainers');
      b.bug(41);
      b.bug(44);
      b.block(49, 9, 'content');
      b.gem(52, 11, 'Payments');
    },
  },
  {
    id: 'finale',
    title: 'Next stage',
    role: 'Your team?',
    period: '2026',
    place: 'Warsaw · remote',
    blurb: 'That’s the whole map so far. The next stage isn’t built yet.',
    theme: 'finale',
    width: 36,
    achievements: [],
    build(b) {
      b.sign(4, '2026. You reached the end of the map. The next stage isn’t built yet. Walk through the door.');
      b.door(24);
    },
  },
];

export const allAchievements = stages.flatMap((s, stage) => s.achievements.map((ach) => ({ ...ach, stage })));
