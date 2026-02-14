import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, IconButton, Typography, TablePagination, Box
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { inventoryItemSearch } from '../../services/commonAPI';

const InventoryItemList = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchItems = async (query) => {
    try {
      const res = await inventoryItemSearch(query);
      setItems(res);
    } catch (err) {
      console.error('Failed to fetch inventory items', err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(filter.toLowerCase()) ||
    item.itemCode.toLowerCase().includes(filter.toLowerCase())
  );

  const pagedItems = filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ padding: 2, width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden" }}>
      <Typography variant="h6" gutterBottom>Inventory Items</Typography>
      <TextField
        label="Search by name or code"
        variant="outlined"
        fullWidth
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <TableContainer component={Paper} sx={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
        <Table sx={{ minWidth: 840, width: "max-content" }}>
          <TableHead>
            <TableRow>
              <TableCell>Item Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>HSN Code</TableCell>
              <TableCell>UOM</TableCell>
              <TableCell>Item Type</TableCell>
              <TableCell>Available Qty</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedItems.map(item => (
              <TableRow key={item.inventoryItemId}>
                <TableCell>{item.itemCode}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.hsnCode}</TableCell>
                <TableCell>{item.uom}</TableCell>
                <TableCell>{item.itemType}</TableCell>
                <TableCell>{item.availableQuantity}</TableCell>
                <TableCell>
                  <IconButton><VisibilityIcon /></IconButton>
                  <IconButton><EditIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filteredItems.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Box>
  );
};

export default InventoryItemList;
