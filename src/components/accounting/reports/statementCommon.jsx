import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Box, MenuItem, Paper, Skeleton, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { CELL, CELL_NUM, COL_HEAD, COL_NUM, fmtDate, todayStr } from "../gst/gstCommon";

// Statement amounts arrive signed for their side; a negative is a contra balance and prints in brackets.
export const fmtStmt = (n) => {
    if (n == null || Number(n) === 0) return "—";
    const s = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(Math.abs(n));
    return Number(n) < 0 ? `(${s})` : s;
};

export const fmtStmt0 = (n) => {
    if (n == null) return "—";
    const s = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.abs(n));
    return Number(n) < 0 ? `(${s})` : s;
};

/** The FY containing today, else the latest one that has started, else the first. */
export const pickDefaultFy = (fys = []) => {
    if (!fys.length) return null;
    const today = todayStr();
    return fys.find((f) => f.startDate <= today && today <= f.endDate)
        || [...fys].filter((f) => f.startDate <= today).sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0]
        || fys[0];
};

/** A financial year runs to its end date, or to today while it is still running. */
export const fyToDate = (fy) => {
    const today = todayStr();
    return fy.endDate < today ? fy.endDate : today;
};

export const FySelect = ({ fys, value, onChange, disabled }) => (
    <TextField select size="small" label="Financial Year" value={value ?? ""} disabled={disabled || !fys.length}
        onChange={(e) => onChange(fys.find((f) => f.id === e.target.value) || null)}
        sx={{ width: 180 }}>
        {fys.map((f) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
        <MenuItem value="custom">Custom dates</MenuItem>
    </TextField>
);

const SIDE_META = {
    INCOME:    { color: "#16a34a", bg: "#f0fdf4" },
    EXPENSES:  { color: "#ea580c", bg: "#fff7ed" },
    EQUITY:    { color: "#7c3aed", bg: "#f5f3ff" },
    LIABILITIES: { color: "#dc2626", bg: "#fef2f2" },
    ASSETS:    { color: "#2563eb", bg: "#eff6ff" },
};

const Rows = ({ line, depth, showLedgers, onLedger }) => {
    const isGroup = line.kind === "GROUP";
    const isLedger = line.kind === "LEDGER";
    if (isLedger && !showLedgers) return null;
    const pad = 1.5 + depth * 2;
    const label = isGroup
        ? { fontWeight: depth <= 1 ? 700 : 600, color: "#0f172a" }
        : line.kind === "COMPUTED"
            ? { fontStyle: "italic", color: "#334155" }
            : { color: "#334155" };
    const num = { ...CELL_NUM, fontWeight: isGroup ? 600 : 400, color: isGroup ? "#0f172a" : "#334155" };
    return (
        <>
            <TableRow
                hover={isLedger}
                onClick={isLedger ? () => onLedger(line) : undefined}
                sx={{ cursor: isLedger ? "pointer" : "default" }}>
                <TableCell sx={{ ...CELL, ...label, pl: pad }}>
                    {line.name}
                    {isLedger && <Box component="span" sx={{ ml: 1, color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6875rem" }}>{line.code}</Box>}
                </TableCell>
                <TableCell sx={num}>{fmtStmt(line.amount)}</TableCell>
                <TableCell sx={{ ...num, color: "#64748b" }}>{fmtStmt(line.previousAmount)}</TableCell>
            </TableRow>
            {line.children?.map((c) => (
                <Rows key={`${c.kind}-${c.code}`} line={c} depth={depth + 1} showLedgers={showLedgers} onLedger={onLedger} />
            ))}
        </>
    );
};

/**
 * One statement as a tree: each side's heading, its groups and (optionally) ledgers, then the
 * total rows. Clicking a ledger opens its statement for `ledgerFrom`–`ledgerTo`.
 */
export const StatementTable = ({ sides, totals, curLabel, prevLabel, showLedgers, ledgerFrom, ledgerTo }) => {
    const navigate = useNavigate();
    const openLedger = (line) =>
        navigate(`/accounting/reports/ledger?accountId=${line.accountId}&from=${ledgerFrom}&to=${ledgerTo}`);

    return (
        <TableContainer component={Box} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflowX: "auto" }}>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                        <TableCell sx={COL_HEAD}>Particulars</TableCell>
                        <TableCell sx={{ ...COL_NUM, color: "#0f172a" }}>{curLabel}</TableCell>
                        <TableCell sx={COL_NUM}>{prevLabel}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sides.map(({ key, title, line }) => {
                        const meta = SIDE_META[key] || { color: "#64748b", bg: "#f8fafc" };
                        return (
                            <React.Fragment key={key}>
                                <TableRow>
                                    <TableCell colSpan={3} sx={{ bgcolor: meta.bg, py: 0.75, px: 1.5, borderBottom: "1px solid #e2e8f0" }}>
                                        <Typography sx={{ fontSize: "0.6875rem", fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: 0.7 }}>
                                            {title}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                                {line.children?.length
                                    ? line.children.map((c) => (
                                        <Rows key={`${c.kind}-${c.code}`} line={c} depth={0} showLedgers={showLedgers} onLedger={openLedger} />
                                    ))
                                    : (
                                        <TableRow>
                                            <TableCell colSpan={3} sx={{ ...CELL, color: "#94a3b8" }}>Nothing posted.</TableCell>
                                        </TableRow>
                                    )}
                                <TableRow sx={{ bgcolor: "#fafafa" }}>
                                    <TableCell sx={{ ...CELL, fontWeight: 700, color: meta.color, fontSize: "0.75rem" }}>Total {title}</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 700, color: "#0f172a" }}>{fmtStmt(line.amount)}</TableCell>
                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 700, color: "#64748b" }}>{fmtStmt(line.previousAmount)}</TableCell>
                                </TableRow>
                            </React.Fragment>
                        );
                    })}
                    {totals.map(({ label, amount, previousAmount, tone }) => (
                        <TableRow key={label} sx={{ bgcolor: "#f1f5f9" }}>
                            <TableCell sx={{ ...CELL, fontWeight: 800, color: tone || "#0f172a", py: 1.5 }}>{label}</TableCell>
                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800, fontSize: "0.8125rem", color: tone || "#0f172a", py: 1.5 }}>{fmtStmt(amount)}</TableCell>
                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800, fontSize: "0.8125rem", color: "#64748b", py: 1.5 }}>{fmtStmt(previousAmount)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export const StatementSkeleton = () => (
    <Box>{[...Array(10)].map((_, i) => <Skeleton key={i} height={40} sx={{ mb: 0.5 }} />)}</Box>
);

export const PageHeader = ({ title, subtitle, right }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3, gap: 2, flexWrap: "wrap" }}>
        <Box>
            <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{title}</Typography>
            <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>{subtitle}</Typography>
        </Box>
        {right}
    </Stack>
);

export const PageShell = ({ children }) => (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>
            {children}
        </Paper>
    </Box>
);

export const rangeLabel = (from, to) => `${fmtDate(from)} – ${fmtDate(to)}`;
