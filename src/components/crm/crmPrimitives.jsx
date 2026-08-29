import React from 'react';
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { T, SHELL, STATUS, MONO, EYEBROW, fmtMoney } from '../../theme/moduleTokens';
import { PERIOD_PRESETS } from '../../services/crmAnalyticsService';

/* ============================================================================
   Shared CRM dashboard primitives.

   Extracted when the Revenue Desk arrived and needed the same tiles, the same
   period rail and the same honesty callout as the Pipeline Desk. Two copies of
   a FlowTile is how one screen ends up with a delta pill the other one doesn't,
   and a user who moves between them starts reading the two as different
   products — the same argument crmTokens.js makes about palettes.

   What lives here is anything both desks render. Anything specific to one of
   them — the pipeline funnel, the revenue mix bar — stays in its own file.

   The FLOW / STOCK split these components encode is the organising idea behind
   both screens:

     FLOW  — happened inside the selected window. Raised card, a delta against
             the prior window, and the period rail applies.
     STOCK — the state of the business right now. Recessed ground, a severity
             chip instead of a delta, and the period rail deliberately does NOT
             apply.
   ========================================================================= */

export const Eyebrow = ({ children, sx }) => (
  <Typography component="div" sx={{ ...EYEBROW, ...sx }}>{children}</Typography>
);

export const BandHead = ({ title, note, inset }) => (
  <Stack
    direction="row" alignItems="baseline" gap={1.5} flexWrap="wrap"
    sx={{ mb: 1.8, pb: 1, borderBottom: `1px solid ${inset ? T.insetRule : T.rule}` }}
  >
    <Eyebrow>{title}</Eyebrow>
    {note && <Typography sx={{ fontSize: 12, color: T.ink3, ml: 'auto', fontWeight: 600 }}>{note}</Typography>}
  </Stack>
);

export const DeltaPill = ({ pct, priorLabel }) => {
  if (pct == null) {
    return <Typography sx={{ fontSize: 12, color: T.ink3, fontWeight: 600 }}>{priorLabel}</Typography>;
  }
  const up = pct >= 0;
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Box
        component="span"
        sx={{
          fontFamily: MONO, fontSize: 11.5, fontWeight: 700, px: 0.9, py: 0.35,
          borderRadius: 2, fontVariantNumeric: 'tabular-nums',
          color: up ? STATUS.good : STATUS.critical,
          bgcolor: up ? STATUS.goodBg : STATUS.criticalBg,
        }}
      >
        {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
      </Box>
      <Typography sx={{ fontSize: 12, color: T.ink3, fontWeight: 600 }}>{priorLabel}</Typography>
    </Stack>
  );
};

