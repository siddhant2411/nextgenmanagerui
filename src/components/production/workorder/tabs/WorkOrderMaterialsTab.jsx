import React, { useEffect, useState } from 'react';
import {
  Box,
  Alert,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
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
import { DeleteOutline, Refresh, WarningAmber } from '@mui/icons-material';

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

const getIssueStatusColor = (status) => {
  if (status === 'ISSUED') return 'success';
  if (status === 'PARTIALLY_ISSUED') return 'warning';
  return 'default';
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
      issuedQuantity,
      scrappedQuantity,
    };
  };

  const canIssuePayload = (payload) =>
    Boolean(payload?.workOrderMaterialId) &&
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

  return (
    <Box>
      {formik.values.allowBackflush && (
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
          <strong>Backflush Enabled</strong> - Materials will be auto-consumed when the work order is completed. Manual issuance is still allowed for partial quantities.
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1.5,
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
          MATERIALS
        </Typography>

        {isAddMode ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<Refresh />}
            onClick={onLoadFromBom}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Reload from BOM'}
          </Button>
        ) : (
          <Button
            size="small"
            variant="contained"
            onClick={handleIssueEnteredMaterials}
            disabled={isMaterialIssueLoading || !hasAnyIssueDraft}
          >
            {isMaterialIssueLoading ? 'Issuing...' : 'Issue Entered'}
          </Button>
        )}
      </Box>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          maxWidth: '100%',
          overflowX: 'auto',
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
              <TableCell>Issued Qty</TableCell>
              {!isAddMode && <TableCell>Consumed</TableCell>}
              {!isAddMode && <TableCell>Available</TableCell>}
              <TableCell>Scrap Qty</TableCell>
              {!isAddMode && <TableCell>Remaining Qty</TableCell>}
              <TableCell>Status</TableCell>
              {!isAddMode && <TableCell>Issue Now</TableCell>}
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
                const remainingQuantity = Math.max(netRequiredQuantity - issuedQuantity - scrappedQuantity, 0);

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
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleIssueSingleMaterial(material, index)}
                          disabled={!canIssue || isMaterialIssueLoading}
                        >
                          Issue
                        </Button>
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
              label="Issue quantities are treated as incremental batches"
            />
          )}
        </Box>
      )}
    </Box>
  );
}
