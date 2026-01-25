import apiService from "./apiService";

export const downloadBomAttachment = (fileId, fileName) => {
    return apiService.download(
        `/bom/download/${fileId}`,
        null,
        fileName
    );
};

export const uploadBomAttachment = (bomId, file) => {

    console.log(file)
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

export const downloadBomExcel = (bomId) => {
    return apiService.download(
        `/bom/${bomId}/export`, null,
        "BOM_" + bomId + ".xlsx")

};