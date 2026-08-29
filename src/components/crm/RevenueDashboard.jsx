import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Container, Paper, Skeleton, Stack, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip,
} from '@mui/material';
import { ViewList, Refresh, Insights } from '@mui/icons-material';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend,
} from 'recharts';
import {
  T, SHELL, STATUS, MONO, EYEBROW,
  fmtMoney, fmtNum, fmtPct, fmtDate, humanize, delta,
} from '../../theme/moduleTokens';
import { REVENUE, FUNNEL_RAMP } from './crmTokens';
import {
  Eyebrow, BandHead, FlowTile, StockTile, Honesty, PeriodRail, Card,
  RankedBars, TH, TD, TDNum,
} from './crmPrimitives';
import { getSalesAnalytics } from '../../services/salesAnalyticsService';

/* ============================================================================
   Revenue Desk — the money half of the CRM dashboard.

   The Pipeline Desk answers "what might we win". This one answers "what did we
   actually sell, to whom, and of what" — and the two share a shell, a period
   rail and a tile vocabulary because they are one click apart and a second
   visual language between them reads as a different product.

   Same two bands, same rule:

   FLOW  — happened inside the selected window. Raised cards, a delta against
           the prior window, the period rail applies.
   STOCK — the state of the business right now: open deals, dormant accounts,
           money owed. Recessed ground, severity chips, and the period rail
           deliberately does NOT apply.

   Three disclosures this screen makes that a prettier one would not:

     · Unapproved order value, because intake that counts unapproved drafts
       flatters itself and every company that has not switched the approval
       workflow on has all of them.
     · Enquiry-link coverage, because the "top enquiries" table can only see
       orders that name an enquiry, and at 40% coverage it is describing 40%
       of the revenue.
     · New-vs-repeat meaningfulness, because on an all-time window every
       customer is new by construction and drawing that as a finding would
       tell a business with twenty years of loyal accounts that it has none.
   ========================================================================= */

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
          <Box component="b" sx={{ fontFamily: MONO, fontWeight: 700 }}>{fmtMoney(p.value)}</Box>
        </Stack>
      ))}
    </Box>
  );
};

/**
 * Ordered as bars, invoiced as a line.
 *
 * The two are not the same measurement taken twice — intake is dated by order, billing by invoice
 * — so they get different marks. Drawing both as lines would invite reading the gap between them
 * as a backlog figure, which it is not: it is two different clocks.
 */
const RevenueTrend = ({ data, bucket }) => (
  <Box sx={{ width: '100%', height: 248 }}>
    <ResponsiveContainer>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: -6, bottom: 0 }}>
        <CartesianGrid stroke={T.rule} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="bucket" tick={{ fill: T.ink3, fontSize: 10, fontFamily: MONO }}
          axisLine={{ stroke: T.rule }} tickLine={false}
        />
        <YAxis
          tick={{ fill: T.ink3, fontSize: 10, fontFamily: MONO }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => fmtMoney(v)}
        />
        <RTooltip content={<TrendTooltip />} cursor={{ fill: T.ruleSoft }} />
        <Legend
          verticalAlign="bottom" height={28} iconType="square" iconSize={9}
          wrapperStyle={{ fontSize: 12, color: T.ink2, fontWeight: 600 }}
        />
        <Bar dataKey="orderValue" name="Ordered" fill={REVENUE.ordered} radius={[3, 3, 0, 0]} maxBarSize={38} />
        <Line
          type="monotone" dataKey="invoicedValue" name="Invoiced" stroke={REVENUE.invoiced}
          strokeWidth={2} dot={false} activeDot={{ r: 4.5, strokeWidth: 2, stroke: T.surface }}
        />
      </ComposedChart>
    </ResponsiveContainer>
    <Typography sx={{ fontSize: 11.5, color: T.ink3, mt: 0.5, fontWeight: 600 }}>
      Bucketed by {bucket === 'week' ? 'week' : 'month'}. Ordered is dated by order date, invoiced by
      invoice date — two clocks, not a backlog.
    </Typography>
  </Box>
);

