import React, { useState, useEffect } from 'react';
import {
  Alert, Box, Button, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, TextField
} from '@mui/material';
import apiService from '../../../services/apiService';
import { resolveApiErrorMessage } from '../../../services/apiService';

const AddEditItemCodeMapping = ({ mapping, onClose, canWrite = false }) => {
  const [formData, setFormData] = useState({ category: '', keyword: '', code: '' });
  const [error, setError] = useState("");

  const categoryOptions = ['PRODUCT_TYPE', 'MODEL_CODE', 'GROUP'];

  useEffect(() => {
    if (mapping) setFormData(mapping);
  }, [mapping]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!canWrite) {
      return;
    }
    try {
      if (mapping) {
        await apiService.put(`/item-code-mapping/${mapping.id}`, formData);
      } else {
        await apiService.post('/item-code-mapping', formData);
      }
      setError("");
      onClose();
    } catch (error) {
      setError(resolveApiErrorMessage(error, "Error saving item code mapping."));
    }
  };

  return (
    <>
      <DialogTitle>{mapping ? 'Edit' : 'Add'} Item Code Mapping</DialogTitle>
      <DialogContent>
        {!canWrite ? (
          <Alert severity="warning" sx={{ mt: 1 }}>
            You are not authorized to modify item code mappings.
          </Alert>
        ) : null}
        {error ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        ) : null}
        <Box mt={1} display="flex" flexDirection="column" gap={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Category</InputLabel>
            <Select
              name="category"
              value={formData.category}
              onChange={handleChange}
              label="Category"
              required
              disabled={!canWrite}
            >
              {categoryOptions.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            name="keyword"
            label="Keyword"
            value={formData.keyword}
            onChange={handleChange}
            fullWidth
            size="small"
            required
            disabled={!canWrite}
          />

          <TextField
            name="code"
            label="Code"
            value={formData.code}
            onChange={handleChange}
            fullWidth
            size="small"
            required
            disabled={!canWrite}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!canWrite}>
          {mapping ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </>
  );
};

export default AddEditItemCodeMapping;
