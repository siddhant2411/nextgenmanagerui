import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Route, Routes, useLocation, useNavigate} from "react-router-dom";
import apiService from "../../services/apiService";
import {CircularProgress} from "@mui/material";
import EnquiryList from "./EnquiryList";
import AddUpdateEnquiry from "./AddUpdateEnquiry";

const Enquiry = () => {
    const [loading, setLoading] = useState(false);
    const [enquiryList, setEnquiryList] = useState([]);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('id');
    const [sortDir, setSortDir] = useState('asc');
    const [filters, setFilters] = useState({
        companyName: '',
        lastContactDate: '',
        enqDate: '',
        closedDate: '',
        daysForNextFollowup: '',
        lastContactedDateComp: '=',
        enqDateComp: '=',
        closedDateComp: '>',
    });

    
    const itemsPerPage = 5;
    const navigate = useNavigate();
    const location = useLocation();
    const debounceTimeout = useRef(null);

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };

        setFilters(newFilters);

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            fetchEnquiryList(currentPage, sortBy, sortDir, newFilters);
        }, 1500);
    };

    const handleSort = (column) => {
        const newSortDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDir(newSortDir);
        fetchEnquiryList(currentPage, column, newSortDir, filters);
    };

    const handleAdd = () => {
        navigate('add');
    };

    const handleSave = async (data) => {

        try {
            if (data.id) {
                await apiService.put(`/enquiry/${data.id}`, data); // Update
            } else {
                await apiService.post('/enquiry', data); // Create
            }
            navigate(-1);
        } catch (err) {
            // handled
        }
    };

    const handleDelete = async (id) => {
        await apiService.delete(`/enquiry/${id}`);
        fetchEnquiryList()
    };
    const fetchEnquiryList = useCallback(
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
                const data = await apiService.get('/enquiry', params);
                setEnquiryList(data.content || []);
                setTotalPages(data.totalPages || 1);
            } catch (err) {
                setError('Failed to fetch enquiry list');
            } finally {
                setLoading(false);
            }
        },
        [itemsPerPage, currentPage, sortBy, sortDir]
    );

    const handlePageChange = (event, page) => {
        setCurrentPage(page);
        fetchEnquiryList(page, sortBy, sortDir, filters);
    };

    useEffect(() => {
        if (location.pathname === '/enquiry') {
            fetchEnquiryList(currentPage, sortBy, sortDir, filters);
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
                    <EnquiryList
                        enquiryList={enquiryList}
                        filters={filters}
                        handleSort={handleSort}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        handlePageChange={handlePageChange}
                        handleFilterChange={handleFilterChange}
                        handleDelete={handleDelete}
                    />

                    }
                />

                <Route path="/add"
                       element={
                           <AddUpdateEnquiry
                               onSave={handleSave}
                           />
                       } />

                <Route
                    path="/edit/:enquiryId"
                    element={
                        <AddUpdateEnquiry
                            onSave={handleSave}

                        />
                    }
                />

            </Routes>
        </div>
    );
};

export default Enquiry;
