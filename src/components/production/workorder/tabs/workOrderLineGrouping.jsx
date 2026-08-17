import React from 'react';
import { Box, Chip, TableCell, TableRow, Typography } from '@mui/material';

/**
 * Groups work order rows (operations or materials) by the line — the product — they belong to.
 *
 * Operation sequence numbers restart per line and each line explodes its own BOM, so a flat list
 * shows two operations called "10" and the same component twice with no way to tell which item
 * either belongs to. Rows carry their line from the server as workOrderLineId / lineNumber /
 * lineItemCode / lineItemName.
 *
 * Each entry keeps its original index. Callers key rows and address drafts by position in the
 * flat array, and grouping must not renumber them.
 *
 * @returns groups ordered by line number, each { key, lineNumber, itemCode, itemName, entries }
 *          where entries are { row, index }.
 */
export const groupByWorkOrderLine = (rows) => {
  const groups = new Map();

  (rows || []).forEach((row, index) => {
    const key = row?.workOrderLineId ?? row?.lineNumber ?? '__ungrouped__';
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        lineNumber: row?.lineNumber ?? null,
        itemCode: row?.lineItemCode || '',
        itemName: row?.lineItemName || '',
        entries: [],
      });
    }
    groups.get(key).entries.push({ row, index });
  });

  return [...groups.values()].sort(
    (a, b) => (a.lineNumber ?? Infinity) - (b.lineNumber ?? Infinity),
  );
};

/**
 * Whether the grouping is worth showing. A single-item work order has one group, and heading it
 * with the item name only adds a band of chrome above a list that was never ambiguous.
 */
export const shouldShowLineGroups = (groups) => groups.length > 1;

/** Banner row introducing one line's rows inside a table. */
export function LineGroupHeaderRow({ group, colSpan, countLabel }) {
  return (
    <TableRow sx={{ bgcolor: '#eef2f7' }}>
      <TableCell
        colSpan={colSpan}
        sx={{ py: 1, px: 1.5, borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #cbd5e1' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {group.lineNumber != null && (
            <Chip
              label={`Line ${group.lineNumber}`}
              size="small"
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#1e293b', color: '#fff' }}
            />
          )}
          <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0f2744' }}>
            {group.itemCode || 'Unassigned'}
          </Typography>
          {group.itemName && (
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {group.itemName}
            </Typography>
          )}
          {countLabel && (
            <Typography variant="caption" sx={{ ml: 'auto', color: '#64748b', fontWeight: 700 }}>
              {countLabel}
            </Typography>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}
