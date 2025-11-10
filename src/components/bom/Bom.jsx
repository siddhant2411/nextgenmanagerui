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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const setLoadingStable = useCallback((val) => setLoading(val), []);
    const setErrorStable = useCallback((val) => setError(val), []);
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);



    const handleAddNewBomClick = () => {
        navigate(`/bom/add/`)
    };


    // const handleExportPDF = () => {
    //     const doc = new jsPDF();
    //     const columns = ['BOM Name', 'Item Code', 'Item Name'];
    //     const rows = bomList.map(item => [
    //         item.bomName,
    //         item.itemCode,
    //         item.name
    //     ]);
    //     autoTable(doc, {
    //         head: [columns],
    //         body: rows
    //     });
    //     doc.save('bom-list.pdf');
    // };

    // const handleExportExcel = () => {
    //     const worksheetData = [
    //         ['BOM Name', 'Item Code', 'Item Name'],
    //         ...bomList.map(item => [item.bomName, item.itemCode, item.name])
    //     ];
    //     const worksheet = XLSXUtils.aoa_to_sheet(worksheetData);
    //     const workbook = XLSXUtils.book_new();
    //     XLSXUtils.book_append_sheet(workbook, worksheet, 'BOM List');
    //     writeFile(workbook, 'bom-list.xlsx');
    // };



    const handleClose = (_, reason) => {
        if (reason === "clickaway") return;
        setError(null)
        setOpen(false);

    };

    useEffect(() => {
        if (error !== null) {
            setOpen(true)
        }
    }, [error])
    return (
        <Box sx={{ p: 3 }}>
            <Routes>
                <Route
                    path="/"
                    element={
                        <BomList
                            // onExportExcel={handleExportExcel}
                            // onExportPDF={handleExportPDF}
                            setLoading={setLoadingStable}
                            loading={loading}
                            setError={setErrorStable}
                            handleAddNewBomClick={handleAddNewBomClick}
                        />
                    }
                />

                <Route
                    path="/add"
                    element={
                        <AddBom

                        />
                    }
                />

                <Route path="/edit/:bomId" element={<AddBom />} />
            </Routes>

            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={handleClose}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                    onClose={handleClose}
                    severity="error"
                    sx={{ width: "100%" }}
                    variant="filled"
                >
                    {error}
                </Alert>
            </Snackbar>

        </Box>
    );
};

export default Bom;