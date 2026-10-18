import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import { getTrialBalance } from "../../../services/accounting/accountingReportService";

/*
 * Shared pieces for the accounting screens: money formatting, voucher-type badges, the link from a
 * voucher back to the document that raised it, live ledger balances, a ledger picker that shows
 * them, and the Tally-style keyboard (arrows + Enter to open a row, Esc to go back).
 */

export const todayStr = () => new Date().toISOString().split("T")[0];

export const fmtDate = (d) =>
    !d ? "—" : new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const fmtMoney = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

/** A net balance (Dr − Cr) as an unsigned amount with its side, e.g. "₹1,200.00 Dr". */
export const fmtBalance = (net) => {
    const n = Number(net) || 0;
    if (Math.abs(n) < 0.005) return "₹0.00";
    return `${fmtMoney(Math.abs(n))} ${n > 0 ? "Dr" : "Cr"}`;
};

/**
 * The first day of the financial year holding `date`: from the configured years when one covers it,
 * else 1 April (the Indian financial year) of the right calendar year.
 */
export const fyStartFor = (date, fys = []) => {
    const d = date || todayStr();
    const fy = fys.find((f) => f.startDate <= d && d <= f.endDate);
    if (fy) return fy.startDate;
    const [y, m] = d.split("-").map(Number);
    return `${m >= 4 ? y : y - 1}-04-01`;
};

/** Parses what the user typed into an amount box; commas and a leading ₹ are allowed. */
export const parseAmount = (s) => {
    const n = parseFloat(String(s ?? "").replace(/[₹,\s]/g, ""));
    return Number.isFinite(n) ? n : 0;
};

export const VOUCHER_TYPE_META = {
    JOURNAL:      { label: "Journal",      short: "JNL", color: "#2563eb", bg: "#eff6ff" },
    RECEIPT:      { label: "Receipt",      short: "REC", color: "#16a34a", bg: "#f0fdf4" },
    PAYMENT:      { label: "Payment",      short: "PAY", color: "#d97706", bg: "#fffbeb" },
    CONTRA:       { label: "Contra",       short: "CTR", color: "#7c3aed", bg: "#f5f3ff" },
    OPENING:      { label: "Opening",      short: "OPN", color: "#64748b", bg: "#f8fafc" },
    SALES:        { label: "Sales",        short: "SAL", color: "#0891b2", bg: "#f0f9ff" },
    PURCHASE:     { label: "Purchase",     short: "PUR", color: "#4f46e5", bg: "#eef2ff" },
    CREDIT_NOTE:  { label: "Credit Note",  short: "CRN", color: "#be185d", bg: "#fdf2f8" },
    DEBIT_NOTE:   { label: "Debit Note",   short: "DBN", color: "#b45309", bg: "#fffbeb" },
    CLOSING:      { label: "Closing",      short: "CLO", color: "#475569", bg: "#f8fafc" },
    DEPRECIATION: { label: "Depreciation", short: "DEP", color: "#64748b", bg: "#f8fafc" },
    PAYROLL:      { label: "Payroll",      short: "PRL", color: "#0f766e", bg: "#f0fdfa" },
};

export const TypeBadge = ({ type }) => {
    const m = VOUCHER_TYPE_META[type] || { short: type?.slice(0, 3) || "?", color: "#64748b", bg: "#f1f5f9" };
    return (
        <Box component="span" sx={{ display: "inline-block", px: 0.75, py: "1px", borderRadius: 1, bgcolor: m.bg, color: m.color,
            fontSize: "0.625rem", fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.3 }}>
            {m.short}
        </Box>
    );
};

/*
 * Where a voucher came from. Only documents with a page of their own that opens by the source id
 * get a path; a vendor invoice opens under its purchase order, which the voucher does not carry.
 */
const SOURCE_DOCS = {
    TAX_INVOICE:        { label: "Tax invoice", path: (id) => `/sales/sales-order/invoices/view/${id}` },
    DEBIT_NOTE:         { label: "Debit note", path: (id) => `/purchase/debit-notes/${id}` },
    SALES_PAYMENT:      { label: "Customer payment" },
    SALES_CREDIT_NOTE:  { label: "Credit note" },
    VENDOR_INVOICE:     { label: "Vendor invoice" },
    VENDOR_PAYMENT:     { label: "Vendor payment" },
    INVENTORY_MOVEMENT: { label: "Stock movement" },
    TDS_CHALLAN:        { label: "TDS challan", path: () => "/accounting/tds/challans" },
    PAYROLL:            { label: "Payroll" },
    DEPRECIATION:       { label: "Depreciation" },
    FY_CLOSE:           { label: "Year-end close", path: () => "/accounting/masters/financial-years" },
};

export const sourceDoc = (type, id) => {
    if (!type) return null;
    const m = SOURCE_DOCS[type];
    const label = `${m?.label || type.replace(/_/g, " ").toLowerCase()}${id ? ` #${id}` : ""}`;
    return { label, path: m?.path ? m.path(id) : null };
};

