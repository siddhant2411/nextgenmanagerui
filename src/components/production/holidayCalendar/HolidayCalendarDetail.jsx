import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Box, Button, Typography, Paper, CircularProgress, Grid,
    Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Switch, FormControlLabel, MenuItem,
    Select, FormControl, InputLabel, Snackbar, Alert, Divider,
    FormGroup, Checkbox, Stack
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../../services/apiService';
import { ChevronLeft, ChevronRight, Delete, Edit, ArrowBack } from '@mui/icons-material';
import { useAuth } from '../../../auth/AuthContext';
import { PRODUCTION_MANAGE_ROLES } from '../../../auth/roles';

const BORDER_COLOR = '#e5e7eb';
const HEADER_BG = '#0f2744';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_OF_WEEK_FULL = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const formatDateISO = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const getMonthDays = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfWeek = (year, month) => new Date(year, month, 1).getDay();

const LEGEND = [
    { color: '#e3f2fd', border: '#1565c0', label: 'Today' },
    { color: '#c8e6c9', border: '#388e3c', label: 'Holiday' },
    { color: '#f3e5f5', border: '#7b1fa2', label: 'Override (Working)' },
    { color: '#ffebee', border: '#c62828', label: 'Override (Off)' },
    { color: '#f5f5f5', border: '#bdbdbd', label: 'Weekly Off' },
];

const HolidayCalendarDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasAnyRole } = useAuth();
    const canManage = hasAnyRole(PRODUCTION_MANAGE_ROLES);

    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());

    const [calendar, setCalendar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [holidays, setHolidays] = useState([]);
    const [overrides, setOverrides] = useState([]);


    const [openHolidayForm, setOpenHolidayForm] = useState(false);
    const [holidayForm, setHolidayForm] = useState({ name: '', holidayDate: '', fullDay: true, startTime: '', endTime: '' });

    const [openOverrideForm, setOpenOverrideForm] = useState(false);
    const [overrideForm, setOverrideForm] = useState({ overrideDate: '', overrideType: 'WORKING', reason: '' });

    const [editCalendarForm, setEditCalendarForm] = useState({ name: '', description: '', active: true, weeklyOffDays: [] });
    const [openEditDialog, setOpenEditDialog] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState({ open: false, type: '', id: null, name: '' });
    const [saving, setSaving] = useState(false);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

    const fetchCalendar = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.get(`/production/calendar/${id}`);
            setCalendar(data);
            setHolidays(data.holidays || []);
            setOverrides(data.overrides || []);
            setEditCalendarForm({
                name: data.name || '',
                description: data.description || '',
                active: data.active ?? true,
                weeklyOffDays: data.weeklyOffDays || [],
            });
        } catch (error) {
            showSnackbar('Failed to fetch calendar details', 'error');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

    const prevMonth = () => {
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
        else setCurrentMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
        else setCurrentMonth(m => m + 1);
    };

    // Build a lookup map for the visible month
    const holidayMap = useMemo(() => {
        const map = {};
        (holidays || []).forEach(h => { map[h.holidayDate] = h; });
        return map;
    }, [holidays]);

    const overrideMap = useMemo(() => {
        const map = {};
        (overrides || []).forEach(o => { map[o.overrideDate] = o; });
        return map;
    }, [overrides]);

    const weeklyOffSet = useMemo(() =>
        new Set((calendar?.weeklyOffDays || []).map(d => DAYS_OF_WEEK_FULL.indexOf(d))),
        [calendar?.weeklyOffDays]
    );

    const getDayInfo = (dateStr, dayOfWeek) => {
        const isToday = dateStr === formatDateISO(today.getFullYear(), today.getMonth(), today.getDate());
        const isHoliday = !!holidayMap[dateStr];
        const override = overrideMap[dateStr];
        const isWeeklyOff = weeklyOffSet.has(dayOfWeek);
        return { isToday, isHoliday, override, isWeeklyOff };
    };

    const getDayCellStyle = (info) => {
        if (info.override) {
            return info.override.overrideType === 'WORKING'
                ? { bgcolor: '#f3e5f5', border: '2px solid #7b1fa2' }
                : { bgcolor: '#ffebee', border: '2px solid #c62828' };
        }
        if (info.isHoliday) return { bgcolor: '#c8e6c9', border: '2px solid #388e3c' };
        if (info.isToday) return { bgcolor: '#e3f2fd', border: '2px solid #1565c0' };
        if (info.isWeeklyOff) return { bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' };
        return { bgcolor: '#fff', border: `1px solid ${BORDER_COLOR}` };
    };

    const getDayTooltip = (dateStr, info) => {
        const parts = [];
        if (info.isToday) parts.push('Today');
        if (info.isHoliday) parts.push(`Holiday: ${holidayMap[dateStr].name}`);
        if (info.override) parts.push(`Override: ${info.override.overrideType}${info.override.reason ? ' — ' + info.override.reason : ''}`);
        if (info.isWeeklyOff) parts.push('Weekly Off');
        return parts.join('\n');
    };

    // NOTE: Public holiday import can be added later when backend supports
    // e.g. apiService.post(`/production/calendar/${id}/import-public-holidays?year=${year}&country=IN`)

    // Holiday Handlers
    const addHoliday = async () => {
        if (!holidayForm.name?.trim()) { showSnackbar('Holiday name is required', 'error'); return; }
        if (!holidayForm.holidayDate) { showSnackbar('Holiday date is required', 'error'); return; }
        if (!holidayForm.fullDay) {
            if (!holidayForm.startTime || !holidayForm.endTime) {
                showSnackbar('Start time and end time are required for half-day holidays', 'error');
                return;
            }
            if (holidayForm.startTime >= holidayForm.endTime) {
                showSnackbar('End time must be after start time', 'error');
                return;
            }
        }
        if (saving) return;
        setSaving(true);
        try {
            const payload = { ...holidayForm, name: holidayForm.name.trim() };
            if (payload.fullDay) { delete payload.startTime; delete payload.endTime; }
            await apiService.post(`/production/calendar/${id}/holidays`, payload);
            showSnackbar('Holiday added successfully');
            setOpenHolidayForm(false);
            setHolidayForm({ name: '', holidayDate: '', fullDay: true, startTime: '', endTime: '' });
            fetchCalendar();
        } catch (error) {
            const msg = error?.response?.data?.error || error?.response?.data?.message || 'Failed to add holiday';
            showSnackbar(msg, 'error');
        } finally { setSaving(false); }
    };

    const deleteHoliday = async (holidayId) => {
        if (saving) return;
        setSaving(true);
        try {
            await apiService.delete(`/production/calendar/${id}/holidays/${holidayId}`);
            showSnackbar('Holiday deleted');
            fetchCalendar();
        } catch (err) {
            showSnackbar('Failed to delete holiday', 'error');
        } finally { setSaving(false); }
    };

    // Override Handlers
    const addOverride = async () => {
        if (!overrideForm.overrideDate) { showSnackbar('Override date is required', 'error'); return; }
        if (!overrideForm.overrideType) { showSnackbar('Override type is required', 'error'); return; }
        if (saving) return;
        setSaving(true);
        try {
            await apiService.post(`/production/calendar/${id}/overrides`, overrideForm);
            showSnackbar('Override added successfully');
            setOpenOverrideForm(false);
            setOverrideForm({ overrideDate: '', overrideType: 'WORKING', reason: '' });
            fetchCalendar();
        } catch (error) {
            const msg = error?.response?.data?.error || error?.response?.data?.message || 'Failed to add override';
            showSnackbar(msg, 'error');
        } finally { setSaving(false); }
    };

    const deleteOverride = async (overrideId) => {
        if (saving) return;
        setSaving(true);
        try {
            await apiService.delete(`/production/calendar/${id}/overrides/${overrideId}`);
            showSnackbar('Override deleted');
            fetchCalendar();
        } catch (err) {
            showSnackbar('Failed to delete override', 'error');
        } finally { setSaving(false); }
    };

    // Confirmation handler for deletes
    const handleConfirmDelete = async () => {
        if (confirmDelete.type === 'holiday') {
            await deleteHoliday(confirmDelete.id);
        } else if (confirmDelete.type === 'override') {
            await deleteOverride(confirmDelete.id);
        }
        setConfirmDelete({ open: false, type: '', id: null, name: '' });
    };

    // Update calendar settings
    const saveCalendarSettings = async () => {
        if (!editCalendarForm.name?.trim()) { showSnackbar('Calendar name is required', 'error'); return; }
        if (saving) return;
        setSaving(true);
        try {
            await apiService.put(`/production/calendar/${id}`, { ...editCalendarForm, name: editCalendarForm.name.trim() });
            showSnackbar('Calendar updated');
            setOpenEditDialog(false);
            fetchCalendar();
        } catch (err) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to update calendar';
            showSnackbar(msg, 'error');
        } finally { setSaving(false); }
    };

    const handleDayChange = (day) => {
        const currentDays = [...editCalendarForm.weeklyOffDays];
        const index = currentDays.indexOf(day);
        if (index === -1) currentDays.push(day); else currentDays.splice(index, 1);
        setEditCalendarForm(prev => ({ ...prev, weeklyOffDays: currentDays }));
    };

    if (loading) return (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh" gap={2}>
            <CircularProgress size={32} sx={{ color: '#1565c0' }} />
            <Typography variant="body2" color="text.secondary">Loading calendar...</Typography>
        </Box>
    );

    if (!calendar) return <Typography sx={{ p: 3 }}>Calendar not found</Typography>;

    const daysInMonth = getMonthDays(currentYear, currentMonth);
    const firstDay = getFirstDayOfWeek(currentYear, currentMonth);

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: 2, border: `1px solid ${BORDER_COLOR}` }}>

                {/* Page Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconButton onClick={() => navigate('/production/calendar')} size="small" sx={{ color: '#1565c0' }}>
                            <ArrowBack fontSize="small" />
                        </IconButton>
                        <Box>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="h5" fontWeight={700} sx={{ color: '#0f2744', fontSize: { xs: '1.2rem', md: '1.4rem' } }}>
                                    {calendar.name}
                                </Typography>
                                <Chip
                                    label={calendar.active ? 'Active' : 'Inactive'}
                                    size="small"
                                    sx={{
                                        backgroundColor: calendar.active ? '#e8f5e9' : '#f5f5f5',
                                        color: calendar.active ? '#2e7d32' : '#757575',
                                        fontWeight: 500, fontSize: '0.7rem', height: 22,
                                    }}
                                />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                {calendar.description || 'Manufacturing calendar'} · Weekly off: {calendar.weeklyOffDays?.map(d => d.substring(0, 3)).join(', ') || 'None'}
                            </Typography>
                        </Box>
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {canManage && (
                            <>
                                <Button size="small" variant="outlined" startIcon={<Edit />}
                                    onClick={() => setOpenEditDialog(true)}
                                    sx={{ textTransform: 'none', fontWeight: 500, borderColor: BORDER_COLOR, color: '#374151' }}>
                                    Settings
                                </Button>
                                <Button size="small" variant="outlined"
                                    onClick={() => { setHolidayForm({ ...holidayForm, holidayDate: '' }); setOpenHolidayForm(true); }}
                                    sx={{ textTransform: 'none', fontWeight: 500, borderColor: '#388e3c', color: '#388e3c' }}>
                                    + Holiday
                                </Button>
                                <Button size="small" variant="outlined"
                                    onClick={() => { setOverrideForm({ ...overrideForm, overrideDate: '' }); setOpenOverrideForm(true); }}
                                    sx={{ textTransform: 'none', fontWeight: 500, borderColor: '#7b1fa2', color: '#7b1fa2' }}>
                                    + Override
                                </Button>
                                {/* TODO: Public holiday import button — enable when backend API is ready */}
                            </>
                        )}
                    </Stack>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Legend */}
                <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
                    {LEGEND.map(l => (
                        <Box key={l.label} display="flex" alignItems="center" gap={0.5}>
                            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: l.color, border: `2px solid ${l.border}` }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{l.label}</Typography>
                        </Box>
                    ))}
                </Box>

                {/* Month Navigation */}
                <Box display="flex" justifyContent="center" alignItems="center" gap={2} mb={2}>
                    <IconButton onClick={prevMonth} size="small" sx={{ color: '#1565c0' }}><ChevronLeft /></IconButton>
                    <Typography variant="h6" fontWeight={600} sx={{ color: '#0f2744', minWidth: 180, textAlign: 'center' }}>
                        {MONTH_NAMES[currentMonth]} {currentYear}
                    </Typography>
                    <IconButton onClick={nextMonth} size="small" sx={{ color: '#1565c0' }}><ChevronRight /></IconButton>
                </Box>

                {/* Calendar Grid */}
                <Box sx={{ overflowX: 'auto' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, minWidth: { xs: 350, sm: 'auto' } }}>
                        {/* Day headers */}
                        {DAY_NAMES.map((dayName, i) => (
                            <Box key={dayName} sx={{
                                py: 1, textAlign: 'center', bgcolor: HEADER_BG, color: '#fff',
                                fontWeight: 600, fontSize: '0.75rem', borderRadius: 0.5,
                                ...(weeklyOffSet.has(i) ? { opacity: 0.7 } : {}),
                            }}>
                                {dayName}
                            </Box>
                        ))}

                        {/* Empty cells for the first week */}
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <Box key={`empty-${i}`} sx={{ minHeight: { xs: 48, sm: 72, md: 88 }, border: `1px solid transparent` }} />
                        ))}

                        {/* Day cells */}
                        {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                            const dayNum = dayIdx + 1;
                            const dayOfWeek = (firstDay + dayIdx) % 7;
                            const dateStr = formatDateISO(currentYear, currentMonth, dayNum);
                            const info = getDayInfo(dateStr, dayOfWeek);
                            const cellStyle = getDayCellStyle(info);
                            const tooltip = getDayTooltip(dateStr, info);

                            return (
                                <Tooltip key={dayNum} title={<span style={{ whiteSpace: 'pre-line', fontSize: 12 }}>{tooltip || `${dayNum} ${MONTH_NAMES[currentMonth]}`}</span>} arrow placement="top">
                                    <Box
                                        sx={{
                                            minHeight: { xs: 48, sm: 72, md: 88 },
                                            p: 0.5,
                                            borderRadius: 1,
                                            transition: 'all 0.15s',
                                            '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
                                            display: 'flex', flexDirection: 'column',
                                            ...cellStyle,
                                        }}
                                    >
                                        <Typography variant="body2" fontWeight={info.isToday ? 700 : 500} sx={{
                                            fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                                            color: info.isToday ? '#1565c0' : info.isWeeklyOff ? '#9e9e9e' : '#0f2744',
                                        }}>
                                            {dayNum}
                                        </Typography>
                                        {/* Labels */}
                                        <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                            {info.isHoliday && (
                                                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#388e3c', fontWeight: 600, lineHeight: 1.1, display: { xs: 'none', sm: 'block' } }}>
                                                    {holidayMap[dateStr]?.name?.substring(0, 14)}
                                                </Typography>
                                            )}
                                            {info.override && (
                                                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: info.override.overrideType === 'WORKING' ? '#7b1fa2' : '#c62828', fontWeight: 600, lineHeight: 1.1, display: { xs: 'none', sm: 'block' } }}>
                                                    {info.override.overrideType}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </Tooltip>
                            );
                        })}
                    </Box>
                </Box>

                {/* Upcoming events sidebar */}
                <Box sx={{ mt: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                                <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1 }}>
                                    Holidays ({holidays.length})
                                </Typography>
                                {holidays.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" fontSize="0.8rem">No holidays configured</Typography>
                                ) : (
                                    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                        {holidays.map(h => (
                                            <Box key={h.id} display="flex" justifyContent="space-between" alignItems="center"
                                                sx={{ py: 0.5, borderBottom: `1px solid ${BORDER_COLOR}`, '&:last-child': { borderBottom: 'none' } }}>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={500} fontSize="0.8rem">{h.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{h.holidayDate} {h.fullDay ? '(Full Day)' : `${h.startTime}-${h.endTime}`}</Typography>
                                                </Box>
                                                {canManage && (
                                                    <IconButton size="small" onClick={() => setConfirmDelete({ open: true, type: 'holiday', id: h.id, name: h.name })} sx={{ color: '#d32f2f' }}>
                                                        <Delete sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                                <Typography variant="subtitle2" fontWeight={600} color="#0f2744" sx={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1 }}>
                                    Date Overrides ({overrides.length})
                                </Typography>
                                {overrides.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" fontSize="0.8rem">No overrides configured</Typography>
                                ) : (
                                    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                                        {overrides.map(o => (
                                            <Box key={o.id} display="flex" justifyContent="space-between" alignItems="center"
                                                sx={{ py: 0.5, borderBottom: `1px solid ${BORDER_COLOR}`, '&:last-child': { borderBottom: 'none' } }}>
                                                <Box>
                                                    <Chip label={o.overrideType} size="small" sx={{
                                                        backgroundColor: o.overrideType === 'WORKING' ? '#f3e5f5' : '#ffebee',
                                                        color: o.overrideType === 'WORKING' ? '#7b1fa2' : '#c62828',
                                                        fontWeight: 500, fontSize: '0.65rem', height: 20, mr: 0.5,
                                                    }} />
                                                    <Typography variant="caption" color="text.secondary">{o.overrideDate} {o.reason ? `· ${o.reason}` : ''}</Typography>
                                                </Box>
                                                {canManage && (
                                                    <IconButton size="small" onClick={() => setConfirmDelete({ open: true, type: 'override', id: o.id, name: o.overrideDate })} sx={{ color: '#d32f2f' }}>
                                                        <Delete sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            </Paper >

            {/* Holiday Dialog */}
            < Dialog open={openHolidayForm} onClose={() => setOpenHolidayForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Add Company Holiday</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth type="date" label="Holiday Date" InputLabelProps={{ shrink: true }}
                                value={holidayForm.holidayDate} onChange={e => setHolidayForm({ ...holidayForm, holidayDate: e.target.value })} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Holiday Name" value={holidayForm.name}
                                onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })} size="small" />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={<Switch checked={holidayForm.fullDay} onChange={e => setHolidayForm({ ...holidayForm, fullDay: e.target.checked })} />}
                                label={<Typography variant="body2">Full Day Holiday</Typography>}
                            />
                        </Grid>
                        {!holidayForm.fullDay && (
                            <>
                                <Grid item xs={6}>
                                    <TextField fullWidth type="time" label="Start Time" InputLabelProps={{ shrink: true }}
                                        value={holidayForm.startTime} onChange={e => setHolidayForm({ ...holidayForm, startTime: e.target.value })} size="small" />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField fullWidth type="time" label="End Time" InputLabelProps={{ shrink: true }}
                                        value={holidayForm.endTime} onChange={e => setHolidayForm({ ...holidayForm, endTime: e.target.value })} size="small" />
                                </Grid>
                            </>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpenHolidayForm(false)} disabled={saving} sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
                    <Button onClick={addHoliday} variant="contained" disabled={saving} sx={{ textTransform: 'none', bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>{saving ? 'Saving...' : 'Save'}</Button>
                </DialogActions>
            </Dialog >

            {/* Override Dialog */}
            < Dialog open={openOverrideForm} onClose={() => setOpenOverrideForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Add Date Override</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth type="date" label="Override Date" InputLabelProps={{ shrink: true }}
                                value={overrideForm.overrideDate} onChange={e => setOverrideForm({ ...overrideForm, overrideDate: e.target.value })} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Type</InputLabel>
                                <Select label="Type" value={overrideForm.overrideType} onChange={e => setOverrideForm({ ...overrideForm, overrideType: e.target.value })}>
                                    <MenuItem value="WORKING">WORKING (Make a holiday a working day)</MenuItem>
                                    <MenuItem value="OFF">OFF (Make a working day a holiday)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Reason" value={overrideForm.reason}
                                onChange={e => setOverrideForm({ ...overrideForm, reason: e.target.value })} size="small" />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpenOverrideForm(false)} disabled={saving} sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
                    <Button onClick={addOverride} variant="contained" disabled={saving} sx={{ textTransform: 'none', bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>{saving ? 'Saving...' : 'Save'}</Button>
                </DialogActions>
            </Dialog >

            {/* Edit Calendar Settings Dialog */}
            < Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Calendar Settings</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Calendar Name" value={editCalendarForm.name}
                                onChange={e => setEditCalendarForm({ ...editCalendarForm, name: e.target.value })} size="small" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={<Switch checked={editCalendarForm.active} onChange={e => setEditCalendarForm({ ...editCalendarForm, active: e.target.checked })} />}
                                label={<Typography variant="body2">Active</Typography>}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={2} label="Description" value={editCalendarForm.description}
                                onChange={e => setEditCalendarForm({ ...editCalendarForm, description: e.target.value })} size="small" />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Weekly Off Days</Typography>
                            <FormGroup row>
                                {DAYS_OF_WEEK_FULL.map(day => (
                                    <FormControlLabel key={day}
                                        control={<Checkbox checked={editCalendarForm.weeklyOffDays.includes(day)} onChange={() => handleDayChange(day)} size="small" />}
                                        label={<Typography variant="body2">{day.substring(0, 3)}</Typography>}
                                    />
                                ))}
                            </FormGroup>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpenEditDialog(false)} disabled={saving} sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
                    <Button onClick={saveCalendarSettings} variant="contained" disabled={saving} sx={{ textTransform: 'none', bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}>{saving ? 'Saving...' : 'Save'}</Button>
                </DialogActions>
            </Dialog >


            {/* Confirm Delete Dialog */}
            <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, type: '', id: null, name: '' })} PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontWeight: 600, color: '#0f2744' }}>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Are you sure you want to delete {confirmDelete.type === 'holiday' ? 'holiday' : 'override'} <strong>{confirmDelete.name}</strong>? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmDelete({ open: false, type: '', id: null, name: '' })} disabled={saving} sx={{ textTransform: 'none', color: '#374151' }}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} variant="contained" disabled={saving}
                        sx={{ textTransform: 'none', bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}>
                        {saving ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 1.5 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box >
    );
};

export default HolidayCalendarDetail;
