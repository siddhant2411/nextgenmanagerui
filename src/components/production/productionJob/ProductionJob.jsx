import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProductionJobList from './ProductionJobList';
import AddProductionJob from './AddProductionJob';
import RoleProtectedRoute from '../../../auth/RoleProtectedRoute';
import { PRODUCTION_MANAGE_ROLES } from '../../../auth/roles';
const ProductionJob = () => {
  return (
    <Routes>
      <Route path="/" element={<ProductionJobList />} />
      <Route
        path="/add"
        element={
          <RoleProtectedRoute
            allowedRoles={PRODUCTION_MANAGE_ROLES}
            deniedMessage="You are not authorized to create production jobs."
          >
            <AddProductionJob />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/edit/:id"
        element={
          <RoleProtectedRoute
            allowedRoles={PRODUCTION_MANAGE_ROLES}
            deniedMessage="You are not authorized to edit production jobs."
          >
            <AddProductionJob />
          </RoleProtectedRoute>
        }
      />
    </Routes>
  );
};

export default ProductionJob;
