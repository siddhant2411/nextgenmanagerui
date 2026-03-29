import React from 'react';
import { Box } from '@mui/material';
import ProductionScheduleView from '../components/production/schedule/ProductionScheduleView';

export default function ProductionSchedulePage({ setSnackbar }) {
    return (
        <Box sx={{ width: '100%', overflowX: 'hidden' }}>
            <ProductionScheduleView setSnackbar={setSnackbar} />
        </Box>
    );
}
