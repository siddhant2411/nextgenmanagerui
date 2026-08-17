import React, { useCallback, useEffect, useState } from 'react';
import { Box, Chip, Paper, Skeleton, Tooltip, Typography } from '@mui/material';
import { AccountTree, CallSplit, NorthEast, SouthEast } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getRelatedWorkOrders } from '../../../services/workOrderService';
import dayjs from 'dayjs';

const BORDER = '#e2e8f0';

const STATUS_TONE = {
  CREATED:              { color: '#5a6474', bg: '#f4f6f8' },
  SCHEDULED:            { color: '#1d4ed8', bg: '#eff6ff' },
  MATERIAL_PENDING:     { color: '#8a4a1c', bg: '#fdf4ec' },
  PARTIALLY_READY:      { color: '#8a4a1c', bg: '#fdf4ec' },
  READY_FOR_PRODUCTION: { color: '#1d4ed8', bg: '#eff6ff' },
  IN_PROGRESS:          { color: '#5b3b9e', bg: '#f0edf9' },
  COMPLETED:            { color: '#2a6640', bg: '#eef6f0' },
  CLOSED:               { color: '#2a6640', bg: '#eef6f0' },
  SHORT_CLOSED:         { color: '#b84040', bg: '#fdf0f0' },
  CANCELLED:            { color: '#6b6b6b', bg: '#f5f5f5' },
  HOLD:                 { color: '#b84040', bg: '#fdf0f0' },
};

// The direction of the link is the label — parent or child — so the two ends of one relationship
// never read the same way round. How the link came about is a note beside it, not a second kind
// of relationship.
const RELATION_LABEL = {
  PARENT:       { label: 'Parent', icon: <NorthEast sx={{ fontSize: 13 }} />, note: '', hint: 'This work order was raised under that one' },
  SPLIT_PARENT: { label: 'Parent', icon: <NorthEast sx={{ fontSize: 13 }} />, note: 'split from', hint: 'This work order was split out of that one' },
  CHILD:        { label: 'Child', icon: <SouthEast sx={{ fontSize: 13 }} />, note: '', hint: 'Raised under this work order' },
  SPLIT_CHILD:  { label: 'Child', icon: <SouthEast sx={{ fontSize: 13 }} />, note: 'split off', hint: 'Quantity was split off this work order to create it' },
};

const fmtQty = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
};

/**
 * Work orders linked to this one, one line each.
 *
 * A signpost rather than a summary — number, how it relates, what it makes, progress, status.
 * Anyone who needs the detail opens it. Manually raised sub-assembly orders and orders created by
 * splitting quantity both appear; the relation chip is what tells them apart.
 */
export default function RelatedWorkOrdersSection({ workOrderId, refreshToken = 0 }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!workOrderId) return;
    setLoading(true);
    try {
      const response = await getRelatedWorkOrders(workOrderId);
      setRows(Array.isArray(response) ? response : []);
    } catch {
      // A missing link list must never take the work order page down with it.
      setRows([]);
    } finally {
      setLoading(false);
    }
    // refreshToken is a deliberate dependency: a split adds a link without changing the work
    // order being viewed, so the list has to be re-read on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId, refreshToken]);

  useEffect(() => { load(); }, [load]);

  if (!workOrderId) return null;
  if (!loading && rows.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: 1.5, overflow: 'hidden', mb: 2 }}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountTree sx={{ fontSize: 16, color: '#475569' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f2744' }}>
          Related work orders
        </Typography>
        {!loading && (
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            ({rows.length})
          </Typography>
        )}
      </Box>

      {loading ? (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Skeleton height={22} />
          <Skeleton height={22} width="70%" />
        </Box>
      ) : (
        rows.map((row, index) => {
          const relation = RELATION_LABEL[row.relation] || RELATION_LABEL.CHILD;
          const tone = STATUS_TONE[row.status] || STATUS_TONE.CREATED;
          return (
            <Box
              key={row.id}
              // This section only renders on .../work-order/edit/:id, so the target is a sibling
              // of the current id — one segment up, not up to the list and back down through
              // /edit again. Derived from the current path so it survives a base-path change.
              onClick={() => navigate(`../${row.id}`, { relative: 'path' })}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1,
                borderTop: index === 0 ? 'none' : `1px solid ${BORDER}`,
                cursor: 'pointer', transition: 'background .1s',
                '&:hover': { bgcolor: '#f8fafc' },
              }}
            >
              <Tooltip title={relation.hint} placement="left">
                <Chip
                  icon={relation.icon}
                  label={relation.label}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569', flexShrink: 0 }}
                />
              </Tooltip>

              <Typography variant="body2" fontWeight={700} sx={{ color: '#1d4ed8', flexShrink: 0 }}>
                {row.workOrderNumber}
              </Typography>

              {relation.note && (
                <Chip
                  icon={<CallSplit sx={{ fontSize: 12 }} />}
                  label={relation.note}
                  size="small"
                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#f3e8ff', color: '#7c3aed', border: '1px solid #e9d5ff', flexShrink: 0 }}
                />
              )}

              <Typography variant="caption" sx={{ color: '#475569', flex: 1, minWidth: 0 }} noWrap>
                {row.items || '—'}
              </Typography>

              <Typography variant="caption" sx={{ color: '#64748b', flexShrink: 0 }}>
                {fmtQty(row.completedQuantity)} / {fmtQty(row.plannedQuantity)}
              </Typography>

              {row.dueDate && (
                <Typography variant="caption" sx={{ color: '#94a3b8', flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
                  {dayjs(row.dueDate).format('DD MMM YY')}
                </Typography>
              )}

              <Chip
                label={row.status}
                size="small"
                sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800, bgcolor: tone.bg, color: tone.color, border: `1px solid ${tone.color}33`, flexShrink: 0 }}
              />
            </Box>
          );
        })
      )}
    </Paper>
  );
}
