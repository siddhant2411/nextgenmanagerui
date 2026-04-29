import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    Button,
    TablePagination,
} from '@mui/material';
import {
    AddCircleOutline,
    ArrowDownward,
    ArrowUpward,
    EditOutlined,
    DeleteForever,
} from '@mui/icons-material';

/* ── Design tokens ── */
const T = {
    primary:       '#1565c0',
    primaryHover:  '#0d47a1',
    pageBg:        '#f4f6f9',
    surface:       '#ffffff',
    border:        '#e2e8f0',
    borderCard:    '#e5e7eb',
    textHead:      '#0f2744',
    textBody:      '#1a1a2e',
    textSecondary: '#64748b',
    textMuted:     '#94a3b8',
    headerBg:      '#0f2744',
    headerText:    '#e8edf3',
    rowHover:      '#e3f2fd',
    rowAlt:        '#fafbfc',
};

/* ── Type chip ── */
const TYPE_STYLE = {
    VENDOR:   { bg: '#eef4fb', color: '#2a6496', border: '#c8dcf0' },
    CUSTOMER: { bg: '#eef6f0', color: '#2a6640', border: '#b8d8bf' },
    BOTH:     { bg: '#fdf8ec', color: '#7a5a18', border: '#eddcaa' },
};
const TYPE_LABELS = { VENDOR: 'Vendor', CUSTOMER: 'Customer', BOTH: 'Both' };

function TypeChip({ type }) {
    const s = TYPE_STYLE[type] || { bg: '#f5f5f5', color: '#6b6b6b', border: '#ddd' };
    return (
        <Box component="span" sx={{
            display: 'inline-block', borderRadius: '4px', px: '9px', py: '2px',
            fontSize: '0.6875rem', fontWeight: 600,
            border: `1px solid ${s.border}`, bgcolor: s.bg, color: s.color, whiteSpace: 'nowrap',
        }}>
            {TYPE_LABELS[type] || type}
        </Box>
    );
}

/* ── Stat card ── */
function StatCard({ label, value, accent, active, onClick }) {
    return (
        <Box onClick={onClick} sx={{
            bgcolor: '#fff', border: `1px solid ${T.border}`,
            borderLeft: `3px solid ${accent}`, borderRadius: '6px',
            p: '10px 14px', cursor: 'pointer',
            outline: active ? `2px solid ${accent}` : 'none',
            outlineOffset: '-2px',
            transition: 'box-shadow .15s',
            '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,.07)' },
        }}>
            <Typography sx={{ fontSize: '0.65625rem', fontWeight: 600, color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em', mb: '4px' }}>{label}</Typography>
            <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.5rem', fontWeight: 500, color: T.textHead, lineHeight: 1 }}>{value}</Typography>
        </Box>
    );
}

/* ── Type toggle button ── */
function TypeToggle({ value, selected, onClick, children }) {
    return (
        <Box component="button" onClick={() => onClick(value)} sx={{
            px: '12px', py: '4px', borderRadius: '4px', border: 'none', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 600,
            bgcolor: selected ? '#fff' : 'transparent',
            color: selected ? T.textHead : T.textSecondary,
            boxShadow: selected ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            transition: 'all .15s',
        }}>
            {children}
        </Box>
    );
}

const getPrimaryContact = (personDetails = []) => {
    const primary = personDetails.find(p => p.isPrimary) || personDetails[0];
    if (!primary) return '—';
    return (
        <Box>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: T.textBody }}>{primary.personName || '—'}</Typography>
            {primary.designation && (
                <Typography sx={{ fontSize: '0.6875rem', color: T.textMuted, mt: '1px' }}>{primary.designation}</Typography>
            )}
        </Box>
    );
};

const getLocation = (addresses = []) => {
    const addr = addresses.find(a => a.isDefault) || addresses[0];
    if (!addr) return '—';
    return [addr.city, addr.state].filter(Boolean).join(', ') || '—';
};

const SORTABLE = ['contactCode', 'companyName'];

