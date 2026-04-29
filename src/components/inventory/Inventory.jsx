import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import InventoryList from './InventoryList';
import { Button } from 'react-bootstrap';
import InventoryForm from './InventoryForm';
import { addInventory, getPresentInventory, updateInventory } from '../../services/inventoryService';

const Inventory = () => {
    const [loading, setLoading] = useState(false);
    const [inventoryList, setInventoryList] = useState([]);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('inventoryItemRef');
    const [sortDir, setSortDir] = useState('asc');
    const [filters, setFilters] = useState({
        itemCode: '',
        name: '',
        hsnCode: '',
        itemType: '',
        uom: '',
    });

    const itemsPerPage = 10;
    const navigate = useNavigate();
    const location = useLocation();
    const debounceTimeout = useRef(null);

    // Handle filter changes
    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            fetchInventoryList(currentPage, sortBy, sortDir, newFilters);
        }, 1500);
    };

    const handleSort = (column) => {
        const newSortDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortDir(newSortDir);
        fetchInventoryList(currentPage, column, newSortDir, filters);
    };

    const handleAdd = () => {
        navigate('add');
    };

    const handleSave = async (data) => {
        try {
            if (data.id) {
                await updateInventory(data.id, data); // Update
            } else {
                await addInventory(data); // Create
            }
            navigate(-1);
        } catch (err) {
            // handled
        }
    };

    const fetchInventoryList = useCallback(
        async (page = currentPage, sort = sortBy, dir = sortDir, filters) => {
            setLoading(true);
            setError(null); // Reset error state
            try {
                const params = {
                    page: page - 1, // API expects zero-based page index
                    size: itemsPerPage,
                    sortBy: sort,
                    sortDir: dir,
                    ...filters, // Pass filters in API request
                };

                const data = await getPresentInventory(params);
                setInventoryList(data.content || []);
                setTotalPages(data.totalPages || 1);
                setCurrentPage(page);
            } catch (err) {
                setError('Failed to fetch inventory list');
            } finally {
                setLoading(false);
            }
        },
        [currentPage, sortBy, sortDir]
    );

    const handlePageChange = (event, page) => {
        setCurrentPage(page);
        fetchInventoryList(page, sortBy, sortDir, filters);
    };

    useEffect(() => {
        if (location.pathname === '/inventory') {
            fetchInventoryList(currentPage, sortBy, sortDir, filters);
        }
    }, [location]);

    if (loading) {
        return (
            <div className="text-center">
                <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
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
                        <InventoryList
                            inventoryList={inventoryList}
                            setSortBy={setSortBy}
                            setSortDir={setSortDir}
                            filters={filters}
                            handleSort={handleSort}
                            onFilterChange={handleFilterChange}
                            handleAdd={handleAdd}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            handlePageChange={handlePageChange}
                        />
                    }
                />
                <Route
                    path="/add"
                    element={
                        <InventoryForm
                            onSave={handleSave}
                            initialData={null}
                        />
                    }
                />

            </Routes>
        </div>
    );
};

export default Inventory;
