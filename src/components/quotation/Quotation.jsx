import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Routes, useLocation, useNavigate,Route} from "react-router-dom";
import apiService from "../../services/apiService";
import {CircularProgress} from "@mui/material";
import QuotationList from "./QuotationList";
import AddUpdateEnquiry from "../enquiry/AddUpdateEnquiry";
import AddUpdateQuotation from "./AddUpdateQuotation";

const Quotation = () => {

    const [loading, setLoading] = useState(false);
    const [quotationList, setQuotationList] = useState([]);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('asc');
    const [filters, setFilters] = useState({
        companyName: null,
        qtnNo: null,
        qtnDate:null,
        enqNo:null,
        enqDate: null,
        netAmount:null,
        totalAmount:null
    });

    const itemsPerPage = 5;
    const navigate = useNavigate();
    const location = useLocation();
    const debounceTimeout = useRef(null);

    const fetchQuotationList = useCallback(
        async (page = currentPage, sort = sortBy, dir = sortDir, filters) => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    page: page - 1,
                    size: itemsPerPage,
                    sortBy: sort,
                    sortDir: dir,
                    ...filters,
                };
                const data = await apiService.get('/quotation', params);
                setQuotationList(data.content || []);
                setTotalPages(data.totalPages || 1);
            } catch (err) {
                setError('Failed to fetch enquiry list');
            } finally {
                setLoading(false);
            }
        },
        [itemsPerPage, currentPage, sortBy, sortDir]
    );

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };

        setFilters(newFilters);

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            fetchQuotationList(currentPage, sortBy, sortDir, newFilters);
        }, 1500);
    };

    const handleSort = (column) => {
        const newSortDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDir(newSortDir);
        fetchQuotationList(currentPage, column, newSortDir, filters);
    };

    const handleAdd = () => {
        navigate('add');
    };


    const handleSave = async (data) => {
        try {
            if (data.id) {
                await apiService.put(`/quotation/${data.id}`, data); // Update
            } else {
                await apiService.post('/quotation', data); // Create
            }
            navigate(-1);
        } catch (err) {
            // handled
        }
    };

    const handleDelete = async (id) => {
        await apiService.delete(`/quotation/${id}`);
        fetchQuotationList()
    };

    const handlePageChange = (event, page) => {
        setCurrentPage(page);
        fetchQuotationList(page, sortBy, sortDir, filters);
    };

    useEffect(() => {
        if (location.pathname === '/quotation') {
            fetchQuotationList(currentPage, sortBy, sortDir, filters);
        }
    }, [location]);

    useEffect(() => {
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);

    if (loading) {
        return (
            <CircularProgress/>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Error: {error}</div>;
    }


    return (
        <div>
            <Routes>
                <Route
                    path="/"
                    element={
                <QuotationList
                    handleSort={handleSort}
                    filters={filters}
                    handleFilterChange={handleFilterChange}
                    quotationList={quotationList}
                    handleDelete={handleDelete}
                    totalPages={totalPages}
                    currentPage={currentPage}
                    handlePageChange={handlePageChange}/>
                    }
                />

                <Route path="/add"
                       element={
                           <AddUpdateQuotation
                               onSave={handleSave}
                           />
                       } />

                <Route
                    path="/edit/:quotationId"
                    element={
                        <AddUpdateQuotation
                            onSave={handleSave}
                        />
                    }
                />
            </Routes>
        </div>
    );
};

export default Quotation;
