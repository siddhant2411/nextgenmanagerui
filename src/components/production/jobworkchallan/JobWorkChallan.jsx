import React from 'react';
import { Route, Routes } from 'react-router-dom';
import JobWorkChallanList from './JobWorkChallanList';
import JobWorkChallanForm from './JobWorkChallanForm';
import JobWorkChallanDetail from './JobWorkChallanDetail';

export default function JobWorkChallan() {
    return (
        <Routes>
            <Route index element={<JobWorkChallanList />} />
            <Route path="new" element={<JobWorkChallanForm />} />
            <Route path=":id" element={<JobWorkChallanDetail />} />
            <Route path=":id/edit" element={<JobWorkChallanForm />} />
        </Routes>
    );
}