// ---------------------------------------------------------------- mix

/**
 * New versus repeat, as one proportional bar rather than two tiles.
 *
 * A split that must add to the whole should look like it does. Two separate figures invite the
 * reader to compare them against the headline instead of against each other, which is the wrong
 * comparison and the one that makes rounding look like an error.
 */
const MixBar = ({ mix }) => {
  const newRev = Number(mix?.newRevenue) || 0;
  const repeatRev = Number(mix?.repeatRevenue) || 0;
  const total = newRev + repeatRev;

  if (total <= 0) {
    return (
      <Typography sx={{ fontSize: 12.5, color: T.ink3, fontWeight: 600, mt: 1 }}>
        No revenue in this window.
      </Typography>
    );
  }

  const repeatPct = (repeatRev / total) * 100;

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', height: 30, borderRadius: 2, overflow: 'hidden' }}>
        <Tooltip arrow title={`Repeat — ${fmtMoney(repeatRev)} from ${fmtNum(mix.repeatCustomers)} customers`}>
          <Box sx={{
            width: `${repeatPct}%`, bgcolor: REVENUE.repeatBusiness,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {repeatPct >= 12 && (
              <Box component="span" sx={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                {repeatPct.toFixed(0)}%
              </Box>
            )}
          </Box>
        </Tooltip>
        <Tooltip arrow title={`New — ${fmtMoney(newRev)} from ${fmtNum(mix.newCustomers)} customers`}>
          <Box sx={{
            width: `${100 - repeatPct}%`, bgcolor: REVENUE.newBusiness,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {100 - repeatPct >= 12 && (
              <Box component="span" sx={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#fff' }}>
                {(100 - repeatPct).toFixed(0)}%
              </Box>
            )}
          </Box>
        </Tooltip>
      </Box>

      <Stack direction="row" gap={3} sx={{ mt: 1.6 }} flexWrap="wrap">
        <MixLeg
          swatch={REVENUE.repeatBusiness} label="Repeat customers"
          value={fmtMoney(repeatRev)}
          note={`${fmtNum(mix.repeatCustomers)} customers · ${fmtNum(mix.repeatOrders)} orders · avg ${fmtMoney(mix.repeatAvgOrderValue)}`}
        />
        <MixLeg
          swatch={REVENUE.newBusiness} label="New customers"
          value={fmtMoney(newRev)}
          note={`${fmtNum(mix.newCustomers)} customers · ${fmtNum(mix.newOrders)} orders · avg ${fmtMoney(mix.newAvgOrderValue)}`}
        />
      </Stack>
    </Box>
  );
};

const MixLeg = ({ swatch, label, value, note }) => (
  <Box sx={{ flex: '1 1 220px' }}>
    <Stack direction="row" alignItems="center" gap={1}>
      <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: swatch }} />
      <Eyebrow>{label}</Eyebrow>
    </Stack>
    <Typography sx={{
      fontFamily: MONO, fontSize: 18, fontWeight: 700, color: T.ink, mt: 0.4,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {value}
    </Typography>
    <Typography sx={{ fontSize: 11.5, color: T.ink3, fontWeight: 600, mt: 0.2 }}>{note}</Typography>
  </Box>
);

// ---------------------------------------------------------------- tables

const CustomerTable = ({ rows }) => (
  <TableContainer sx={{ overflowX: 'auto' }}>
    <Table size="small" sx={{ minWidth: 560 }}>
      <TableHead>
        <TableRow>
          <TableCell sx={TH}>Customer</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Orders</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Revenue</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Share</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Avg order</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Last order</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.customerId}>
            <TableCell sx={TD}>
              <Stack direction="row" alignItems="center" gap={1}>
                <span>{r.label}</span>
                {/* A word, not just a colour — the row has to read for everyone. */}
                <Box component="span" sx={{
                  px: 0.8, py: 0.25, borderRadius: 1.5, fontSize: 9.5, fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '.06em',
                  color: r.repeatCustomer ? STATUS.good : T.ink3,
                  bgcolor: r.repeatCustomer ? STATUS.goodBg : T.ruleSoft,
                }}>
                  {r.repeatCustomer ? 'Repeat' : 'New'}
                </Box>
              </Stack>
            </TableCell>
            <TableCell sx={TDNum}>{r.orderCount}</TableCell>
            <TableCell sx={{ ...TDNum, fontWeight: 700 }}>{fmtMoney(r.revenue)}</TableCell>
            <TableCell sx={TDNum}>{fmtPct(r.sharePercent)}</TableCell>
            <TableCell sx={TDNum}>{fmtMoney(r.averageOrderValue)}</TableCell>
            <TableCell sx={TDNum}>{fmtDate(r.lastOrderDate)}</TableCell>
          </TableRow>
        ))}
        {!rows.length && (
          <TableRow><TableCell sx={{ ...TD, color: T.ink3 }} colSpan={6}>No orders in this window.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const ProductTable = ({ rows }) => (
  <TableContainer sx={{ overflowX: 'auto' }}>
    <Table size="small" sx={{ minWidth: 620 }}>
      <TableHead>
        <TableRow>
          <TableCell sx={TH}>Product</TableCell>
          <TableCell sx={TH}>Group</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Qty</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Revenue</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Share</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Customers</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.itemId}>
            <TableCell sx={TD}>
              <Box sx={{ fontWeight: 600 }}>{r.itemName}</Box>
              <Box sx={{ fontFamily: MONO, fontSize: 11, color: T.ink3 }}>{r.itemCode}</Box>
            </TableCell>
            <TableCell sx={{ ...TD, color: T.ink2, fontSize: 12 }}>{r.itemGroup}</TableCell>
            <TableCell sx={TDNum}>{fmtNum(r.qty)}</TableCell>
            <TableCell sx={{ ...TDNum, fontWeight: 700 }}>{fmtMoney(r.revenue)}</TableCell>
            <TableCell sx={TDNum}>{fmtPct(r.sharePercent)}</TableCell>
            {/*
              One customer behind a top-selling product is a concentration risk wearing a
              top-seller badge, so it is called out rather than left as a number to notice.
            */}
            <TableCell sx={{
              ...TDNum,
              color: r.customerCount === 1 ? STATUS.warningInk : T.ink,
              fontWeight: r.customerCount === 1 ? 700 : 500,
            }}>
              {r.customerCount}
            </TableCell>
          </TableRow>
        ))}
        {!rows.length && (
          <TableRow><TableCell sx={{ ...TD, color: T.ink3 }} colSpan={6}>No order lines in this window.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const ConvertedTable = ({ rows, onOpen }) => (
  <TableContainer sx={{ overflowX: 'auto' }}>
    <Table size="small" sx={{ minWidth: 620 }}>
      <TableHead>
        <TableRow>
          <TableCell sx={TH}>Enquiry</TableCell>
          <TableCell sx={TH}>Customer</TableCell>
          <TableCell sx={TH}>Source</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Forecast</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Booked</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>vs forecast</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow
            key={r.enquiryId}
            hover
            onClick={() => onOpen(r.enquiryId)}
            sx={{ cursor: 'pointer' }}
          >
            <TableCell sx={TD}>
              <Box sx={{ fontWeight: 600 }}>{r.title}</Box>
              <Box sx={{ fontFamily: MONO, fontSize: 11, color: T.ink3 }}>{r.enqNo}</Box>
            </TableCell>
            <TableCell sx={{ ...TD, fontSize: 12.5 }}>{r.customer}</TableCell>
            <TableCell sx={{ ...TD, color: T.ink2, fontSize: 12 }}>{r.source}</TableCell>
            <TableCell sx={{ ...TDNum, color: T.ink3 }}>{fmtMoney(r.expectedRevenue)}</TableCell>
            <TableCell sx={{ ...TDNum, fontWeight: 700 }}>{fmtMoney(r.bookedValue)}</TableCell>
            <TableCell sx={{
              ...TDNum,
              color: r.forecastAccuracyPercent == null ? T.ink3
                : r.forecastAccuracyPercent >= 80 && r.forecastAccuracyPercent <= 125 ? STATUS.good
                : STATUS.warningInk,
            }}>
              {fmtPct(r.forecastAccuracyPercent)}
            </TableCell>
          </TableRow>
        ))}
        {!rows.length && (
          <TableRow>
            <TableCell sx={{ ...TD, color: T.ink3 }} colSpan={6}>
              No orders in this window name the enquiry they came from.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const OpportunityTable = ({ rows, onOpen }) => (
  <TableContainer sx={{ overflowX: 'auto' }}>
    <Table size="small" sx={{ minWidth: 640 }}>
      <TableHead>
        <TableRow>
          <TableCell sx={TH}>Opportunity</TableCell>
          <TableCell sx={TH}>Customer</TableCell>
          <TableCell sx={TH}>Stage</TableCell>
          <TableCell sx={TH}>Owner</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Value</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Weighted</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Age</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow
            key={r.enquiryId}
            hover
            onClick={() => onOpen(r.enquiryId)}
            sx={{ cursor: 'pointer', bgcolor: r.followupOverdue ? STATUS.criticalBg : undefined }}
          >
            <TableCell sx={TD}>
              <Box sx={{ fontWeight: 600 }}>{r.title}</Box>
              <Stack direction="row" gap={1} alignItems="center">
                <Box component="span" sx={{ fontFamily: MONO, fontSize: 11, color: T.ink3 }}>{r.enqNo}</Box>
                {r.followupOverdue && (
                  <Box component="span" sx={{
                    px: 0.7, py: 0.2, borderRadius: 1.5, fontSize: 9.5, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '.06em',
                    color: STATUS.critical, bgcolor: STATUS.criticalBg,
                  }}>
                    Follow-up overdue
                  </Box>
                )}
              </Stack>
            </TableCell>
            <TableCell sx={{ ...TD, fontSize: 12.5 }}>{r.customer}</TableCell>
            <TableCell sx={{ ...TD, fontSize: 12, color: T.ink2 }}>{humanize(r.status)}</TableCell>
            <TableCell sx={{ ...TD, fontSize: 12, color: T.ink2 }}>{r.owner}</TableCell>
            <TableCell sx={{ ...TDNum, fontWeight: 700 }}>{fmtMoney(r.expectedRevenue)}</TableCell>
            {/* Blank, not zero, where probability was never set — unforecast is not nil. */}
            <TableCell sx={{ ...TDNum, color: r.weightedValue == null ? T.ink3 : T.ink }}>
              {r.weightedValue == null ? '—' : fmtMoney(r.weightedValue)}
            </TableCell>
            <TableCell sx={TDNum}>{r.ageDays == null ? '—' : `${r.ageDays}d`}</TableCell>
          </TableRow>
        ))}
        {!rows.length && (
          <TableRow><TableCell sx={{ ...TD, color: T.ink3 }} colSpan={7}>Nothing open on the desk.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const DormantTable = ({ rows }) => (
  <TableContainer sx={{ overflowX: 'auto' }}>
    <Table size="small" sx={{ minWidth: 460 }}>
      <TableHead>
        <TableRow>
          <TableCell sx={TH}>Account</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Last order</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Silent</TableCell>
          <TableCell sx={{ ...TH, textAlign: 'right' }}>Lifetime</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.customerId}>
            <TableCell sx={TD}>{r.label}</TableCell>
            <TableCell sx={TDNum}>{fmtDate(r.lastOrderDate)}</TableCell>
            <TableCell sx={{ ...TDNum, color: STATUS.warningInk, fontWeight: 700 }}>
              {r.daysSinceLastOrder == null ? '—' : `${r.daysSinceLastOrder}d`}
            </TableCell>
            <TableCell sx={TDNum}>
              {fmtMoney(r.lifetimeValue)}
              <Box component="span" sx={{ color: T.ink3, fontSize: 11 }}> · {r.lifetimeOrders}</Box>
            </TableCell>
          </TableRow>
        ))}
        {!rows.length && (
          <TableRow><TableCell sx={{ ...TD, color: T.ink3 }} colSpan={4}>No lapsed accounts.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

// ---------------------------------------------------------------- dashboard

const RevenueDashboard = () => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState('THIS_FY');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getSalesAnalytics({ preset: p }));
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not load revenue figures. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(preset); }, [preset, load]);

  const h = data?.headline;
  const prev = data?.previous;
  const mix = data?.customerMix;
  const conc = data?.concentration;
  const cover = data?.productCoverage;
  const recv = data?.receivables;

  const periodLabel = useMemo(() => data?.period?.label || null, [data]);

  /** Product-group bars, shaped for the shared RankedBars and capped at the ramp's five steps. */
  const groupRows = useMemo(
    () => (data?.byProductGroup || []).slice(0, 5).map((g) => ({
      key: g.groupCode,
      label: g.groupCode,
      revenue: g.revenue,
      sharePercent: g.sharePercent,
    })),
    [data],
  );

  const openEnquiry = (id) => navigate(`/enquiry?id=${id}`);

  return (
    <Box sx={{ bgcolor: T.ground, minHeight: '100vh' }}>

      {/* ---- masthead: the same shell the pipeline desk wears ---- */}
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
                Revenue Desk
              </Typography>
              <Typography variant="h6" sx={{ color: SHELL.heroInkDim, fontWeight: 500, maxWidth: 640 }}>
                Order intake, repeat business, top products and the accounts that have gone quiet —
                measured against the period before.
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
                variant="outlined" startIcon={<Insights />}
                onClick={() => navigate('/crm/pipeline')}
                sx={{
                  color: 'white', borderColor: SHELL.heroLine, borderRadius: 3,
                  textTransform: 'none', fontWeight: 700, px: 3,
                  '&:hover': { bgcolor: SHELL.heroFill, borderColor: SHELL.heroLine },
                }}
              >
                Pipeline Desk
              </Button>
              <Button
                variant="outlined" startIcon={<ViewList />}
                onClick={() => navigate('/sales/sales-order')}
                sx={{
                  color: 'white', borderColor: SHELL.heroLine, borderRadius: 3,
                  textTransform: 'none', fontWeight: 700, px: 3,
                  '&:hover': { bgcolor: SHELL.heroFill, borderColor: SHELL.heroLine },
                }}
              >
                Order Register
              </Button>
            </Stack>
          </Stack>

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
          <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
            <FlowTile
              label="Order intake" loading={loading}
              value={fmtMoney(h?.orderValue)}
              pct={delta(h?.orderValue, prev?.orderValue)}
              priorLabel={prev ? `vs ${fmtMoney(prev.orderValue)} prior` : 'no prior period'}
            />
            <FlowTile
              label="Orders" loading={loading}
              value={fmtNum(h?.orderCount)}
              pct={delta(h?.orderCount, prev?.orderCount)}
              priorLabel={`${fmtNum(h?.customerCount)} customers`}
            />
            <FlowTile
              label="Avg order value" loading={loading}
              value={fmtMoney(h?.averageOrderValue)}
              pct={delta(h?.averageOrderValue, prev?.averageOrderValue)}
              priorLabel={prev ? `vs ${fmtMoney(prev.averageOrderValue)} prior` : 'no prior period'}
            />
            <FlowTile
              label="Repeat revenue" loading={loading}
              value={mix?.repeatRevenuePercent != null ? Number(mix.repeatRevenuePercent).toFixed(1) : '—'}
              unit={mix?.repeatRevenuePercent != null ? '%' : null}
              pct={null}
              priorLabel={`${fmtMoney(mix?.repeatRevenue)} from ${fmtNum(mix?.repeatCustomers)} returning`}
            />
          </Stack>

          <BandHead
            title={'Flow — what was sold in this period'}
            note="Every figure here moves with the period selector"
          />

          {!loading && h?.unapprovedCount > 0 && (
            <Honesty>
              <b>{fmtMoney(h.unapprovedValue)}</b> of the intake above ({h.unapprovedCount} of{' '}
              {h.orderCount} orders) sits at an approval status other than APPROVED. It is counted,
              not hidden — filtering it out would report a confident zero to anyone who has not
              switched the approval workflow on.
            </Honesty>
          )}

          <Box sx={{
            display: 'grid', gap: 2, mt: 2,
            gridTemplateColumns: { xs: '1fr', lg: '1.42fr 1fr' },
          }}>
            <Card
              title="Ordered and invoiced"
              sub="What was sold against what was billed — two clocks on one axis."
              right={<Eyebrow>{data?.trendBucket === 'week' ? 'Weekly' : 'Monthly'}</Eyebrow>}
            >
              {loading ? <Skeleton variant="rounded" height={248} />
                : <RevenueTrend data={data?.trend || []} bucket={data?.trendBucket} />}
            </Card>

            <Card
              title="New vs repeat business"
              sub="Repeat means they had already traded with you before this window opened."
            >
              {loading ? <Skeleton variant="rounded" height={200} /> : (
                <>
                  <MixBar mix={mix} />
                  {mix && !mix.meaningful && (
                    <Honesty>
                      This window reaches back to the beginning of the register, so there is no
                      "before" for anyone to have traded in — every customer classifies as new.
                      Pick a bounded period to make this split mean something.
                    </Honesty>
                  )}
                </>
              )}
            </Card>
          </Box>

          {/* ------------------------------------------------ customers */}
          <Box sx={{ mt: 2 }}>
            <Card
              title="Top customers"
              sub="Ranked by revenue in this window, with how much of the total each one carries."
              right={conc?.top5Percent != null ? (
                <Eyebrow sx={{ color: conc.top5Percent >= 70 ? STATUS.warningInk : T.ink3 }}>
                  Top 5 = {Number(conc.top5Percent).toFixed(0)}%
                </Eyebrow>
              ) : null}
            >
              {loading ? <Skeleton variant="rounded" height={260} /> : (
                <>
                  <CustomerTable rows={data?.topCustomers || []} />
                  {conc?.topCustomerPercent != null && conc.topCustomerPercent >= 30 && (
                    <Honesty>
                      One customer accounts for <b>{Number(conc.topCustomerPercent).toFixed(1)}%</b> of
                      this period's revenue, and the top five for{' '}
                      <b>{Number(conc.top5Percent).toFixed(1)}%</b> across {fmtNum(conc.customerCount)}{' '}
                      trading accounts. Turnover and resilience are different numbers.
                    </Honesty>
                  )}
                </>
              )}
            </Card>
          </Box>

          {/* ------------------------------------------------- products */}
          <Box sx={{
            display: 'grid', gap: 2, mt: 2,
            gridTemplateColumns: { xs: '1fr', lg: '1.42fr 1fr' },
          }}>
            <Card
              title="Top products"
              sub="Line value with the order's header discount allocated down to the line."
            >
              {loading ? <Skeleton variant="rounded" height={260} /> : (
                <>
                  <ProductTable rows={data?.topProducts || []} />
                  {cover && !cover.reconciled && (
                    <Honesty>
                      These lines account for <b>{fmtPct(cover.coveragePercent)}</b> of the{' '}
                      {fmtMoney(cover.headerValue)} intake above. The difference is orders carrying
                      no item lines — their revenue is in the headline but belongs to no product row
                      here.
                    </Honesty>
                  )}
                </>
              )}
            </Card>

            <Card
              title="By product family"
              sub="Rolled up from every line in the window, not from the top-20 above."
            >
              {loading ? <Skeleton variant="rounded" height={200} /> : (
                <RankedBars
                  rows={groupRows}
                  valueFor={(r) => r.revenue}
                  colourFor={(key) => FUNNEL_RAMP[
                    Math.min(groupRows.findIndex((g) => g.key === key), FUNNEL_RAMP.length - 1)
                  ] || FUNNEL_RAMP[2]}
                  labelFor={(r) => (
                    <>
                      {fmtMoney(r.revenue)}
                      <Box component="span" sx={{ color: T.ink3, fontSize: 11 }}>
                        {' '}· {fmtPct(r.sharePercent)}
                      </Box>
                    </>
                  )}
                />
              )}
            </Card>
          </Box>

          {/* ---------------------------------------- converted enquiries */}
          <Box sx={{ mt: 2 }}>
            <Card
              title="Top enquiries that became revenue"
              sub="Reached through the order's enquiry link, so orders taken without a quotation still count."
            >
              {loading ? <Skeleton variant="rounded" height={240} /> : (
                <>
                  <ConvertedTable rows={data?.topConvertedEnquiries || []} onOpen={openEnquiry} />
                  {h?.enquiryLinkedPercent != null && h.enquiryLinkedPercent < 100 && (
                    <Honesty>
                      <b>{fmtPct(h.enquiryLinkedPercent)}</b> of this period's orders name the enquiry
                      they came from ({h.fromEnquiryCount} of {h.orderCount}). This table can only
                      rank those — the rest of the revenue is real but unattributed.
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
            title={'Stock — where the business stands right now'}
            note={'As of today · the period selector does not apply'}
          />
          <Stack direction="row" flexWrap="wrap" gap={2}>
            <StockTile
              label="Outstanding" loading={loading}
              severity={T.accent}
              value={fmtMoney(recv?.outstanding)}
              note={`${fmtNum(recv?.openInvoiceCount)} invoices unpaid or part-paid`}
            />
            <StockTile
              label="Overdue" loading={loading}
              severity={recv?.overdue > 0 ? STATUS.critical : STATUS.good}
              value={fmtMoney(recv?.overdue)}
              note={`${fmtNum(recv?.overdueInvoiceCount)} past their due date`}
              chip={recv?.overdue > 0
                ? { text: `${fmtPct(recv.overduePercent)} of book`, ink: STATUS.critical, bg: STATUS.criticalBg }
                : { text: 'Clean', ink: STATUS.good, bg: STATUS.goodBg }}
            />
            <StockTile
              label="Dormant accounts" loading={loading}
              severity={(data?.dormantCustomers || []).length > 0 ? STATUS.serious : STATUS.good}
              value={fmtNum((data?.dormantCustomers || []).length)}
              note={`no order in ${data?.dormantAfterDays ?? 180} days`}
              chip={(data?.dormantCustomers || []).length > 0
                ? { text: 'Call list', ink: STATUS.serious, bg: STATUS.seriousBg }
                : { text: 'All active', ink: STATUS.good, bg: STATUS.goodBg }}
            />
            <StockTile
              label="Open opportunities" loading={loading}
              severity={T.accent}
              value={fmtNum((data?.topOpenOpportunities || []).length)}
              note="largest live deals, listed below"
            />
          </Stack>

          <Box sx={{
            display: 'grid', gap: 2, mt: 2.5,
            gridTemplateColumns: { xs: '1fr', lg: '1.42fr 1fr' },
          }}>
            <Card
              title="Biggest open deals"
              sub="The desk as it stands today — this list does not move with the period."
              right={<Eyebrow>As of today</Eyebrow>}
            >
              {loading ? <Skeleton variant="rounded" height={240} />
                : <OpportunityTable rows={data?.topOpenOpportunities || []} onOpen={openEnquiry} />}
            </Card>

            <Card
              title="Gone quiet"
              sub="Ranked by what they were worth, not by how long they have been silent."
              right={<Eyebrow>{data?.dormantAfterDays ?? 180}d+</Eyebrow>}
            >
              {loading ? <Skeleton variant="rounded" height={240} />
                : <DormantTable rows={data?.dormantCustomers || []} />}
            </Card>
          </Box>

          <Honesty>
            Outstanding is measured as of today because an invoice records how much has been
            collected, not when. A period-bounded collections figure lives in Accounting's payment
            ledger; bounding this one would compare a filtered invoice set against an all-time
            payment total and report negative debt in a good quarter.
          </Honesty>
        </Paper>

      </Container>
    </Box>
  );
};

export default RevenueDashboard;
