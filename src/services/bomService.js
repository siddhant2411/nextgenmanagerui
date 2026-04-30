import apiService from "./apiService";

export const downloadBomAttachment = (fileId, fileName) => {
    return apiService.download(
        `/bom/download/${fileId}`,
        null,
        fileName
    );
};

export const uploadBomAttachment = (bomId, file) => {

    return apiService.upload(
        `/bom/upload/${bomId}`,
        file
    )
        ;
};

export const deleteBomAttachment = (bomId, fileId) => {
    return apiService.delete(`/bom/${bomId}/delete-attachment/${fileId}`)
}

export const duplicateBom = (bomId) => {
    return apiService.post(`/bom/${bomId}/duplicate`, {})
}

export const downloadFlatBomExcel = (ids) => {
    return apiService.download(
        `/bom/export/flat`,
        { ids: Array.isArray(ids) ? ids.join(',') : ids },
        "Flat_BOM_Export.xlsx"
    );
};

export const downloadIndentedBomExcel = (ids) => {
    return apiService.download(
        `/bom/export/indented`,
        { ids: Array.isArray(ids) ? ids.join(',') : ids },
        "Indented_BOM_Export.xlsx"
    );
};

export const downloadManufacturingBomPdf = (ids) => {
    return apiService.download(
        `/bom/export/pdf`,
        { ids: Array.isArray(ids) ? ids.join(',') : ids },
        "Manufacturing_BOM_Sheet.pdf"
    );
};

export const downloadBomJobSheet = (ids) => {
    return apiService.download(
        `/bom/export/job-sheet`,
        { ids: Array.isArray(ids) ? ids.join(',') : ids },
        "BOM_Job_Sheet.pdf"
    );
};

export const getActiveBomByItemid = (itemId) => {
    return apiService.get(`/bom/active-by-item/${itemId}`);
}

export const getBomHistoryByInventoryItem = (itemId) => {
    return apiService.get(`/bom/${itemId}/bom-history`);
}

export const getBomPositisions = (bomId) => {
    return apiService.get(`/bom/positions/${bomId}`);
}

export const getWhereUsedByItemId = (itemId) => {
    return apiService.get(`/bom/where-used/${itemId}`);
}

export const getBomChangeLog = (bomId) => {
    return apiService.get(`/bom/${bomId}/change-log`);
}

export const getBomCostBreakdown = (bomId) => {
    return apiService.get(`/bom/${bomId}/cost-breakdown`);
}

// ---- Routing Operation Attachments ----

export const uploadOperationAttachment = (operationId, file) => {
    return apiService.upload(`/manufacturing/routing/operation/${operationId}/upload`, file);
};

export const getOperationAttachments = (operationId) => {
    return apiService.get(`/manufacturing/routing/operation/${operationId}/attachments`);
};

export const deleteOperationAttachment = (operationId, fileId) => {
    return apiService.delete(`/manufacturing/routing/operation/${operationId}/delete-attachment/${fileId}`);
};

export const downloadOperationAttachment = (fileId, fileName) => {
    return apiService.download(`/manufacturing/routing/operation/download/${fileId}`, null, fileName);
};
