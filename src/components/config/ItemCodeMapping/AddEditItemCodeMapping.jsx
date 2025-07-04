import React, { useState, useEffect } from 'react';
import {
  Box, Button, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, TextField
} from '@mui/material';
import apiService from '../../../services/apiService';

const AddEditItemCodeMapping = ({ mapping, onClose }) => {
  const [formData, setFormData] = useState({ category: '', keyword: '', code: '' });

  const categoryOptions = ['PRODUCT_TYPE', 'MODEL_CODE', 'GROUP'];

  useEffect(() => {
    if (mapping) setFormData(mapping);
  }, [mapping]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (mapping) {
        await apiService.put(`/item-code-mapping/${mapping.id}`, formData);
      } else {
        await apiService.post('/item-code-mapping', formData);
      }
      onClose();
    } catch (error) {
      console.error("Error saving mapping:", error);
    }
  };

  return (
    <>
      <DialogTitle>{mapping ? 'Edit' : 'Add'} Item Code Mapping</DialogTitle>
      <DialogContent>
        <Box mt={1} display="flex" flexDirection="column" gap={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Category</InputLabel>
            <Select name="category" value={formData.category} onChange={handleChange} label="Category" required>
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
          />

          <TextField
            name="code"
            label="Code"
            value={formData.code}
            onChange={handleChange}
            fullWidth
            size="small"
            required
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">{mapping ? 'Update' : 'Add'}</Button>
      </DialogActions>
    </>
  );
};

export default AddEditItemCodeMapping;
