import apiService from "../apiService";
import { apiClientFile } from "../apiService";

// file: File object, openingDate: "YYYY-MM-DD"
export const importOpeningBalances = async (file, openingDate) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClientFile.post(
        `/accounting/opening-balance/import`,
        formData,
        {
            headers: { Accept: "application/json" },
            params: { openingDate },
        }
    );
    return response.data;
};

export const setOpeningDate = (fyId, openingDate) =>
    apiService.patch(
        `/accounting/opening-balance/financial-years/${fyId}/opening-date`,
        null,
        { params: { openingDate } }
    );
