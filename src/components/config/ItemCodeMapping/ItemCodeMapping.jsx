import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import ItemCodeMappingList from './ItemCodeMappingList';

const ItemCodeMapping = () => {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Item Code Mapping Configuration
      </Typography>
      <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
        <ItemCodeMappingList />
      </Paper>
    </Box>
  );
};

export default ItemCodeMapping;
