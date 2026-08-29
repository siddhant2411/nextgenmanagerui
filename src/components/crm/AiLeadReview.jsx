import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, AlertTitle, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogTitle, Drawer,
  IconButton, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
  Close, Refresh, ViewList, CloudSync, CheckCircleOutline, BlockOutlined,
  MergeTypeOutlined, SmartToyOutlined,
} from '@mui/icons-material';
import {
  T, SHELL, STATUS, MONO, EYEBROW, TABLE, chipSx,
  fmtNum, fmtPct, fmtDate, humanize, heroButtonSx, panelSx,
} from '../../theme/moduleTokens';
import { BandHead, Card } from './crmPrimitives';
import { resolveApiErrorMessage } from '../../services/apiService';
import { searchEnquiryForMerge } from '../../services/commonAPI';
import {
  getAgentHealth, getAgentStats, getReviewQueue, getRunTrace,
  submitReviewAction, triggerPoll,
} from '../../services/aiLeadAgentService';

/** Normalises an apiService rejection into the {status, message} shape this screen renders. */
const toDisplayError = (err, fallback) => ({
  status: err?.response?.status ?? null,
  message: resolveApiErrorMessage(err, fallback),
});

/* ============================================================================
   AI Lead Review — the adjudication desk for machine-extracted enquiries.

   Wears the same chrome as the Pipeline Desk and the enquiry register, from the
   same tokens, because this screen is one click from both.

   The screen exists because the agent deliberately does not decide everything.
   Three bands, by confidence:

     >= 0.90  written straight to the register, unflagged. Never appears here.
     >= 0.70  written to the register, but flagged. A person confirms it.
     <  0.70  held in the agent's own queue. The ERP is never touched.

   That last band is the reason the queue is not just an ERP filter: those leads
   have no enquiry number because they were never filed, and the whole point is
   that a bad extraction must not reach the register before a human sees it.

   So every row here shows the score and the confidence that produced it. A desk
   that only shows the extraction invites rubber-stamping; showing how sure the
   machine was, and on what evidence, is what makes the review a review.
   ========================================================================= */

const QUEUE_TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'MERGED', label: 'Merged' },
];

// HOT/WARM/COLD carry the same colours as EnquiryPriority everywhere else in the product, and
// are always rendered with the word beside them — colour is never the only signal.
const PRIORITY_STYLE = {
  HOT: { color: STATUS.critical, bg: STATUS.criticalBg },
  WARM: { color: STATUS.warning, bg: STATUS.warningBg },
  COLD: { color: T.accent, bg: T.accentDim },
};

/**
 * Confidence, banded to the thresholds that actually drove the decision.
 *
 * A bare "0.74" tells a salesperson nothing. What it means is "the agent filed this but wants
 * you to check it", and that is what the chip says.
 */
const confidenceBand = (confidence) => {
  if (confidence == null) return { label: 'Unknown', color: T.ink2, bg: T.inset };
  if (confidence >= 0.9) return { label: 'High', color: STATUS.good, bg: STATUS.goodBg };
  if (confidence >= 0.7) return { label: 'Moderate', color: STATUS.warning, bg: STATUS.warningBg };
  return { label: 'Low', color: STATUS.critical, bg: STATUS.criticalBg };
};

// ---------------------------------------------------------------- tiles

const StatTile = ({ label, value, note, loading, tone }) => (
  <Box sx={{
    p: 2.5, borderRadius: SHELL.radius, bgcolor: T.surface,
    border: `1px solid ${T.rule}`, boxShadow: SHELL.tileShadow, minWidth: 0,
  }}>
    <Typography sx={{ ...EYEBROW, mb: 1 }}>{label}</Typography>
    {loading ? (
      <Skeleton width={64} height={38} />
    ) : (
      <Typography sx={{
        fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, fontFamily: MONO,
        fontVariantNumeric: 'tabular-nums', color: tone || T.ink,
      }}>
        {value}
      </Typography>
    )}
    {note && <Typography sx={{ fontSize: 12, color: T.ink2, mt: 0.5 }}>{note}</Typography>}
  </Box>
);

// ---------------------------------------------------------------- trace

