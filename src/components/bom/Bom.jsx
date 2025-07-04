// Bom.jsx - Main BOM route and controller
import React, { useCallback, useEffect, useState } from 'react';
import apiService from "../../services/apiService";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import BomList from "./BomList";
import "./style/bom.css";
import AddBom from "./AddBom";
import { CircularProgress, Box, Typography, Snackbar, Alert } from "@mui/material";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { utils as XLSXUtils, writeFile } from 'xlsx';

const Bom = () => {
    const [bomList, setBomList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const itemsPerPage = 5;
    const navigate = useNavigate();
    const location = useLocation();

    const fetchBomList = useCallback(async (page = 1, sort = 'id', dir = 'asc', search = '') => {
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: itemsPerPage,
                sortBy: sort,
                sortDir: dir,
                search,
            };
            const data = await apiService.get('/bom/all', params);
            setBomList(data.content);
            setTotalPages(data.totalPages);
            setCurrentPage(page);
        } catch (err) {
            setError('Failed to fetch BOM list');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSortChange = (sortField) => {
        const newSortDir = sortBy === sortField && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(sortField);
        setSortDir(newSortDir);
        fetchBomList(currentPage, sortField, newSortDir, searchQuery);
    };

    const performSearch = () => {
        fetchBomList(1, sortBy, sortDir, searchQuery);
    };

    useEffect(() => {
        if (location.pathname === '/bom') {
            fetchBomList();
        }
    }, [location]);

    const handlePageChange = (page) => {
        fetchBomList(page, sortBy, sortDir, searchQuery);
    };

    const deleteBom = async (id) => {
        try {
            await apiService.delete(`/bom/${id}`);
            setSnackbar({ open: true, message: 'Item deleted successfully!', severity: 'success' });
            fetchBomList(currentPage, sortBy, sortDir, searchQuery);
        } catch (err) {
            setSnackbar({ open: true, message: 'Failed to delete item. Please try again.', severity: 'error' });
            console.error(err);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const columns = ['BOM Name', 'Item Code', 'Item Name'];
        const rows = bomList.map(item => [
            item.bomName,
            item.itemCode,
            item.name
        ]);
        autoTable(doc, {
            head: [columns],
            body: rows
        });
        doc.save('bom-list.pdf');
    };

    const handleExportExcel = () => {
        const worksheetData = [
            ['BOM Name', 'Item Code', 'Item Name'],
            ...bomList.map(item => [item.bomName, item.itemCode, item.name])
        ];
        const worksheet = XLSXUtils.aoa_to_sheet(worksheetData);
        const workbook = XLSXUtils.book_new();
        XLSXUtils.book_append_sheet(workbook, worksheet, 'BOM List');
        writeFile(workbook, 'bom-list.xlsx');
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    return (
        <Box className="bom">
            <Routes>
                <Route
                    path="/"
                    element={
                        <BomList
                            bomList={bomList}
                            sortBy={sortBy}
                            onSortChange={handleSortChange}
                            sortDir={sortDir}
                            searchQuery={searchQuery}
                            onDeleteBom={deleteBom}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            setSearchQuery={setSearchQuery}
                            onSearchSubmit={performSearch}
                            fetchBomList={fetchBomList}
                            onExportExcel={handleExportExcel}
                            onExportPDF={handleExportPDF}
                        />
                    }
                />

                <Route
                    path="/add"
                    element={
                        <AddBom
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            onSearchSubmit={performSearch}
                            bomList={bomList}
                            fetchBomList={fetchBomList}
                        />
                    }
                />

                <Route path="/edit/:bomId" element={<AddBom />} />
            </Routes>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Bom;