import React, { useEffect, useState } from 'react';
import {
  Box,
  Alert,
  Button,
  Chip,
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
import { DeleteOutline, Refresh, WarningAmber, AutoFixHigh } from '@mui/icons-material';

const DEFAULT_ISSUE_STATUSES = [
  'NOT_ISSUED',
  'PARTIALLY_ISSUED',
  'ISSUED',
];
const EMPTY_MATERIALS = [];

const toNumberValue = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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

const getIssueStatusColor = (status) => {
  if (status === 'ISSUED') return 'success';
  if (status === 'PARTIALLY_ISSUED') return 'warning';
  return 'default';
};

const getMrStatusChip = (material) => {
  const status = material?.mrStatus || material?.mrApprovalStatus;
  const approved = material?.mrApprovedQuantity;
  const requested = material?.plannedRequiredQuantity;
  if (!status || status === 'PENDING') return <Chip size="small" label="Awaiting Stores" sx={{ bgcolor: '#fef9c3', color: '#92400e', fontWeight: 700, fontSize: '0.65rem', height: 20, border: '1px solid #fde68a' }} />;
  if (status === 'APPROVED') return <Chip size="small" label="Approved" color="success" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }} />;
  if (status === 'PARTIAL') return <Chip size="small" label={`Partial (${approved ?? '?'} / ${requested ?? '?'})`} color="warning" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }} />;
  if (status === 'REJECTED') return <Chip size="small" label="Rejected" color="error" sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }} />;
  return <Chip size="small" label="Awaiting Stores" sx={{ bgcolor: '#fef9c3', color: '#92400e', fontWeight: 700, fontSize: '0.65rem', height: 20, border: '1px solid #fde68a' }} />;
};

