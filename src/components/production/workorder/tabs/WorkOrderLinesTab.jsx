import React from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Chip, LinearProgress,
} from '@mui/material';

const BORDER = '#e2e8f0';

const headerCellSx = {
  fontWeight: 700,
  fontSize: '0.75rem',
  color: '#475569',
  bgcolor: '#f8fafc',
  borderBottom: `1px solid ${BORDER}`,
};

const STATUS_COLOR = {
  CREATED: 'default',
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
  SHORT_CLOSED: 'error',
};

const num = (v, dp = 2) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(dp).replace(/\.00$/, '') : '-';
};

/**
 * The items a work order makes, one row per line.
 *
 * Each line carries its own item, BOM, routing and quantity, and is produced and costed on its
 * own — so progress is shown per line rather than as a single work-order total, which would be
 * meaningless across items with different units of measure.
 */
export default function WorkOrderLinesTab({ lines = [] }) {
  if (!lines.length) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderColor: BORDER, borderRadius: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          This work order has no item lines.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderColor: BORDER, borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Items ({lines.length})
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Each line is produced and costed independently.
        </Typography>
      </Box>

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>#</TableCell>
              <TableCell sx={headerCellSx}>Item</TableCell>
              <TableCell sx={headerCellSx}>BOM</TableCell>
              <TableCell align="right" sx={headerCellSx}>Planned</TableCell>
              <TableCell align="right" sx={headerCellSx}>Completed</TableCell>
              <TableCell align="right" sx={headerCellSx}>Scrapped</TableCell>
              <TableCell sx={headerCellSx}>Progress</TableCell>
              <TableCell align="right" sx={headerCellSx}>Yield %</TableCell>
              <TableCell align="center" sx={headerCellSx}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line, index) => {
              const planned = Number(line.plannedQuantity) || 0;
              const completed = Number(line.completedQuantity) || 0;
              const pct = planned > 0 ? Math.min(100, (completed / planned) * 100) : 0;

              return (
                <TableRow
                  key={line.id ?? line.lineNumber}
                  sx={{
                    bgcolor: index % 2 === 0 ? '#fafbfc' : '#fff',
                    '& td': { fontSize: '0.8125rem', py: 0.75, borderBottom: `1px solid ${BORDER}` },
                  }}
                >
                  <TableCell>{line.lineNumber}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1565c0' }}>
                      {line.inventoryItem?.itemCode || '-'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {line.inventoryItem?.name || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>{line.bomName || (line.bomId ? `BOM #${line.bomId}` : '-')}</TableCell>
                  <TableCell align="right">{num(line.plannedQuantity)}</TableCell>
                  <TableCell align="right">{num(line.completedQuantity)}</TableCell>
                  <TableCell align="right">{num(line.scrappedQuantity)}</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ height: 6, borderRadius: 3, bgcolor: '#eef2f6' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {pct.toFixed(0)}%
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{num(line.firstPassYield, 1)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={(line.status || '-').replace(/_/g, ' ')}
                      size="small"
                      color={STATUS_COLOR[line.status] || 'default'}
                      variant="outlined"
                      sx={{ fontSize: '0.6875rem', height: 22 }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
