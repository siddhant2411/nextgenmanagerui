import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Box, Button, Grid, TextField, Typography, Paper, Divider,
    Snackbar, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
    Switch, FormControlLabel, Alert, Stack, Checkbox, FormGroup
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import apiService from '../../../services/apiService';
import { useNavigate, useParams } from 'react-router-dom';

const BORDER_COLOR = '#e5e7eb';
const DAYS_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const fieldSx = {
    "& .MuiInputBase-input": { fontSize: 13.5 },
    "& .MuiInputLabel-root": { fontSize: 13.5 },
    "& .MuiOutlinedInput-root": {
        borderRadius: 1.5,
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1565c0' },
    },
};

const SectionHeading = ({ children }) => (
    <Grid item xs={12}>
        <Box sx={{ mt: 2.5, mb: 1.5, pb: 0.75, borderBottom: `2px solid ${BORDER_COLOR}` }}>
            <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {children}
            </Typography>
        </Box>
    </Grid>
);

const HolidayCalendarForm = () => {
    const [calData, setCalData] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const formChanged = useRef(false);

    const { id } = useParams();
    const navigate = useNavigate();

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const fetchCalendar = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.get(`/production/calendar/${id}`);
            setCalData(data);
            setIsEditMode(true);
        } catch (error) {
            showSnackbar('Failed to fetch calendar', 'error');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchCalendar();
    }, [id, fetchCalendar]);

    const formik = useFormik({
        initialValues: {
            name: calData?.name || '',
            description: calData?.description || '',
            active: calData?.active ?? true,
            weeklyOffDays: calData?.weeklyOffDays || [],
        },
        enableReinitialize: true,
        validationSchema: Yup.object({
            name: Yup.string().trim().required('Calendar Name is required'),
        }),
        onSubmit: async (values, { setSubmitting }) => {
            try {
                const payload = { ...values, name: values.name.trim() };
                if (isEditMode) {
                    await apiService.put(`/production/calendar/${id}`, payload);
                } else {
                    await apiService.post('/production/calendar', payload);
                }
                showSnackbar('Calendar saved successfully');
                formChanged.current = false;
                navigate('/production/calendar');
            } catch (err) {
                const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to save calendar';
                showSnackbar(msg, 'error');
            } finally {
                setSubmitting(false);
            }
        },
    });

    useEffect(() => {
        const beforeUnload = (e) => {
            if (formChanged.current) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', beforeUnload);
        return () => window.removeEventListener('beforeunload', beforeUnload);
    }, []);

    const handleDayToggle = (day) => {
        const current = [...formik.values.weeklyOffDays];
        const index = current.indexOf(day);
        if (index === -1) current.push(day); else current.splice(index, 1);
        formik.setFieldValue('weeklyOffDays', current);
        formChanged.current = true;
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minHeight: '100%' }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 1.5, sm: 2, md: 2.5 },
                    maxWidth: 900,
                    margin: 'auto',
                    borderRadius: 2,
                    border: `1px solid ${BORDER_COLOR}`,
                }}
            >
                {/* Header */}
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    px={0.5}
                    pb={1}
                    flexDirection={{ xs: 'column', sm: 'row' }}
                    gap={1}
                >
                    <Box>
                        <Typography variant="h5" fontWeight={700} sx={{ color: '#0f2744', fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
                            {isEditMode ? 'Edit Holiday Calendar' : 'New Holiday Calendar'}
                        </Typography>
                        {isEditMode && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                {calData?.name}
                            </Typography>
                        )}
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                                if (formChanged.current) setShowLeaveDialog(true);
                                else navigate('/production/calendar');
                            }}
                            sx={{ textTransform: 'none', fontWeight: 500, borderColor: BORDER_COLOR, color: '#374151' }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={formik.handleSubmit}
                            disabled={formik.isSubmitting}
                            sx={{
                                textTransform: 'none', fontWeight: 600, px: 3, borderRadius: 1.5,
                                bgcolor: '#1565c0', boxShadow: '0 2px 8px rgba(21,101,192,0.25)',
                                '&:hover': { bgcolor: '#0d47a1' },
                            }}
                        >
                            {formik.isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
                        </Button>
                    </Stack>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {loading ? (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="20vh" gap={2}>
                        <CircularProgress size={32} sx={{ color: '#1565c0' }} />
                    </Box>
                ) : (
                    <form onSubmit={formik.handleSubmit} onChange={() => { formChanged.current = true; }}>
                        <Grid container spacing={2}>
                            <SectionHeading>Calendar Details</SectionHeading>
                            <Grid item xs={12} sm={6} md={4}>
                                <TextField fullWidth name="name" label="Calendar Name *" value={formik.values.name}
                                    onChange={formik.handleChange} onBlur={formik.handleBlur}
                                    error={formik.touched.name && Boolean(formik.errors.name)}
                                    helperText={formik.touched.name && formik.errors.name}
                                    size='small' sx={fieldSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formik.values.active}
                                            onChange={(e) => { formik.setFieldValue('active', e.target.checked); formChanged.current = true; }}
                                            color="primary"
                                        />
                                    }
                                    label={<Typography variant="body2">Active</Typography>}
                                    sx={{ mt: 0.5 }}
                                />
                            </Grid>

                            <SectionHeading>Description</SectionHeading>
                            <Grid item xs={12}>
                                <TextField fullWidth multiline rows={3} name="description" label="Description"
                                    value={formik.values.description} onChange={formik.handleChange}
                                    size='small' sx={fieldSx}
                                />
                            </Grid>

                            <SectionHeading>Weekly Off Days</SectionHeading>
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Select the days your factory / plant is closed every week. Common for Indian MSMEs: Sunday only, or Saturday + Sunday.
                                </Typography>
                                <FormGroup row>
                                    {DAYS_OF_WEEK.map(day => (
                                        <FormControlLabel
                                            key={day}
                                            control={
                                                <Checkbox
                                                    checked={formik.values.weeklyOffDays.includes(day)}
                                                    onChange={() => handleDayToggle(day)}
                                                    size="small"
                                                    sx={{ '&.Mui-checked': { color: '#1565c0' } }}
                                                />
                                            }
                                            label={
                                                <Typography variant="body2" fontWeight={formik.values.weeklyOffDays.includes(day) ? 600 : 400}>
                                                    {day.charAt(0) + day.slice(1).toLowerCase()}
                                                </Typography>
                                            }
                                            sx={{
                                                border: `1px solid ${formik.values.weeklyOffDays.includes(day) ? '#1565c0' : BORDER_COLOR}`,
                                                borderRadius: 1.5, px: 1, mr: 1, mb: 1,
                                                bgcolor: formik.values.weeklyOffDays.includes(day) ? '#e3f2fd' : 'transparent',
                                                transition: 'all 0.15s',
                                            }}
                                        />
                                    ))}
                                </FormGroup>
                            </Grid>
                        </Grid>
                    </form>
                )}
            </Paper>

            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ borderRadius: 1.5 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Dialog open={showLeaveDialog} onClose={() => setShowLeaveDialog(false)} PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Unsaved Changes</DialogTitle>
                <DialogContent><Typography variant="body2" color="text.secondary">Are you sure you want to leave? Your changes will be lost.</Typography></DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setShowLeaveDialog(false)} sx={{ textTransform: 'none', color: '#374151' }}>Stay</Button>
                    <Button onClick={() => navigate('/production/calendar')} variant="contained" sx={{ textTransform: 'none', bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}>Leave</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default HolidayCalendarForm;