const compactCellSx = {
  px: 0.75,
  py: 0.5,
  fontSize: '0.74rem',
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
      {formik.values.status !== 'CREATED' && formik.values.status !== 'MATERIAL_PENDING' && formik.values.status !== 'PARTIALLY_READY' && formik.values.status !== 'READY_FOR_PRODUCTION' && (
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
            </>
          )}
        </Stack>
      </Box>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          maxWidth: '100%',
          overflowX: 'auto',
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          '& .MuiTableCell-root': compactCellSx,
        }}
      >
        <Table size="small" sx={{ minWidth: isAddMode ? 800 : 1100 }}>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Item Code</TableCell>
              <TableCell>Component</TableCell>
              <TableCell>UOM</TableCell>
              <TableCell>Required at Operation</TableCell>
              <TableCell>Net Req</TableCell>
              <TableCell>Planned</TableCell>
              {!isAddMode && <TableCell>MR Status</TableCell>}
              <TableCell>Issued Qty</TableCell>
              {!isAddMode && <TableCell>Consumed</TableCell>}
              {!isAddMode && <TableCell>On Floor</TableCell>}
              <TableCell>Scrap Qty</TableCell>
              {!isAddMode && <TableCell>Remaining Qty</TableCell>}
              <TableCell>Status</TableCell>
              {!isAddMode && <TableCell>Move to Floor</TableCell>}
              {!isAddMode && <TableCell>Scrap Now</TableCell>}
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAddMode ? 11 : 16} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {isAddMode
                      ? 'No materials found. Select item/BOM and open this tab to load.'
                      : 'No materials available.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              materials.map((material, index) => {
                const rowKey = getMaterialRowKey(material, index);
                const issuePayload = getIssuePayload(material, rowKey);
                const canIssue = canIssuePayload(issuePayload);
                const netRequiredQuantity = toNumberValue(material?.netRequiredQuantity);
                const plannedRequiredQuantity = toNumberValue(material?.plannedRequiredQuantity);
                const issuedQuantity = toNumberValue(material?.issuedQuantity);
                const consumedQuantity = toNumberValue(material?.consumedQuantity);
                const availableQuantity = Math.max(issuedQuantity - consumedQuantity, 0);
                const scrappedQuantity = toNumberValue(material?.scrappedQuantity);
                const remainingQuantity = Math.max(netRequiredQuantity - consumedQuantity - scrappedQuantity, 0);

                return (
                  <TableRow
                    key={material?.id || material?.workOrderMaterialId || `${material?.component?.inventoryItemId}-${index}`}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{material?.component?.itemCode || '-'}</TableCell>
                    <TableCell>{material?.component?.name || '-'}</TableCell>
                    <TableCell>{material?.component?.uom || '-'}</TableCell>
                    <TableCell>
                      {material?.operationName || 'All / On Start'}
                      {!material?.operationName && !material?.workOrderOperationId && material?.issueStatus !== 'ISSUED' && !isAddMode && (
                        <Tooltip title="This material must be fully issued before any operation can start" arrow>
                          <WarningAmber sx={{ fontSize: 16, color: 'warning.main', ml: 0.5, verticalAlign: 'middle', cursor: 'help' }} />
                        </Tooltip>
                      )}
                    </TableCell>

                    <TableCell sx={{ minWidth: 88 }}>
                      {isAddMode ? (
                        <TextField
                          size="small"
                          type="number"
                          value={material?.netRequiredQuantity ?? 0}
                          onChange={(e) => handleMaterialChange(index, 'netRequiredQuantity', e.target.value)}
                          inputProps={{ min: 0 }}
                          sx={compactInputSx}
                        />
                      ) : (
                        <Typography variant="caption">{netRequiredQuantity}</Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ minWidth: 88 }}>
                      {isAddMode ? (
                        <TextField
                          size="small"
                          type="number"
                          value={material?.plannedRequiredQuantity ?? 0}
                          onChange={(e) =>
                            handleMaterialChange(index, 'plannedRequiredQuantity', e.target.value)
                          }
                          inputProps={{ min: 0 }}
                          sx={compactInputSx}
                        />
                      ) : (
                        <Typography variant="caption">{plannedRequiredQuantity}</Typography>
                      )}
                    </TableCell>

                    {!isAddMode && (
                      <TableCell sx={{ minWidth: 110 }}>
                        {getMrStatusChip(material)}
                        {material?.mrRejectionReason && (
                          <Tooltip title={material.mrRejectionReason} arrow>
                            <Typography variant="caption" sx={{ display: 'block', color: 'error.main', mt: 0.3, cursor: 'help' }}>
                              {material.mrRejectionReason.length > 18 ? material.mrRejectionReason.slice(0, 18) + '…' : material.mrRejectionReason}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}

                    <TableCell sx={{ minWidth: 88 }}>
                      {isAddMode ? (
                        <TextField
                          size="small"
                          type="number"
                          value={material?.issuedQuantity ?? 0}
                          onChange={(e) => handleMaterialChange(index, 'issuedQuantity', e.target.value)}
                          inputProps={{ min: 0 }}
                          sx={compactInputSx}
                        />
                      ) : (
                        <Typography variant="caption">{issuedQuantity}</Typography>
                      )}
                    </TableCell>

                    {!isAddMode && (
                      <TableCell sx={{ minWidth: 78 }}>
                        <Typography variant="caption">{consumedQuantity}</Typography>
                      </TableCell>
                    )}

                    {!isAddMode && (
                      <TableCell sx={{ minWidth: 78 }}>
                        <Typography variant="caption" fontWeight={600} color={availableQuantity === 0 ? 'text.secondary' : 'success.main'}>
                          {availableQuantity}
                        </Typography>
                      </TableCell>
                    )}

                    <TableCell sx={{ minWidth: 88 }}>
                      {isAddMode ? (
                        <TextField
                          size="small"
                          type="number"
                          value={material?.scrappedQuantity ?? 0}
                          onChange={(e) => handleMaterialChange(index, 'scrappedQuantity', e.target.value)}
                          inputProps={{ min: 0, step: '0.01' }}
                          sx={compactInputSx}
                        />
                      ) : (
                        <Typography variant="caption">{scrappedQuantity}</Typography>
                      )}
                    </TableCell>

                    {!isAddMode && (
                      <TableCell sx={{ minWidth: 88 }}>
                        <Typography variant="caption">{remainingQuantity}</Typography>
                      </TableCell>
                    )}

                    <TableCell sx={{ minWidth: 98 }}>
                      {isAddMode ? (
                        <TextField
                          select
                          size="small"
                          value={material?.issueStatus || 'NOT_ISSUED'}
                          onChange={(e) => handleMaterialChange(index, 'issueStatus', e.target.value)}
                          fullWidth
                          sx={compactInputSx}
                        >
                          {statusOptions.map((status) => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={material?.issueStatus || 'NOT_ISSUED'}
                          color={getIssueStatusColor(material?.issueStatus)}
                        />
                      )}
                    </TableCell>

                    {!isAddMode && (
                      <TableCell sx={{ minWidth: 92 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={issueDrafts[rowKey]?.issuedQuantity ?? ''}
                          onChange={(e) => handleIssueDraftChange(rowKey, 'issuedQuantity', e.target.value)}
                          inputProps={{ min: 0 }}
                          placeholder="0"
                          disabled={isMaterialIssueLoading}
                          sx={compactInputSx}
                        />
                      </TableCell>
                    )}

                    {!isAddMode && (
                      <TableCell sx={{ minWidth: 92 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={issueDrafts[rowKey]?.scrappedQuantity ?? ''}
                          onChange={(e) => handleIssueDraftChange(rowKey, 'scrappedQuantity', e.target.value)}
                          inputProps={{ min: 0, step: '0.01' }}
                          placeholder="0"
                          disabled={isMaterialIssueLoading}
                          sx={compactInputSx}
                        />
                      </TableCell>
                    )}

                    <TableCell align="center">
                      {isAddMode ? (
                        <Tooltip title="Remove material">
                          <span>
                            <IconButton color="error" size="small" onClick={() => handleRemove(index)}>
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Record physical movement to shop floor (tracking only — no stock deduction)" arrow>
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleIssueSingleMaterial(material, index)}
                              disabled={!canIssue || isMaterialIssueLoading}
                            >
                              Move
                            </Button>
                          </span>
                        </Tooltip>
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
        <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
          <Chip size="small" variant="outlined" label={`Total items: ${materials.length}`} />
          {!isAddMode && (
            <Chip
              size="small"
              variant="outlined"
              color="primary"
              label="Floor movements are incremental. Stock is consumed when batches are recorded."
            />
          )}
        </Box>
      )}
    </Box>
  );
}
