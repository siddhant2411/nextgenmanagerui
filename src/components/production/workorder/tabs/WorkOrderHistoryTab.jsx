import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const formatTimestamp = (value) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD-MM-YYYY HH:mm") : String(value);
};

export default function WorkOrderHistoryTab({
  rows = [],
  loading = false,
  isAddMode = false,
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const sortedRows = useMemo(() => {
    const copy = Array.isArray(rows) ? [...rows] : [];
    return copy.sort((a, b) => {
      const aValue = dayjs(a?.performedAt).valueOf();
      const bValue = dayjs(b?.performedAt).valueOf();
      const aScore = Number.isFinite(aValue) ? aValue : -Infinity;
      const bScore = Number.isFinite(bValue) ? bValue : -Infinity;
      return bScore - aScore;
    });
  }, [rows]);

  const pagedRows = useMemo(() => {
    if (!sortedRows.length) return [];
    const start = page * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [page, rowsPerPage, sortedRows]);

  useEffect(() => {
    setPage(0);
  }, [rowsPerPage, rows]);

  if (isAddMode) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
        History will be available after the work order is created.
      </Typography>
    );
  }

  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={1} px={1} py={2}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          Loading history...
        </Typography>
      </Box>
    );
  }

  if (!sortedRows.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
        No history available.
      </Typography>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 1.5, borderColor: "#e5e9f2", overflow: "hidden" }}
    >
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell>Field</TableCell>
              <TableCell>Old Value</TableCell>
              <TableCell>New Value</TableCell>
              <TableCell>Performed By</TableCell>
              <TableCell>Performed At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((row) => (
              <TableRow key={row?.id ?? `${row?.eventType}-${row?.performedAt}`}>
                <TableCell>
                  {row?.eventType ? (
                    <Chip size="small" label={row.eventType} variant="outlined" />
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{formatValue(row?.fieldName)}</TableCell>
                <TableCell>{formatValue(row?.oldValue)}</TableCell>
                <TableCell>{formatValue(row?.newValue)}</TableCell>
                <TableCell>{formatValue(row?.performedBy)}</TableCell>
                <TableCell>{formatTimestamp(row?.performedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={sortedRows.length}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50, 100]}
        onRowsPerPageChange={(event) =>
          setRowsPerPage(parseInt(event.target.value, 10))
        }
      />
    </Paper>
  );
}
