import React, { useRef, useEffect } from 'react';
import {
  Box, Button, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow,
  TextField, Paper, Typography, Collapse
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useNavigate } from 'react-router-dom';
import './style/InventoryItem.css';

const InventoryItemList = ({
  inventoryItems,
  setInventoryItems,
  currentPage,
  totalPages,
  onPageChange,
  onSortChange,
  sortBy,
  sortDir,
  onDeleteItem,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  fetchInventoryItems,
  loading,
  error,
  handleAddNewItemClick
}) => {
  const navigate = useNavigate();
  const debounceTimeout = useRef(null);
  const [openRow, setOpenRow] = React.useState(null);

  const columnMapping = {
    itemCode: 'Item Code',
    name: 'Name',
    uom: 'UOM',
    itemType: 'Type',
    purchased: 'Purchased',
    manufactured: 'Manufactured'
  };

  const visibleColumns = ['itemCode', 'name', 'uom', 'itemType', 'purchased', 'manufactured'];

  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchInventoryItems(1, sortBy, sortDir, query);
    }, 600);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') onSearchSubmit();
  };

  const handleEditClick = (id) => navigate(`/inventory-item/edit/${id}`);
  const handleDeleteClick = (id) => window.confirm('Delete this item?') && onDeleteItem(id);

  useEffect(() => {
    return () => debounceTimeout.current && clearTimeout(debounceTimeout.current);
  }, []);

  const handleRowToggle = (id) => {
    setOpenRow(openRow === id ? null : id);
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#fff', borderRadius: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <TextField
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyPress={handleKeyPress}
          placeholder="Search inventory items"
          size="small"
          variant="outlined"
          InputProps={{ endAdornment: <SearchIcon /> }}
          sx={{ width: '40%' }}
        />

        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleAddNewItemClick}
        >
          Add New Item
        </Button>
      </Box>

      {error && <Typography color="error">{error}</Typography>}
      {loading ? (
        <Typography variant="body1">Loading...</Typography>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {visibleColumns.map((col) => (
                    <TableCell
                      key={col}
                      onClick={() => onSortChange(col)}
                      sx={{ cursor: 'pointer' }}
                    >
                      {columnMapping[col] || col} {sortBy === col && (sortDir === 'asc' ? '↑' : '↓')}
                    </TableCell>
                  ))}
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventoryItems.map((item) => (
                  <React.Fragment key={item.inventoryItemId}>
                    <TableRow>
                      {visibleColumns.map((col) => (
                        <TableCell key={col}>{item[col]?.toString()}</TableCell>
                      ))}
                      <TableCell>
                        <IconButton onClick={() => handleEditClick(item.inventoryItemId)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteClick(item.inventoryItemId)} size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalPages * 5} // assuming 5 per page
            page={currentPage - 1}
            onPageChange={(e, page) => onPageChange(page + 1)}
            rowsPerPage={5}
            rowsPerPageOptions={[5]}
          />
        </Paper>
      )}
    </Box>
  );
};

export default InventoryItemList;
