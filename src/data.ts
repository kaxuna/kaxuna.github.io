// Single source of truth for everything on the site.
// Edit this file to update the pipeline, SQL tables, and terminal files.

export type NodeKind = 'source' | 'stage' | 'hub' | 'sink' | 'branch' | 'db';

export interface Metric {
  label: string;
  value: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  location: string;
  start: string; // YYYY-MM
  end: string | null; // null = present
  kind: NodeKind;
  tagline: string;
  bullets: string[];
  skills: string[];
  metrics?: Metric[];
  link?: string;
}

export const profile = {
  name: 'Kakha Philauri',
  title: 'Backend Software Engineer · Google BigQuery',
  summary:
    'Java/JVM engineer on BigQuery data infrastructure. Sole maintainer of the Dumper in google/dwh-migration-tools, the open-source extraction layer of the BigQuery Migration Service. Five years across data platforms, security automation and backend systems. Ships LLM-powered tooling, runs production services on-call, calibrated technical interviewer at Google.',
  location: 'Warsaw, Poland',
  email: 'kakhapilauri@gmail.com',
  github: 'https://github.com/kaxuna',
  githubUser: 'kaxuna',
  linkedin: 'https://www.linkedin.com/in/kakha-philauri/',
  leetcode: 'https://leetcode.com/u/kaxuna/',
  languages: [
    { name: 'English', level: 'fluent' },
    { name: 'Swedish', level: 'fluent' },
    { name: 'Georgian', level: 'native' },
    { name: 'Russian', level: 'intermediate' },
  ],
  interests: ['Piano', 'Rock climbing', 'Weightlifting'],
};

export const headlineStats: Metric[] = [
  { label: 'years shipping', value: '5' },
  { label: 'critical vulns caught pre-prod', value: '70+' },
  { label: 'redundant query processing cut', value: '50%' },
  { label: 'reduction on Snowflake workloads', value: '3x' },
  { label: 'LeetCode solved', value: '384' },
];

