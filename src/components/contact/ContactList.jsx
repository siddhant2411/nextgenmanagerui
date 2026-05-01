import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, IconButton, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Tooltip, Typography, Button, TablePagination,
    Avatar, Stack, Skeleton, Chip, Divider
} from '@mui/material';
import {
    AddCircleOutline, ArrowDownward, ArrowUpward, EditOutlined,
    DeleteForever, Business, LocalPhone, Email, LocationOn
} from '@mui/icons-material';

/* ── Design tokens ── */
const T = {
    primary:       '#2563eb',
    headerBg:      '#f8fafc',
    border:        '#e2e8f0',
    textHead:      '#0f172a',
    textSecondary: '#64748b',
    rowHover:      '#f1f5f9',
};

const TYPE_CONFIG = {
    VENDOR:   { label: 'Vendor',   color: '#2563eb', bg: '#eff6ff' },
    CUSTOMER: { label: 'Customer', color: '#059669', bg: '#ecfdf5' },
    BOTH:     { label: 'Both',     color: '#d97706', bg: '#fffbeb' },
};

/* ── Stat card ── */
const StatCard = ({ label, value, accent = '#1565c0', loading }) => (
  <Paper
    elevation={0}
    sx={{
      flex: 1,
      minWidth: 160,
      p: '11px 14px',
      borderRadius: 1.5,
      border: '1px solid #e2e8f0',
      borderLeft: `3px solid ${accent}`,
      background: '#fff',
      transition: 'box-shadow 0.15s',
      '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.07)' },
    }}
  >
    <Typography sx={{ fontSize: '0.65625rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', mb: '5px' }}>
      {label}
    </Typography>
    {loading ? (
      <Skeleton width="60%" height={32} />
    ) : (
      <Typography sx={{ fontSize: '1.625rem', fontWeight: 500, color: '#1e293b', lineHeight: 1 }}>
        {value}
      </Typography>
    )}
  </Paper>
);

