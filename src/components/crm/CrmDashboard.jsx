import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Container, Paper, Skeleton, Stack, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip,
} from '@mui/material';
import { ViewList, Refresh } from '@mui/icons-material';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend,
} from 'recharts';
import {
  T, SHELL, STATUS, MONO, EYEBROW,
  fmtMoney, fmtNum, fmtPct, delta,
} from '../../theme/moduleTokens';
import { SERIES, FUNNEL_RAMP } from './crmTokens';
import {
  Eyebrow, BandHead, FlowTile, StockTile, Honesty, PeriodRail, Card,
  RankedBars, TH, TD, TDNum,
} from './crmPrimitives';
import { getCrmDashboard } from '../../services/crmAnalyticsService';

/* ============================================================================
   Pipeline Desk — the CRM dashboard.

   Chrome is the sales module's: dark masthead, slate ground, cards floating up
   into the masthead's bottom edge. It is the same shell Enquiry.jsx wears, from
   the same tokens (crmTokens.SHELL), because this screen is one click from that
   one and a second visual language between them reads as a different product.

   The screen is split into two bands because it holds two kinds of number.

   FLOW  — happened inside the selected window. Raised cards, a delta against
           the prior window, and the period rail applies.
   STOCK — the state of the desk right now. Recessed ground, severity chip
           instead of a delta, and the period rail deliberately does NOT apply.

   Keeping them apart is not decoration. Bounding "overdue follow-ups" to a
   month produces a figure that means nothing and shrinks every time a month
   turns over, which reads as improvement.
   ========================================================================= */

// ---------------------------------------------------------------- funnel

const PipelineFunnel = ({ funnel }) => {
  const stages = funnel?.stages || [];
  const top = stages.length ? Math.max(...stages.map((s) => s.reached), 1) : 1;
  const worst = stages.reduce(
    (acc, s) => (s.dropOffPercent != null && (acc == null || s.dropOffPercent > acc) ? s.dropOffPercent : acc),
    null,
  );

  return (
    <Box>
      {stages.map((s, i) => (
        <React.Fragment key={s.key}>
          {i > 0 && s.dropOffPercent != null && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '108px 1fr', gap: 1.5 }}>
              <Box />
              <Typography sx={{ fontSize: 11, color: T.ink3, py: '2px', pl: 0.5, fontWeight: 600 }}>
                <Box component="span" sx={{
                  fontFamily: MONO,
                  color: s.dropOffPercent === worst ? STATUS.critical : STATUS.serious,
                  fontWeight: s.dropOffPercent === worst ? 700 : 600,
                }}>
                  {'\u2212'}{Number(s.dropOffPercent).toFixed(0)}%
                </Box>
                {'  '}
                {stages[i - 1].reached - s.reached} dropped
                {s.dropOffPercent === worst ? ' \u00B7 worst leak in the funnel' : ''}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: '108px 1fr', gap: 1.5, alignItems: 'center' }}>
            <Typography sx={{ fontSize: 12.5, color: T.ink2, textAlign: 'right', fontWeight: 600 }}>{s.label}</Typography>
            <Tooltip
              arrow
              placement="right"
              title={`${fmtNum(s.reached)} enquiries \u00B7 ${fmtMoney(s.value)}`}
            >
              <Box sx={{ height: 34, display: 'flex', alignItems: 'center' }}>
                <Box sx={{
                  width: `${Math.max((s.reached / top) * 100, 8)}%`,
                  height: 26, borderRadius: '0 6px 6px 0', bgcolor: FUNNEL_RAMP[i] || FUNNEL_RAMP[4],
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1.1,
                  minWidth: 58, transition: 'filter .12s', '&:hover': { filter: 'brightness(1.08)' },
                }}>
                  <Box component="span" sx={{
                    fontFamily: MONO, fontSize: 12, fontWeight: 700,
                    color: i === 0 ? T.ink : '#fff', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {s.reached}
                  </Box>
                </Box>
              </Box>
            </Tooltip>
          </Box>
        </React.Fragment>
      ))}
    </Box>
  );
};

