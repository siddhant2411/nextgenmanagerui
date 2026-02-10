import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Checkbox,
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
import { DeleteOutline } from '@mui/icons-material';
import dayjs from 'dayjs';

const DEFAULT_OPERATION_STATUSES = [
  'PLANNED',
  'READY',
  'IN_PROGRESS',
  'COMPLETED',
  'HOLD',
  'CANCELLED',
];
const EMPTY_OPERATIONS = [];

const toNumberValue = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const DATE_FIELDS = new Set([
  'plannedStartDate',
  'plannedEndDate',
  'actualStartDate',
  'actualEndDate',
]);

const formatDateTime = (value) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  if (!parsed.isValid()) return '-';
  return parsed.format('DD-MM-YY hh:mm A');
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
    width: '5rem',
  },
  '& .MuiInputBase-input': {
    px: 1,
    py: 0.5,
  },
};

const getOperationRowKey = (operation, index) =>
  String(operation?.id ?? operation?.routingOperation?.id ?? index);

const getStatusColor = (status) => {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS') return 'primary';
  if (status === 'READY') return 'warning';
  if (status === 'CANCELLED') return 'error';
  return 'default';
};

const canStartOperation = (operation) =>
  Boolean(operation?.id) && ['PLANNED', 'READY'].includes(operation?.status);

const canRecordPartialCompletion = (operation) =>
  Boolean(operation?.id) && ['READY', 'IN_PROGRESS'].includes(operation?.status);

