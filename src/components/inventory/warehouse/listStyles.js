/**
 * Shared design tokens for the Warehouse and Picking screens.
 *
 * Taken from the Sales Order hub so these read as the same product: dark hero band with glassy
 * stat cards, content lifted over it, alert rails on the left, registry in a rounded card.
 */

export const T = {
    primary: "#2563eb",
    success: "#059669",
    error: "#dc2626",
    warning: "#d97706",
    violet: "#8b5cf6",
    bg: "#f8fafc",
    card: "#ffffff",
    border: "#e2e8f0",
    text: "#0f172a",
    textSec: "#64748b",
};

export const BORDER_COLOR = T.border;
export const HEADER_BG = T.bg;
export const INK = T.text;
export const INK_SOFT = "#334155";
export const MUTED = T.textSec;

/** The dark band behind the page title and its stat cards. */
export const heroSx = {
    bgcolor: "#0f172a",
    backgroundImage:
        "radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.1) 0%, transparent 50%), " +
        "radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 50%)",
    color: "white",
    pt: 6,
    pb: 12,
};

/** Frosted card that sits on the dark band. */
export const statCardSx = {
    p: 3,
    borderRadius: 4,
    bgcolor: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    backdropFilter: "blur(10px)",
};

export const surfaceSx = {
    borderRadius: 4,
    border: `1px solid ${T.border}`,
    bgcolor: "white",
    overflow: "hidden",
    boxShadow: "0 4px 20px 0 rgba(0,0,0,0.03)",
};

export const headerCellSx = {
    fontWeight: 700,
    fontSize: "0.65625rem",
    color: MUTED,
    bgcolor: HEADER_BG,
    borderBottom: `1px solid ${T.border}`,
    whiteSpace: "nowrap",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
};

export const clickableRowSx = {
    cursor: "pointer",
    "&:hover": { bgcolor: "#f1f5f9" },
    transition: "background-color 0.1s",
};

export const chipSx = (cfg) => ({
    fontSize: "0.7rem",
    fontWeight: 700,
    bgcolor: cfg.bg,
    color: cfg.color,
    height: 20,
    border: `1px solid ${cfg.color}30`,
});

export const primaryButtonSx = {
    bgcolor: T.primary,
    borderRadius: 2.5,
    px: 3,
    fontWeight: 800,
    textTransform: "none",
    boxShadow: "0 4px 14px 0 rgba(37, 99, 235, 0.4)",
};

export const heroIconButtonSx = {
    border: "1px solid rgba(255,255,255,0.1)",
    color: "white",
    "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
};

/** Left-rail alert panel, coloured by urgency the way the sales hub colours overdue vs ready. */
export const alertPanelSx = (border, bg) => ({
    p: 0,
    borderRadius: 4,
    border: `1px solid ${border}`,
    bgcolor: bg,
    overflow: "hidden",
});
