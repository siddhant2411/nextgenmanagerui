import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Paper, Dialog
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import apiService from '../../../services/apiService';
import AddEditItemCodeMapping from './AddEditItemCodeMapping';
import { ACTION_KEYS } from '../../../auth/roles';
import { useAuth } from '../../../auth/AuthContext';
import { resolveApiErrorMessage } from '../../../services/apiService';

const ItemCodeMappingList = () => {
  const [mappings, setMappings] = useState([]);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const { canAction } = useAuth();
  const canWriteItemCodeMapping = canAction(ACTION_KEYS.ITEM_CODE_MAPPING_WRITE);

  const fetchMappings = async () => {
    try {
      const data = await apiService.get('/item-code-mapping');
      setMappings(Array.isArray(data) ? data : []);
      setActionError("");
    } catch (error) {
      setMappings([]);
      setActionError(resolveApiErrorMessage(error, "Failed to load item code mappings."));
    }
  };

  useEffect(() => { fetchMappings(); }, []);

  const handleDelete = async (id) => {
    if (!canWriteItemCodeMapping) {
      return;
    }
    if (window.confirm('Delete this mapping?')) {
      try {
        await apiService.delete(`/item-code-mapping/${id}`);
        setActionError("");
        fetchMappings();
      } catch (error) {
        setActionError(resolveApiErrorMessage(error, "Failed to delete item code mapping."));
      }
    }
  };

  const handleEdit = (mapping) => {
    if (!canWriteItemCodeMapping) {
      return;
    }
    setSelectedMapping(mapping);
    setOpen(true);
  };

  const handleAdd = () => {
    if (!canWriteItemCodeMapping) {
      return;
    }
    setSelectedMapping(null);
    setOpen(true);
  };

  return (
    <Box p={3}>
      {actionError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      ) : null}
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Item Code Mappings</Typography>
        <Button
          startIcon={<Add />}
          variant="contained"
          onClick={handleAdd}
          disabled={!canWriteItemCodeMapping}
        >
          Add Mapping
        </Button>
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
                    <IconButton onClick={() => handleEdit(mapping)} disabled={!canWriteItemCodeMapping}><Edit /></IconButton>
                    <IconButton onClick={() => handleDelete(mapping.id)} disabled={!canWriteItemCodeMapping}><Delete /></IconButton>
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
          canWrite={canWriteItemCodeMapping}
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