// ---------------------------------------------------------------- trend

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      bgcolor: SHELL.heroBg, color: T.ground, borderRadius: 2.5, p: '10px 13px',
      fontSize: 12, boxShadow: '0 10px 30px -8px rgba(15,23,42,.55)',
    }}>
      <Box sx={{ ...EYEBROW, color: 'rgba(255,255,255,.55)', mb: 0.5 }}>{label}</Box>
      {payload.map((p) => (
        <Stack key={p.dataKey} direction="row" justifyContent="space-between" gap={2}>
          <span>{p.name}</span>
          <Box component="b" sx={{ fontFamily: MONO, fontWeight: 700 }}>{p.value}</Box>
        </Stack>
      ))}
    </Box>
  );
};

const TrendChart = ({ data, bucket }) => (
  <Box sx={{ width: '100%', height: 232 }}>
    <ResponsiveContainer>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={T.rule} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="bucket" tick={{ fill: T.ink3, fontSize: 10, fontFamily: MONO }}
          axisLine={{ stroke: T.rule }} tickLine={false}
        />
        <YAxis
          tick={{ fill: T.ink3, fontSize: 10, fontFamily: MONO }}
          axisLine={false} tickLine={false} allowDecimals={false}
        />
        <RTooltip content={<TrendTooltip />} cursor={{ stroke: T.ink3, strokeDasharray: '3 3' }} />
        <Legend
          verticalAlign="bottom" height={28} iconType="square" iconSize={9}
          wrapperStyle={{ fontSize: 12, color: T.ink2, fontWeight: 600 }}
        />
        {/* Fixed order, never cycled — colour follows the entity, not its rank. */}
        <Line type="monotone" dataKey="created" name="Created" stroke={SERIES.created}
              strokeWidth={2} dot={false} activeDot={{ r: 4.5, strokeWidth: 2, stroke: T.surface }} />
        <Line type="monotone" dataKey="won" name="Won" stroke={SERIES.won}
              strokeWidth={2} dot={false} activeDot={{ r: 4.5, strokeWidth: 2, stroke: T.surface }} />
        <Line type="monotone" dataKey="lost" name="Lost" stroke={SERIES.lost}
              strokeWidth={2} dot={false} activeDot={{ r: 4.5, strokeWidth: 2, stroke: T.surface }} />
      </LineChart>
    </ResponsiveContainer>
    <Typography sx={{ fontSize: 11.5, color: T.ink3, mt: 0.5, fontWeight: 600 }}>
      Bucketed by {bucket === 'week' ? 'week' : 'month'}. Empty buckets are drawn as zero, not skipped.
    </Typography>
  </Box>
);

// ---------------------------------------------------------------- breakdowns

/** Sentiment, not identity: the row label carries identity so colour never has to carry six. */
const outcomeColour = (key) => {
  if (key === 'WON') return SERIES.won;
  if (key === 'LOST') return SERIES.lost;
  return T.ink3;
};

