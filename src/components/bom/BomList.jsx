// BomList.jsx - List all BOMs with view/edit/delete/export functionality
import React, { useRef } from 'react';
import {
    Box, Typography, Table, TableHead, TableBody, TableRow, TableCell,
    Button, TableContainer, Paper, IconButton, TextField, Pagination, InputAdornment,
    Tooltip
} from '@mui/material';
import { Edit, Delete, Search, PictureAsPdf, FileDownload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import './style/bom.css';

const BomList = ({
    bomList = [],
    sortBy,
    onSortChange,
    sortDir,
    searchQuery,
    onDeleteBom,
    currentPage,
    totalPages,
    onPageChange,
    setSearchQuery,
    onSearchSubmit,
    fetchBomList,
    onExportExcel,
    onExportPDF
}) => {
    const navigate = useNavigate();
    const debounceTimeout = useRef(null);

    const columnMapping = {
        bomName: "BOM Name",
        itemCode: "Item Code",
        name: "Item Name"
    };
    const excludedColumns = ["id"];
    const columns = Object.keys(bomList[0] || {}).filter(
        (column) => !excludedColumns.includes(column)
    );

    const handleEditClick = (id) => navigate(`/bom/edit/${id}`);

    const handleDeleteClick = (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            onDeleteBom(id);
        }
    };

    const handleChange = (event) => {
        const query = event.target.value;
        setSearchQuery(query);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            fetchBomList(1, sortBy, sortDir, query);
        }, 500);
    };

    return (
        <Box className="bom-list" sx={{ p: 3, backgroundColor: '#fff', borderRadius: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Search BOMs..."
                    value={searchQuery}
                    onChange={handleChange}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        )
                    }}
                />

                <Box display="flex" gap={1}>
                    <Tooltip title="Export to Excel">
                        <IconButton color="primary" onClick={onExportExcel}>
                            <FileDownload />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Export to PDF">
                        <IconButton color="error" onClick={onExportPDF}>
                            <PictureAsPdf />
                        </IconButton>
                    </Tooltip>
                    <Button variant="contained" color="primary" onClick={() => navigate('/bom/add')}>
                        Add BOM
                    </Button>
                </Box>
            </Box>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            {columns.map((column) => (
                                <TableCell
                                    key={column}
                                    onClick={() => onSortChange(column)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {columnMapping[column] || column}
                                    {sortBy === column && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                                </TableCell>
                            ))}
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bomList.map((item) => (
                            <TableRow key={item.id}>
                                {columns.map((column) => (
                                    <TableCell key={column}>{item[column]}</TableCell>
                                ))}
                                <TableCell>
                                    <IconButton onClick={() => handleEditClick(item.id)}><Edit /></IconButton>
                                    <IconButton color="error" onClick={() => handleDeleteClick(item.id)}><Delete /></IconButton>
                                    
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={2}>
                <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(e, page) => onPageChange(page)}
                    variant="outlined"
                    color="primary"
                />
            </Box>
        </Box>
    );
};

export default BomList;
