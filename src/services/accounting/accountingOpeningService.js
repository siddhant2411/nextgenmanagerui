import { apiClientFile } from "../apiService";
import apiService from "../apiService";

export const importOpeningBalances = async (file, openingDate) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClientFile.post(
        `/accounting/opening-balance/import?openingDate=${openingDate}`,
        formData,
        { headers: { Accept: "application/json" } }
    );
    return response.data;
};

export const setFyOpeningDate = (fyId, openingDate) =>
    apiService.patch(`/accounting/opening-balance/financial-years/${fyId}/opening-date`, null, {
        params: { openingDate },
    });