export const experiences: Experience[] = [
  {
    id: 'lund',
    company: 'Lund University',
    role: 'CS coursework',
    location: 'Lund, Sweden',
    start: '2019-09',
    end: '2021-01',
    kind: 'source',
    tagline: 'Where the pipeline starts.',
    bullets: [
      'Computer Science coursework at Lund University, Sweden.',
      'Picked up Swedish along the way (now fluent).',
    ],
    skills: ['Algorithms', 'Data structures', 'Swedish'],
  },
  {
    id: 'bog-analyst',
    company: 'Bank of Georgia',
    role: 'Data Analyst',
    location: 'Tbilisi, Georgia',
    start: '2021-05',
    end: '2021-12',
    kind: 'stage',
    tagline: 'First contact with production data.',
    bullets: [
      'SQL-based data mining and reporting for operational decisions.',
      'Partnered with business analysts; delivered Microsoft Report Builder reports.',
    ],
    skills: ['SQL', 'Reporting', 'Data analysis'],
  },
  {
    id: 'azry',
    company: 'Azry',
    role: 'Software Engineer',
    location: 'Tbilisi, Georgia',
    start: '2022-01',
    end: '2022-06',
    kind: 'stage',
    tagline: 'End-to-end product, first time.',
    bullets: [
      'Built a loyalty program for a major Georgian oil company end to end: Spring Boot, React, SQL, Hibernate, Docker.',
      'REST APIs, unit-test coverage, and workflow automation that cut manual operations.',
    ],
    skills: ['Java', 'Spring Boot', 'React', 'Hibernate', 'Docker'],
  },
  {
    id: 'bog-swe',
    company: 'Bank of Georgia',
    role: 'Software Engineer',
    location: 'Tbilisi, Georgia',
    start: '2022-08',
    end: '2024-03',
    kind: 'stage',
    tagline: 'Credit risk, microservices, and teaching Java.',
    bullets: [
      "Architected and built the bank's credit-risk evaluation system from the ground up, consolidating data scattered across Oracle stored procedures into one coherent service used by risk managers. Owned data accuracy end to end.",
      'Partnered with the Integrations team on source-of-truth microservices: new services from scratch, legacy monolith decomposed onto modern Java, refactor-vs-rebuild decided per component.',
      'Set up Grafana monitoring, telemetry and alerting; worked with DevOps and DBA teams on provisioning and bootstrapping; owned deployments through to production.',
      "Trained engineers from non-Java backgrounds as the team's Java/Spring Boot lecturer.",
    ],
    skills: ['Java', 'Spring Boot', 'Microservices', 'Oracle', 'Grafana', 'Mentoring'],
  },
  {
    id: 'devexperts',
    company: 'DevExperts',
    role: 'Software Engineer',
    location: 'Tbilisi, Georgia',
    start: '2024-03',
    end: '2024-09',
    kind: 'stage',
    tagline: 'Real-time charts, legacy codebase.',
    bullets: [
      "Maintained and extended dxcharts, DevExperts' real-time financial charting frontend (candlestick/OHLC market visualizations).",
      'Supported multiple client-specific forks of a highly complex React/GWT legacy codebase.',
    ],
    skills: ['React', 'GWT', 'TypeScript', 'Canvas', 'Legacy systems'],
  },
  {
    id: 'google',
    company: 'Google · BigQuery',
    role: 'Software Engineer',
    location: 'Warsaw, Poland',
    start: '2024-09',
    end: null,
    kind: 'hub',
    tagline: 'Maintainer of the Dumper. Two of three stages of the migration-assessment pipeline.',
    bullets: [
      "Maintainer of the Dumper in google/dwh-migration-tools, Google's official open-source toolkit for the BigQuery Migration Service. Extracts DDL metadata and query logs from Teradata, Redshift, Snowflake and Oracle to drive migration assessment and SQL translation. Reviews and merges community PRs, ships releases used by migrating enterprises.",
      'Owns two of the three stages of the migration-assessment pipeline: extraction (Dumper in Java, plus the Python-based Databricks notebook assessment) and customer-facing assessment reports.',
      'Two on-call rotations for production services: incident response, release duty, customer-escalation handling.',
      'Shipped an LLM-powered documentation pipeline that auto-generates customer-journey design docs for migration engagements.',
      'Architected a performance-metrics pipeline and reporting framework surfaced at VP level, used to forecast migration trends and scale BigQuery hardware capacity ahead of demand.',
      'Cut redundant query processing 50% with canonicalized query hashing: semantically equivalent queries deduplicate to one hash. Over 3x reduction on Snowflake workloads.',
      'Created the full CI/CD pipeline for google/dwh-migration-tools on GitHub Actions: build, test and vulnerability scanning on every PR, plus daily scans for zero-day dependency vulnerabilities.',
      'Built an automated vulnerability-management lifecycle that caught 70+ critical flaws before production and drove the product to MOSS compliance, coordinating 6 teams across time zones.',
      'Led a competitive cost-analysis tool benchmarking BigQuery against Databricks; flagged that the DBU-to-BigQuery conversion factor behind customer estimates was unsubstantiated, core contributor to the replacement.',
      'Calibrated technical interviewer: coding interviews, question-pool contributions, mentoring newer interviewers to certification.',
    ],
    skills: ['Java', 'Python', 'BigQuery', 'Distributed systems', 'GitHub Actions', 'Security', 'LLM tooling', 'On-call'],
    metrics: [
      { label: 'redundant queries cut', value: '50%' },
      { label: 'Snowflake workload reduction', value: '3x' },
      { label: 'critical vulns pre-prod', value: '70+' },
      { label: 'teams coordinated', value: '6' },
    ],
    link: 'https://github.com/google/dwh-migration-tools',
  },
  {
    id: 'fixfox',
    company: 'FixFox',
    role: 'Founder, sole engineer',
    location: 'fixfox.ge · in production',
    start: '2025-01',
    end: null,
    kind: 'branch',
    tagline: 'A whole business, one engineer, zero excuses.',
    bullets: [
      'Full-stack cleaning-marketplace business: Spring Boot (Java 21) backend, React/TypeScript frontend, PostgreSQL.',
      'Card-payment workflows with idempotent charge recovery, an append-only financial ledger, and automated reconciliation.',
      'Delivery pipeline on GitHub Actions: pre-cutover smoke-tested deploys, a visual-regression screenshot net over the component catalog, a Testcontainers gate applying every DB migration on real Postgres per PR.',
      'LLM-powered social-media content pipeline generating and auto-publishing localized posts and video weekly.',
    ],
    skills: ['Java 21', 'Spring Boot', 'React', 'TypeScript', 'PostgreSQL', 'Payments', 'Testcontainers', 'LLM tooling'],
    link: 'https://fixfox.ge',
  },
];

