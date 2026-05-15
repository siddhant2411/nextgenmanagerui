import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, IconButton, Collapse, Chip, Pagination,
  CircularProgress, TablePagination, Stack
} from '@mui/material';
import {
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import InstanceGenealogy from './InstanceGenealogy';
import { getGroupedInventory, getPresentInventory } from '../../services/inventoryService';


const InventoryInstanceList = () => {
  const [loading, setLoading] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [groupedData, setGroupedData] = useState({});
  const [groupedLoading, setGroupedLoading] = useState({});
  const [groupedPage, setGroupedPage] = useState({});
  const [groupedRowsPerPage, setGroupedRowsPerPage] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [historyDialog, setHistoryDialog] = useState({ open: false, instanceId: null, uniqueId: '' });
  const debounceRef = useRef();


  const itemsPerPage = 10;

  const renderStatus = (status) => {
    const config = {
      AVAILABLE: { color: '#059669', bg: '#ecfdf5' },
      BOOKED:    { color: '#d97706', bg: '#fffbeb' },
      CONSUMED:  { color: '#475569', bg: '#f1f5f9' },
      REQUESTED: { color: '#2563eb', bg: '#eff6ff' },
      DESTROYED: { color: '#dc2626', bg: '#fef2f2' },
      PENDING:   { color: '#64748b', bg: '#f8fafc' },
    };
    const c = config[status] || config.PENDING;
    return (
      <Chip 
        label={status} 
        size="small" 
        sx={{ 
          fontSize: '0.65rem', fontWeight: 800, height: 20,
          color: c.color, bgcolor: c.bg, border: `1px solid ${c.color}30` 
        }} 
      />
    );
  };

  const fetchPresentInventory = useCallback(async (page = 1, query = searchQuery) => {
    setLoading(true);
    try {
      const params = {
        page: page - 1,
        size: itemsPerPage,
        itemCode: query,
        itemName: query
      };
      const res = await getPresentInventory(params);
      setInventoryList(res.content || []);
      setTotalPages(res.totalPages || 1);
      setCurrentPage(page);
    } catch (e) {
      // handled
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const fetchGroupedInventory = async (itemCode) => {
    setGroupedLoading((prev) => ({ ...prev, [itemCode]: true }));
    try {
      const res = await getGroupedInventory({
        page: 0,
        size: 100, // fetch larger dataset for client-side pagination
        itemCode
      });
      setGroupedData((prev) => ({ ...prev, [itemCode]: res.content || [] }));
      setGroupedPage((prev) => ({ ...prev, [itemCode]: 0 }));
      setGroupedRowsPerPage((prev) => ({ ...prev, [itemCode]: 5 }));
    } catch (e) {
      // handled
    } finally {
      setGroupedLoading((prev) => ({ ...prev, [itemCode]: false }));
    }
  };

  const handleExpandClick = (itemCode) => {
    const isExpanded = expandedRow === itemCode;
    setExpandedRow(isExpanded ? null : itemCode);
    if (!isExpanded && !groupedData[itemCode]) {
      fetchGroupedInventory(itemCode);
    }
  };

  const handleGroupedPageChange = (itemCode, newPage) => {
    setGroupedPage((prev) => ({ ...prev, [itemCode]: newPage }));
  };

  const handleGroupedRowsPerPageChange = (itemCode, newRowsPerPage) => {
    setGroupedRowsPerPage((prev) => ({ ...prev, [itemCode]: parseInt(newRowsPerPage, 10) }));
    setGroupedPage((prev) => ({ ...prev, [itemCode]: 0 }));
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPresentInventory(1, val);
    }, 600);
  };

  const handlePageChange = (e, page) => {
    fetchPresentInventory(page, searchQuery);
  };

  useEffect(() => {
    fetchPresentInventory();
  }, [fetchPresentInventory]);

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', pb: 8 }}>
      {/* ── Hero Header ── */}
      <Box sx={{ 
          bgcolor: '#0f172a', 
          backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.1) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 40%)',
          color: 'white', pt: 6, pb: 12 
      }}>
          <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', mb: 1 }}>
                  Inventory Instance Ledger
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                  Track individual stock batches, serial numbers, and their complete lifecycle status.
              </Typography>
          </Box>
      </Box>

      {/* ── Main Registry ── */}
      <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, mt: -6 }}>
          <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid #e2e8f0`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)' }}>
              
              <Box sx={{ p: 3, borderBottom: `1px solid #e2e8f0`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Search by Item Code or Name..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    sx={{ width: 350, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#f8fafc' } }}
                  />
                  {totalPages > 1 && (
                      <Pagination count={totalPages} page={currentPage} size="small"
                          onChange={handlePageChange} color="primary" />
                  )}
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ width: 50, borderBottom: `1px solid #e2e8f0` }} />
                      <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid #e2e8f0` }}>Item Code</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid #e2e8f0` }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid #e2e8f0` }}>Total Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid #e2e8f0` }} align="center">UOM</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid #e2e8f0` }}>Total Cost (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                          <CircularProgress size={32} />
                        </TableCell>
                      </TableRow>
                    ) : inventoryList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                           <Typography color="text.secondary" variant="body2">No inventory data found.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      inventoryList.map((item, idx) => {
                        const code = item.itemCode;
                        const currentPage = groupedPage[code] || 0;
                        const rowsPerPage = groupedRowsPerPage[code] || 5;
                        const instanceGroups = groupedData[code] || [];

                        const flattened = instanceGroups.flatMap(g => g.inventoryInstances || []);
                        const paginatedData = flattened.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage);

                        return (
                          <React.Fragment key={item.inventoryItemId || idx}>
                            <TableRow hover sx={{ '&:hover': { bgcolor: '#f1f5f9' }, cursor: 'pointer' }} onClick={() => handleExpandClick(code)}>
                              <TableCell>
                                <IconButton size="small" sx={{ color: '#64748b' }}>
                                  {expandedRow === code ? <ArrowUpIcon /> : <ArrowDownIcon />}
                                </IconButton>
                              </TableCell>
                              <TableCell><Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{code}</Typography></TableCell>
                              <TableCell><Typography sx={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>{item.name}</Typography></TableCell>
                              <TableCell><Typography sx={{ fontWeight: 800, color: '#2563eb' }}>{item.totalQuantity}</Typography></TableCell>
                              <TableCell align="center"><Chip label={item.uom} size="small" sx={{ fontSize: '0.65rem', fontWeight: 700, bgcolor: '#f1f5f9' }} /></TableCell>
                              <TableCell><Typography sx={{ fontWeight: 600 }}>{item.totalCost?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography></TableCell>
                            </TableRow>

                            <TableRow>
                              <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                                <Collapse in={expandedRow === code} timeout="auto" unmountOnExit>
                                  <Box sx={{ px: 4, py: 3, bgcolor: '#f8fafc', borderBottom: `1px solid #e2e8f0` }}>
                                    {groupedLoading[code] ? (
                                      <Box sx={{ textAlign: 'center', py: 4 }}>
                                        <CircularProgress size={24} />
                                      </Box>
                                    ) : (
                                      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                                        <Table size="small">
                                          <TableHead sx={{ bgcolor: 'white' }}>
                                            <TableRow>
                                              <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase' }}>UID</TableCell>
                                              <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase' }}>Quantity</TableCell>
                                              <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase' }}>Status</TableCell>
                                              <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase' }}>Entry Date</TableCell>
                                              <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase' }}>Cost/Unit</TableCell>
                                              <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase' }}>Batch / Serial</TableCell>
                                              <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase' }} align="center">History</TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {paginatedData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}><Typography variant="body2" color="text.secondary">No instances tracked.</Typography></TableCell>
                                                </TableRow>
                                            )}
                                            {paginatedData.map((inst, i) => (
                                              <TableRow key={i} sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#fcfcfc' } }}>
                                                <TableCell><Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{inst.uniqueId}</Typography></TableCell>
                                                <TableCell><Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{inst.quantity}</Typography></TableCell>
                                                <TableCell>{renderStatus(inst.inventoryInstanceStatus)}</TableCell>
                                                <TableCell><Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(inst.entryDate).toLocaleDateString()}</Typography></TableCell>
                                                <TableCell><Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>₹{inst.costPerUnit?.toLocaleString()}</Typography></TableCell>
                                                <TableCell>
                                                     <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                                         <Stack direction="row" spacing={1}>
                                                            {inst.batchNumber && <Chip label={`B: ${inst.batchNumber.batchNumber}`} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#f1f5f9' }} />}
                                                            {inst.serialNumber && <Chip label={`S: ${inst.serialNumber.serialNumber}`} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: '#f1f5f9' }} />}
                                                            {!inst.batchNumber && !inst.serialNumber && <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</Typography>}
                                                         </Stack>
                                                     </Stack>
                                                </TableCell>
                                                <TableCell align="center">
                                                     <IconButton size="small" sx={{ color: '#2563eb' }} onClick={(e) => {
                                                         e.stopPropagation();
                                                         setHistoryDialog({ open: true, instanceId: inst.id, uniqueId: inst.uniqueId });
                                                     }}>
                                                         <HistoryIcon sx={{ fontSize: 18 }} />
                                                     </IconButton>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                        {flattened.length > 5 && (
                                            <TablePagination
                                              component="div"
                                              count={flattened.length}
                                              page={currentPage}
                                              onPageChange={(e, newPage) => handleGroupedPageChange(code, newPage)}
                                              rowsPerPage={rowsPerPage}
                                              onRowsPerPageChange={(e) => handleGroupedRowsPerPageChange(code, e.target.value)}
                                              rowsPerPageOptions={[5, 10, 25]}
                                              sx={{ bgcolor: 'white', borderTop: '1px solid #e2e8f0' }}
                                            />
                                        )}
                                      </Paper>
                                    )}
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
          </Paper>
      </Box>

      {/* ── Product Biography Dialog ── */}
      <Dialog 
        open={historyDialog.open} 
        onClose={() => setHistoryDialog({ ...historyDialog, open: false })}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
                <Typography variant="h6" fontWeight={900} sx={{ color: '#0f172a' }}>Product Biography</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>UID: {historyDialog.uniqueId}</Typography>
            </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ borderBottom: 'none' }}>
            <InstanceGenealogy instanceId={historyDialog.instanceId} />
        </DialogContent>
      </Dialog>
    </Box>

  );
};

export default InventoryInstanceList;