const ContactList = ({
    contacts, filters, sortBy, sortDir,
    currentPage, totalPages, totalElements, rowsPerPage,
    handleSort, handlePageChange, handleFilterChange, handleDelete,
    handleRowsPerPageChange,
}) => {
    const navigate = useNavigate();

    const typeFilter = filters?.type || '';
    const searchQuery = filters?.query || '';

    const counts = {
        VENDOR:   contacts.filter ? contacts.filter(c => c.contactType === 'VENDOR').length   : 0,
        CUSTOMER: contacts.filter ? contacts.filter(c => c.contactType === 'CUSTOMER').length : 0,
        BOTH:     contacts.filter ? contacts.filter(c => c.contactType === 'BOTH').length     : 0,
    };

    const headerCellSx = {
        bgcolor: T.headerBg, color: T.headerText,
        fontWeight: 600, fontSize: '0.71875rem', letterSpacing: '0.03em',
        py: '9px', px: '14px', whiteSpace: 'nowrap',
        borderBottom: '2px solid rgba(232,237,243,.2)',
        borderRight: '1px solid rgba(255,255,255,.06)',
    };

    return (
        <Box sx={{ p: { xs: 2, md: '24px 28px' }, bgcolor: T.pageBg, minHeight: '100%' }}>

            {/* ── Header ── */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: '20px' }}>
                <Box>
                    <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.375rem' }, fontWeight: 700, color: T.textHead, lineHeight: 1.2 }}>
                        Company &amp; Contacts
                    </Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: T.textSecondary, mt: '3px' }}>
                        Manage vendors, customers and their contact details
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddCircleOutline sx={{ fontSize: 16 }} />}
                    onClick={() => navigate('add')}
                    sx={{
                        borderRadius: '6px', fontWeight: 600, fontSize: '0.8125rem',
                        textTransform: 'none', px: '18px', py: '7px',
                        bgcolor: T.primary, boxShadow: '0 2px 6px rgba(21,101,192,.2)',
                        '&:hover': { bgcolor: T.primaryHover },
                    }}
                >
                    Add Contact
                </Button>
            </Box>

            {/* ── Stat cards ── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 160px))', gap: '12px', mb: '20px' }}>
                <StatCard label="Vendors"   value={counts.VENDOR}   accent="#2a6496" active={typeFilter === 'VENDOR'}   onClick={() => handleFilterChange('type', typeFilter === 'VENDOR'   ? '' : 'VENDOR')}   />
                <StatCard label="Customers" value={counts.CUSTOMER} accent="#2a6640" active={typeFilter === 'CUSTOMER'} onClick={() => handleFilterChange('type', typeFilter === 'CUSTOMER' ? '' : 'CUSTOMER')} />
                <StatCard label="Both"      value={counts.BOTH}     accent="#7a5a18" active={typeFilter === 'BOTH'}     onClick={() => handleFilterChange('type', typeFilter === 'BOTH'     ? '' : 'BOTH')}     />
            </Box>

            {/* ── Filter row ── */}
            <Box sx={{ display: 'flex', gap: '10px', mb: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search */}
                <Box sx={{ position: 'relative', flex: 1, maxWidth: 360 }}>
                    <Box component="svg" sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textMuted, pointerEvents: 'none' }}
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    </Box>
                    <Box component="input"
                        value={searchQuery}
                        onChange={e => handleFilterChange('query', e.target.value)}
                        placeholder="Search company, code, GST, phone…"
                        sx={{
                            width: '100%', border: `1px solid ${T.border}`, borderRadius: '6px',
                            p: '7px 10px 7px 32px', fontSize: '0.8125rem', color: T.textBody,
                            fontFamily: 'Inter, sans-serif', outline: 'none', bgcolor: '#fff',
                            '&:focus': { borderColor: T.primary, boxShadow: '0 0 0 2px rgba(21,101,192,.12)' },
                        }}
                    />
                </Box>
                {/* Type toggle pill */}
                <Box sx={{ display: 'flex', bgcolor: '#f1f5f9', p: '3px', borderRadius: '6px', gap: '2px' }}>
                    {['', 'VENDOR', 'CUSTOMER', 'BOTH'].map(t => (
                        <TypeToggle key={t} value={t} selected={typeFilter === t} onClick={v => handleFilterChange('type', v)}>
                            {t || 'All'}
                        </TypeToggle>
                    ))}
                </Box>
            </Box>

            {/* ── Table ── */}
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${T.borderCard}`, borderRadius: '8px', overflow: 'hidden' }}>
                <Table size="small" sx={{ fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                    <TableHead>
                        <TableRow>
                            {[
                                { key: 'contactCode',    label: 'Code'            },
                                { key: 'companyName',    label: 'Company'         },
                                { key: 'contactType',    label: 'Type'            },
                                { key: 'gstNumber',      label: 'GST Number'      },
                                { key: 'primaryContact', label: 'Primary Contact' },
                                { key: 'location',       label: 'Location'        },
                                { key: 'phone',          label: 'Phone'           },
                                { key: 'action',         label: ''                },
                            ].map(col => (
                                <TableCell key={col.key} sx={{
                                    ...headerCellSx,
                                    cursor: SORTABLE.includes(col.key) ? 'pointer' : 'default',
                                    userSelect: 'none',
                                }} onClick={() => SORTABLE.includes(col.key) && handleSort(col.key)}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {col.label}
                                        {SORTABLE.includes(col.key) && sortBy === col.key && (
                                            sortDir === 'asc'
                                                ? <ArrowUpward sx={{ fontSize: 13, color: 'rgba(232,237,243,.7)' }} />
                                                : <ArrowDownward sx={{ fontSize: 13, color: 'rgba(232,237,243,.7)' }} />
                                        )}
                                    </Box>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {contacts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 8, color: T.textMuted, fontSize: '0.8125rem' }}>
                                    No contacts found.{' '}
                                    <Box component="span" onClick={() => navigate('add')}
                                        sx={{ color: T.primary, cursor: 'pointer', fontWeight: 600 }}>
                                        Add your first contact →
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            contacts.map((contact, idx) => (
                                <TableRow key={contact.id}
                                    onClick={() => navigate(`edit/${contact.id}`)}
                                    sx={{
                                        bgcolor: idx % 2 === 0 ? '#fff' : T.rowAlt,
                                        cursor: 'pointer', transition: 'background .1s',
                                        '&:hover': { bgcolor: T.rowHover },
                                        '& td': { borderBottom: '1px solid #f1f5f9', py: '10px', px: '14px', color: T.textSecondary },
                                    }}
                                >
                                    <TableCell>
                                        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', fontWeight: 500, color: T.primary }}>
                                            {contact.contactCode || '—'}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: T.textHead }}>{contact.companyName}</Typography>
                                        {contact.tradeName && (
                                            <Typography sx={{ fontSize: '0.6875rem', color: T.textMuted, mt: '1px' }}>{contact.tradeName}</Typography>
                                        )}
                                    </TableCell>

                                    <TableCell><TypeChip type={contact.contactType} /></TableCell>

                                    <TableCell>
                                        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: T.textSecondary }}>
                                            {contact.gstNumber || '—'}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>{getPrimaryContact(contact.personDetails)}</TableCell>

                                    <TableCell>
                                        <Typography sx={{ fontSize: '0.8125rem' }}>{getLocation(contact.addresses)}</Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>{contact.phone || '—'}</Typography>
                                    </TableCell>

                                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={() => navigate(`edit/${contact.id}`)}>
                                                <EditOutlined sx={{ fontSize: 16, color: T.primary }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton size="small" onClick={() => handleDelete(contact.id)}>
                                                <DeleteForever sx={{ fontSize: 16, color: '#b84040' }} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                <TablePagination
                    component="div"
                    count={totalElements ?? contacts.length}
                    page={currentPage - 1}
                    onPageChange={(_, page) => handlePageChange(null, page + 1)}
                    rowsPerPage={rowsPerPage ?? 10}
                    rowsPerPageOptions={[10, 25, 50]}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    sx={{
                        borderTop: '1px solid #f1f5f9', bgcolor: '#fafafa',
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.75rem', color: T.textMuted },
                    }}
                />
            </TableContainer>
        </Box>
    );
};

export default ContactList;
