import React, { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { exportPriceList } from '../../services/inventoryService';

// Local-date ISO string. Deliberately not toISOString(), which converts to UTC and can
// roll the date back a day for users east of Greenwich.
const toLocalISO = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const defaultValidUntil = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return toLocalISO(date);
};

/**
 * Export options for a sales price list.
 *
 * Scope follows the grid: an explicit row selection wins, otherwise the active filter, otherwise
 * every priced item.
 */
const PriceListExportDialog = ({ open, onClose, selectedIds = [], filters = [], canExportInternal = false }) => {
    const [audience, setAudience] = useState('CUSTOMER');
    const [format, setFormat] = useState('PDF');
    const [validUntil, setValidUntil] = useState(defaultValidUntil);
    const [customerName, setCustomerName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const scope = useMemo(() => {
        if (selectedIds.length) {
            return { label: `${selectedIds.length} selected item${selectedIds.length > 1 ? 's' : ''}`, color: 'primary' };
        }
        if (filters.length) {
            return { label: `Current filter (${filters.length} condition${filters.length > 1 ? 's' : ''})`, color: 'info' };
        }
        return { label: 'All priced items', color: 'default' };
    }, [selectedIds, filters]);

    const isInternal = audience === 'INTERNAL';

    const handleClose = () => {
        if (submitting) return;
        setError(null);
        onClose();
    };

    const handleExport = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await exportPriceList({
                itemIds: selectedIds,
                filter: selectedIds.length
                    ? null
                    : { page: 0, size: 5000, filters: filters.map((f) => ({ field: f.field, operator: f.operator, value: f.value })) },
                format,
                audience,
                validUntil,
                customerName: customerName.trim() || undefined,
            });
            onClose();
        } catch (err) {
            const status = err?.response?.status;
            if (status === 403) {
                setError('You do not have permission to export an internal price list. Choose the customer copy instead.');
            } else {
                setError('Could not generate the price list. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <PictureAsPdfIcon fontSize="small" color="primary" />
                    <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                        Export Price List
                    </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Items to include: <Chip size="small" label={scope.label} color={scope.color} sx={{ ml: 0.5 }} />
                </Typography>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2.5}>
                    <FormControl>
                        <FormLabel sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>Audience</FormLabel>
                        <RadioGroup value={audience} onChange={(e) => setAudience(e.target.value)}>
                            <FormControlLabel
                                value="CUSTOMER"
                                control={<Radio size="small" />}
                                label={
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>Customer copy</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            List price and GST only — safe to send to a customer.
                                        </Typography>
                                    </Box>
                                }
                            />
                            <Tooltip
                                title={canExportInternal ? '' : 'Requires sales admin or administrator access'}
                                placement="right"
                            >
                                <span>
                                    <FormControlLabel
                                        value="INTERNAL"
                                        disabled={!canExportInternal}
                                        control={<Radio size="small" />}
                                        label={
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    Internal copy
                                                    {!canExportInternal && <LockIcon sx={{ fontSize: 14 }} color="disabled" />}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Adds cost, margin, floor price and maximum discount.
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </span>
                            </Tooltip>
                        </RadioGroup>
                    </FormControl>

                    {isInternal && (
                        <Alert severity="warning" sx={{ py: 0.5 }}>
                            Contains cost, margin and discount authority. Do not forward this file to customers.
                        </Alert>
                    )}

                    <Divider />

                    <FormControl>
                        <FormLabel sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>Format</FormLabel>
                        <RadioGroup row value={format} onChange={(e) => setFormat(e.target.value)}>
                            <FormControlLabel value="PDF" control={<Radio size="small" />} label="PDF" />
                            <FormControlLabel value="XLSX" control={<Radio size="small" />} label="Excel" />
                        </RadioGroup>
                    </FormControl>

                    <TextField
                        label="Prices valid until"
                        type="date"
                        size="small"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        helperText="Printed on the document as the quote validity deadline. Defaults to one week from today."
                        fullWidth
                    />

                    <TextField
                        label="Prepared for (optional)"
                        size="small"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer name"
                        fullWidth
                    />

                    {error && <Alert severity="error">{error}</Alert>}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={handleClose} disabled={submitting} color="inherit">Cancel</Button>
                <Button
                    onClick={handleExport}
                    variant="contained"
                    disabled={submitting || !validUntil}
                    startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                >
                    {submitting ? 'Generating…' : 'Export'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PriceListExportDialog;
