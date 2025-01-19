import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import InventoryItemList from './InventoryItemList';
import AddInventoryItem from './AddInventoryItem';
import apiService from '../../services/apiService';
import { Button } from 'react-bootstrap';
import './style/InventoryItem.css';

const InventoryItem = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('inventoryItemId');
    const [sortDir, setSortDir] = useState('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const itemsPerPage = 5;
    const navigate = useNavigate();
    const location = useLocation();

    // Memoized fetch function to prevent unnecessary recreations
    const fetchInventoryItems = useCallback(async (page = 1, sort = 'inventoryItemId', dir = 'asc', search = '') => {
        setLoading(true);
        try {
            const params = {
                page: page - 1,
                size: itemsPerPage,
                sortBy: sort,
                sortDir: dir,
                search,
            };

            const data = await apiService.get('/inventory_item/all', params);
            setItems(data.content);
            setTotalPages(data.totalPages);
            setCurrentPage(page);
        } catch (err) {
            setError('Failed to fetch inventory items');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch on mount
    // useEffect(() => {
    //     fetchInventoryItems();
    // }, [fetchInventoryItems]);



    const performSearch = () => {
        fetchInventoryItems(1, sortBy, sortDir, searchQuery);
    };

    const handlePageChange = (page) => {
        fetchInventoryItems(page, sortBy, sortDir, searchQuery);
    };

    const handleSortChange = (sortField) => {
        const newSortDir = sortBy === sortField && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(sortField);
        setSortDir(newSortDir);
        fetchInventoryItems(currentPage, sortField, newSortDir, searchQuery);
    };

    const handleAddNewItemClick = () => {
        navigate('add');
    };

    const deleteInventoryItem = async (id) => {
        try {
            await apiService.delete(`/inventory_item/${id}`);
            alert('Item deleted successfully!');
            fetchInventoryItems(currentPage, sortBy, sortDir, searchQuery);
        } catch (err) {
            alert('Failed to delete item. Please try again.');
            console.error(err);
        }
    };

    useEffect(() => {
      console.log("LOCATION CHANGE")
        if(location.pathname === '/inventory-item') {
            fetchInventoryItems()
        }
    }, [location]);
    if (loading) {
        console.log("LOGGGING")
        return <div>Loading inventory items...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="inventory-item">
            <h2>Inventory Items</h2>

            <Routes>
                <Route
                    path="/"
                    element={
                        <>
                            <Button
                                className="add-item-btn btn btn-primary"
                                onClick={handleAddNewItemClick}
                            >
                                Create Item
                            </Button>
                            <InventoryItemList
                                inventoryItems={items}
                                setInventoryItems={setItems}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                onSortChange={handleSortChange}
                                sortBy={sortBy}
                                sortDir={sortDir}
                                onDeleteItem={deleteInventoryItem}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                onSearchSubmit={performSearch}
                                fetchInventoryItems={fetchInventoryItems}
                            />
                        </>
                    }
                />
                <Route path="/add" element={<AddInventoryItem />} />
                <Route path="/edit/:id" element={<AddInventoryItem />} />
            </Routes>
        </div>
    );
};

export default InventoryItem;