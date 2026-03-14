import React from 'react'
import { Route, Routes } from 'react-router-dom'
import AddWorkCenter from './AddWorkCenter'
import WorkCenterList from './WorkCenterList'
import RoleProtectedRoute from '../../../auth/RoleProtectedRoute'
import { PRODUCTION_ACCESS_ROLES } from '../../../auth/roles'

export default function WorkCenter() {
  return (
    <Routes>
      <Route path='/' element={<WorkCenterList />} />
      <Route path='/add' element={
        <RoleProtectedRoute allowedRoles={PRODUCTION_ACCESS_ROLES}>
          <AddWorkCenter />
        </RoleProtectedRoute>
      } />
      <Route path='/edit/:id' element={
        <RoleProtectedRoute allowedRoles={PRODUCTION_ACCESS_ROLES}>
          <AddWorkCenter />
        </RoleProtectedRoute>
      } />
    </Routes>
  )
}