/** A flow figure: value, movement against the prior window, nothing else. */
export const FlowTile = ({ label, value, unit, pct, priorLabel, loading }) => (
  <Paper
    elevation={0}
    sx={{
      flex: '1 1 200px', minWidth: 190, p: '18px 20px 17px',
      border: `1px solid ${T.rule}`, borderRadius: SHELL.radius,
      bgcolor: T.surface, boxShadow: SHELL.cardShadow,
    }}
  >
    <Eyebrow>{label}</Eyebrow>
    {loading ? (
      <Skeleton width="70%" height={38} />
    ) : (
      <>
        <Typography sx={{
          fontFamily: MONO, fontSize: 28, fontWeight: 600, letterSpacing: '-.03em',
          lineHeight: 1.05, mt: 1.1, color: T.ink, fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
          {unit && <Box component="span" sx={{ fontSize: 15, color: T.ink2, ml: 0.4 }}>{unit}</Box>}
        </Typography>
        <Box sx={{ mt: 1.1 }}><DeltaPill pct={pct} priorLabel={priorLabel} /></Box>
      </>
    )}
  </Paper>
);

/**
 * A stock figure: value, a severity stripe, and a chip that names the state in words.
 * No delta — there is no prior window for "right now".
 */
export const StockTile = ({ label, value, note, severity, chip, loading }) => (
  <Paper
    elevation={0}
    sx={{
      flex: '1 1 200px', minWidth: 190, p: '16px 18px', position: 'relative',
      border: `1px solid ${T.rule}`, borderRadius: SHELL.radius, bgcolor: T.surface,
      overflow: 'hidden', boxShadow: SHELL.tileShadow,
      '&::before': {
        content: '""', position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px',
        bgcolor: severity || T.ink3,
      },
    }}
  >
    <Eyebrow>{label}</Eyebrow>
    {loading ? <Skeleton width="60%" height={32} /> : (
      <>
        <Typography sx={{
          fontFamily: MONO, fontSize: 24, fontWeight: 600, letterSpacing: '-.028em',
          lineHeight: 1.1, mt: 0.9, color: T.ink, fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </Typography>
        {note && <Typography sx={{ fontSize: 11.5, color: T.ink3, mt: 0.4, fontWeight: 600 }}>{note}</Typography>}
        {chip && (
          <Box sx={{
            display: 'inline-block', mt: 1.2, px: 1.1, py: 0.4, borderRadius: 2,
            fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em',
            color: chip.ink, bgcolor: chip.bg,
          }}>
            {chip.text}
          </Box>
        )}
      </>
    )}
  </Paper>
);

/**
 * Coverage disclosure. Every derived figure on these screens ships with how much of it is real,
 * because a clean tile looks better than an honest one and that is exactly the trade to refuse.
 */
export const Honesty = ({ children }) => (
  <Stack direction="row" gap={1.2} sx={{
    mt: 2, p: '12px 15px', borderRadius: 3, bgcolor: T.accentDim,
    fontSize: 12, color: T.ink2, lineHeight: 1.5, fontWeight: 500,
  }}>
    <Box component="span" sx={{ color: T.accent, fontWeight: 900, lineHeight: 1.35 }}>i</Box>
    <Box>{children}</Box>
  </Stack>
);

/**
 * The window selector. It lives in the masthead rather than above the cards, because it governs
 * every flow figure on the page — a control that reaches that far belongs with the page title, not
 * beside the first thing it happens to change.
 */
export const PeriodRail = ({ preset, onChange, label, disabled }) => {
  const line = SHELL.heroLine;
  return (
    <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
      <Box sx={{
        display: 'flex', border: `1px solid ${line}`, borderRadius: 3,
        overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.04)',
      }}>
        {PERIOD_PRESETS.map((p, i) => {
          const active = p.key === preset;
          return (
            <Box
              key={p.key}
              component="button"
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(p.key)}
              sx={{
                border: 0, borderRight: i < PERIOD_PRESETS.length - 1 ? `1px solid ${line}` : 0,
                px: 2, py: 1.1, font: 'inherit', fontSize: 12.5, fontWeight: 700,
                cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap',
                transition: 'background-color .15s, color .15s',
                color: active ? '#fff' : SHELL.heroInkDim,
                bgcolor: active ? T.accent : 'transparent',
                '&:hover': {
                  bgcolor: active ? T.accentHover : SHELL.heroFill,
                  color: active ? '#fff' : SHELL.heroInk,
                },
              }}
            >
              {p.label}
            </Box>
          );
        })}
      </Box>
      {label && (
        <Box sx={{
          fontFamily: MONO, fontSize: 12, px: 1.4, py: 0.9,
          border: `1px dashed ${line}`, borderRadius: 2, whiteSpace: 'nowrap',
          color: SHELL.heroInkFaint,
        }}>
          {label}
        </Box>
      )}
    </Stack>
  );
};

export const Card = ({ title, sub, children, right, sx }) => (
  <Paper elevation={0} sx={{
    p: '20px 22px 22px', border: `1px solid ${T.rule}`, borderRadius: SHELL.radius,
    bgcolor: T.surface, boxShadow: SHELL.cardShadow, ...sx,
  }}>
    <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1.5}>
      <Typography sx={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.015em', color: T.ink }}>
        {title}
      </Typography>
      {right}
    </Stack>
    {sub && <Typography sx={{ fontSize: 12.5, color: T.ink2, mt: 0.5, mb: 1.6, fontWeight: 500 }}>{sub}</Typography>}
    {children}
  </Paper>
);

// ---------------------------------------------------------------- table cells

export const TH = {
  ...EYEBROW, textAlign: 'left', py: 1, px: 0,
  borderBottom: `1px solid ${T.rule}`, whiteSpace: 'nowrap',
};
export const TD = { fontSize: 13, color: T.ink, py: 1.2, px: 0, borderBottom: `1px solid ${T.ruleSoft}` };
export const TDNum = {
  ...TD, textAlign: 'right', fontFamily: MONO, fontSize: 12.5,
  fontVariantNumeric: 'tabular-nums',
};

/**
 * A ranked bar list.
 *
 * <p>The bar is scaled by {@code count} while the money rides alongside as text, so a long tail of
 * small-count rows stays readable. Callers that rank by value pass a {@code valueFor} to scale on
 * instead.
 */
export const RankedBars = ({ rows, colourFor, valueFor, labelFor }) => {
  const measure = valueFor || ((r) => r.count);
  const top = rows.length ? Math.max(...rows.map((r) => Number(measure(r)) || 0), 1) : 1;
  return (
    <Stack gap={1.2} sx={{ mt: 0.8 }}>
      {rows.map((r) => (
        <Box key={r.key} sx={{ display: 'grid', gridTemplateColumns: '128px 1fr 92px', gap: 1.4, alignItems: 'center' }}>
          <Typography sx={{ fontSize: 12.5, color: T.ink2, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.label}
          </Typography>
          <Box sx={{ height: 18, bgcolor: T.ruleSoft, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{
              width: `${((Number(measure(r)) || 0) / top) * 100}%`, height: '100%',
              bgcolor: colourFor ? colourFor(r.key) : T.accent, borderRadius: 2,
            }} />
          </Box>
          <Typography sx={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, textAlign: 'right', color: T.ink, fontVariantNumeric: 'tabular-nums' }}>
            {labelFor ? labelFor(r) : (
              <>
                {r.count}
                <Box component="span" sx={{ color: T.ink3, fontSize: 11 }}> {'·'} {fmtMoney(r.value)}</Box>
              </>
            )}
          </Typography>
        </Box>
      ))}
      {!rows.length && <Typography sx={{ fontSize: 12.5, color: T.ink3, fontWeight: 600 }}>Nothing in this window.</Typography>}
    </Stack>
  );
};
