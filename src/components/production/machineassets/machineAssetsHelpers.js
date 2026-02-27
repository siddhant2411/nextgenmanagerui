import dayjs from "dayjs";

export const parseNumberInput = (value) => {
    if (value === "" || value === null || value === undefined) {
        return null;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};

export const isNonNegative = (value) => {
    const parsed = parseNumberInput(value);
    return parsed !== null && parsed >= 0;
};

export const validateEventTimeRange = (startTime, endTime) => {
    if (!startTime || !endTime) {
        return "";
    }
    const start = dayjs(startTime);
    const end = dayjs(endTime);
    if (!start.isValid() || !end.isValid()) {
        return "Invalid date/time value.";
    }
    if (end.isBefore(start)) {
        return "End time must be greater than or equal to start time.";
    }
    return "";
};

export const validateProductionLogValues = (values = {}) => {
    const errors = {};
    const requiredFields = [
        "productionDate",
        "plannedQuantity",
        "actualQuantity",
        "rejectedQuantity",
        "runtimeMinutes",
        "downtimeMinutes",
    ];

    requiredFields.forEach((field) => {
        if (values[field] === "" || values[field] === null || values[field] === undefined) {
            errors[field] = "Required";
        }
    });

    [
        "plannedQuantity",
        "actualQuantity",
        "rejectedQuantity",
        "runtimeMinutes",
        "downtimeMinutes",
    ].forEach((field) => {
        if (values[field] === "" || values[field] === null || values[field] === undefined) {
            return;
        }
        if (!isNonNegative(values[field])) {
            errors[field] = "Must be zero or greater";
        }
    });

    return errors;
};

export const normalizePageResponse = (response) => {
    if (Array.isArray(response)) {
        return {
            content: response,
            number: 0,
            size: response.length,
            totalElements: response.length,
            totalPages: 1,
        };
    }

    if (response && Array.isArray(response.content)) {
        return {
            content: response.content,
            number: response.number ?? 0,
            size: response.size ?? response.content.length ?? 0,
            totalElements: response.totalElements ?? response.content.length ?? 0,
            totalPages: response.totalPages ?? 1,
        };
    }

    return {
        content: [],
        number: 0,
        size: 0,
        totalElements: 0,
        totalPages: 0,
    };
};

export const formatDateTime = (value) => {
    if (!value) {
        return "-";
    }
    const parsed = dayjs(value);
    if (!parsed.isValid()) {
        return String(value);
    }
    return parsed.format("DD MMM YYYY, HH:mm");
};

export const resolveMachineErrorMessage = (error, fallbackMessage) => {
    const payload = error?.response?.data;
    const messageFromPayload =
        payload?.message || payload?.error || (typeof payload === "string" ? payload : "");
    const directMessage = typeof error?.message === "string" ? error.message : "";

    if (typeof messageFromPayload === "string" && messageFromPayload.trim()) {
        return messageFromPayload;
    }

    if (directMessage.trim()) {
        return directMessage;
    }

    return fallbackMessage;
};

const pickFirstNonEmptyString = (values = []) => {
    const match = values.find(
        (value) => value !== null && value !== undefined && String(value).trim()
    );
    return match === null || match === undefined ? "" : String(match).trim();
};

export const getWorkCenterValue = (workCenter) => {
    if (typeof workCenter === "string") {
        return workCenter.trim();
    }

    if (workCenter && typeof workCenter === "object") {
        return pickFirstNonEmptyString([
            workCenter.centerCode,
            workCenter.centerName,
            workCenter.id,
        ]);
    }

    return "";
};

export const getWorkCenterDisplayValue = (workCenter) => {
    if (typeof workCenter === "string") {
        return workCenter.trim();
    }

    if (workCenter && typeof workCenter === "object") {
        const centerCode = pickFirstNonEmptyString([workCenter.centerCode]);
        const centerName = pickFirstNonEmptyString([workCenter.centerName]);
        if (centerCode && centerName) {
            return `${centerCode} - ${centerName}`;
        }
        return pickFirstNonEmptyString([
            centerCode,
            centerName,
            workCenter.description,
            workCenter.id,
        ]);
    }

    return "";
};
