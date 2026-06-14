import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PlanningDeskPage from "../components/planning/PlanningDeskPage";

const PlanningPage = () => (
    <Routes>
        <Route index element={<Navigate to="desk" replace />} />
        <Route path="desk" element={<PlanningDeskPage />} />
        <Route path="*" element={<Navigate to="desk" replace />} />
    </Routes>
);

export default PlanningPage;
