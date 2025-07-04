// Enhanced and styled QuotationList.jsx matching InventoryItemList UI
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, MenuItem, Pagination, Paper, Select,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, IconButton
} from '@mui/material';
import { DeleteForever, EditOutlined } from '@mui/icons-material';

const QuotationList = ({
  handleSort,
  filters,
  handleFilterChange,
  quotationList,
  handleDelete,
  totalPages,
  currentPage,
  handlePageChange
}) => {
  const navigate = useNavigate();

  const handleEdit = (id) => navigate(`/quotation/edit/${id}`);

  const columnHeader = [
    { key: 'qtnNo', value: 'Quotation No' },
    { key: 'qtnDate', value: 'Quotation Date' },
    { key: 'enqNo', value: 'Enquiry No' },
    { key: 'enqDate', value: 'Enquiry Date' },
    { key: 'companyName', value: 'Company Name' },
    { key: 'netAmount', value: 'Net Amount' },
    { key: 'totalAmount', value: 'Total Amount' },
    { key: 'action', value: 'Action' }
  ];

  return (
    <Box sx={{ p: 3, backgroundColor: '#fff', borderRadius: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Quotation List</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('add')}
        >
          New Quotation
        </Button>
      </Box>

      <Paper elevation={3}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columnHeader.map((col, idx) => (
                  <TableCell
                    key={idx}
                    align="center"
                    sx={{
                      fontWeight: 'bold',
                      backgroundColor: '#f5f5f5',
                      color: '#333',
                      cursor: ['qtnNo', 'enqNo', 'companyName'].includes(col.key) ? 'pointer' : 'default'
                    }}
                    onClick={() =>
                      ['qtnNo', 'enqNo', 'companyName'].includes(col.key) && handleSort(col.key)
                    }
                  >
                    {col.value}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                {columnHeader.map((col, idx) => (
                  <TableCell key={idx} align="center">
                    {['qtnNo', 'enqNo', 'companyName', 'netAmount', 'totalAmount'].includes(col.key) ? (
                      <TextField
                        variant="outlined"
                        size="small"
                        placeholder={`Search ${col.value}`}
                        value={filters[col.key] || ''}
                        onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        sx={{ width: '90%' }}
                      />
                    ) : ['enqDate', 'qtnDate'].includes(col.key) ? (
                      <TextField
                        type="date"
                        size="small"
                        value={filters[col.key] || ''}
                        onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        sx={{ width: '90%' }}
                      />
                    ) : null}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {quotationList.map((row, idx) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ backgroundColor: idx % 2 === 0 ? '#fafafa' : '#fff' }}
                >
                  <TableCell align="center" size='small'>{row.qtnNo}</TableCell>
                  <TableCell align="center" size='small'>{row.qtnDate}</TableCell>
                  <TableCell align="center" size='small'>{row.enqNo}</TableCell>
                  <TableCell align="center" size='small'>{row.enqDate}</TableCell>
                  <TableCell align="center" size='small'>{row.companyName || 'N/A'}</TableCell>
                  <TableCell align="center" size='small'>{row.netAmount || 'N/A'}</TableCell>
                  <TableCell align="center" size='small'>{row.totalAmount || 'N/A'}</TableCell>
                  <TableCell align="center" size='small'>
                    <IconButton onClick={() => handleEdit(row.id)} size="small">
                      <EditOutlined fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(row.id)} size="small" color="error">
                      <DeleteForever fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Box mt={3} display="flex" justifyContent="center">
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>
    </Box>
  );
};

export default QuotationList;