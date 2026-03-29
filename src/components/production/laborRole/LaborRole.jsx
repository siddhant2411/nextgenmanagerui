import React from 'react'
import { Route, Routes } from 'react-router-dom'
import LaborRoleList from './LaborRoleList'
import AddLaborRole from './AddLaborRole'
import RoleProtectedRoute from '../../../auth/RoleProtectedRoute'
import { PRODUCTION_ACCESS_ROLES } from '../../../auth/roles'

export default function LaborRole() {
  return (
    <Routes>
      <Route path='/' element={<LaborRoleList />} />
      <Route path='/add' element={
        <RoleProtectedRoute allowedRoles={PRODUCTION_ACCESS_ROLES}>
          <AddLaborRole />
        </RoleProtectedRoute>
      } />
      <Route path='/edit/:id' element={
        <RoleProtectedRoute allowedRoles={PRODUCTION_ACCESS_ROLES}>
          <AddLaborRole />
        </RoleProtectedRoute>
      } />
    </Routes>
  )
}
