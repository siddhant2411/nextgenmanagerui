import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Chip,
    IconButton,
    InputAdornment,
    Pagination,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    AddCircleOutline,
    ArrowDownward,
    ArrowUpward,
    DeleteForever,
    EditOutlined,
    Search,
} from '@mui/icons-material';

const TYPE_OPTIONS = [
    { value: '',         label: 'All'      },
    { value: 'VENDOR',   label: 'Vendor'   },
    { value: 'CUSTOMER', label: 'Customer' },
    { value: 'BOTH',     label: 'Both'     },
];

const typeChip = (type) => {
    const map = {
        VENDOR:   { label: 'Vendor',   color: 'primary'  },
        CUSTOMER: { label: 'Customer', color: 'success'  },
        BOTH:     { label: 'Both',     color: 'warning'  },
    };
    const cfg = map[type] || { label: type, color: 'default' };
    return <Chip label={cfg.label} color={cfg.color} size="small" />;
};

const getPrimaryContact = (personDetails = []) => {
    const primary = personDetails.find(p => p.isPrimary) || personDetails[0];
    if (!primary) return '—';
    return (
        <Box>
            <Typography variant="body2">{primary.personName || '—'}</Typography>
            {primary.designation && (
                <Typography variant="caption" color="text.secondary">{primary.designation}</Typography>
            )}
        </Box>
    );
};

const getLocation = (addresses = []) => {
    const addr = addresses.find(a => a.isDefault) || addresses[0];
    if (!addr) return '—';
    return [addr.city, addr.state].filter(Boolean).join(', ') || '—';
};

const SortIcon = ({ column, sortBy, sortDir }) => {
    if (sortBy !== column) return null;
    return sortDir === 'asc'
        ? <ArrowUpward fontSize="inherit" sx={{ ml: 0.5, verticalAlign: 'middle' }} />
        : <ArrowDownward fontSize="inherit" sx={{ ml: 0.5, verticalAlign: 'middle' }} />;
};

const SORTABLE = ['contactCode', 'companyName'];

const ContactList = ({
    contacts, filters, sortBy, sortDir,
    currentPage, totalPages,
    handleSort, handlePageChange, handleFilterChange, handleDelete,
}) => {
    const navigate = useNavigate();

    return (
        <Box p={3} sx={{ backgroundColor: '#fff', minHeight: '100vh' }}>

            {/* ── Header ── */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight="bold">Contacts</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddCircleOutline />}
                    onClick={() => navigate('add')}
                >
                    Add Contact
                </Button>
            </Box>

            {/* ── Type filter + Search ── */}
            <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
                <ToggleButtonGroup
                    value={filters.type}
                    exclusive
                    size="small"
                    onChange={(_, val) => handleFilterChange('type', val ?? '')}
                >
                    {TYPE_OPTIONS.map(opt => (
                        <ToggleButton key={opt.value} value={opt.value} sx={{ px: 2 }}>
                            {opt.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                <TextField
                    size="small"
                    placeholder="Search by company, code, GST, phone or email…"
                    value={filters.query}
                    onChange={e => handleFilterChange('query', e.target.value)}
                    sx={{ flex: 1, minWidth: 260 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {/* ── Table ── */}
            <TableContainer component={Paper} elevation={2}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            {[
                                { key: 'contactCode',  label: 'Code'            },
                                { key: 'companyName',  label: 'Company'         },
                                { key: 'contactType',  label: 'Type'            },
                                { key: 'gstNumber',    label: 'GST Number'      },
                                { key: 'primaryContact', label: 'Primary Contact' },
                                { key: 'location',     label: 'Location'        },
                                { key: 'phone',        label: 'Phone'           },
                                { key: 'action',       label: 'Actions'         },
                            ].map(col => (
                                <TableCell
                                    key={col.key}
                                    align="center"
                                    sx={{
                                        fontWeight: 'bold',
                                        color: '#333',
                                        cursor: SORTABLE.includes(col.key) ? 'pointer' : 'default',
                                        userSelect: 'none',
                                    }}
                                    onClick={() => SORTABLE.includes(col.key) && handleSort(col.key)}
                                >
                                    {col.label}
                                    {SORTABLE.includes(col.key) && (
                                        <SortIcon column={col.key} sortBy={sortBy} sortDir={sortDir} />
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {contacts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                    No contacts found. Add your first vendor or customer.
                                </TableCell>
                            </TableRow>
                        ) : (
                            contacts.map((contact, idx) => (
                                <TableRow
                                    key={contact.id}
                                    hover
                                    sx={{ backgroundColor: idx % 2 === 0 ? '#fafafa' : '#fff', cursor: 'pointer' }}
                                    onClick={() => navigate(`edit/${contact.id}`)}
                                >
                                    <TableCell align="center">
                                        <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                                            {contact.contactCode || '—'}
                                        </Typography>
                                    </TableCell>

                                    <TableCell align="center">
                                        <Typography variant="body2" fontWeight="medium">
                                            {contact.companyName}
                                        </Typography>
                                        {contact.tradeName && (
                                            <Typography variant="caption" color="text.secondary">
                                                {contact.tradeName}
                                            </Typography>
                                        )}
                                    </TableCell>

                                    <TableCell align="center">
                                        {typeChip(contact.contactType)}
                                    </TableCell>

                                    <TableCell align="center">
                                        <Typography variant="body2">
                                            {contact.gstNumber || '—'}
                                        </Typography>
                                    </TableCell>

                                    <TableCell align="center">
                                        {getPrimaryContact(contact.personDetails)}
                                    </TableCell>

                                    <TableCell align="center">
                                        <Typography variant="body2">
                                            {getLocation(contact.addresses)}
                                        </Typography>
                                    </TableCell>

                                    <TableCell align="center">
                                        <Typography variant="body2">
                                            {contact.phone || '—'}
                                        </Typography>
                                    </TableCell>

                                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="small"
                                                onClick={() => navigate(`edit/${contact.id}`)}
                                            >
                                                <EditOutlined fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(contact.id)}
                                            >
                                                <DeleteForever fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                    <Pagination
                        count={totalPages}
                        page={currentPage}
                        onChange={handlePageChange}
                        color="primary"
                    />
                </Box>
            )}
        </Box>
    );
};

export default ContactList;
