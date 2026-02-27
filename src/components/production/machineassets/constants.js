export const MACHINE_STATUS_OPTIONS = [
    "ACTIVE",
    "UNDER_MAINTENANCE",
    "BREAKDOWN",
    "OUT_OF_SERVICE",
];

export const MACHINE_EVENT_TYPE_OPTIONS = ["RUNNING", "IDLE", "BREAKDOWN", "MAINTENANCE"];

export const MACHINE_EVENT_SOURCE_OPTIONS = ["MANUAL", "SYSTEM"];

export const MACHINE_STATUS_COLOR_MAP = {
    ACTIVE: "success",
    UNDER_MAINTENANCE: "warning",
    BREAKDOWN: "error",
    OUT_OF_SERVICE: "default",
};
