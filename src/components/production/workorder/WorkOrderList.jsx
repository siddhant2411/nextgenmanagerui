import React from 'react';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableFooter, TableHead, TablePagination, TableRow,
  Select, MenuItem, InputLabel, FormControl, TextField, InputAdornment,
  Chip, Tooltip
} from '@mui/material';
import { Search } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import "./WorkOrder.css"
const StatusChip = ({ status }) => {
  const colorMap = {
    DRAFT: 'default',
    IN_PROGRESS: 'primary',
    READY: 'warning',
    COMPLETED: 'success',
  };
  return (
    <Chip
      label={status}
      color={colorMap[status] || 'default'}
      size="small"
      sx={{ fontSize: 11, width: 90 }}
    />
  );
};

const DueDateCell = ({ dueDate }) => {
  const today = dayjs();
  const date = dayjs(dueDate);
  return (
    <>
      {date.format('DD-MM-YYYY')}
      {date.isBefore(today, 'day') || date.isSame(today, 'day') ? (
        <Tooltip title="Overdue"><span style={{ color: 'red', fontSize: 14 }}>⚠️</span></Tooltip>
      ) : date.diff(today, 'day') <= 2 ? (
        <Tooltip title="Almost Due"><span style={{ color: 'orange', fontSize: 14 }}>⏳</span></Tooltip>
      ) : null}
    </>
  );
};

export default function WorkOrderList({
  workOrderList,
  filters,
  sortBy,
  sortDir,
  currentPage,
  itemsPerPage,
  totalElements,
  onFilterChange,
  onSort,
  onPageChange,
  onRowsPerPageChange
}) {
  const navigate = useNavigate();

  return (
    <Box >
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small">
            <InputLabel>Filter By</InputLabel>
            <Select
              value={filters.key || ''}
              onChange={(e) => onFilterChange('key', e.target.value)}
              label="Filter By"
            >
              <MenuItem value=""><em>None</em></MenuItem>
              <MenuItem value="id">ID</MenuItem>
              <MenuItem value="salesOrderNumber">Sales Order</MenuItem>
              <MenuItem value="bomName">BOM</MenuItem>
              <MenuItem value="status">Status</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Search"
            onChange={(e) => onFilterChange(filters.key, e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              )
            }}
          />
        </Box>

        <Button variant="contained" onClick={() => navigate('/production/work-order/add')}>
          + Create
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['ID', 'Sales Order', 'BOM', 'Status', 'Due Date', 'Cost', 'Created', 'Action'].map((col, i) => (
                <TableCell
                  key={i}
                  align="center"
                  sx={{ fontWeight: 600, cursor: i < 7 ? 'pointer' : 'default' }}
                  onClick={() => i < 7 && onSort(col.toLowerCase().replace(/ /g, ''))}
                >
                  {col} {sortBy === col.toLowerCase().replace(/ /g, '') && (sortDir === 'asc' ? '⬆️' : '⬇️')}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {workOrderList.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell align="center">{row.id}</TableCell>
                <TableCell align="center">{row.salesOrderNumber}</TableCell>
                <TableCell align="center">{row.bomName}</TableCell>
                <TableCell align="center"><StatusChip status={row.status} /></TableCell>
                <TableCell align="center"><DueDateCell dueDate={row.dueDate} /></TableCell>
                <TableCell align="center">₹{row.actualCost}</TableCell>
                <TableCell align="center">{dayjs(row.creationDate).format('DD-MM-YYYY')}</TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/production/work-order/edit/${row.id}`)}
                  >
                    Edit
                  </Button>
                  <DeleteIcon sx={{ color: 'grey', ml: 1, cursor: 'pointer' }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TablePagination
                colSpan={8}
                rowsPerPageOptions={[5, 15, 20]}
                count={totalElements}
                page={currentPage - 1}
                rowsPerPage={itemsPerPage}
                onPageChange={(e, newPage) => onPageChange(e, newPage)}
                onRowsPerPageChange={onRowsPerPageChange}
              />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Box>
  );
}