// Warehouses the Dumper extracts from. Feed into the Google hub on the pipeline.
export const warehouses = [
  { id: 'teradata', label: 'Teradata', color: '#f5b82e' },
  { id: 'redshift', label: 'Redshift', color: '#ff6b6b' },
  { id: 'snowflake', label: 'Snowflake', color: '#5ec8f2' },
  { id: 'oracle', label: 'Oracle', color: '#ff8a3d' },
];

export interface Skill {
  name: string;
  category: 'language' | 'framework' | 'data' | 'infra' | 'ai' | 'practice';
  years: number; // approximate
  since: number;
}

export const skills: Skill[] = [
  { name: 'Java (JVM)', category: 'language', years: 5, since: 2021 },
  { name: 'SQL', category: 'language', years: 5, since: 2021 },
  { name: 'Python', category: 'language', years: 3, since: 2023 },
  { name: 'TypeScript / JavaScript', category: 'language', years: 3, since: 2023 },
  { name: 'Spring Boot', category: 'framework', years: 4, since: 2022 },
  { name: 'React', category: 'framework', years: 3, since: 2022 },
  { name: 'JDBC', category: 'data', years: 4, since: 2022 },
  { name: 'BigQuery', category: 'data', years: 2, since: 2024 },
  { name: 'PostgreSQL', category: 'data', years: 3, since: 2023 },
  { name: 'Oracle', category: 'data', years: 3, since: 2022 },
  { name: 'Distributed data systems', category: 'data', years: 2, since: 2024 },
  { name: 'Data-warehouse migration', category: 'data', years: 2, since: 2024 },
  { name: 'Docker & Kubernetes', category: 'infra', years: 3, since: 2022 },
  { name: 'GitHub Actions (CI/CD)', category: 'infra', years: 3, since: 2023 },
  { name: 'Grafana (monitoring & alerting)', category: 'infra', years: 3, since: 2023 },
  { name: 'GenAI / LLM tooling', category: 'ai', years: 2, since: 2024 },
  { name: 'Security automation', category: 'practice', years: 2, since: 2024 },
  { name: 'On-call & incident response', category: 'practice', years: 2, since: 2024 },
  { name: 'Technical interviewing', category: 'practice', years: 2, since: 2024 },
];

export const leetcode = {
  username: 'kaxuna',
  snapshotDate: '2026-09-05',
  ranking: 338841,
  solved: [
    { difficulty: 'Easy', count: 119, total: 962 },
    { difficulty: 'Medium', count: 239, total: 2109 },
    { difficulty: 'Hard', count: 26, total: 971 },
  ],
};

export function monthsBetween(start: string, end: string | null): number {
  const [sy, sm] = start.split('-').map(Number);
  const e = end ?? new Date().toISOString().slice(0, 7);
  const [ey, em] = e.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm);
}

export function formatPeriod(e: Experience): string {
  const fmt = (s: string) => {
    const [y, m] = s.split('-').map(Number);
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${names[m - 1]} ${y}`;
  };
  return `${fmt(e.start)} – ${e.end ? fmt(e.end) : 'present'}`;
}
