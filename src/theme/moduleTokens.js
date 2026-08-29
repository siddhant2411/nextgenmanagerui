/**
 * The application's shared module chrome.
 *
 * One palette and one page shell for every register screen in the product — sales, purchase, and
 * anything that follows. Before this file the same four roles were redefined per folder and had
 * drifted into three different primaries (#2563eb in sales, #1565c0 in purchase, #1c4f87 in the
 * purchase status chips) and two different grounds. Nobody chose that; it is what happens when a
 * palette is copied into the top of a component instead of imported.
 *
 * If a screen needs a colour that is not here, add it here. A local `const T = {...}` at the top of
 * a component is how the drift started.
 */

/** Slate ramp. Same hex for the same role, everywhere. */
export const T = {
  ink: '#0f172a',
  ink2: '#64748b',
  ink3: '#94a3b8',
  rule: '#e2e8f0',
  ruleSoft: '#f1f5f9',
  surface: '#ffffff',
  ground: '#f8fafc',

  inset: '#f1f5f9',
  insetRule: '#e2e8f0',

  accent: '#2563eb',
  accentHover: '#1d4ed8',
  accentDim: '#eff6ff',
};

/**
 * Page chrome: dark masthead, slate ground, cards that float up over the masthead's bottom edge.
 *
 * `radius`/`radiusLg` are MUI spacing units (4 -> 16px, 5 -> 20px) so they drop straight into `sx`.
 * The masthead's deep bottom padding and the content's negative top margin are a matched pair —
 * change one and the first row of cards either detaches or swallows the subtitle.
 */
export const SHELL = {
  heroBg: '#0f172a',
  heroImage:
    'radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.15) 0%, transparent 50%), ' +
    'radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 50%)',
  heroInk: '#ffffff',
  heroInkDim: 'rgba(255,255,255,0.6)',
  heroInkFaint: 'rgba(255,255,255,0.45)',
  heroLine: 'rgba(255,255,255,0.2)',
  heroFill: 'rgba(255,255,255,0.05)',

  radius: 4,
  radiusLg: 5,
  cardShadow: '0 20px 60px rgba(0,0,0,0.05)',
  tileShadow: '0 4px 6px -1px rgba(15,23,42,0.06), 0 2px 4px -2px rgba(15,23,42,0.04)',

  heroPadTop: 6,
  heroPadBottom: 15,
  contentPullUp: -8,
};

/**
 * Severity. Reserved — never used to tell two categories apart, always paired with a word or icon,
 * because roughly 8% of men cannot take colour alone as the message.
 */
export const STATUS = {
  good: '#059669',
  warning: '#d97706',
  serious: '#ea580c',
  critical: '#dc2626',
  goodBg: '#ecfdf5',
  warningBg: '#fffbeb',
  seriousBg: '#fff7ed',
  criticalBg: '#fef2f2',
  warningInk: '#b45309',
};

export const MONO = "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace";

/** Uppercase micro-label used for eyebrows and column heads. */
export const EYEBROW = {
  fontSize: '0.68rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: T.ink3,
};

/**
 * Register-table styling, lifted from the enquiry register so every list in the product reads the
 * same way: a quiet slate header, hairline row rules, and the row itself as the click target.
 *
 * Numeric columns get `TABLE.num` — tabular figures, right-aligned. Money that is not aligned on
 * its decimal cannot be compared down a column, which is the only reason to put it in a column.
 */
