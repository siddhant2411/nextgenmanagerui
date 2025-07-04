import React, { useEffect, useState } from 'react';
import {
  Box, Button, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Paper, Dialog
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import apiService from '../../../services/apiService';
import AddEditItemCodeMapping from './AddEditItemCodeMapping';

const ItemCodeMappingList = () => {
  const [mappings, setMappings] = useState([]);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [open, setOpen] = useState(false);

  const fetchMappings = async () => {
    const data = await apiService.get('/item-code-mapping');
    setMappings(data);
  };

  useEffect(() => { fetchMappings(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this mapping?')) {
      await apiService.delete(`/item-code-mapping/${id}`);
      fetchMappings();
    }
  };

  const handleEdit = (mapping) => {
    setSelectedMapping(mapping);
    setOpen(true);
  };

  const handleAdd = () => {
    setSelectedMapping(null);
    setOpen(true);
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Item Code Mappings</Typography>
        <Button startIcon={<Add />} variant="contained" onClick={handleAdd}>Add Mapping</Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Keyword</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>{mapping.category}</TableCell>
                  <TableCell>{mapping.keyword}</TableCell>
                  <TableCell>{mapping.code}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(mapping)}><Edit /></IconButton>
                    <IconButton onClick={() => handleDelete(mapping.id)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <AddEditItemCodeMapping
          mapping={selectedMapping}
          onClose={() => {
            setOpen(false);
            fetchMappings();
          }}
        />
      </Dialog>
    </Box>
  );
};

export default ItemCodeMappingList;
