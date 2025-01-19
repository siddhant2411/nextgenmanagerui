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
    Select, Pagination
} from "@mui/material";
import { DeleteForever, EditOutlined } from "@mui/icons-material";

const EnquiryLIst = ({ enquiryList, filters, handleSort, currentPage, totalPages, handlePageChange, handleFilterChange, handleDelete }) => {
    const navigate = useNavigate();

    const handleEdit = (id) => {
        navigate(`/enquiry/edit/${id}`);
    };

    const columnHeader = [
        { key: 'enqNo', value: "enquiry No" },
        { key: "enqDate", value: "enquiry Date" },
        { key: "companyName", value: "Company Name" },
        { key: "lastContactedDate", value: "Last Contacted" },
        { key: "daysForNextFollowup", value: "Next Followup (Days)" },
        { key: "closedDate", value: "Status" },
        { key: "action", value: "Action" }
    ];

    return (
        <div>
            <Box>
                {console.log(filters)}
                <Typography variant="h4" gutterBottom>Enquiry List</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    style={{ float: "right", marginBottom: "2rem" }}
                    onClick={() => navigate('add')}
                >
                    New Enquiry
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
                                            cursor: ['enqNo', 'companyName', 'daysForNextFollowup'].includes(column.key) ? 'pointer' : 'default'
                                        }}
                                        onClick={() =>
                                            ["enqNo", "companyName", "daysForNextFollowup"].includes(column.key) && handleSort(column.key)
                                        }
                                    >
                                        {column.value}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableHead>
                            <TableRow>
                                {columnHeader.map((columnHead, index) => (
                                    <TableCell key={index} align="center">
                                        {['enqNo', 'companyName', 'daysForNextFollowup'].includes(columnHead.key) ? (
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
                                        ) : columnHead.key === 'enqDate' || columnHead.key === 'lastContactedDate' ? (
                                            <Box display="flex" alignItems="center" justifyContent="center">
                                                <Select
                                                    value={filters[columnHead.key]?.operator || "="}
                                                    onChange={(e) =>
                                                        handleFilterChange(columnHead.key==="enqDate"?
                                                            "enqDateComp":"lastContactedDateComp", e.target.value )}
                                                    sx={{ marginRight: 1 }}
                                                >
                                                    <MenuItem value="=">=</MenuItem>
                                                    <MenuItem value="<">&lt;</MenuItem>
                                                    <MenuItem value=">">&gt;</MenuItem>
                                                </Select>
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
                            {enquiryList.map((enquiry, rowIndex) => (
                                <TableRow
                                    key={enquiry.id}
                                    sx={{
                                        backgroundColor: rowIndex % 2 === 0 ? '#fafafa' : '#fff',
                                        '&:hover': { backgroundColor: '#f1f1f1' }
                                    }}
                                >
                                    <TableCell align="center">{enquiry.enqNo}</TableCell>
                                    <TableCell align="center">{enquiry.enqDate}</TableCell>
                                    <TableCell align="center">{enquiry.companyName || 'N/A'}</TableCell>
                                    <TableCell align="center">{enquiry.lastContactDate || 'N/A'}</TableCell>
                                    <TableCell align="center">{enquiry.daysForNextFollowup || 'N/A'}</TableCell>
                                    <TableCell align="center">{!enquiry.closedDate ? "Open" : "Closed"}</TableCell>
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

export default EnquiryLIst;