/** Every ledger's closing balance on a date, read from the trial balance in one call. */
export const useLedgerBalances = (asOf) => {
    const [map, setMap] = useState({});
    const load = useCallback(() => {
        getTrialBalance(asOf || todayStr())
            .then((tb) => {
                const m = {};
                (tb?.lines || []).forEach((l) => { m[l.accountId] = (Number(l.closingDr) || 0) - (Number(l.closingCr) || 0); });
                setMap(m);
            })
            .catch(() => {});
    }, [asOf]);
    useEffect(() => { load(); }, [load]);
    return { balanceOf: (id) => map[id] ?? 0, reload: load };
};

const filterLedgers = (opts, { inputValue }) => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return opts.slice(0, 80);
    // Names that start with what was typed come first, as in Tally's list of ledgers.
    const starts = [];
    const contains = [];
    opts.forEach((o) => {
        const name = o.name.toLowerCase();
        const code = (o.code || "").toLowerCase();
        if (name.startsWith(q) || code.startsWith(q)) starts.push(o);
        else if (name.includes(q) || code.includes(q)) contains.push(o);
    });
    return [...starts, ...contains].slice(0, 80);
};

/**
 * A ledger search box that shows each ledger's current balance, Tally's "Cur Bal", in the list
 * and under the field. `onPicked` runs after a choice so the form can move to the next field.
 */
export const LedgerPicker = ({ ledgers, value, onChange, onPicked, label, placeholder, balanceOf, inputRef, autoFocus, helper, dense }) => (
    <Box>
        <Autocomplete
            size="small"
            options={ledgers}
            value={value}
            autoHighlight
            openOnFocus
            onChange={(_, v) => { onChange(v); if (v) onPicked?.(v); }}
            getOptionLabel={(l) => l.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            filterOptions={filterLedgers}
            renderOption={(props, o) => (
                <Box component="li" {...props} key={o.id} sx={{ display: "flex", gap: 1, fontSize: "0.8125rem" }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name}</Box>
                        <Box sx={{ fontSize: "0.6875rem", color: "#94a3b8" }}>{o.groupName}</Box>
                    </Box>
                    {balanceOf && (
                        <Box sx={{ fontSize: "0.75rem", color: "#64748b", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                            {fmtBalance(balanceOf(o.id))}
                        </Box>
                    )}
                </Box>
            )}
            renderInput={(params) => (
                <TextField {...params} label={label} placeholder={placeholder} inputRef={inputRef} autoFocus={autoFocus}
                    sx={dense ? { "& .MuiInputBase-input": { fontSize: "0.8125rem" } } : undefined} />
            )}
        />
        {!dense && (
            <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.5, minHeight: 18 }}>
                {value && balanceOf ? <>Current balance <b style={{ color: "#0f172a" }}>{fmtBalance(balanceOf(value.id))}</b></> : helper}
            </Typography>
        )}
    </Box>
);

/** A small keycap, for showing shortcuts beside the action they trigger. */
export const Kbd = ({ children }) => (
    <Box component="kbd" sx={{ display: "inline-block", px: 0.6, py: "1px", mx: 0.25, borderRadius: 0.75, border: "1px solid #cbd5e1",
        borderBottomWidth: 2, bgcolor: "#f8fafc", color: "#334155", fontSize: "0.6875rem", fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.4 }}>
        {children}
    </Box>
);

const typingIn = (el) =>
    el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

// A modal (dialog, drawer, open menu) owns the keyboard while it is up.
const modalOpen = () => Boolean(document.querySelector(".MuiModal-root:not(.MuiModal-hidden)"));

/**
 * Arrow keys move a highlight through `count` rows and Enter opens the highlighted one. The
 * highlighted row scrolls into view; give each row `ref={rowRef(i)}`.
 */
export const useRowKeys = (count, onOpen) => {
    const [active, setActive] = useState(-1);
    const refs = useRef([]);
    useEffect(() => { setActive(-1); }, [count]);
    useEffect(() => {
        const onKey = (e) => {
            if (e.defaultPrevented || typingIn(e.target) || modalOpen() || !count) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => {
                    const next = e.key === "ArrowDown" ? Math.min(count - 1, a + 1) : Math.max(0, a - 1);
                    refs.current[next]?.scrollIntoView({ block: "nearest" });
                    return next;
                });
            } else if (e.key === "Enter" && active >= 0 && !e.target.closest?.("button, a, [role=button]")) {
                e.preventDefault();
                onOpen(active);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [count, active, onOpen]);
    return { active, setActive, rowRef: (i) => (el) => { refs.current[i] = el; } };
};

/** Esc goes back one screen, the way Tally climbs out of a drill-down, unless something else claims it. */
export const useEscBack = () => {
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== "Escape" || e.defaultPrevented || typingIn(e.target) || modalOpen()) return;
            if (location.key === "default") return; // landed here directly, nothing to go back to
            navigate(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [navigate, location.key]);
};

/** Row styling for a keyboard-highlighted, clickable report row. */
export const rowSx = (isActive) => ({
    cursor: "pointer",
    bgcolor: isActive ? "#ecfdf5" : undefined,
    boxShadow: isActive ? "inset 3px 0 0 #10b981" : undefined,
    "&:hover": { bgcolor: isActive ? "#ecfdf5" : "#f8fafc" },
});
