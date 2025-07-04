import React from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button,
    Paper,
    TableBody,
    Table,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Box,
    MenuItem,
    Select,
    Pagination,
    IconButton,
    Tooltip
} from "@mui/material";
import { DeleteForever, EditOutlined, AddCircleOutline } from "@mui/icons-material";

const EnquiryList = ({ enquiryList, filters, handleSort, currentPage, totalPages, handlePageChange, handleFilterChange, handleDelete }) => {
    const navigate = useNavigate();

    const handleEdit = (enquiryId) => {
        console.log(enquiryId)
        navigate(`/enquiry/edit/${enquiryId}`);
    };

    const columnHeader = [
        { key: 'enqNo', value: "Enquiry No" },
        { key: "enqDate", value: "Enquiry Date" },
        { key: "companyName", value: "Company Name" },
        { key: "lastContactedDate", value: "Last Contacted" },
        { key: "daysForNextFollowup", value: "Follow-up (Days)" },
        { key: "closedDate", value: "Status" },
        { key: "action", value: "Actions" }
    ];

    return (
        <Box p={3} sx={{backgroundColor:'#fff'}}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Enquiry List</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddCircleOutline />}
                    onClick={() => navigate('add')}
                >
                    New Enquiry
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {columnHeader.map((column, index) => (
                                <TableCell
                                    key={index}
                                    align="center"
                                    sx={{
                                        fontWeight: 'bold',
                                        backgroundColor: '#f5f5f5',
                                        color: '#333',
                                        cursor: ['enqNo', 'companyName', 'daysForNextFollowup'].includes(column.key) ? 'pointer' : 'default'
                                    }}
                                    onClick={() => ['enqNo', 'companyName', 'daysForNextFollowup'].includes(column.key) && handleSort(column.key)}
                                >
                                    {column.value}
                                </TableCell>
                            ))}
                        </TableRow>
                        <TableRow>
                            {columnHeader.map((column, index) => (
                                <TableCell key={index} align="center">
                                    {['enqNo', 'companyName', 'daysForNextFollowup'].includes(column.key) ? (
                                        <TextField
                                            variant="outlined"
                                            size="small"
                                            placeholder={`Search ${column.value}`}
                                            value={filters[column.key] || ''}
                                            onChange={(e) => handleFilterChange(column.key, e.target.value)}
                                            sx={{ width: '90%' }}
                                        />
                                    ) : column.key === 'closedDate' ? (
                                        <Select
                                            value={filters.closedDate || ""}
                                            onChange={(e) => handleFilterChange(column.key, e.target.value)}
                                            displayEmpty
                                            size="small"
                                            sx={{ width: '90%' }}
                                        >
                                            <MenuItem value="">All</MenuItem>
                                            <MenuItem value={null}>Open</MenuItem>
                                            <MenuItem value="1900-01-01">Closed</MenuItem>
                                        </Select>
                                    ) : column.key === 'enqDate' || column.key === 'lastContactedDate' ? (
                                        <Box display="flex" alignItems="center" justifyContent="center">
                                            <Select
                                                value={filters[column.key === "enqDate" ? "enqDateComp" : "lastContactedDateComp"] || "="}
                                                onChange={(e) => handleFilterChange(column.key === "enqDate" ? "enqDateComp" : "lastContactedDateComp", e.target.value)}
                                                size="small"
                                                sx={{ marginRight: 1 }}
                                            >
                                                <MenuItem value="=">=</MenuItem>
                                                <MenuItem value="<">&lt;</MenuItem>
                                                <MenuItem value=">">&gt;</MenuItem>
                                            </Select>
                                            <TextField
                                                type="date"
                                                size="small"
                                                value={filters[column.key] || ''}
                                                onChange={(e) => handleFilterChange(column.key, e.target.value)}
                                                sx={{ width: '70%' }}
                                            />
                                        </Box>
                                    ) : null}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {enquiryList.map((enquiry, index) => (
                            <TableRow key={enquiry.id} hover size='small'>
                                <TableCell align="center" size='small'>{enquiry.enqNo}</TableCell>
                                <TableCell align="center" size='small'>{enquiry.enqDate}</TableCell>
                                <TableCell align="center" size='small'>{enquiry.companyName || 'N/A'}</TableCell>
                                <TableCell align="center" size='small'>{enquiry.lastContactDate || 'N/A'}</TableCell>
                                <TableCell align="center" size='small'>{enquiry.daysForNextFollowup || 'N/A'}</TableCell>
                                <TableCell align="center" size='small'>{!enquiry.closedDate ? "Open" : "Closed"}</TableCell>
                                <TableCell align="center" size='small'>
                                    <Tooltip title="Edit">
                                        <IconButton color="primary" onClick={() => handleEdit(enquiry.id)}>
                                            <EditOutlined />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton color="error" onClick={() => handleDelete(enquiry.id)}>
                                            <DeleteForever />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box mt={3} display="flex" justifyContent="center">
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

export default EnquiryList;
