import React, { useEffect, useState } from 'react';
import {
  Box,
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DeleteOutline, Refresh, WarningAmber, AutoFixHigh, Replay } from '@mui/icons-material';
import { reorderMaterial, getMaterialReorders } from '../../../../services/workOrderService';

const DEFAULT_ISSUE_STATUSES = [
  'NOT_ISSUED',
  'PARTIALLY_ISSUED',
  'ISSUED',
];
const EMPTY_MATERIALS = [];

const toNumberValue = (value) => {
  if (value === '' || value === null || value === undefined) return 0;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;

  return Number(parsed.toFixed(6));
};

const getMaterialRowKey = (material, index) =>
  String(
    material?.id ??
    material?.workOrderMaterialId ??
    material?.component?.inventoryItemId ??
    index
  );

const getMaterialId = (material) =>
  material?.id ?? material?.workOrderMaterialId ?? material?.materialId ?? null;

const getInventoryItemId = (material) =>
  material?.inventoryItemId ??
  material?.component?.inventoryItemId ??
  material?.component?.id ??
  material?.childInventoryItem?.inventoryItemId ??
  null;

const ISSUE_STATUS_STYLE = {
  ISSUED:           { bg: '#eef6f0', color: '#2a6640', border: '#b8d8bf' },
  PARTIALLY_ISSUED: { bg: '#fdf4ec', color: '#8a4a1c', border: '#efd0b0' },
  NOT_ISSUED:       { bg: '#f5f5f5', color: '#6b6b6b', border: '#ddd' },
};
const IssueStatusChip = ({ status = 'NOT_ISSUED' }) => {
  const s = ISSUE_STATUS_STYLE[status] || ISSUE_STATUS_STYLE.NOT_ISSUED;
  const label = status.replace(/_/g, ' ');
  return (
    <Box component="span" sx={{
      display: 'inline-block', borderRadius: '4px', px: '8px', py: '2px',
      fontSize: '0.6875rem', fontWeight: 600, whiteSpace: 'nowrap',
      bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {label}
    </Box>
  );
};

const MR_STATUS_STYLE = {
  PENDING:  { bg: '#fef9c3', color: '#92400e', border: '#fde68a', label: 'Awaiting Stores' },
  APPROVED: { bg: '#eef6f0', color: '#2a6640', border: '#b8d8bf', label: 'Approved' },
  PARTIAL:  { bg: '#fdf4ec', color: '#8a4a1c', border: '#efd0b0', label: null },
  REJECTED: { bg: '#fdf0f0', color: '#b84040', border: '#f0c8c8', label: 'Rejected' },
};

const getMrStatusChip = (material) => {
  const status = material?.mrStatus || material?.mrApprovalStatus;
  const approved = material?.mrApprovedQuantity;
  const requested = material?.plannedRequiredQuantity;
  const key = status || 'PENDING';
  const s = MR_STATUS_STYLE[key] || MR_STATUS_STYLE.PENDING;
  const reorderQty = material?.approvedReorderQuantity;
  let label = s.label;
  if (key === 'PARTIAL') {
    label = `Partial (${approved ?? '?'} / ${requested ?? '?'})${reorderQty ? ` + ${reorderQty}` : ''}`;
  } else if (key === 'APPROVED') {
    label = `Approved (${approved ?? '?'} / ${requested ?? '?'})${reorderQty ? ` + ${reorderQty}` : ''}`;
  }
  return (
    <Box component="span" sx={{
      display: 'inline-block', borderRadius: '4px', px: '8px', py: '2px',
      fontSize: '0.6875rem', fontWeight: 600, whiteSpace: 'nowrap',
      bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {label}
    </Box>
  );
};

const compactCellSx = {
  px: '12px',
  py: '9px',
  fontSize: '0.8125rem',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid #f1f5f9',
  color: '#475569',
};

const headerCellSx = {
  px: '12px',
  py: '8px',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  color: '#475569',
  bgcolor: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  whiteSpace: 'nowrap',
};

const compactInputSx = {
  '& .MuiInputBase-root': {
    height: 32,
    fontSize: '0.74rem',
  },
  '& .MuiInputBase-input': {
    px: 1,
    py: 0.5,
  },
};

const REORDER_BLOCKED_STATUSES = new Set([
  'CREATED', 'SCHEDULED', 'COMPLETED', 'CLOSED', 'CANCELLED', 'SHORT_CLOSED',
]);

const MR_STATUS_CHIP_COLORS = {
  PENDING:  'warning',
  APPROVED: 'success',
  PARTIAL:  'info',
  REJECTED: 'error',
};

function ReorderDialog({ open, material, workOrderId, onClose, onSuccess }) {
  const [qty, setQty] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const effectiveReqForDialog = toNumberValue(material?.effectiveRequiredQuantity)
    || toNumberValue(material?.plannedRequiredQuantity);
  const shortfall = toNumberValue(Math.max(effectiveReqForDialog - toNumberValue(material?.issuedQuantity), 0));

  useEffect(() => {
    if (!open || !material || !workOrderId) return;
    setQty(shortfall > 0 ? String(shortfall) : '');
    setRemarks('');
    setError('');
    setHistory([]);
    const materialId = getMaterialId(material);
    if (!materialId) return;
    setHistoryLoading(true);
    getMaterialReorders(workOrderId, materialId)
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [open, material, workOrderId]);

  const handleSubmit = async () => {
    const parsedQty = parseFloat(qty);
    if (!parsedQty || parsedQty <= 0) {
      setError('Requested quantity must be greater than zero');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await reorderMaterial(workOrderId, getMaterialId(material), {
        requestedQuantity: parsedQty,
        remarks: remarks.trim() || null,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to submit re-order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!material) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography fontWeight={700} fontSize="1rem">Material Re-order</Typography>
        <Typography variant="caption" color="text.secondary">
          {material?.component?.itemCode} · {material?.component?.name}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Shortfall summary */}
        <Box sx={{ display: 'flex', gap: 3, mb: 2.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {toNumberValue(material?.approvedReorderQuantity) > 0 ? 'Effective Required' : 'Planned'}
            </Typography>
            <Typography fontWeight={600} fontSize="0.9rem">
              {effectiveReqForDialog}
              {toNumberValue(material?.approvedReorderQuantity) > 0 && (
                <Typography component="span" variant="caption" sx={{ color: '#d97706', ml: 0.5 }}>
                  ({toNumberValue(material?.plannedRequiredQuantity)} + {toNumberValue(material?.approvedReorderQuantity)} reorder)
                </Typography>
              )}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Issued</Typography>
            <Typography fontWeight={600} fontSize="0.9rem">{toNumberValue(material?.issuedQuantity)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Shortfall</Typography>
            <Typography fontWeight={700} fontSize="0.9rem" color={shortfall > 0 ? 'error.main' : 'success.main'}>
              {shortfall}
            </Typography>
          </Box>
        </Box>

        <Stack spacing={2}>
          <TextField
            label="Requested Quantity"
            type="number"
            size="small"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputProps={{ min: 0, step: '0.001' }}
            fullWidth
            required
          />
          <TextField
            label="Remarks"
            size="small"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Reason for re-order (optional)"
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2, fontSize: '0.8rem' }}>{error}</Alert>
        )}

        {/* Re-order history */}
        {(historyLoading || history.length > 0) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Previous Re-orders
            </Typography>
            {historyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', py: 0.5 }}>Ref</TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', py: 0.5 }}>Qty</TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', py: 0.5 }}>Status</TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', py: 0.5 }}>Approved</TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', py: 0.5 }}>By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell sx={{ fontSize: 11, py: 0.5, fontFamily: 'monospace' }}>{r.referenceNumber || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 11, py: 0.5 }}>{r.requestedQuantity}</TableCell>
                      <TableCell sx={{ fontSize: 11, py: 0.5 }}>
                        <Chip
                          label={r.mrStatus || 'PENDING'}
                          color={MR_STATUS_CHIP_COLORS[r.mrStatus] || 'default'}
                          size="small"
                          sx={{ fontSize: 10, height: 18 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, py: 0.5 }}>{r.mrApprovedQuantity ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 11, py: 0.5, color: '#94a3b8' }}>{r.createdBy || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
        >
          {submitting ? 'Submitting…' : 'Submit Re-order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function WorkOrderMaterialsTab({
  formik,
  isLoading,
  onLoadFromBom,
  isAddMode,
  onIssueMaterials,
  materialIssueState,
}) {
  const materials = Array.isArray(formik.values?.materials)
    ? formik.values.materials
    : EMPTY_MATERIALS;
  const [issueDrafts, setIssueDrafts] = useState({});
  const [reorderDialog, setReorderDialog] = useState({ open: false, material: null });

  const workOrderId = formik.values?.id;
  const woStatus = formik.values?.status;
  const isWoTerminal = ['COMPLETED', 'CLOSED', 'CANCELLED'].includes(woStatus);
  const canReorder = !isAddMode && !REORDER_BLOCKED_STATUSES.has(woStatus);
  const canIssueToFloor = !isAddMode && !isWoTerminal;

  useEffect(() => {
    const validKeys = new Set(materials.map((material, index) => getMaterialRowKey(material, index)));
    setIssueDrafts((prev) => {
      const next = {};
      let changed = false;
      Object.keys(prev).forEach((key) => {
        if (validKeys.has(key)) {
          next[key] = prev[key];
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [materials]);

  const statusOptions = Array.from(
    new Set([
      ...DEFAULT_ISSUE_STATUSES,
      ...materials.map((material) => material?.issueStatus).filter(Boolean),
    ])
  );

  const handleMaterialChange = (index, field, nextValue) => {
    const updated = [...materials];
    updated[index] = {
      ...updated[index],
      [field]: field === 'issueStatus' ? nextValue : toNumberValue(nextValue),
    };
    formik.setFieldValue('materials', updated);
  };

  const handleIssueDraftChange = (rowKey, field, nextValue) => {
    setIssueDrafts((prev) => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] || {}),
        [field]: nextValue,
      },
    }));
  };

  const handleRemove = (index) => {
    const updated = materials.filter((_, idx) => idx !== index);
    formik.setFieldValue('materials', updated);
  };

  const getIssuePayload = (material, rowKey) => {
    const draft = issueDrafts[rowKey] || {};
    const issuedQuantity = toNumberValue(draft.issuedQuantity);
    const scrappedQuantity = toNumberValue(draft.scrappedQuantity);
    return {
      workOrderMaterialId: getMaterialId(material),
      inventoryItemId: getInventoryItemId(material),
      issuedQuantity,
      scrappedQuantity,
      overrideInstanceIds: draft.overrideInstanceIds || material?.overrideInstanceIds,
      overrideReason: draft.overrideReason || material?.overrideReason,
    };
  };

  const canIssuePayload = (payload) =>
    Boolean(payload?.inventoryItemId) &&
    !Number.isNaN(payload.issuedQuantity) &&
    !Number.isNaN(payload.scrappedQuantity) &&
    payload.issuedQuantity >= 0 &&
    payload.scrappedQuantity >= 0 &&
    payload.issuedQuantity + payload.scrappedQuantity > 0;

  const hasAnyIssueDraft = materials.some((material, index) => {
    const rowKey = getMaterialRowKey(material, index);
    return canIssuePayload(getIssuePayload(material, rowKey));
  });

  const isMaterialIssueLoading = Boolean(materialIssueState?.loading);

  const handleIssueSingleMaterial = async (material, index) => {
    if (!onIssueMaterials) return;
    const rowKey = getMaterialRowKey(material, index);
    const payload = getIssuePayload(material, rowKey);
    if (!canIssuePayload(payload)) return;

    const success = await onIssueMaterials([payload]);
    if (!success) return;

    setIssueDrafts((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  };

  const handleIssueEnteredMaterials = async () => {
    if (!onIssueMaterials) return;

    const payloads = [];
    const clearKeys = [];
    materials.forEach((material, index) => {
      const rowKey = getMaterialRowKey(material, index);
      const payload = getIssuePayload(material, rowKey);
      if (!canIssuePayload(payload)) return;
      payloads.push(payload);
      clearKeys.push(rowKey);
    });

    if (payloads.length === 0) return;

    const success = await onIssueMaterials(payloads);
    if (!success) return;

    setIssueDrafts((prev) => {
      const next = { ...prev };
      clearKeys.forEach((key) => {
        delete next[key];
      });
      return next;
    });
  };

  const handleAutoFillRemaining = () => {
    const nextDrafts = { ...issueDrafts };
    materials.forEach((material, index) => {
      const rowKey = getMaterialRowKey(material, index);
      const netRequired = toNumberValue(material?.netRequiredQuantity);
      const issued = toNumberValue(material?.issuedQuantity);
      const scrapped = toNumberValue(material?.scrappedQuantity);
      const remaining = Math.max(netRequired - issued - scrapped, 0);

      if (remaining > 0) {
        nextDrafts[rowKey] = {
          ...(nextDrafts[rowKey] || {}),
          issuedQuantity: remaining,
          scrappedQuantity: nextDrafts[rowKey]?.scrappedQuantity || 0
        };
      }
    });
    setIssueDrafts(nextDrafts);
  };

  return (
    <Box>
      {formik.values.status === 'MATERIAL_PENDING' && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem', borderRadius: 2 }}>
          <strong>Awaiting Stores Approval</strong> — Material Requests have been sent to the Store Keeper.
          Production will be enabled once materials are approved.
        </Alert>
      )}
      {formik.values.status === 'PARTIALLY_READY' && (
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem', borderRadius: 2 }}>
          <strong>Partially Ready</strong> — Some materials have been approved. Operations with fully approved materials can be started.
          Remaining items are still awaiting Stores action.
        </Alert>
      )}
      {formik.values.status === 'READY_FOR_PRODUCTION' && (
        <Alert severity="success" sx={{ mb: 2, fontSize: '0.8rem', borderRadius: 2 }}>
          <strong>All Materials Approved</strong> — Stock is reserved. Use <strong>Move to Floor</strong> to track physical movement (optional).
          Stock is <strong>consumed</strong> automatically when you <strong>Record a Batch</strong>.
        </Alert>
      )}
      {formik.values.status === 'MATERIAL_REORDER' && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem', borderRadius: 2 }}>
          <strong>Re-order Pending</strong> — Additional material has been requested due to scrap.
          Production is paused until Stores approves the re-order.
        </Alert>
      )}
      {formik.values.status !== 'CREATED' && formik.values.status !== 'MATERIAL_PENDING' && formik.values.status !== 'PARTIALLY_READY' && formik.values.status !== 'READY_FOR_PRODUCTION' && formik.values.status !== 'MATERIAL_REORDER' && (
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem', borderRadius: 2 }}>
          Materials are <strong>reserved</strong> from the Stores-approved quantity.
          Stock is <strong>consumed</strong> automatically when you <strong>Record a Batch</strong>.
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          gap: 1.5,
          flexWrap: 'wrap',
          p: 0.5
        }}
      >
        <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Material Requirements
        </Typography>

        <Stack direction="row" spacing={1.5}>
          {isAddMode ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Refresh />}
              onClick={onLoadFromBom}
              disabled={isLoading}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              {isLoading ? 'Loading...' : 'Reload from BOM'}
            </Button>
          ) : (
            <>
              {canIssueToFloor && (
              <Button
                size="small"
                variant="outlined"
                color="info"
                startIcon={<AutoFixHigh />}
                onClick={handleAutoFillRemaining}
                disabled={isMaterialIssueLoading}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderStyle: 'dashed' }}
              >
                Auto-fill Remaining
              </Button>
              )}
              {canIssueToFloor && (
              <Button
                size="small"
                variant="contained"
                onClick={handleIssueEnteredMaterials}
                disabled={isMaterialIssueLoading || !hasAnyIssueDraft}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                {isMaterialIssueLoading ? 'Moving...' : 'Move to Floor'}
              </Button>
              )}
            </>
          )}
        </Stack>
      </Box>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          width: '100%',
          overflowX: 'auto',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
        }}
      >
        {/* Columns: # | Component (code+name+uom) | Required (net/planned) | MR Status | Issued | Remaining | Status | Issue / Scrap | Action */}
        <Table size="small" sx={{ minWidth: isAddMode ? 620 : 820, borderCollapse: 'collapse' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>#</TableCell>
              <TableCell sx={headerCellSx}>Component</TableCell>
              <TableCell sx={headerCellSx}>Required</TableCell>
              {!isAddMode && <TableCell sx={headerCellSx}>MR Status</TableCell>}
              <TableCell sx={headerCellSx}>Issued</TableCell>
              {!isAddMode && <TableCell sx={headerCellSx}>Consumed</TableCell>}
              <TableCell sx={headerCellSx}>Status</TableCell>
              {!isAddMode && <TableCell sx={headerCellSx}>Issue / Scrap</TableCell>}
              <TableCell sx={{ ...headerCellSx, textAlign: 'center' }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAddMode ? 5 : 9} align="center" sx={{ py: 5, color: '#94a3b8', fontSize: '0.8125rem' }}>
                  {isAddMode
                    ? 'No materials found. Select item/BOM and open this tab to load.'
                    : 'No materials available.'}
                </TableCell>
              </TableRow>
            ) : (
              materials.map((material, index) => {
                const rowKey = getMaterialRowKey(material, index);
                const issuePayload = getIssuePayload(material, rowKey);
                const canIssue = canIssuePayload(issuePayload);
                const netRequiredQuantity = toNumberValue(material?.netRequiredQuantity);
                const plannedRequiredQuantity = toNumberValue(material?.plannedRequiredQuantity);
                const approvedReorderQty = toNumberValue(material?.approvedReorderQuantity);
                const effectiveRequiredQty = toNumberValue(material?.effectiveRequiredQuantity) || plannedRequiredQuantity;
                const reorderCount = material?.reorderCount || 0;
                const issuedQuantity = toNumberValue(material?.issuedQuantity);
                const consumedQuantity = toNumberValue(material?.consumedQuantity);
                const scrappedQuantity = toNumberValue(material?.scrappedQuantity);
                const remainingQuantity = toNumberValue(Math.max(netRequiredQuantity - consumedQuantity - scrappedQuantity, 0));

                return (
                  <TableRow
                    key={material?.id || material?.workOrderMaterialId || `${material?.component?.inventoryItemId}-${index}`}
                    sx={{ transition: 'background .1s', '&:hover': { bgcolor: '#f8fafc' } }}
                  >
                    {/* # */}
                    <TableCell sx={{ ...compactCellSx, width: 36, color: '#94a3b8', fontWeight: 600 }}>{index + 1}</TableCell>

                    {/* Component — code + name + UOM + operation tooltip */}
                    <TableCell sx={{ ...compactCellSx, minWidth: 160 }}>
                      <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#94a3b8', lineHeight: 1 }}>
                        {material?.component?.itemCode || '—'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', mt: '2px' }}>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b' }}>
                          {material?.component?.name || '—'}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>
                          {material?.component?.uom ? `· ${material.component.uom}` : ''}
                        </Typography>
                        {(material?.operationName || material?.workOrderOperationId) ? (
                          <Tooltip title={`Required at: ${material.operationName || 'linked operation'}`} arrow>
                            <Typography sx={{ fontSize: 10, color: '#4a8fc0', fontWeight: 600, cursor: 'default', ml: '2px' }}>
                              @{(material.operationName || 'op').split(' ')[0]}
                            </Typography>
                          </Tooltip>
                        ) : (!isAddMode && material?.issueStatus !== 'ISSUED') ? (
                          <Tooltip title="Must be issued before any operation can start" arrow>
                            <WarningAmber sx={{ fontSize: 13, color: 'warning.main', cursor: 'help' }} />
                          </Tooltip>
                        ) : null}
                      </Box>
                    </TableCell>

                    {/* Required — net / planned stacked, or editable in add mode */}
                    <TableCell sx={{ ...compactCellSx, minWidth: 90, fontVariantNumeric: 'tabular-nums' }}>
                      {isAddMode ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <TextField size="small" type="number" value={material?.netRequiredQuantity ?? 0}
                            onChange={(e) => handleMaterialChange(index, 'netRequiredQuantity', e.target.value)}
                            inputProps={{ min: 0 }} sx={compactInputSx} placeholder="Net" />
                          <TextField size="small" type="number" value={material?.plannedRequiredQuantity ?? 0}
                            onChange={(e) => handleMaterialChange(index, 'plannedRequiredQuantity', e.target.value)}
                            inputProps={{ min: 0 }} sx={compactInputSx} placeholder="Planned" />
                        </Box>
                      ) : (
                        <Tooltip
                          title={approvedReorderQty > 0
                            ? `Planned: ${plannedRequiredQuantity} + Reorder approved: ${approvedReorderQty} = Effective: ${effectiveRequiredQty}`
                            : `Net required: ${netRequiredQuantity} · Planned: ${plannedRequiredQuantity}`}
                          arrow
                        >
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Typography sx={{ fontSize: '0.8125rem', color: '#1e293b', fontWeight: 500 }}>
                                {effectiveRequiredQty}
                              </Typography>
                              {reorderCount > 0 && (
                                <Typography component="span" sx={{ fontSize: 10, fontWeight: 800, color: '#fff', bgcolor: approvedReorderQty > 0 ? '#d97706' : '#94a3b8', borderRadius: '9999px', px: '5px', py: '1px', lineHeight: 1.4 }}>
                                  +{reorderCount}R
                                </Typography>
                              )}
                            </Box>
                            <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>of {plannedRequiredQuantity}</Typography>
                          </Box>
                        </Tooltip>
                      )}
                    </TableCell>

                    {/* MR Status */}
                    {!isAddMode && (
                      <TableCell sx={{ ...compactCellSx, minWidth: 110 }}>
                        {getMrStatusChip(material)}
                        {material?.mrRejectionReason && (
                          <Tooltip title={material.mrRejectionReason} arrow>
                            <Typography variant="caption" sx={{ display: 'block', color: 'error.main', mt: 0.3, cursor: 'help', fontSize: 11 }}>
                              {material.mrRejectionReason.length > 16 ? material.mrRejectionReason.slice(0, 16) + '…' : material.mrRejectionReason}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}

                    {/* Issued */}
                    <TableCell sx={{ ...compactCellSx, minWidth: 80, fontVariantNumeric: 'tabular-nums' }}>
                      {isAddMode ? (
                        <TextField size="small" type="number" value={material?.issuedQuantity ?? 0}
                          onChange={(e) => handleMaterialChange(index, 'issuedQuantity', e.target.value)}
                          inputProps={{ min: 0 }} sx={compactInputSx} />
                      ) : issuedQuantity}
                    </TableCell>

                    {/* Remaining */}
                    {!isAddMode && (
                      <TableCell sx={{ ...compactCellSx, minWidth: 80, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: remainingQuantity === 0 ? '#2a6640' : '#8a4a1c' }}>
                        {consumedQuantity}
                      </TableCell>
                    )}

                    {/* Status */}
                    <TableCell sx={{ ...compactCellSx, minWidth: 98 }}>
                      {isAddMode ? (
                        <TextField select size="small" value={material?.issueStatus || 'NOT_ISSUED'}
                          onChange={(e) => handleMaterialChange(index, 'issueStatus', e.target.value)}
                          fullWidth sx={compactInputSx}>
                          {statusOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </TextField>
                      ) : (
                        <IssueStatusChip status={material?.issueStatus || 'NOT_ISSUED'} />
                      )}
                    </TableCell>

                    {/* Issue / Scrap inputs — merged into one cell */}
                    {!isAddMode && (
                      <TableCell sx={{ ...compactCellSx, minWidth: 140 }}>
                        <Box sx={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <TextField size="small" type="number"
                            value={issueDrafts[rowKey]?.issuedQuantity ?? ''}
                            onChange={(e) => handleIssueDraftChange(rowKey, 'issuedQuantity', e.target.value)}
                            inputProps={{ min: 0 }} placeholder="Issue"
                            disabled={isMaterialIssueLoading} sx={{ ...compactInputSx, width: 64 }} />
                          <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>/</Typography>
                          <TextField size="small" type="number"
                            value={issueDrafts[rowKey]?.scrappedQuantity ?? ''}
                            onChange={(e) => handleIssueDraftChange(rowKey, 'scrappedQuantity', e.target.value)}
                            inputProps={{ min: 0, step: '0.01' }} placeholder="Scrap"
                            disabled={isMaterialIssueLoading} sx={{ ...compactInputSx, width: 64 }} />
                        </Box>
                      </TableCell>
                    )}

                    {/* Action */}
                    <TableCell align="center" sx={{ ...compactCellSx, minWidth: 80 }}>
                      {isAddMode ? (
                        <Tooltip title="Remove">
                          <span>
                            <IconButton color="error" size="small" onClick={() => handleRemove(index)}>
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : (
                        <Stack spacing={0.5} alignItems="center">
                          <Tooltip title="Move to floor & record scrap" arrow>
                            <span>
                              <Button size="small" variant="outlined"
                                onClick={() => handleIssueSingleMaterial(material, index)}
                                disabled={!canIssue || isMaterialIssueLoading}
                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: '5px', borderColor: '#c8dcf0', color: '#2a6496', '&:hover': { bgcolor: '#eef4fb', borderColor: '#2a6496' } }}>
                                Issue
                              </Button>
                            </span>
                          </Tooltip>
                          {canReorder && (
                            <Tooltip title="Request additional material" arrow>
                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                startIcon={<Replay sx={{ fontSize: '12px !important' }} />}
                                onClick={() => setReorderDialog({ open: true, material })}
                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.7rem', borderRadius: '5px', borderStyle: 'dashed', py: '1px' }}
                              >
                                Re-order
                              </Button>
                            </Tooltip>
                          )}
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {materials.length > 0 && (
        <Box mt={1.5} display="flex" flexWrap="wrap" gap={1} alignItems="center">
          <Box component="span" sx={{ display: 'inline-block', borderRadius: '4px', px: '8px', py: '2px', fontSize: '0.6875rem', fontWeight: 600, bgcolor: '#f4f6f8', color: '#5a6474', border: '1px solid #dde3ec' }}>
            {materials.length} item{materials.length !== 1 ? 's' : ''}
          </Box>
          {!isAddMode && (
            <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
              Floor movements are incremental — stock is consumed when batches are recorded.
            </Typography>
          )}
        </Box>
      )}

      <ReorderDialog
        open={reorderDialog.open}
        material={reorderDialog.material}
        workOrderId={workOrderId}
        onClose={() => setReorderDialog({ open: false, material: null })}
        onSuccess={() => setReorderDialog({ open: false, material: null })}
      />
    </Box>
  );
}
