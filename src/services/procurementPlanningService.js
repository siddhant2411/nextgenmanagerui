import apiService, { resolveApiErrorMessage } from './apiService';

export { resolveApiErrorMessage };

// Procurement Planning Desk — make/buy decisions on needs that could not be auto-routed.

export const getPlanningQueue = () =>
    apiService.get('/procurement-planning/queue');

// `deliverToWarehouse` is the code of the warehouse the goods are wanted in. Left out, the need
// keeps the warehouse it was raised with.
const deliverTo = (deliverToWarehouse) =>
    (deliverToWarehouse ? { params: { deliverToWarehouse } } : {});

export const decideMake = (procurementOrderId, deliverToWarehouse) =>
    apiService.post(`/procurement-planning/${procurementOrderId}/make`, null, deliverTo(deliverToWarehouse));

export const decideBuy = (procurementOrderId, deliverToWarehouse) =>
    apiService.post(`/procurement-planning/${procurementOrderId}/buy`, null, deliverTo(deliverToWarehouse));

export const deferNeed = (procurementOrderId) =>
    apiService.post(`/procurement-planning/${procurementOrderId}/defer`);

const procurementPlanningService = {
    getPlanningQueue,
    decideMake,
    decideBuy,
    deferNeed,
};

export default procurementPlanningService;