export const TABLE = {
  container: {
    borderRadius: 2,
    border: `1px solid ${T.rule}`,
    overflow: 'hidden',
  },
  head: {
    fontWeight: 700,
    fontSize: '0.65625rem',
    color: T.ink2,
    bgcolor: T.ground,
    borderBottom: `1px solid ${T.rule}`,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  row: {
    cursor: 'pointer',
    transition: 'background-color 0.1s',
    '&:hover': { bgcolor: T.ruleSoft },
    '&.Mui-selected': { bgcolor: `${T.accentDim} !important` },
    '&.Mui-selected:hover': { bgcolor: '#dbeafe !important' },
  },
  cell: {
    fontSize: '0.8125rem',
    color: '#334155',
    py: 1.2,
  },
  num: {
    fontSize: '0.8125rem',
    color: T.ink,
    py: 1.2,
    textAlign: 'right',
    fontFamily: MONO,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
};

/** The chip used for a status or approval state in a table cell. */
export const chipSx = (color, bg) => ({
  height: 20,
  fontWeight: 700,
  fontSize: '0.625rem',
  borderRadius: 1,
  bgcolor: bg,
  color,
  border: `1px solid ${color}30`,
  '& .MuiChip-label': { px: 0.9 },
});

// ---------------------------------------------------------------- formatting

/**
 * Indian money, in the units people actually speak: crore above a crore, lakh above a lakh.
 * Rendering 10,460,000 forces the reader to count digits; 1.05 Cr does not.
 */
export const fmtMoney = (n) => {
  if (n == null) return '\u2014';
  const v = Number(n);
  if (!Number.isFinite(v)) return '\u2014';
  const abs = Math.abs(v);
  if (abs >= 1e7) return `\u20B9${(v / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `\u20B9${(v / 1e5).toFixed(2)} L`;
  return `\u20B9${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

/** Whole rupees with Indian digit grouping, for table cells where precision matters. */
export const fmtRupees = (n) =>
  n == null ? '\u2014' : `\u20B9${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/** Rupees to the paisa — invoice and payment columns, where the decimal is part of the record. */
export const fmtAmount = (n) =>
  n == null ? '\u2014' : `\u20B9${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtNum = (n) => (n == null ? '\u2014' : Number(n).toLocaleString('en-IN'));

/**
 * Percentages arrive as null when the denominator was zero. That is deliberate: "0%" and "nothing
 * has happened yet" are different statements, so this renders an em dash rather than inventing a
 * zero.
 */
export const fmtPct = (n, digits = 1) =>
  n == null ? '\u2014' : `${Number(n).toFixed(digits)}%`;

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014';

/** Turns SCREAMING_SNAKE enum values into something a person reads. */
export const humanize = (s) => (s ? String(s).replace(/_/g, ' ') : '\u2014');

/**
 * Period-over-period change.
 *
 * Returns null when the prior window was zero — a jump from 0 to 5 is not "+500%", it is a change
 * with no meaningful ratio, and the caller should show the absolute prior value instead.
 */
export const delta = (current, previous) => {
  if (previous == null || current == null) return null;
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
  return ((c - p) / Math.abs(p)) * 100;
};

// ---------------------------------------------------------------- masthead buttons

/**
 * The two button treatments a masthead gets: outlined for everything, filled for the one action
 * the screen exists to start. Two filled buttons in a masthead means neither is the primary one.
 */
export const heroButtonSx = {
  color: SHELL.heroInk,
  borderColor: SHELL.heroLine,
  borderRadius: 3,
  textTransform: 'none',
  fontWeight: 700,
  px: 3,
  '&:hover': { bgcolor: SHELL.heroFill, borderColor: SHELL.heroLine },
  '&.Mui-disabled': { color: SHELL.heroInkFaint, borderColor: SHELL.heroFill },
};

export const heroCtaSx = {
  borderRadius: 3,
  textTransform: 'none',
  fontWeight: 900,
  px: 4,
  py: 1.5,
  bgcolor: T.accent,
  boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
  '&:hover': { bgcolor: T.accentHover },
};

/** The white card a register's table lives in — the widest surface on the page. */
export const panelSx = {
  p: { xs: 2, md: 3 },
  borderRadius: SHELL.radiusLg,
  border: `1px solid ${T.rule}`,
  bgcolor: T.surface,
  boxShadow: SHELL.cardShadow,
};