export default function WorkOrderOperationsTab({
  formik,
  isEditMode,
  onStartOperation,
  onCompleteOperation,
  operationActionState,
}) {
  const operations = Array.isArray(formik.values?.operations)
    ? formik.values.operations
    : EMPTY_OPERATIONS;
  const [partialDrafts, setPartialDrafts] = useState({});

  useEffect(() => {
    const validKeys = new Set(operations.map((operation, index) => getOperationRowKey(operation, index)));
    setPartialDrafts((prev) => {
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
  }, [operations]);

  const statusOptions = Array.from(
    new Set([
      ...DEFAULT_OPERATION_STATUSES,
      ...operations.map((operation) => operation?.status).filter(Boolean),
    ])
  );

  const handleOperationChange = (index, field, value) => {
    const updated = [...operations];
    updated[index] = {
      ...updated[index],
      [field]:
        field === 'isMilestone' || field === 'allowOverCompletion'
          ? Boolean(value)
          : DATE_FIELDS.has(field)
            ? value
          : field === 'status'
            ? value
            : toNumberValue(value),
    };
    formik.setFieldValue('operations', updated);
  };

  const handlePartialDraftChange = (rowKey, field, value) => {
    setPartialDrafts((prev) => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] || {}),
        [field]: value,
      },
    }));
  };

  const handleRemove = (index) => {
    const updated = operations.filter((_, idx) => idx !== index);
    formik.setFieldValue('operations', updated);
  };

  const getCompletionPayload = (rowKey) => {
    const draft = partialDrafts[rowKey] || {};
    return {
      completedQuantity: toNumberValue(draft.completedQuantity),
      scrappedQuantity: toNumberValue(draft.scrappedQuantity),
      remarks: draft.remarks || '',
    };
  };

  const canSubmitCompletionPayload = (payload) =>
    !Number.isNaN(payload.completedQuantity) &&
    !Number.isNaN(payload.scrappedQuantity) &&
    payload.completedQuantity >= 0 &&
    payload.scrappedQuantity >= 0 &&
    payload.completedQuantity + payload.scrappedQuantity > 0;

  const hasAnyCompletionDraft = operations.some((operation, index) => {
    if (!canRecordPartialCompletion(operation)) return false;
    const rowKey = getOperationRowKey(operation, index);
    return canSubmitCompletionPayload(getCompletionPayload(rowKey));
  });

  const handleStart = async (operationId) => {
    if (!onStartOperation) return;
    await onStartOperation(operationId);
  };

  const handleRecordPartialCompletion = async (operation, index) => {
    if (!onCompleteOperation) return;
    const rowKey = getOperationRowKey(operation, index);
    const payload = getCompletionPayload(rowKey);
    if (!canSubmitCompletionPayload(payload)) return;

    const success = await onCompleteOperation(operation?.id, payload);
    if (!success) return;

    setPartialDrafts((prev) => ({
      ...prev,
      [rowKey]: {
        completedQuantity: '',
        scrappedQuantity: '',
        remarks: '',
      },
    }));
  };

  return (
    <Box>
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
          OPERATIONS
        </Typography>
        {isEditMode && (
          <Chip
            size="small"
            color={hasAnyCompletionDraft ? 'primary' : 'default'}
            variant="outlined"
            label="Partial completion uses incremental quantities"
          />
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
        <Table size="small" sx={{ minWidth: isEditMode ? 1520 : 1280 }}>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Sequence</TableCell>
              <TableCell>Operation Name</TableCell>
              <TableCell>Planned Qty</TableCell>
              <TableCell>Completed Qty</TableCell>
              <TableCell>Scrapped Qty</TableCell>
              {isEditMode && <TableCell>Remaining Qty</TableCell>}
              <TableCell>Status</TableCell>
              <TableCell>Actual Start</TableCell>
              <TableCell>Actual End</TableCell>
              {isEditMode && <TableCell>Complete Now</TableCell>}
              {isEditMode && <TableCell>Scrap Now</TableCell>}
              {/* {isEditMode && <TableCell>Remarks</TableCell>} */}
              {/* {!isEditMode && <TableCell>Milestone</TableCell>}
              {!isEditMode && <TableCell>Over Completion</TableCell>} */}
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {operations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isEditMode ? 14 : 12} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No operations available.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              operations.map((operation, index) => {
                const rowKey = getOperationRowKey(operation, index);
                const completionPayload = getCompletionPayload(rowKey);
                const isCurrentOperationAction =
                  operationActionState?.loading &&
                  operationActionState?.operationId === operation?.id;
                const startAllowed = isEditMode && canStartOperation(operation);
                const partialCompletionAllowed =
                  isEditMode && canRecordPartialCompletion(operation);
                const canRecord =
                  partialCompletionAllowed &&
                  canSubmitCompletionPayload(completionPayload) &&
                  !isCurrentOperationAction;
                const plannedQuantity = toNumberValue(operation?.plannedQuantity);
                const completedQuantity = toNumberValue(operation?.completedQuantity);
                const scrappedQuantity = toNumberValue(operation?.scrappedQuantity);
                const remainingQuantity = Math.max(plannedQuantity - completedQuantity, 0);

                return (
                  <TableRow key={operation?.id || `${operation?.routingOperation?.id || index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{operation?.sequence ?? operation?.routingOperation?.sequenceNumber ?? '-'}</TableCell>
                    <TableCell>{operation?.operationName || operation?.routingOperation?.name || '-'}</TableCell>

                    <TableCell sx={{ width: "4rem" }}>
                      {isEditMode ? (
                        <Typography variant="caption">{plannedQuantity}</Typography>
                      ) : (
                        <TextField
                          size="small"
                          type="number"
                          value={operation?.plannedQuantity ?? 0}
                          onChange={(e) => handleOperationChange(index, 'plannedQuantity', e.target.value)}
                          inputProps={{ min: 0,  }}
                          sx={compactInputSx}
                        />
                      )}
                    </TableCell>

                    <TableCell sx={{  width: "4rem" }}>
                      {isEditMode ? (
                        <Typography variant="caption">{completedQuantity}</Typography>
                      ) : (
                        <TextField
                          size="small"
                          type="number"
                          value={operation?.completedQuantity ?? 0}
                          onChange={(e) => handleOperationChange(index, 'completedQuantity', e.target.value)}
                          inputProps={{ min: 0,  }}
                          sx={compactInputSx}
                        />
                      )}
                    </TableCell>

                    <TableCell sx={{  width: "4rem" }}>
                      {isEditMode ? (
                        <Typography variant="caption">{scrappedQuantity}</Typography>
                      ) : (
                        <TextField
                          size="small"
                          type="number"
                          value={operation?.scrappedQuantity ?? 0}
                          onChange={(e) => handleOperationChange(index, 'scrappedQuantity', e.target.value)}
                          inputProps={{ min: 0,  }}
                          sx={compactInputSx}
                        />
                      )}
                    </TableCell>

                    {isEditMode && (
                      <TableCell sx={{ width: "4rem"}}>
                        <Typography variant="caption">{remainingQuantity}</Typography>
                      </TableCell>
                    )}

                    <TableCell sx={{  width: "4rem" }}>
                      {isEditMode ? (
                        <Chip
                          size="small"
                          label={operation?.status || 'PLANNED'}
                          color={getStatusColor(operation?.status)}
                          variant="outlined"
                        />
                      ) : (
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={operation?.status || 'PLANNED'}
                          onChange={(e) => handleOperationChange(index, 'status', e.target.value)}
                          sx={compactInputSx}
                        >
                          {statusOptions.map((status) => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    </TableCell>

                    <TableCell sx={{ width:50 }}>
                      {isEditMode ? (
                        <Typography variant="caption">
                          {formatDateTime(operation?.actualStartDate)}
                        </Typography>
                      ) : (
                        <TextField
                          size="small"
                          type="datetime-local"
                          value={operation?.actualStartDate ?? ''}
                          onChange={(e) => handleOperationChange(index, 'actualStartDate', e.target.value)}
                          fullWidth
                          sx={compactInputSx}
                        />
                      )}
                    </TableCell>

                    <TableCell sx={{ width: 50 }}>
                      {isEditMode ? (
                        <Typography variant="caption">
                          {formatDateTime(operation?.actualEndDate)}
                        </Typography>
                      ) : (
                        <TextField
                          size="small"
                          type="datetime-local"
                          value={operation?.actualEndDate ?? ''}
                          onChange={(e) => handleOperationChange(index, 'actualEndDate', e.target.value)}
                          fullWidth
                          sx={compactInputSx}
                        />
                      )}
                    </TableCell>

                    {isEditMode && (
                      <TableCell sx={{ width: 40 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={partialDrafts[rowKey]?.completedQuantity ?? ''}
                          onChange={(e) => handlePartialDraftChange(rowKey, 'completedQuantity', e.target.value)}
                          inputProps={{ min: 0,  }}
                          placeholder="0"
                          disabled={!partialCompletionAllowed || isCurrentOperationAction}
                          sx={compactInputSx}
                        />
                      </TableCell>
                    )}

                    {isEditMode && (
                      <TableCell sx={{ width: 40 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={partialDrafts[rowKey]?.scrappedQuantity ?? ''}
                          onChange={(e) => handlePartialDraftChange(rowKey, 'scrappedQuantity', e.target.value)}
                          inputProps={{ min: 0 }}
                          placeholder="0"
                          disabled={!partialCompletionAllowed || isCurrentOperationAction}
                          sx={compactInputSx}
                        />
                      </TableCell>
                    )}

                    {/* {isEditMode && (
                      <TableCell sx={{ minWidth: 140 }}>
                        <TextField
                          size="small"
                          value={partialDrafts[rowKey]?.remarks ?? ''}
                          onChange={(e) => handlePartialDraftChange(rowKey, 'remarks', e.target.value)}
                          placeholder="Remarks"
                          fullWidth
                          disabled={!partialCompletionAllowed || isCurrentOperationAction}
                          sx={compactInputSx}
                        />
                      </TableCell>
                    )} */}

                    {/* {!isEditMode && (
                      <TableCell align="center">
                        <Checkbox
                          size="small"
                          checked={Boolean(operation?.isMilestone)}
                          onChange={(e) => handleOperationChange(index, 'isMilestone', e.target.checked)}
                        />
                      </TableCell>
                    )} */}

                    {/* {!isEditMode && (
                      <TableCell align="center">
                        <Checkbox
                          size="small"
                          checked={Boolean(operation?.allowOverCompletion)}
                          onChange={(e) => handleOperationChange(index, 'allowOverCompletion', e.target.checked)}
                        />
                      </TableCell>
                    )} */}

                    <TableCell align="center">
                      {isEditMode ? (
                        <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleStart(operation?.id)}
                            disabled={!startAllowed || isCurrentOperationAction}
                          >
                            {isCurrentOperationAction && operationActionState?.action === 'start'
                              ? 'Starting...'
                              : 'Start'}
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleRecordPartialCompletion(operation, index)}
                            disabled={!canRecord}
                          >
                            {isCurrentOperationAction && operationActionState?.action === 'complete'
                              ? 'Saving...'
                              : 'Record Batch'}
                          </Button>
                        </Box>
                      ) : (
                        <Tooltip title="Remove operation">
                          <span>
                            <IconButton color="error" size="small" onClick={() => handleRemove(index)}>
                              <DeleteOutline fontSize="small" />
                            </IconButton>
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

      {operations.length > 0 && (
        <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
          <Chip size="small" variant="outlined" label={`Total operations: ${operations.length}`} />
          {isEditMode && (
            <Chip
              size="small"
              variant="outlined"
              color="primary"
              label="Use Complete Now/Scrap Now as incremental batch values"
            />
          )}
        </Box>
      )}
    </Box>
  );
}
