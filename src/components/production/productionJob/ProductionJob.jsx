import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ProductionJobList from './ProductionJobList';
import AddProductionJob from './AddProductionJob';
import apiService from '../../../services/apiService';
const ProductionJob = () => {
  const navigate = useNavigate();
  const location = useLocation();



  return (
    <Routes>
      <Route path="/" element={<ProductionJobList />} />
      <Route path="/add" element={<AddProductionJob />} />
       <Route path="/edit/:id" element={<AddProductionJob />} />
    </Routes>
  );
};

export default ProductionJob;
