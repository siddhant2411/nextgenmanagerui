import React from 'react';
import { Routes, Route } from 'react-router-dom';
import JobWorkChallan from '../components/production/jobworkchallan/JobWorkChallan';

export default function JobWorkChallanPage() {
    return (
        <Routes>
            <Route path="/*" element={<JobWorkChallan />} />
        </Routes>
    );
}
