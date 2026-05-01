import apiService from './apiService';

const productionAnalyticsService = {
    // OEE Endpoints
    getMachineOEE: async (machineId, date) => {
        const params = date ? { date } : {};
        return await apiService.get(`/production/analytics/oee/machine/${machineId}`, params);
    },

    getWorkCenterOEE: async (workCenterId, date) => {
        const params = date ? { date } : {};
        return await apiService.get(`/production/analytics/oee/work-center/${workCenterId}`, params);
    },

    getMachineTrend: async (machineId, startDate, endDate) => {
        return await apiService.get(`/production/analytics/oee/machine/${machineId}/trend`, {
            startDate,
            endDate
        });
    },

    // Downtime Endpoints
    getDowntimeReasons: async () => {
        return await apiService.get('/production/downtime/reasons');
    },

    createDowntimeReason: async (reason) => {
        return await apiService.post('/production/downtime/reasons', reason);
    },

    startDowntime: async (request) => {
        return await apiService.post('/production/downtime/start', request);
    },

    stopDowntime: async (eventId) => {
        return await apiService.post(`/production/downtime/stop/${eventId}`);
    },

    getActiveDowntime: async (machineId) => {
        return await apiService.get(`/production/downtime/active/${machineId}`);
    }
};

export default productionAnalyticsService;