const CohortTable = ({ rows, keyHeader, flagKey }) => (
  <TableContainer sx={{ overflowX: 'auto' }}>
    <Table size="small" sx={{ minWidth: 420 }}>
      <TableHead>
        <TableRow>
          <TableCell sx={TH}>{keyHeader}</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Raised</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Won</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Conv.</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Won value</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => {
          const flagged = flagKey && r.key === flagKey;
          return (
            <TableRow key={r.key} sx={flagged ? { bgcolor: STATUS.warningBg } : undefined}>
              <TableCell sx={{ ...TD, fontWeight: flagged ? 700 : 500 }}>{r.label}</TableCell>
              <TableCell sx={TDNum}>{r.count}</TableCell>
              <TableCell sx={TDNum}>{r.wonCount}</TableCell>
              <TableCell sx={{
                ...TDNum,
                fontWeight: 600,
                color: r.conversionPercent == null ? T.ink3
                  : r.conversionPercent >= 20 ? STATUS.good
                  : r.conversionPercent < 5 ? STATUS.critical : T.ink,
              }}>
                {fmtPct(r.conversionPercent)}
              </TableCell>
              <TableCell sx={TDNum}>{fmtMoney(r.wonValue)}</TableCell>
            </TableRow>
          );
        })}
        {!rows.length && (
          <TableRow><TableCell sx={{ ...TD, color: T.ink3 }} colSpan={5}>Nothing in this window.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

// ---------------------------------------------------------------- dashboard

const CrmDashboard = () => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState('THIS_QUARTER');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getCrmDashboard({ preset: p }));
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not load the pipeline. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(preset); }, [preset, load]);

  const s = data?.summary;
  const a = data?.analytics;
  const prev = s?.previous;
  const stock = s?.stock;

  const periodLabel = useMemo(() => {
    if (!s?.period) return null;
    const cur = s.period.label;
    return prev?.period?.label ? `${cur}  \u00B7  vs ${prev.period.label}` : cur;
  }, [s, prev]);

  const coverageNote = useMemo(() => {
    if (!s) return null;
    if (!s.closedCount) return null;
    const pct = Math.round((s.codedCount / s.closedCount) * 100);
    return { pct, coded: s.codedCount, closed: s.closedCount };
  }, [s]);

  return (
    <Box sx={{ bgcolor: T.ground, minHeight: '100vh' }}>

      {/* ---- masthead: the same shell the enquiry register wears ---- */}
      <Box sx={{
        bgcolor: SHELL.heroBg, backgroundImage: SHELL.heroImage, color: SHELL.heroInk,
        pt: SHELL.heroPadTop, pb: SHELL.heroPadBottom,
      }}>
        <Container maxWidth="xl">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            gap={3}
          >
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-0.03em', mb: 1 }}>
                Pipeline Desk
              </Typography>
              <Typography variant="h6" sx={{ color: SHELL.heroInkDim, fontWeight: 500, maxWidth: 620 }}>
                Conversion, leakage and follow-up hygiene across the enquiry pipeline {'\u2014'} measured
                against the period before it.
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined" startIcon={<Refresh />}
                onClick={() => load(preset)} disabled={loading}
                sx={{
                  color: 'white', borderColor: SHELL.heroLine, borderRadius: 3,
                  textTransform: 'none', fontWeight: 700, px: 3,
                  '&:hover': { bgcolor: SHELL.heroFill, borderColor: SHELL.heroLine },
                  '&.Mui-disabled': { color: SHELL.heroInkFaint, borderColor: SHELL.heroFill },
                }}
              >
                Refresh
              </Button>
              <Button
                variant="outlined" startIcon={<ViewList />}
                onClick={() => navigate('/enquiry')}
                sx={{
                  color: 'white', borderColor: SHELL.heroLine, borderRadius: 3,
                  textTransform: 'none', fontWeight: 700, px: 3,
                  '&:hover': { bgcolor: SHELL.heroFill, borderColor: SHELL.heroLine },
                }}
              >
                Lead Register
              </Button>
            </Stack>
          </Stack>

          {/* The window selector is a page-level control, so it sits with the title. */}
          <Box sx={{ mt: 4 }}>
            <PeriodRail
              preset={preset} onChange={setPreset}
              label={periodLabel} disabled={loading}
            />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: SHELL.contentPullUp, pb: 6 }}>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2.5, borderRadius: 3, fontWeight: 700, boxShadow: SHELL.cardShadow }}
            action={
              <Button size="small" color="inherit" onClick={() => load(preset)}
                      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* ---------------------------------------------------------- FLOW */}
        <Box sx={{ mb: 3.5 }}>
          {/* The tile strip floats up into the masthead, as the register's does. */}
          <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
            <FlowTile
              label="Leads raised" loading={loading}
              value={fmtNum(s?.leadsCreated)}
              pct={delta(s?.leadsCreated, prev?.leadsCreated)}
              priorLabel={prev ? `vs ${fmtNum(prev.leadsCreated)} prior` : 'no prior period'}
            />
            <FlowTile
              label="Booked revenue" loading={loading}
              value={fmtMoney(s?.bookedRevenue)}
              pct={delta(s?.bookedRevenue, prev?.bookedRevenue)}
              priorLabel={prev ? `vs ${fmtMoney(prev.bookedRevenue)} prior` : 'no prior period'}
            />
            <FlowTile
              label="Win rate" loading={loading}
              value={s?.winRatePercent != null ? Number(s.winRatePercent).toFixed(1) : '\u2014'}
              unit={s?.winRatePercent != null ? '%' : null}
              pct={delta(s?.winRatePercent, prev?.winRatePercent)}
              priorLabel={`${fmtNum(s?.won)} won / ${fmtNum(s?.lost)} lost`}
            />
            <FlowTile
              label="Avg deal size" loading={loading}
              value={fmtMoney(s?.avgDealSize)}
              pct={delta(s?.avgDealSize, prev?.avgDealSize)}
              priorLabel={`${fmtNum(s?.convertedToOrder)} orders`}
            />
          </Stack>

          <BandHead
            title={'Flow \u2014 what happened in this period'}
            note="Every figure here moves with the period selector"
          />

          <Box sx={{
            display: 'grid', gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: '1.42fr 1fr' },
          }}>
            <Card
              title="Created, won and lost"
              sub="Won and lost are dated by when they closed; created by when they were raised."
              right={<Eyebrow>{a?.trendBucket === 'week' ? 'Weekly' : 'Monthly'}</Eyebrow>}
            >
              {loading ? <Skeleton variant="rounded" height={232} />
                : <TrendChart data={a?.trend || []} bucket={a?.trendBucket} />}
            </Card>

            <Card
              title="Pipeline funnel"
              sub="Enquiries raised in this period, counted at every stage they reached or passed."
              right={<Eyebrow>Cohort</Eyebrow>}
            >
              {loading ? <Skeleton variant="rounded" height={232} /> : (
                <>
                  <PipelineFunnel funnel={a?.funnel} />
                  {a?.funnel?.inferredRank > 0 && (
                    <Honesty>
                      <b>{a.funnel.inferredRank}</b> of {a.funnel.cohortSize} in this cohort have
                      already closed, so how far they got is inferred from evidence {'\u2014'} a
                      quotation exists, a conversation exists {'\u2014'} rather than recorded.
                      Drop-offs are a conservative floor until stage history lands.
                    </Honesty>
                  )}
                </>
              )}
            </Card>
          </Box>
        </Box>

        {/* --------------------------------------------------------- STOCK */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: T.inset, border: `1px solid ${T.insetRule}`, borderRadius: SHELL.radiusLg,
            p: { xs: 2.5, md: '24px 26px 26px' }, mb: 3.5,
          }}
        >
          <BandHead
            inset
            title={'Stock \u2014 the state of the desk right now'}
            note={'As of today \u00B7 the period selector does not apply'}
          />
          <Stack direction="row" flexWrap="wrap" gap={2}>
            <StockTile
              label="Open pipeline" loading={loading}
              severity={T.accent}
              value={fmtMoney(stock?.openPipeline)}
              note={`${fmtNum(stock?.openCount)} open enquiries`}
            />
            <StockTile
              label="Weighted pipeline" loading={loading}
              severity={stock?.probabilityCoverage != null && stock.probabilityCoverage < 60 ? STATUS.warning : T.accent}
              value={fmtMoney(stock?.weightedPipeline)}
              note={'expected value \u00D7 probability'}
              chip={stock?.probabilityCoverage != null && stock.probabilityCoverage < 60
                ? { text: `${stock.probabilityCoverage}% coverage`, ink: STATUS.warningInk, bg: STATUS.warningBg }
                : null}
            />
            <StockTile
              label="Overdue follow-ups" loading={loading}
              severity={stock?.overdueFollowups > 0 ? STATUS.critical : STATUS.good}
              value={fmtNum(stock?.overdueFollowups)}
              note={`${fmtMoney(stock?.overdueValue)} of pipeline unattended`}
              chip={stock?.overdueFollowups > 0
                ? { text: 'Act today', ink: STATUS.critical, bg: STATUS.criticalBg }
                : { text: 'Clear', ink: STATUS.good, bg: STATUS.goodBg }}
            />
            <StockTile
              label="Never contacted" loading={loading}
              severity={stock?.openNeverContacted > 0 ? STATUS.serious : STATUS.good}
              value={fmtNum(stock?.openNeverContacted)}
              note="open, zero conversation logged"
              chip={stock?.openNeverContacted > 0
                ? { text: 'Unworked', ink: STATUS.serious, bg: STATUS.seriousBg }
                : { text: 'All worked', ink: STATUS.good, bg: STATUS.goodBg }}
            />
          </Stack>

          {!loading && stock?.closedWithoutDate > 0 && (
            <Honesty>
              <b>{stock.closedWithoutDate}</b> closed enquiries carry no close date, so they fall
              outside every period above and are missing from the flow figures. Setting a close date
              on them brings them back into the numbers.
            </Honesty>
          )}
        </Paper>

        {/* ---------------------------------------------------- BREAKDOWNS */}
        <Box>
          <BandHead title="Breakdowns" note="Cohorts of enquiries raised in this period" />

          <Box sx={{
            display: 'grid', gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: '1.42fr 1fr' },
          }}>
            <Card
              title="Why enquiries close"
              sub={'Dated by close, not by when the enquiry was raised \u2014 this is a question about closures.'}
            >
              {loading ? <Skeleton variant="rounded" height={180} /> : (
                <>
                  <RankedBars rows={a?.byOutcome || []} colourFor={outcomeColour} />
                  {coverageNote && (
                    <Honesty>
                      <b>{coverageNote.coded} of {coverageNote.closed}</b> enquiries closed in this
                      period carry a close-reason code ({coverageNote.pct}%). The rest is inferred
                      from status {'\u2014'} the win rate above is only as honest as this number.
                    </Honesty>
                  )}
                </>
              )}
            </Card>

            <Card
              title="Lead source"
              sub={'Conversion, not volume \u2014 volume without conversion is just noise.'}
            >
              {loading ? <Skeleton variant="rounded" height={180} /> : (
                <>
                  <CohortTable rows={a?.bySource || []} keyHeader="Source" />
                  <Honesty>
                    Source is free text today, so <b>IndiaMart</b> and <b>Indiamart</b> split into
                    separate rows. A source master makes this reliable.
                  </Honesty>
                </>
              )}
            </Card>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Card
              title="Owner"
              sub={'Unassigned is a row, not a gap \u2014 it is usually the largest and worst-performing bucket.'}
            >
              {loading ? <Skeleton variant="rounded" height={160} />
                : <CohortTable rows={a?.byOwner || []} keyHeader="Owner" flagKey="unassigned" />}
            </Card>
          </Box>

          <Box sx={{
            display: 'grid', gap: 2, mt: 2,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}>
            <Card
              title="Open by stage"
              sub={'Stock, not flow \u2014 what is on the desk right now, whenever it arrived.'}
              right={<Eyebrow>As of today</Eyebrow>}
            >
              {loading ? <Skeleton variant="rounded" height={150} />
                : <RankedBars rows={a?.openByStage || []} />}
            </Card>

            <Card
              title="Activity mix"
              sub="Conversations logged in this period, by channel."
            >
              {loading ? <Skeleton variant="rounded" height={150} /> : (
                <Stack gap={1.2} sx={{ mt: 0.8 }}>
                  {(a?.byChannel || []).map((c) => (
                    <Stack key={c.key} direction="row" justifyContent="space-between"
                           sx={{ borderBottom: `1px solid ${T.ruleSoft}`, pb: 0.9 }}>
                      <Typography sx={{ fontSize: 12.5, color: T.ink2, fontWeight: 600 }}>{c.label}</Typography>
                      <Typography sx={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 600, color: T.ink }}>{c.count}</Typography>
                    </Stack>
                  ))}
                  {!(a?.byChannel || []).length && (
                    <Typography sx={{ fontSize: 12.5, color: T.ink3, fontWeight: 600 }}>
                      No conversations logged in this window.
                    </Typography>
                  )}
                </Stack>
              )}
            </Card>
          </Box>
        </Box>

      </Container>
    </Box>
  );
};

export default CrmDashboard;
