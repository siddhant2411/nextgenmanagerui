import React, { useState } from 'react';
import {
    Box, Collapse, IconButton, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Pagination
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';

const GroupedInventoryTable = ({ groupedInventory = [], currentPage, totalPages, handlePageChange }) => {
    const [openRow, setOpenRow] = useState(null);
    const [pageMap, setPageMap] = useState({}); // Keeps pagination per itemCode

    const rowsPerPage = 10;

    const handleToggle = (itemCode) => {
        setOpenRow(openRow === itemCode ? null : itemCode);
        setPageMap((prev) => ({ ...prev, [itemCode]: 1 })); // Reset to page 1 on toggle
    };

    const handleInstancePageChange = (itemCode, event, value) => {
        setPageMap((prev) => ({ ...prev, [itemCode]: value }));
    };

    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '—';

    return (
        <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell />
                        <TableCell align="center"><b>Item Code</b></TableCell>
                        <TableCell align="center"><b>Item Name</b></TableCell>
                        <TableCell align="center"><b>Item Type</b></TableCell>
                        <TableCell align="center"><b>UOM</b></TableCell>
                         <TableCell align="center"><b>Min Required</b></TableCell>
                        <TableCell align="center"><b>Available Qty</b></TableCell>
                        <TableCell align="center"><b>Ordered Qty</b></TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {groupedInventory.map((group, index) => {
                        const item = group.inventoryItem;
                        const allInstances = group.inventoryInstances || [];
                        const itemCode = item.itemCode || `row-${index}`;
                        const currentPage = pageMap[itemCode] || 1;

                        const startIdx = (currentPage - 1) * rowsPerPage;
                        const paginatedInstances = allInstances.slice(startIdx, startIdx + rowsPerPage);
                        const totalPagesForInstance = Math.ceil(allInstances.length / rowsPerPage);

                        return (
                            <React.Fragment key={itemCode}>
                                <TableRow hover>
                                    <TableCell align="center">
                                        <IconButton size="small" onClick={() => handleToggle(itemCode)}>
                                            {openRow === itemCode ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell align="center">{item.itemCode}</TableCell>
                                    <TableCell align="center">{item.name}</TableCell>
                                    <TableCell align="center">{item.itemType}</TableCell>
                                    <TableCell align="center">{item.uom}</TableCell>
                                    <TableCell align="center">{item.minStock}</TableCell>
                                    <TableCell align="center">{item.availableQuantity}</TableCell>
                                    <TableCell align="center">{item.orderedQuantity}</TableCell>
                                </TableRow>

                                <TableRow>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                                        <Collapse in={openRow === itemCode} timeout="auto" unmountOnExit>
                                            <Box sx={{ margin: 2 }}>
                                                <Typography variant="subtitle1" gutterBottom>
                                                    Inventory Instances
                                                </Typography>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell align="center">Instance ID</TableCell>
                                                            <TableCell align="center">Quantity</TableCell>
                                                            <TableCell align="center">Entry Date</TableCell>
                                                            <TableCell align="center">Booked Date</TableCell>
                                                            <TableCell align="center">Requested Date</TableCell>
                                                            <TableCell align="center">Delivery Date</TableCell>
                                                            <TableCell align="center">Cost/Unit</TableCell>
                                                            <TableCell align="center">Sell Price/Unit</TableCell>
                                                            <TableCell align="center">Status</TableCell>
                                                            <TableCell align="center">Consumed</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {paginatedInstances.map((inst, idx) => (
                                                            <TableRow key={idx}>
                                                                <TableCell align="center">{inst.uniqueId || '—'}</TableCell>
                                                                <TableCell align="center">{inst.quantity}</TableCell>
                                                                <TableCell align="center">{formatDate(inst.entryDate)}</TableCell>
                                                                <TableCell align="center">{formatDate(inst.bookedDate)}</TableCell>
                                                                <TableCell align="center">{formatDate(inst.requestedDate)}</TableCell>
                                                                <TableCell align="center">{formatDate(inst.deliveryDate)}</TableCell>
                                                                <TableCell align="center">{inst.costPerUnit?.toFixed(2)}</TableCell>
                                                                <TableCell align="center">{inst.sellPricePerUnit?.toFixed(2)}</TableCell>
                                                                <TableCell align="center">{inst.inventoryInstanceStatus}</TableCell>
                                                                <TableCell align="center">{inst.consumed ? 'Yes' : 'No'}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>

                                                {totalPagesForInstance > 1 && (
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                                        <Pagination
                                                            count={totalPagesForInstance}
                                                            page={currentPage}
                                                            onChange={(e, value) => handleInstancePageChange(itemCode, e, value)}
                                                            size="small"
                                                            color="primary"
                                                            shape="rounded"
                                                        />
                                                    </Box>
                                                )}
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default GroupedInventoryTable;