/**
 * The per-agent trace: what each step decided, how sure it was, and how long it took.
 *
 * This is the part that makes an approval defensible. Without it the reviewer is agreeing with a
 * verdict; with it they can see that the classifier was certain, the extractor was not, and the
 * contact ladder stopped at a fuzzy company-name match — which is usually the actual reason the
 * lead is sitting in this queue.
 */
const RunTrace = ({ trace, loading }) => {
  if (loading) return <Skeleton variant="rounded" height={160} />;
  if (!trace?.runs?.length) {
    return <Typography sx={{ fontSize: 13, color: T.ink2 }}>No trace recorded for this email.</Typography>;
  }

  return (
    <Stack spacing={1}>
      {trace.runs.map((run) => (
        <Box key={run.id} sx={{
          p: 1.5, borderRadius: 2, bgcolor: T.inset,
          border: `1px solid ${run.error ? `${STATUS.critical}40` : T.insetRule}`,
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.ink }}>
              {humanize(run.agent_name)}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {run.confidence != null && (
                <Typography sx={{ fontSize: 11, fontFamily: MONO, color: T.ink2 }}>
                  {fmtPct(run.confidence * 100, 0)}
                </Typography>
              )}
              <Typography sx={{ fontSize: 11, fontFamily: MONO, color: T.ink3 }}>
                {fmtNum(run.latency_ms)} ms
              </Typography>
            </Stack>
          </Stack>
          <Typography sx={{ fontSize: 11, color: T.ink3, mt: 0.25 }}>
            {run.model}
            {run.tokens ? ` · ${fmtNum(run.tokens)} tokens` : ''}
          </Typography>
          {run.error && (
            <Typography sx={{ fontSize: 12, color: STATUS.critical, mt: 0.5, fontWeight: 600 }}>
              {run.error}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
};

// ---------------------------------------------------------------- drawer

const ReviewDrawer = ({ task, trace, traceLoading, onClose, onAction, busy }) => {
  const [notes, setNotes] = useState('');
  // Holds the selected EnquiryTableDTO (or null), not a bare id — the picker needs the object to
  // render a label; the id used for the actual merge is read off it at submit time.
  const [mergeTarget, setMergeTarget] = useState(null);
  const [mergeOptions, setMergeOptions] = useState([]);
  const [mergeSearchLoading, setMergeSearchLoading] = useState(false);
  const mergeSearchTimeout = useRef(null);

  useEffect(() => {
    setNotes('');
    setMergeTarget(null);
    setMergeOptions([]);
    // Seed the picker with the extracted company name -- opening the dropdown then shows
    // plausible matches immediately instead of an empty list waiting on the first keystroke.
    if (task?.company_name) {
      searchEnquiryForMerge(task.company_name).then(setMergeOptions).catch(() => {});
    }
  }, [task?.task_id, task?.company_name]);

  const searchMergeTargets = (query) => {
    clearTimeout(mergeSearchTimeout.current);
    setMergeSearchLoading(true);
    mergeSearchTimeout.current = setTimeout(async () => {
      try {
        setMergeOptions(await searchEnquiryForMerge(query));
      } finally {
        setMergeSearchLoading(false);
      }
    }, 400);
  };

  if (!task) return null;

  const extracted = task.extracted_data || {};
  const customer = extracted.customer || {};
  const enquiry = extracted.enquiry || {};
  const commercial = extracted.commercial || {};
  const products = enquiry.products || [];
  const band = confidenceBand(task.confidence);
  const priority = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.WARM;

  const decided = task.status !== 'PENDING';

  return (
    <Drawer
      anchor="right" open onClose={onClose}
      PaperProps={{ sx: {
        width: { xs: '100%', md: 640 }, bgcolor: T.ground,
        display: 'flex', flexDirection: 'column',
      } }}
    >
      <Box sx={{ p: 3, bgcolor: SHELL.heroBg, color: SHELL.heroInk, flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ ...EYEBROW, color: SHELL.heroInkFaint, mb: 0.5 }}>
              Task #{task.task_id}
            </Typography>
            <Typography sx={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
              {task.opportunity_name || 'Untitled opportunity'}
            </Typography>
            <Typography sx={{ color: SHELL.heroInkDim, fontSize: 14, mt: 0.5 }}>
              {task.company_name} {'·'} {task.from_email}
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: SHELL.heroInk }}><Close /></IconButton>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip size="small" label={task.priority} sx={chipSx(priority.color, priority.bg)} />
          <Chip size="small" label={`${band.label} confidence`} sx={chipSx(band.color, band.bg)} />
          <Chip
            size="small"
            label={`Score ${task.score}/100`}
            sx={chipSx(T.ink2, T.inset)}
          />
        </Stack>
      </Box>

      {/* The scrollable middle. flex:1 + minHeight:0 is what makes overflowY actually bound to
          the space between the fixed header and the fixed decision footer below, rather than
          growing with content and leaving the footer to fight the page for a scroll container --
          that fight is what previously rendered as the decision panel overlapping the cards. */}
      <Box sx={{ p: 3, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {/* Why it is here, in the agent's own words. Leading with this stops the drawer from
            reading as a data-entry form and keeps it a decision. */}
        <Alert
          severity={decided ? 'success' : 'info'}
          sx={{ mb: 3, borderRadius: 3, fontSize: 13 }}
        >
          <AlertTitle sx={{ fontWeight: 800, fontSize: 13 }}>
            {decided ? `${humanize(task.status)} by ${task.reviewed_by || 'a reviewer'}` : 'Held for review'}
          </AlertTitle>
          {task.notes}
        </Alert>

        <Card title="Customer" sx={{ mb: 2.5 }}>
          <Stack spacing={0.75}>
            <Field label="Company" value={customer.company_name} />
            <Field label="Contact" value={customer.contact_person_name} />
            <Field label="Email" value={customer.email || task.from_email} mono />
            <Field label="Phone" value={customer.phone} mono />
            <Field label="Location" value={[customer.city, customer.state].filter(Boolean).join(', ')} />
            <Field label="GSTIN" value={customer.gst_number} mono />
          </Stack>
        </Card>

        <Card title="Enquiry" sx={{ mb: 2.5 }}>
          <Stack spacing={0.75}>
            <Field label="Type" value={enquiry.type} />
            <Field label="RFQ reference" value={commercial.reference_number} mono />
            <Field label="Delivery to" value={enquiry.delivery_location} />
            <Field label="Wanted by" value={enquiry.expected_delivery_date} />
            <Field label="Certifications" value={enquiry.certifications} />
          </Stack>
          {enquiry.description && (
            <Typography sx={{
              mt: 2, p: 1.5, fontSize: 13, color: '#334155', bgcolor: T.inset,
              borderRadius: 2, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto',
            }}>
              {enquiry.description}
            </Typography>
          )}
        </Card>

        <Card title="Items" sub={`${products.length} line${products.length === 1 ? '' : 's'}`} sx={{ mb: 2.5 }}>
          {products.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: T.ink2 }}>
              No items were extracted. The enquiry can still be filed against the description.
            </Typography>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={TABLE.head}>Product</TableCell>
                    <TableCell sx={TABLE.head}>Matched item</TableCell>
                    <TableCell sx={{ ...TABLE.head, textAlign: 'right' }}>Qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell sx={TABLE.cell}>{p.product_name_required}</TableCell>
                      <TableCell sx={TABLE.cell}>
                        {/* An unmatched line is stated, not left blank. A blank cell reads as an
                            oversight; "not matched" is the fact the reviewer needs to act on. */}
                        {p.inventory_item_id ? (
                          <Typography sx={{ fontSize: 12, fontFamily: MONO, color: STATUS.good }}>
                            {p.item_code || `#${p.inventory_item_id}`}
                          </Typography>
                        ) : (
                          <Typography sx={{ fontSize: 12, color: T.ink3, fontStyle: 'italic' }}>
                            not matched
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={TABLE.num}>{fmtNum(p.qty)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        <Card title="Agent trace" sub="What each step decided" sx={{ mb: 2.5 }}>
          <RunTrace trace={trace} loading={traceLoading} />
        </Card>
      </Box>

      {/* A real footer, not a sticky element inside the scroll area -- always visible, never
          overlapping the last scrolled card, the same way a dialog's action bar works. */}
      {!decided && (
        <Box sx={{
          flexShrink: 0, p: 3, borderTop: `1px solid ${T.rule}`,
          bgcolor: T.surface, boxShadow: '0 -4px 12px rgba(15,23,42,0.06)',
        }}>
          <Typography sx={{ ...EYEBROW, mb: 1.5 }}>Decision</Typography>

          <TextField
            fullWidth multiline minRows={2} size="small"
            placeholder="Why (recorded against the task)"
            value={notes} onChange={(e) => setNotes(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Autocomplete
            size="small"
            options={mergeOptions}
            loading={mergeSearchLoading}
            value={mergeTarget}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            getOptionLabel={(opt) => opt ? `${opt.enqNo} — ${opt.opportunityName || opt.companyName || 'Untitled'}` : ''}
            renderOption={(props, opt) => (
              <li {...props} key={opt.id}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{opt.enqNo}</Typography>
                  <Typography sx={{ fontSize: 12, color: T.ink2 }}>
                    {opt.companyName || 'N/A'} {opt.opportunityName ? `— ${opt.opportunityName}` : ''}
                  </Typography>
                </Box>
              </li>
            )}
            onInputChange={(e, val, reason) => { if (reason === 'input') searchMergeTargets(val); }}
            onChange={(e, val) => setMergeTarget(val)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Merge into enquiry"
                placeholder="Search by company name or enquiry number"
                helperText="Only needed for Merge — logs this mail against an existing enquiry instead of filing a new one."
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {mergeSearchLoading && <CircularProgress size={14} sx={{ mr: 1 }} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{ mb: 2 }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              fullWidth variant="contained" disabled={busy}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutline />}
              onClick={() => onAction('APPROVE', { notes })}
              sx={{
                borderRadius: 3, textTransform: 'none', fontWeight: 800,
                bgcolor: STATUS.good, '&:hover': { bgcolor: '#047857' },
              }}
            >
              Approve
            </Button>
            <Button
              fullWidth variant="outlined" disabled={busy || !mergeTarget}
              startIcon={<MergeTypeOutlined />}
              onClick={() => onAction('MERGE', { notes, targetEnquiryId: mergeTarget?.id })}
              sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800 }}
            >
              Merge
            </Button>
            <Button
              fullWidth variant="outlined" color="error" disabled={busy}
              startIcon={<BlockOutlined />}
              onClick={() => onAction('REJECT', { notes })}
              sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800 }}
            >
              Reject
            </Button>
          </Stack>
        </Box>
      )}
    </Drawer>
  );
};

const Field = ({ label, value, mono }) => (
  <Stack direction="row" gap={2} alignItems="baseline">
    <Typography sx={{ fontSize: 12, color: T.ink3, minWidth: 110, fontWeight: 600 }}>{label}</Typography>
    <Typography sx={{
      fontSize: 13, color: value ? T.ink : T.ink3, fontWeight: value ? 600 : 400,
      fontFamily: mono && value ? MONO : undefined, wordBreak: 'break-word',
    }}>
      {value || '—'}
    </Typography>
  </Stack>
);

// ---------------------------------------------------------------- screen

export default function AiLeadReview() {
  const navigate = useNavigate();

  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [trace, setTrace] = useState(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [notice, setNotice] = useState(null);

  // Bulk selection is only meaningful against PENDING rows -- an approved or rejected task has
  // no action left to take on it, so this is cleared on every reload rather than tracked across
  // tab switches, which would otherwise leave stale ids selected against a different list.
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(null); // null | 'APPROVE' | 'REJECT'
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async (queueStatus) => {
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    try {
      // Fetched together: if the agent is unreachable, health and stats fail the same way the
      // queue does (the backend's 502), so there's nothing extra to learn from staggering them.
      const [healthResult, statsResult, queueResult] = await Promise.allSettled([
        getAgentHealth(),
        getAgentStats(),
        getReviewQueue({ status: queueStatus }),
      ]);

      if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);

      if (queueResult.status === 'fulfilled') {
        setQueue(queueResult.value.content || []);
      } else {
        throw queueResult.reason;
      }
    } catch (err) {
      setError(toDisplayError(err, 'Could not load the AI review queue.'));
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(status); }, [load, status]);

  const openTask = async (task) => {
    setSelected(task);
    setTrace(null);
    setTraceLoading(true);
    try {
      setTrace(await getRunTrace(task.email_id));
    } catch {
      // A missing trace must not block the decision — the extraction is on screen either way.
      setTrace(null);
    } finally {
      setTraceLoading(false);
    }
  };

  const act = async (action, payload) => {
    setBusy(true);
    try {
      const result = await submitReviewAction(selected.task_id, { action, ...payload });
      setNotice(
        result?.result?.enq_no
          ? `${humanize(action)}d — filed as ${result.result.enq_no}`
          : `${humanize(action)}d`
      );
      setSelected(null);
      await load(status);
    } catch (err) {
      setError(toDisplayError(err, 'Could not record that decision.'));
    } finally {
      setBusy(false);
    }
  };

  const runPoll = async () => {
    setPolling(true);
    try {
      const result = await triggerPoll();
      setNotice(`Polled: ${result.emails_processed} message(s) processed`);
      await load(status);
    } catch (err) {
      setError(toDisplayError(err, 'Could not trigger a poll cycle.'));
    } finally {
      setPolling(false);
    }
  };

  const toggleSelected = (taskId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  };

  const allVisibleSelected = queue.length > 0 && queue.every((t) => selectedIds.has(t.task_id));
  const toggleSelectAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(queue.map((t) => t.task_id)));
  };

  /**
   * Each selected task is submitted independently, not as one atomic batch. An approval that
   * already reached the ERP cannot be rolled back from here if a later item in the batch fails,
   * so treating the batch as all-or-nothing would be the wrong kind of safety -- partial success
   * with a clear count of what didn't go through is the honest result to report.
   */
  const runBulkAction = async () => {
    const action = bulkAction;
    const ids = Array.from(selectedIds);
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => submitReviewAction(id, { action, notes: bulkNotes }))
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      setNotice(
        failed === 0
          ? `${humanize(action)}d ${succeeded} lead${succeeded === 1 ? '' : 's'}`
          : `${humanize(action)}d ${succeeded} of ${results.length} — ${failed} failed and are still pending`
      );
    } finally {
      setBulkBusy(false);
      setBulkAction(null);
      setBulkNotes('');
      await load(status);
    }
  };

  const ingestionWarning = useMemo(() => {
    if (!health) return null;
    if (health.ingestion === 'disabled') {
      return 'Live mail ingestion is off. The agent will only process what is pushed to it.';
    }
    if (health.ingestion === 'unconfigured') {
      return `Gmail is switched on but not authorised: ${health.ingestion_detail}`;
    }
    return null;
  }, [health]);

  return (
    <Box sx={{ bgcolor: T.ground, minHeight: '100vh' }}>

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
                AI Lead Review
              </Typography>
              <Typography variant="h6" sx={{ color: SHELL.heroInkDim, fontWeight: 500, maxWidth: 660 }}>
                Leads the agent extracted from inbound mail but would not file unsupervised
                {'—'} confirm, correct or discard them before they reach the register.
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined" startIcon={<Refresh />}
                onClick={() => load(status)} disabled={loading} sx={heroButtonSx}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                startIcon={polling ? <CircularProgress size={16} color="inherit" /> : <CloudSync />}
                onClick={runPoll} disabled={polling || !!error} sx={heroButtonSx}
              >
                Fetch mail
              </Button>
              <Button
                variant="outlined" startIcon={<ViewList />}
                onClick={() => navigate('/enquiry')} sx={heroButtonSx}
              >
                Lead Register
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: SHELL.contentPullUp, pb: 6 }}>

        {/* The agent is an optional service the backend proxies to. When it can't be reached,
            the backend answers with its own 502 rather than the browser hitting a dead socket —
            say exactly that instead of a bare "failed to load". */}
        {error?.status === 502 && (
          <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 3, boxShadow: SHELL.cardShadow }}>
            <AlertTitle sx={{ fontWeight: 800 }}>AI Lead Agent is not running</AlertTitle>
            The backend could not reach it. The rest of the CRM is unaffected {'—'} enquiries can
            still be raised by hand. Start the agent service and try again.
          </Alert>
        )}

        {error && error.status !== 502 && (
          <Alert
            severity="error" sx={{ mb: 2.5, borderRadius: 3, boxShadow: SHELL.cardShadow }}
            action={<Button size="small" onClick={() => load(status)}>Retry</Button>}
          >
            {error.message}
          </Alert>
        )}

        {notice && (
          <Alert severity="success" onClose={() => setNotice(null)} sx={{ mb: 2.5, borderRadius: 3 }}>
            {notice}
          </Alert>
        )}

        {ingestionWarning && !error && (
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 3 }}>{ingestionWarning}</Alert>
        )}

        {health?.dry_run && (
          <Alert severity="info" icon={<SmartToyOutlined />} sx={{ mb: 2.5, borderRadius: 3 }}>
            <AlertTitle sx={{ fontWeight: 800 }}>Dry run</AlertTitle>
            The agent is simulating ERP writes. Approving a lead here will not create an enquiry
            until <code>AI_DRY_RUN</code> is turned off.
          </Alert>
        )}

        <Box sx={{
          display: 'grid', gap: 2, mb: 4,
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
        }}>
          <StatTile
            label="Awaiting review" value={fmtNum(stats?.review_required ?? 0)}
            loading={loading} tone={stats?.review_required ? STATUS.warning : undefined}
            note="Held by the agent"
          />
          <StatTile label="Enquiries filed" value={fmtNum(stats?.enquiries_created ?? 0)} loading={loading} />
          <StatTile
            label="Duplicates caught" value={fmtNum(stats?.duplicates_prevented ?? 0)}
            loading={loading} note="Logged, not re-filed"
          />
          <StatTile label="Mail today" value={fmtNum(stats?.emails_processed_today ?? 0)} loading={loading} />
          <StatTile
            label="Failed" value={fmtNum(stats?.failed_jobs ?? 0)}
            loading={loading} tone={stats?.failed_jobs ? STATUS.critical : undefined}
          />
        </Box>

        <Box sx={panelSx}>
          <BandHead
            title="Review queue"
            note="Sorted newest first. Open a row to see the extraction and the agent's reasoning."
          />

          <ToggleButtonGroup
            exclusive size="small" value={status}
            onChange={(_, next) => next && setStatus(next)}
            sx={{ my: 2 }}
          >
            {QUEUE_TABS.map((tab) => (
              <ToggleButton
                key={tab.key} value={tab.key}
                sx={{ textTransform: 'none', fontWeight: 700, px: 2, borderRadius: 2 }}
              >
                {tab.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {status === 'PENDING' && selectedIds.size > 0 && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: 1.5,
              borderRadius: 2, bgcolor: T.accentDim, border: `1px solid ${T.accent}30`,
            }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.ink }}>
                {selectedIds.size} selected
              </Typography>
              <Button
                size="small" variant="contained" startIcon={<CheckCircleOutline />}
                onClick={() => setBulkAction('APPROVE')}
                sx={{
                  borderRadius: 2, textTransform: 'none', fontWeight: 700,
                  bgcolor: STATUS.good, '&:hover': { bgcolor: '#047857' },
                }}
              >
                Approve
              </Button>
              <Button
                size="small" variant="outlined" color="error" startIcon={<BlockOutlined />}
                onClick={() => setBulkAction('REJECT')}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
              >
                Reject
              </Button>
              <Button
                size="small" onClick={() => setSelectedIds(new Set())}
                sx={{ ml: 'auto', textTransform: 'none', fontWeight: 600, color: T.ink2 }}
              >
                Clear
              </Button>
            </Box>
          )}

          {loading ? (
            <Stack spacing={1}>
              {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={52} />)}
            </Stack>
          ) : queue.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.ink2 }}>
                {status === 'PENDING' ? 'Nothing waiting' : `No ${status.toLowerCase()} tasks`}
              </Typography>
              {status === 'PENDING' && (
                <Typography sx={{ fontSize: 13, color: T.ink3, mt: 0.5 }}>
                  Confident extractions go straight to the register and never appear here.
                </Typography>
              )}
            </Box>
          ) : (
            <TableContainer sx={{ ...TABLE.container, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {status === 'PENDING' && (
                      <TableCell padding="checkbox" sx={TABLE.head}>
                        <Checkbox
                          size="small"
                          checked={allVisibleSelected}
                          indeterminate={selectedIds.size > 0 && !allVisibleSelected}
                          onChange={toggleSelectAll}
                        />
                      </TableCell>
                    )}
                    <TableCell sx={TABLE.head}>Company</TableCell>
                    <TableCell sx={TABLE.head}>Opportunity</TableCell>
                    <TableCell sx={TABLE.head}>Items</TableCell>
                    <TableCell sx={TABLE.head}>Priority</TableCell>
                    <TableCell sx={{ ...TABLE.head, textAlign: 'right' }}>Score</TableCell>
                    <TableCell sx={TABLE.head}>Confidence</TableCell>
                    <TableCell sx={TABLE.head}>Received</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queue.map((task) => {
                    const band = confidenceBand(task.confidence);
                    const priority = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.WARM;
                    return (
                      <TableRow
                        key={task.task_id} hover sx={TABLE.row}
                        onClick={() => openTask(task)}
                      >
                        {status === 'PENDING' && (
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              size="small"
                              checked={selectedIds.has(task.task_id)}
                              onChange={() => toggleSelected(task.task_id)}
                            />
                          </TableCell>
                        )}
                        <TableCell sx={{ ...TABLE.cell, fontWeight: 700, color: T.ink }}>
                          {task.company_name}
                          <Typography sx={{ fontSize: 11, color: T.ink3, fontFamily: MONO }}>
                            {task.from_email}
                          </Typography>
                        </TableCell>
                        <TableCell sx={TABLE.cell}>{task.opportunity_name}</TableCell>
                        <TableCell sx={{ ...TABLE.cell, maxWidth: 260 }}>
                          <Tooltip title={task.products_summary || ''}>
                            <Typography noWrap sx={{ fontSize: 13, color: '#334155' }}>
                              {task.products_summary || '—'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={TABLE.cell}>
                          <Chip size="small" label={task.priority} sx={chipSx(priority.color, priority.bg)} />
                        </TableCell>
                        <TableCell sx={TABLE.num}>{task.score}</TableCell>
                        <TableCell sx={TABLE.cell}>
                          {/* Band and number together: the word carries the meaning, the number
                              lets a reviewer calibrate against the thresholds over time. */}
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={band.label} sx={chipSx(band.color, band.bg)} />
                            <Typography sx={{ fontSize: 11, fontFamily: MONO, color: T.ink3 }}>
                              {fmtPct(task.confidence * 100, 0)}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ ...TABLE.cell, whiteSpace: 'nowrap' }}>
                          {fmtDate(task.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Container>

      <ReviewDrawer
        task={selected}
        trace={trace}
        traceLoading={traceLoading}
        busy={busy}
        onClose={() => setSelected(null)}
        onAction={act}
      />

      <Dialog
        open={!!bulkAction}
        onClose={() => !bulkBusy && setBulkAction(null)}
        maxWidth="xs" fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {bulkAction === 'APPROVE' ? 'Approve' : 'Reject'} {selectedIds.size} lead{selectedIds.size === 1 ? '' : 's'}?
        </DialogTitle>
        <DialogContent>
          {bulkAction === 'APPROVE' ? (
            <Typography sx={{ fontSize: 13, color: T.ink2, mb: 2 }}>
              Each is filed as its own enquiry in the register, exactly as approving it
              individually would. If one fails the rest still go through.
            </Typography>
          ) : (
            <Typography sx={{ fontSize: 13, color: T.ink2, mb: 2 }}>
              Each is marked JUNK, kept as a record rather than deleted.
            </Typography>
          )}
          <TextField
            fullWidth multiline minRows={2} size="small"
            placeholder="Why (recorded against every selected task)"
            value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setBulkAction(null)} disabled={bulkBusy}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained" disabled={bulkBusy}
            startIcon={bulkBusy ? <CircularProgress size={16} color="inherit" /> : null}
            onClick={runBulkAction}
            sx={{
              textTransform: 'none', fontWeight: 800, borderRadius: 2,
              bgcolor: bulkAction === 'APPROVE' ? STATUS.good : STATUS.critical,
              '&:hover': { bgcolor: bulkAction === 'APPROVE' ? '#047857' : '#b91c1c' },
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
