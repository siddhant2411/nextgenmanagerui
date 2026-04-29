import React, { useEffect, useState, useRef } from 'react';
import {
    Box, Button, IconButton, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography, TextField,
    InputAdornment, TablePagination, Tooltip, Chip, CircularProgress,
    Stack, Fade
} from '@mui/material';
import { Search, MoveToInbox, Visibility, History as HistoryIcon, Assessment } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { searchInventoryItems } from '../../services/inventoryService';
import { useAuth } from '../../auth/AuthContext';
import { ACTION_KEYS } from '../../auth/roles';

const HEADER_BG = '#f8fafc';
const BORDER_COLOR = '#e5e7eb';

const itemTypeMapping = {
    FINISHED_GOOD: { label: 'Finished Good', color: '#e8f5e9', textColor: '#2e7d32' },
    RAW_MATERIAL: { label: 'Raw Material', color: '#fff3e0', textColor: '#e65100' },
    SEMI_FINISHED: { label: 'Semi-Finished', color: '#e3f2fd', textColor: '#1565c0' },
    SUB_CONTRACTED: { label: 'Sub-Contracted', color: '#f3e5f5', textColor: '#6a1b9a' },
    CONSUMABLE: { label: 'Consumable', color: '#e0f2f1', textColor: '#00796b' },
};

const headerCellSx = {
    background: HEADER_BG,
    color: '#475569',
    fontWeight: 700,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    py: 1.5,
    borderBottom: `2px solid ${BORDER_COLOR}`,
};

const getSettings = (item) => item?.productInventorySettings || {};
const getAvailableQty = (item) => item?.availableQuantity ?? getSettings(item)?.availableQuantity ?? 0;
const getReservedQty = (item) => item?.reservedQuantity ?? getSettings(item)?.reservedQuantity ?? 0;
const getMinStock = (item) => item?.minStock ?? getSettings(item)?.minStock ?? 0;

