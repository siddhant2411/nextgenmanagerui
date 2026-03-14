import dayjs from "dayjs";

/**
 * Format a number as Indian Rupee currency.
 * e.g. 150000 → "₹1,50,000.00"
 */
export const formatINR = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(Number(value))) return "—";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(Number(value));
};

/**
 * Format a number with Indian grouping (no currency symbol).
 * e.g. 150000 → "1,50,000"
 */
export const formatNumber = (value, decimals = 0) => {
    if (value === null || value === undefined || isNaN(Number(value))) return "—";
    return new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(Number(value));
};

/**
 * Format a date string to DD-MMM-YYYY (e.g. "14-Mar-2026").
 */
export const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = dayjs(dateStr);
    return d.isValid() ? d.format("DD-MMM-YYYY") : "—";
};

/**
 * Format a date string to DD MMM YYYY (e.g. "14 Mar 2026") — table display.
 */
export const formatDateShort = (dateStr) => {
    if (!dateStr) return "—";
    const d = dayjs(dateStr);
    return d.isValid() ? d.format("DD MMM YYYY") : "—";
};

/**
 * Format a date+time string to "DD MMM YYYY, HH:mm".
 */
export const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    const d = dayjs(dateStr);
    return d.isValid() ? d.format("DD MMM YYYY, HH:mm") : "—";
};

/**
 * Returns a human-readable relative label, e.g. "2 days ago", "in 3 days".
 */
export const formatRelativeDay = (dateStr) => {
    if (!dateStr) return "—";
    const d = dayjs(dateStr);
    if (!d.isValid()) return "—";
    const diff = d.diff(dayjs(), "day");
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff > 0) return `in ${diff} days`;
    return `${Math.abs(diff)} days ago`;
};
