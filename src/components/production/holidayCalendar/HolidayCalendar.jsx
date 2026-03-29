import React from 'react';
import { Route, Routes } from 'react-router-dom';
import HolidayCalendarList from './HolidayCalendarList';
import HolidayCalendarForm from './HolidayCalendarForm';
import HolidayCalendarDetail from './HolidayCalendarDetail';
import RoleProtectedRoute from '../../../auth/RoleProtectedRoute';
import { PRODUCTION_ACCESS_ROLES } from '../../../auth/roles';

export default function HolidayCalendar() {
    return (
        <Routes>
            <Route path="/" element={<HolidayCalendarList />} />
            <Route
                path="/add"
                element={
                    <RoleProtectedRoute allowedRoles={PRODUCTION_ACCESS_ROLES}>
                        <HolidayCalendarForm />
                    </RoleProtectedRoute>
                }
            />
            <Route
                path="/edit/:id"
                element={
                    <RoleProtectedRoute allowedRoles={PRODUCTION_ACCESS_ROLES}>
                        <HolidayCalendarForm />
                    </RoleProtectedRoute>
                }
            />
            <Route
                path="/detail/:id"
                element={
                    <RoleProtectedRoute allowedRoles={PRODUCTION_ACCESS_ROLES}>
                        <HolidayCalendarDetail />
                    </RoleProtectedRoute>
                }
            />
            <Route
                path="/:id"
                element={
                    <RoleProtectedRoute allowedRoles={PRODUCTION_ACCESS_ROLES}>
                        <HolidayCalendarDetail />
                    </RoleProtectedRoute>
                }
            />
        </Routes>
    );
}
