import React, { useState } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Collapse, IconButton, Box, Typography
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import dayjs from 'dayjs';
export default function WorkOrderInstanceListTable({ childInventoryInstanceList }) {
    const [openRow, setOpenRow] = useState(null);

    const toggleRow = (index) => {
        setOpenRow(openRow === index ? null : index);
    };



    const getTotalConsumedQty = (instances) =>
        instances?.filter(i => i.consumeDate)?.length || 0;

    const getTotalRequestedQty = (instances) =>
        instances?.filter(i => i.inventoryInstanceStatus === 'REQUESTED')?.length || 0;

    const getTotalAvailabledQty = (instances) =>
        instances?.filter(i => i.inventoryInstanceStatus === 'AVAILABLE')?.length || 0;

    return (
        <TableContainer component={Paper} sx={{ mt: 3, overflowX: 'auto', width: '100%' }}>
            <Table size="small" sx={{ minWidth: 700 }}>
                <TableHead>
                    <TableRow>
                        {['#', '', 'Item Code', 'Required Qty', 'Requested Qty', 'Available Qty', 'Consumed Qty'].map((col, i) => (
                            <TableCell key={i} align="center">{col}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>

                <TableBody>
                    {childInventoryInstanceList.length > 0 ? (
                        childInventoryInstanceList.map((item, index) => {
                            const instances = item.inventoryInstanceList || [];
                            return (
                                <React.Fragment key={index}>
                                    <TableRow>
                                        <TableCell align="center">{index + 1}</TableCell>
                                        <TableCell align="center">
                                            <IconButton onClick={() => toggleRow(index)}>
                                                {openRow === index ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                            </IconButton>
                                        </TableCell>
                                        <TableCell align="center">{item.inventoryItem?.itemCode}</TableCell>
                                        <TableCell align="center">{instances.length}</TableCell>
                                        <TableCell align="center">{getTotalRequestedQty(instances)}</TableCell>
                                        <TableCell align="center">{getTotalAvailabledQty(instances)}</TableCell>
                                        <TableCell align="center">{getTotalConsumedQty(instances)}</TableCell>
                                    </TableRow>

                                    <TableRow>
                                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                                            <Collapse in={openRow === index} timeout="auto" unmountOnExit>
                                                <Box margin={2}>
                                                    <Typography variant="subtitle1" gutterBottom>
                                                        Inventory Instance Details
                                                    </Typography>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Unique ID</TableCell>
                                                                <TableCell>Quantity</TableCell>
                                                                <TableCell>Booked Date</TableCell>
                                                                <TableCell>Consumed Date</TableCell>
                                                                <TableCell>Requested Date</TableCell>
                                                                <TableCell>Delivery Date</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {instances.map((inst, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell>{inst.uniqueId}</TableCell>
                                                                    <TableCell>{inst.quantity}</TableCell>
                                                                    <TableCell>{inst.bookedDate ? dayjs(inst.bookedDate).format('DD-MM-YYYY') : '-'}</TableCell>
                                                                    <TableCell>{inst.consumeDate ? dayjs(inst.consumeDate).format('DD-MM-YYYY') : '-'}</TableCell>
                                                                    <TableCell>{inst.requestedDate ? dayjs(inst.requestedDate).format('DD-MM-YYYY') : '-'}</TableCell>
                                                                    <TableCell>{inst.deliveryDate ? dayjs(inst.deliveryDate).format('DD-MM-YYYY') : '-'}</TableCell>

                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} align="center">
                                No items available for inventory actions
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
