import React from 'react';
import {useNavigate} from "react-router-dom";
import {
    Box,
    Button, MenuItem, Pagination,
    Paper, Select,
    Table, TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from "@mui/material";
import {DeleteForever, EditOutlined} from "@mui/icons-material";

const QuotationList = ({handleSort,filters,handleFilterChange,quotationList,handleDelete,
                           totalPages,currentPage,handlePageChange}) => {

    const navigate = useNavigate();

    const handleEdit = (id) => {
        navigate(`/quotation/edit/${id}`);
    };

    const columnHeader = [
        { key: 'qtnNo', value: "Quotation No" },
        { key: "qtnDate", value: "Quotation Date" },
        { key: "enqNo", value: "Enquiry No" },
        { key: "enqDate", value: "Enquiry Date" },
        { key: "companyName", value: "Company Name" },
        { key: "netAmount", value: "Net Amount" },
        { key: "totalAmount", value: "Total Amount" },
        { key: "action", value: "Action" }

    ];
    return (
        <div>
            <Box>
                <Typography variant="h4" gutterBottom>Quotation</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    style={{ float: "right", marginBottom: "2rem" }}
                    onClick={() => navigate('add')}
                >
                    New Quotation
                </Button>


                <TableContainer component={Paper}>
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
                                            fontSize: '1rem',
                                            borderBottom: '2px solid #ccc',
                                            cursor: ['qtnNo','enqNo', 'companyName', 'daysForNextFollowup'].includes(column.key) ? 'pointer' : 'default'
                                        }}
                                        onClick={() =>
                                            ["qtnNo","enqNo", "companyName", "daysForNextFollowup"].includes(column.key) && handleSort(column.key)
                                        }
                                    >
                                        {column.value}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                {columnHeader.map((columnHead, index) => (
                                    <TableCell key={index} align="center">
                                        {['qtnNo','enqNo', 'companyName', 'daysForNextFollowup','netAmount','totalAmount'].includes(columnHead.key) ? (
                                            <TextField
                                                variant="outlined"
                                                size="small"
                                                placeholder={`Filter by ${columnHead.value}`}
                                                value={filters[columnHead.key]}
                                                onChange={(e) => handleFilterChange(columnHead.key, e.target.value)}
                                                sx={{ width: '80%' }}
                                            />
                                        ) : columnHead.key === 'closedDate' ? (
                                            <Select
                                                value={filters.closedDate || ""}
                                                onChange={(e) => handleFilterChange(columnHead.key, e.target.value)}
                                                displayEmpty
                                                sx={{ width: '80%' }}
                                            >
                                                <MenuItem value="">All</MenuItem>
                                                <MenuItem value={null}>Open</MenuItem>
                                                <MenuItem value={"1900-01-01"}>Closed</MenuItem>
                                            </Select>
                                        ) : columnHead.key === 'enqDate' || columnHead.key === 'qtnDate' ? (
                                            <Box display="flex" alignItems="center" justifyContent="center">
                                                {console.log(filters[columnHead.key==="enqDate"?"enqDate":"lastContactDate"])}
                                                <TextField
                                                    type="date"
                                                    value={filters[columnHead.key==="enqDate"?"enqDate":"lastContactDate"] || ""}
                                                    onChange={(e) => handleFilterChange(columnHead.key, e.target.value)}
                                                    sx={{ width: '70%' }}
                                                />
                                            </Box>
                                        ) : null}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {quotationList.map((enquiry, rowIndex) => (
                                <TableRow
                                    key={enquiry.id}
                                    sx={{
                                        backgroundColor: rowIndex % 2 === 0 ? '#fafafa' : '#fff',
                                        '&:hover': { backgroundColor: '#f1f1f1' }
                                    }}
                                >
                                    <TableCell align="center">{enquiry.qtnNo}</TableCell>
                                    <TableCell align="center">{enquiry.qtnDate}</TableCell>
                                    <TableCell align="center">{enquiry.enqNo}</TableCell>
                                    <TableCell align="center">{enquiry.enqDate}</TableCell>
                                    <TableCell align="center">{enquiry.companyName || 'N/A'}</TableCell>
                                    <TableCell align="center">{enquiry.netAmount || 'N/A'}</TableCell>
                                    <TableCell align="center">{enquiry.totalAmount || 'N/A'}</TableCell>
                                    <TableCell align="center">
                                        <Button onClick={() => handleEdit(enquiry.id)}><EditOutlined /></Button>
                                        <Button color="secondary" onClick={() => handleDelete(enquiry.id)}><DeleteForever /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
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
        </div>
    );
};

export default QuotationList;
