import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import InventoryItemList from './InventoryItemList';
import AddInventoryItem from './AddInventoryItem';
import apiService from '../../services/apiService';
import { Box, Button, Typography } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import './style/InventoryItem.css'
const InventoryItem = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('inventoryItemId');
  const [sortDir, setSortDir] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemPerPage] = useState(10);

  const navigate = useNavigate();
  const location = useLocation();

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
      setCurrentPage(0);
    } catch (err) {
      setError('Failed to fetch inventory items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location.pathname === '/inventory-item') {
      fetchInventoryItems();
    }
  }, [location]);

  const performSearch = () => {
    fetchInventoryItems(1, sortBy, sortDir, searchQuery);
  };



  const handleAddNewItemClick = () => {
    const url = `${window.location.origin}${window.location.pathname}/add`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const deleteInventoryItem = async (id) => {
    try {
      await apiService.delete(`/inventory_item/${id}`);
      fetchInventoryItems(currentPage, sortBy, sortDir, searchQuery);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <InventoryItemList
                inventoryItems={items}
                setInventoryItems={setItems}
                currentPage={currentPage}
                totalPages={totalPages}
                sortBy={sortBy}
                sortDir={sortDir}
                setSortBy={setSortBy}
                setSortDir={setSortDir}
                onDeleteItem={deleteInventoryItem}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                itemsPerPage={itemsPerPage}
                setItemPerPage={setItemPerPage}
                setTotalPages={setTotalPages}
                setCurrentPage={setCurrentPage}
                loading={loading}
                error={error}
                handleAddNewItemClick={handleAddNewItemClick}
              />
            </>
          }
        />
        <Route path="/add" element={<AddInventoryItem />} />
        <Route path="/edit/:id" element={<AddInventoryItem />} />
      </Routes>
    </Box>
  );
};

export default InventoryItem;