const InventoryItemPage = ({ onReceiveStock, refreshKey }) => {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const navigate = useNavigate();
    const { canAction } = useAuth();
    const canManageInventory = canAction(ACTION_KEYS.INVENTORY_APPROVAL_WRITE);
    const debounceTimeout = useRef(null);

    const fetchItems = async (query = search, pageNumber = page) => {
        setLoading(true);
        try {
            const params = { page: pageNumber, size: rowsPerPage, sortBy: "availableQuantity", sortDir: "desc", query };
            const res = await searchInventoryItems(params);
            setItems(res.content || []);
            setTotalItems(res.totalElements || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchItems(); 
    }, [page, rowsPerPage, refreshKey]);

    const handleSearchChange = (event) => {
        const query = event.target.value;
        setSearch(query);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => { 
            setPage(0); 
            fetchItems(query, 0); 
        }, 400);
    };

    const renderTypeChip = (type) => {
        const info = itemTypeMapping[type];
        if (!info) return <Chip label={type || 'Unknown'} size="small" variant="outlined" />;
        return (
            <Chip
                label={info.label}
                size="small"
                sx={{ backgroundColor: info.color, color: info.textColor, fontWeight: 600, fontSize: '0.7rem', height: 22 }}
            />
        );
    };

    const renderSourceChips = (item) => {
        const settings = getSettings(item);
        const purchased = item.purchased ?? settings.purchased;
        const manufactured = item.manufactured ?? settings.manufactured;
        return (
            <Stack direction="row" spacing={0.5} justifyContent="center">
                {purchased && <Chip label="Buy" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#f1f5f9', color: '#475569', fontWeight: 700 }} />}
                {manufactured && <Chip label="Make" size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#f1f5f9', color: '#475569', fontWeight: 700 }} />}
            </Stack>
        );
    };

    const renderTrackingBadge = (item) => {
        const settings = getSettings(item);
        const isSerial = settings.serialTracked || item.serialTracked;
        const isBatch = settings.batchTracked || item.batchTracked;
        
        if (isSerial) return <Chip label="Serial" size="small" sx={{ height: 22, bgcolor: '#f5f3ff', color: '#6d28d9', fontWeight: 700, border: '1px solid #ddd6fe' }} />;
        if (isBatch) return <Chip label="Batch" size="small" sx={{ height: 22, bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, border: '1px solid #dbeafe' }} />;
        return <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>Quantity Only</Typography>;
    };

    return (
        <Fade in={true} timeout={400}>
            <Box>
                <Paper
                    elevation={0}
                    sx={{
                        p: 3,
                        borderRadius: 3,
                        border: `1px solid ${BORDER_COLOR}`,
                        bgcolor: '#fff'
                    }}
                >
                    <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3} gap={2} flexWrap="wrap">
                        <Box>
                            <Typography variant="h5" fontWeight={800} sx={{ color: '#0f172a' }}>
                                Stock Register
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Monitor live availability and inventory settings across all SKUs
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <TextField
                                value={search}
                                onChange={handleSearchChange}
                                placeholder="Search by code or name..."
                                size="small"
                                InputProps={{
                                    startAdornment: <Search sx={{ color: '#64748b', fontSize: 18, mr: 0.5 }} />,
                                }}
                                sx={{
                                    width: 280,
                                    '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' }
                                }}
                            />
                            <Button 
                                variant="outlined" 
                                startIcon={<Assessment />}
                                onClick={() => navigate('/inventory-item/transactions')}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, color: '#475569', borderColor: '#e2e8f0' }}
                            >
                                Logs
                            </Button>
                        </Stack>
                    </Box>

                    <TableContainer sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={headerCellSx}>Item Detail</TableCell>
                                    <TableCell align="center" sx={headerCellSx}>Logic</TableCell>
                                    <TableCell align="center" sx={headerCellSx}>Tracking</TableCell>
                                    <TableCell align="center" sx={headerCellSx}>UOM</TableCell>
                                    <TableCell align="right" sx={headerCellSx}>Min / Max</TableCell>
                                    <TableCell align="right" sx={headerCellSx}>Available / Reserved</TableCell>
                                    <TableCell align="right" sx={headerCellSx}>Unit Cost</TableCell>
                                    <TableCell align="center" sx={headerCellSx}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 10 }}><CircularProgress size={30} /></TableCell></TableRow>
                                ) : items.map((item) => {
                                    const settings = getSettings(item);
                                    const available = Number(getAvailableQty(item) || 0);
                                    const reserved = Number(getReservedQty(item) || 0);
                                    const min = Number(getMinStock(item) || 0);
                                    const max = Number(settings.maxStock || 0);
                                    const isNegative = available < 0;
                                    const isLow = !isNegative && available <= min && min > 0;
                                    
                                    return (
                                        <TableRow key={item.inventoryItemId} hover sx={{ '&:hover': { bgcolor: '#f9fafb !important' } }}>
                                            <TableCell sx={{ py: 1.5 }}>
                                                <Typography variant="body2" fontWeight={700} color="primary.main">{item.itemCode}</Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>{item.name}</Typography>
                                                <Box mt={0.5}>{renderTypeChip(item.itemType)}</Box>
                                            </TableCell>
                                            <TableCell align="center">{renderSourceChips(item)}</TableCell>
                                            <TableCell align="center">{renderTrackingBadge(item)}</TableCell>
                                            <TableCell align="center"><Typography variant="body2" fontWeight={600}>{item.uom}</Typography></TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={500}>{min} / {max || '-'}</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack spacing={0.5} alignItems="flex-end">
                                                    <Tooltip title="Available (free to use)" arrow placement="left">
                                                        <Typography variant="body2" fontWeight={800} color={isNegative ? 'error.main' : isLow ? 'warning.main' : 'success.main'}>
                                                            {available.toFixed(item.uom === 'PCS' ? 0 : 2)}
                                                        </Typography>
                                                    </Tooltip>
                                                    {reserved > 0 && (
                                                        <Tooltip title="Reserved for active WOs / SOs" arrow placement="left">
                                                            <Typography variant="caption" fontWeight={600} sx={{ color: '#283593' }}>
                                                                +{reserved.toFixed(item.uom === 'PCS' ? 0 : 2)} rsv
                                                            </Typography>
                                                        </Tooltip>
                                                    )}
                                                    {isNegative && <Chip label="Deficit" color="error" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }} />}
                                                    {isLow && <Chip label="Refill" color="warning" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }} />}
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={600}>₹{item.standardCost || '0'}</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box display="flex" gap={1} justifyContent="center">
                                                    <Tooltip title="View Stock Details">
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => navigate(`/inventory-item/view/${item.inventoryItemId}`)}
                                                            sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5 }}
                                                        >
                                                            <Visibility fontSize="inherit" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        startIcon={<MoveToInbox fontSize="inherit" />}
                                                        disabled={!canManageInventory}
                                                        onClick={() => onReceiveStock?.(item)}
                                                        sx={{ 
                                                            textTransform: 'none', 
                                                            fontWeight: 700, 
                                                            fontSize: '0.75rem', 
                                                            borderRadius: 1.5,
                                                            bgcolor: '#1e293b',
                                                            '&:hover': { bgcolor: '#0f172a' }
                                                        }}
                                                    >
                                                        Receive
                                                    </Button>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!loading && items.length === 0 && (
                                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 10 }}>No items found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TablePagination
                        component="div"
                        count={totalItems}
                        page={page}
                        onPageChange={(e, p) => setPage(p)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => { 
                            setRowsPerPage(parseInt(e.target.value, 10)); 
                            setPage(0); 
                        }}
                        rowsPerPageOptions={[10, 25, 50]}
                        sx={{ mt: 1 }}
                    />
                </Paper>
            </Box>
        </Fade>
    );
};

export default InventoryItemPage;