const getPrimaryContact = (personDetails = []) => {
    const primary = personDetails.find(p => p.isPrimary) || personDetails[0];
    if (!primary) return '—';
    return (
        <Box>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>{primary.personName || '—'}</Typography>
            {primary.designation && (
                <Typography sx={{ fontSize: '0.6875rem', color: '#64748b' }}>{primary.designation}</Typography>
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
    contacts, stats, statsLoading, filters, sortBy, sortDir,
    currentPage, totalPages, totalElements, rowsPerPage,
    handleSort, handlePageChange, handleFilterChange, handleDelete,
    handleRowsPerPageChange, loading
}) => {
    const navigate = useNavigate();
    const typeFilter = filters?.type || '';
    const searchQuery = filters?.query || '';

    const headerCellSx = {
        bgcolor: T.headerBg, color: T.textSecondary,
        fontWeight: 700, fontSize: '0.65625rem', letterSpacing: '0.05em',
        py: '10px', px: '14px', whiteSpace: 'nowrap',
        borderBottom: `1px solid ${T.border}`,
        textTransform: 'uppercase',
    };

    return (
        <Box sx={{ p: 3, bgcolor: '#f8fafc', minHeight: '100vh' }}>

            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 3 },
                    width: '100%',
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    bgcolor: 'white'
                }}
            >
                {/* ── Header ── */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                <Box>
                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        Contact Registry
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mt: 0.5 }}>
                        Maintain your global directory of vendors and customers
                    </Typography>
                </Box>
                <Button
                    variant="contained" disableElevation
                    startIcon={<AddCircleOutline />}
                    onClick={() => navigate('add')}
                    sx={{
                        borderRadius: 2, fontWeight: 700, fontSize: '0.8125rem',
                        textTransform: 'none', px: 2.5, py: 1,
                        bgcolor: T.primary, '&:hover': { bgcolor: '#1d4ed8' },
                    }}
                >
                    New Contact
                </Button>
            </Stack>

            <Divider sx={{ mb: 3, borderColor: '#f1f5f9' }} />

            {/* ── Stats ── */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
                <StatCard label="Total Contacts" value={stats?.totalContacts || 0} accent="#1e293b" loading={statsLoading} />
                <StatCard label="Customers" value={stats?.customers || 0} accent="#059669" loading={statsLoading} />
                <StatCard label="Vendors" value={stats?.vendors || 0} accent="#2563eb" loading={statsLoading} />
                <StatCard label="MSME Regd." value={stats?.msmeRegistered || 0} accent="#d97706" loading={statsLoading} />
                <StatCard label="GST Regd." value={stats?.gstRegistered || 0} accent="#7c3aed" loading={statsLoading} />
            </Stack>

            {/* ── Filters ── */}
            <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                        <Box component="input"
                            value={searchQuery}
                            onChange={e => handleFilterChange('query', e.target.value)}
                            placeholder="Search by company, code, GST or phone..."
                            sx={{
                                width: '100%', border: `1px solid ${T.border}`, borderRadius: '8px',
                                p: '8px 12px 8px 36px', fontSize: '0.875rem', color: '#1e293b',
                                outline: 'none', transition: 'all 0.2s',
                                '&:focus': { borderColor: T.primary, boxShadow: `0 0 0 3px ${T.primary}15` },
                            }}
                        />
                        <Business sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 18 }} />
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2 }}>
                        {['', 'VENDOR', 'CUSTOMER', 'BOTH'].map(t => (
                            <Button
                                key={t}
                                size="small"
                                onClick={() => handleFilterChange('type', t)}
                                sx={{
                                    px: 2, py: 0.5, borderRadius: 1.5, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem',
                                    color: typeFilter === t ? '#0f172a' : '#64748b',
                                    bgcolor: typeFilter === t ? '#fff' : 'transparent',
                                    boxShadow: typeFilter === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    '&:hover': { bgcolor: typeFilter === t ? '#fff' : '#e2e8f0' }
                                }}
                            >
                                {t || 'All'}
                            </Button>
                        ))}
                    </Stack>
                </Stack>
            </Box>

            {/* ── Table ── */}
            <TableContainer component={Box} sx={{ border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={headerCellSx} onClick={() => handleSort('contactCode')} style={{ cursor: 'pointer' }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <span>Code</span>
                                    {sortBy === 'contactCode' && (sortDir === 'asc' ? <ArrowUpward sx={{ fontSize: 12 }} /> : <ArrowDownward sx={{ fontSize: 12 }} />)}
                                </Stack>
                            </TableCell>
                            <TableCell sx={headerCellSx} onClick={() => handleSort('companyName')} style={{ cursor: 'pointer' }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <span>Company</span>
                                    {sortBy === 'companyName' && (sortDir === 'asc' ? <ArrowUpward sx={{ fontSize: 12 }} /> : <ArrowDownward sx={{ fontSize: 12 }} />)}
                                </Stack>
                            </TableCell>
                            <TableCell sx={headerCellSx} align="center">Type</TableCell>
                            <TableCell sx={headerCellSx} align="center">GSTIN</TableCell>
                            <TableCell sx={headerCellSx}>Primary Contact</TableCell>
                            <TableCell sx={headerCellSx}>Location</TableCell>
                            <TableCell sx={headerCellSx} align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} sx={{ py: 10 }} align="center"><Skeleton variant="rectangular" height={200} /></TableCell></TableRow>
                        ) : contacts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                                    <Typography variant="body2" color="text.secondary">No contacts found matching your criteria.</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            contacts.map((contact) => {
                                const cfg = TYPE_CONFIG[contact.contactType] || TYPE_CONFIG.VENDOR;
                                return (
                                    <TableRow 
                                        key={contact.id}
                                        hover
                                        onClick={() => navigate(`edit/${contact.id}`)}
                                        sx={{ 
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: T.rowHover },
                                            '& td': { borderBottom: `1px solid #f1f5f9`, py: 1.5 }
                                        }}
                                    >
                                        <TableCell>
                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: T.primary }}>
                                                {contact.contactCode || '—'}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>{contact.companyName}</Typography>
                                            <Typography sx={{ fontSize: '0.6875rem', color: '#64748b' }}>{contact.email || 'No email'}</Typography>
                                        </TableCell>

                                        <TableCell align="center">
                                            <Chip 
                                                label={cfg.label} 
                                                size="small" 
                                                sx={{ 
                                                    height: 20, fontWeight: 700, fontSize: '0.625rem', 
                                                    bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
                                                    borderRadius: 1, textTransform: 'uppercase'
                                                }} 
                                            />
                                        </TableCell>

                                        <TableCell align="center">
                                            <Typography sx={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>
                                                {contact.gstNumber || '—'}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>{getPrimaryContact(contact.personDetails)}</TableCell>

                                        <TableCell>
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <LocationOn sx={{ fontSize: 14, color: '#94a3b8' }} />
                                                <Typography sx={{ fontSize: '0.8125rem', color: '#475569' }}>{getLocation(contact.addresses)}</Typography>
                                            </Stack>
                                        </TableCell>

                                        <TableCell align="center" onClick={e => e.stopPropagation()}>
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                <IconButton 
                                                  size="small" 
                                                  onClick={() => {
                                                    const phone = contact.phone || '';
                                                    if (phone) {
                                                      const message = encodeURIComponent(`Hello ${contact.companyName}, reaching out from NextGenManager regarding...`);
                                                      window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${message}`, '_blank');
                                                    }
                                                  }}
                                                  sx={{ color: '#64748b', '&:hover': { color: '#25d366' } }}
                                                  disabled={!contact.phone}
                                                >
                                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                                  </svg>
                                                </IconButton>
                                                <IconButton 
                                                  size="small" 
                                                  onClick={() => {
                                                    if (contact.email) window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(`Business Outreach: NextGenManager`)}`;
                                                  }}
                                                  sx={{ color: '#64748b', '&:hover': { color: '#2563eb' } }}
                                                  disabled={!contact.email}
                                                >
                                                  <Email sx={{ fontSize: 16 }} />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => navigate(`edit/${contact.id}`)} sx={{ color: '#64748b', '&:hover': { color: T.primary } }}>
                                                    <EditOutlined sx={{ fontSize: 16 }} />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleDelete(contact.id)} sx={{ color: '#64748b', '&:hover': { color: '#dc2626' } }}>
                                                    <DeleteForever sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                <TablePagination
                    component="div"
                    count={totalElements ?? contacts.length}
                    page={currentPage - 1}
                    onPageChange={(_, page) => handlePageChange(null, page + 1)}
                    rowsPerPage={rowsPerPage ?? 20}
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    sx={{
                        borderTop: `1px solid ${T.border}`,
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: '0.75rem', color: '#64748b', fontWeight: 600 },
                    }}
                />
            </TableContainer>
            </Paper>
        </Box>
    );
};

export default ContactList;
