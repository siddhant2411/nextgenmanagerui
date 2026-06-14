import apiService, { resolveApiErrorMessage } from './apiService';

export { resolveApiErrorMessage };

// Procurement Planning Desk — make/buy decisions on needs that could not be auto-routed.

export const getPlanningQueue = () =>
    apiService.get('/procurement-planning/queue');

export const decideMake = (procurementOrderId) =>
    apiService.post(`/procurement-planning/${procurementOrderId}/make`);

export const decideBuy = (procurementOrderId) =>
    apiService.post(`/procurement-planning/${procurementOrderId}/buy`);

export const deferNeed = (procurementOrderId) =>
    apiService.post(`/procurement-planning/${procurementOrderId}/defer`);

const procurementPlanningService = {
    getPlanningQueue,
    decideMake,
    decideBuy,
    deferNeed,
};

export default procurementPlanningService;
