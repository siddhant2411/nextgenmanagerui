import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, IconButton, Collapse, Chip, Pagination,
  CircularProgress, TablePagination
} from '@mui/material';
import {
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon
} from '@mui/icons-material';
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
  const debounceRef = useRef();

  const itemsPerPage = 10;

  const renderStatus = (status) => {
    const colorMap = {
      AVAILABLE: 'success',
      BOOKED: 'warning',
      CONSUMED: 'default',
      REQUESTED: 'info',
      DESTROYED: 'error'
    };
    return <Chip label={status} color={colorMap[status] || 'default'} size="small" />;
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Inventory Instances</Typography>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by Item Code or Name"
        value={searchQuery}
        onChange={handleSearchChange}
        sx={{ mb: 2 }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Item Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Total Quantity</TableCell>
               <TableCell align="center">UOM</TableCell>
              <TableCell>Total Cost</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : inventoryList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No inventory data found.</TableCell>
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
                    <TableRow>
                      <TableCell>
                        <IconButton onClick={() => handleExpandClick(code)} size="small">
                          {expandedRow === code ? <ArrowUpIcon /> : <ArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>{code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell >{item.totalQuantity}</TableCell>
                     <TableCell align="center">{item.uom}</TableCell>
                      <TableCell>{item.totalCost?.toFixed(1)}</TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                        <Collapse in={expandedRow === code} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                            {groupedLoading[code] ? (
                              <Box sx={{ textAlign: 'center' }}>
                                <CircularProgress size={20} />
                              </Box>
                            ) : (
                              <>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>UID</TableCell>
                                      <TableCell>Quantity</TableCell>
                                      <TableCell>Status</TableCell>
                                      <TableCell>Entry Date</TableCell>
                                      <TableCell>Cost/Unit</TableCell>
                                      <TableCell>Reference No</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {paginatedData.map((inst, i) => (
                                      <TableRow key={i}>
                                        <TableCell>{inst.uniqueId}</TableCell>
                                        <TableCell>{inst.quantity}</TableCell>

                                        <TableCell>{renderStatus(inst.inventoryInstanceStatus)}</TableCell>
                                        <TableCell>{new Date(inst.entryDate).toLocaleDateString()}</TableCell>
                                        <TableCell>{inst.costPerUnit}</TableCell>
                                        <TableCell>{inst.linkedSourceId || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                <TablePagination
                                  component="div"
                                  count={flattened.length}
                                  page={currentPage}
                                  onPageChange={(e, newPage) => handleGroupedPageChange(code, newPage)}
                                  rowsPerPage={rowsPerPage}
                                  onRowsPerPageChange={(e) => handleGroupedRowsPerPageChange(code, e.target.value)}
                                  rowsPerPageOptions={[5, 10, 25]}
                                />
                              </>
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

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>
    </Box>
  );
};

export default InventoryInstanceList;
