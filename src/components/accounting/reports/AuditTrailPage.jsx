import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, Chip, Collapse, Divider, MenuItem, Skeleton, Stack,
    Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { FileDownloadOutlined, KeyboardArrowDownOutlined, KeyboardArrowRightOutlined, LockOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { searchAuditTrail } from "../../../services/accounting/auditTrailService";
import { Kbd, rowSx, todayStr, useRowKeys } from "../common/accountingUi";
import { voucherPath } from "../voucher/VoucherDetailPage";
import { PageHeader, PageShell } from "./statementCommon";

/*
 * The audit trail (edit log) of Rule 3(1) of the Companies (Accounts) Rules: every change to the books
 * and the masters behind them — who, when, and what changed. Read-only by design; nothing here edits.
 */

const ENTITY_TYPES = [
    { value: "", label: "Everything" },
    { value: "VOUCHER", label: "Vouchers" },
    { value: "LEDGER", label: "Ledgers" },
    { value: "ACCOUNT_GROUP", label: "Account groups" },
    { value: "SALES_PAYMENT", label: "Customer payments" },
    { value: "VENDOR_PAYMENT", label: "Vendor payments" },
    { value: "TAX_INVOICE", label: "Tax invoices" },
    { value: "VENDOR_INVOICE", label: "Vendor invoices" },
    { value: "SALES_CREDIT_NOTE", label: "Credit notes" },
    { value: "DEBIT_NOTE", label: "Debit notes" },
];
const TYPE_LABEL = Object.fromEntries(ENTITY_TYPES.filter((t) => t.value).map((t) => [t.value, t.label.replace(/s$/, "")]));

const ACTIONS = {
    CREATE:               { label: "Created",           color: "#16a34a", bg: "#f0fdf4" },
    UPDATE:               { label: "Changed",           color: "#d97706", bg: "#fffbeb" },
    DELETE:               { label: "Deleted",           color: "#dc2626", bg: "#fef2f2" },
    POST:                 { label: "Posted",            color: "#2563eb", bg: "#eff6ff" },
    SUBMIT:               { label: "Sent for approval", color: "#7c3aed", bg: "#f5f3ff" },
    APPROVE:              { label: "Approved",          color: "#0f766e", bg: "#f0fdfa" },
    REVERSE:              { label: "Reversed",          color: "#be185d", bg: "#fdf2f8" },
    VOID:                 { label: "Cancelled",         color: "#b45309", bg: "#fffbeb" },
    AUTO_REVERSAL_FAILED: { label: "Reversal failed",   color: "#dc2626", bg: "#fef2f2" },
};

const isoDaysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtWhen = (t) =>
    new Date(t).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Turns camelCase field names into words: openingBalanceDrCr -> "Opening balance dr cr".
const humanField = (k) => {
    const s = k.replace(/([A-Z])/g, " $1").toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
};

const fmtValue = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
};

const parseDetails = (s) => {
    if (!s) return null;
    try { return JSON.parse(s); } catch { return s; }
};

const isDiff = (d) => d && typeof d === "object" && !Array.isArray(d)
    && Object.values(d).length > 0
    && Object.values(d).every((v) => v && typeof v === "object" && "from" in v && "to" in v);

const CELL = { fontSize: "0.8125rem", color: "#334155", py: 1, px: 1.5, borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };
const HEAD = { fontSize: "0.65625rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, py: 1.25, px: 1.5 };

/** What changed, laid out for reading: before/after for an edit, field/value for a snapshot. */
const Details = ({ details }) => {
    const d = parseDetails(details);
    if (d == null) return <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>No further detail.</Typography>;
    if (typeof d !== "object") return <Typography sx={{ fontSize: "0.75rem", color: "#475569" }}>{d}</Typography>;
    if (isDiff(d)) {
        return (
            <Table size="small" sx={{ maxWidth: 720 }}>
                <TableHead><TableRow>
                    <TableCell sx={HEAD}>Field</TableCell><TableCell sx={HEAD}>Before</TableCell><TableCell sx={HEAD}>After</TableCell>
                </TableRow></TableHead>
                <TableBody>
                    {Object.entries(d).map(([k, v]) => (
                        <TableRow key={k}>
                            <TableCell sx={{ ...CELL, fontWeight: 600 }}>{humanField(k)}</TableCell>
                            <TableCell sx={{ ...CELL, color: "#dc2626", textDecoration: "line-through" }}>{fmtValue(v.from)}</TableCell>
                            <TableCell sx={{ ...CELL, color: "#16a34a", fontWeight: 600 }}>{fmtValue(v.to)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }
    const { lines, ...rest } = d;
    return (
        <Box>
            <Table size="small" sx={{ maxWidth: 720 }}>
                <TableBody>
                    {Object.entries(rest).map(([k, v]) => (
                        <TableRow key={k}>
                            <TableCell sx={{ ...CELL, fontWeight: 600, width: 200 }}>{humanField(k)}</TableCell>
                            <TableCell sx={CELL}>{fmtValue(v)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {Array.isArray(lines) && (
                <Table size="small" sx={{ maxWidth: 720, mt: 1 }}>
                    <TableHead><TableRow>
                        <TableCell sx={HEAD}>Ledger</TableCell>
                        <TableCell sx={{ ...HEAD, textAlign: "right" }}>Debit</TableCell>
                        <TableCell sx={{ ...HEAD, textAlign: "right" }}>Credit</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                        {lines.map((l, i) => (
                            <TableRow key={i}>
                                <TableCell sx={CELL}>{l.ledger}</TableCell>
                                <TableCell sx={{ ...CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Number(l.dr) ? l.dr : "—"}</TableCell>
                                <TableCell sx={{ ...CELL, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Number(l.cr) ? l.cr : "—"}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Box>
    );
};

const csvCell = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const AuditTrailPage = () => {
    const navigate = useNavigate();
    const [from, setFrom] = useState(() => isoDaysAgo(30));
    const [to, setTo] = useState(todayStr);
    const [entityType, setEntityType] = useState("");
    const [action, setAction] = useState("");
    const [userInput, setUserInput] = useState("");
    const [username, setUsername] = useState("");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [open, setOpen] = useState({});

    const load = useCallback(async () => {
        if (!from || !to) return;
        setLoading(true); setError("");
        try {
            setData(await searchAuditTrail({ from, to, entityType: entityType || undefined, action: action || undefined, username: username || undefined }));
            setOpen({});
        } catch (e) {
            setData(null);
            setError(e?.response?.data?.message || "The audit trail could not be loaded.");
        } finally {
            setLoading(false);
        }
    }, [from, to, entityType, action, username]);

    useEffect(() => { load(); }, [load]);

    const entries = useMemo(() => data?.entries || [], [data]);
    const toggle = useCallback((id) => setOpen((o) => ({ ...o, [id]: !o[id] })), []);
    const openAt = useCallback((i) => entries[i] && toggle(entries[i].id), [entries, toggle]);
    const { active, rowRef } = useRowKeys(entries.length, openAt);

    const exportCsv = () => {
        const head = ["When", "User", "Action", "Record type", "Record", "What", "Details"];
        const rows = entries.map((e) => [fmtWhen(e.eventTime), e.username || "", ACTIONS[e.action]?.label || e.action,
            TYPE_LABEL[e.entityType] || e.entityType, e.entityLabel || "", e.summary || "", e.details || ""]);
        const csv = [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `Audit_Trail_${from}_to_${to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <PageShell>
            <PageHeader
                title="Audit Trail"
                subtitle="Every change to the books and the accounts behind them — who made it, when, and what changed"
                right={(
                    <Chip icon={<LockOutlined sx={{ fontSize: 15 }} />} label="Cannot be edited or switched off" size="small"
                        sx={{ fontWeight: 700, fontSize: "0.75rem", bgcolor: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" }} />
                )} />
            <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ mb: 2, flexWrap: "wrap", rowGap: 2 }}>
                <TextField label="From" type="date" size="small" value={from} onChange={(e) => setFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }} sx={{ width: 165 }} />
                <TextField label="To" type="date" size="small" value={to} onChange={(e) => setTo(e.target.value)}
                    InputLabelProps={{ shrink: true }} sx={{ width: 165 }} />
                <TextField select label="Record" size="small" value={entityType} onChange={(e) => setEntityType(e.target.value)} sx={{ width: 190 }}>
                    {ENTITY_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </TextField>
                <TextField select label="Action" size="small" value={action} onChange={(e) => setAction(e.target.value)} sx={{ width: 180 }}>
                    <MenuItem value="">Any</MenuItem>
                    {Object.entries(ACTIONS).map(([k, m]) => <MenuItem key={k} value={k}>{m.label}</MenuItem>)}
                </TextField>
                <TextField label="User" size="small" value={userInput} placeholder="Any"
                    onChange={(e) => setUserInput(e.target.value)}
                    onBlur={() => setUsername(userInput.trim())}
                    onKeyDown={(e) => { if (e.key === "Enter") setUsername(userInput.trim()); }}
                    sx={{ width: 150 }} />
                <Button variant="outlined" startIcon={<FileDownloadOutlined />} onClick={exportCsv} disabled={!entries.length}
                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, height: 40, ml: { md: "auto !important" } }}>
                    CSV
                </Button>
            </Stack>
            <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8", mb: 2 }}>
                Click a row, or <Kbd>↑</Kbd><Kbd>↓</Kbd> then <Kbd>Enter</Kbd>, to see exactly what changed.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}
            {data?.truncated && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
                    Showing the latest {entries.length.toLocaleString("en-IN")} changes. Narrow the dates or filters to see the rest.
                </Alert>
            )}

            {loading && !data && [...Array(8)].map((_, i) => <Skeleton key={i} height={44} />)}

            {data && !entries.length && (
                <Box sx={{ textAlign: "center", py: 6, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                    <Typography sx={{ color: "#94a3b8", fontSize: "0.875rem" }}>No changes in this period.</Typography>
                </Box>
            )}

            {entries.length > 0 && (
                <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflowX: "auto", opacity: loading ? 0.6 : 1 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                <TableCell sx={{ ...HEAD, width: 28 }} />
                                <TableCell sx={HEAD}>When</TableCell>
                                <TableCell sx={HEAD}>User</TableCell>
                                <TableCell sx={HEAD}>Action</TableCell>
                                <TableCell sx={HEAD}>Record</TableCell>
                                <TableCell sx={HEAD}>What</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {entries.map((e, i) => {
                                const m = ACTIONS[e.action] || { label: e.action, color: "#64748b", bg: "#f8fafc" };
                                const isOpen = !!open[e.id];
                                return (
                                    <React.Fragment key={e.id}>
                                        <TableRow ref={rowRef(i)} onClick={() => toggle(e.id)} sx={rowSx(i === active)}>
                                            <TableCell sx={{ ...CELL, px: 0.5, color: "#94a3b8" }}>
                                                {isOpen ? <KeyboardArrowDownOutlined sx={{ fontSize: 18 }} /> : <KeyboardArrowRightOutlined sx={{ fontSize: 18 }} />}
                                            </TableCell>
                                            <TableCell sx={{ ...CELL, whiteSpace: "nowrap", color: "#64748b" }}>{fmtWhen(e.eventTime)}</TableCell>
                                            <TableCell sx={{ ...CELL, whiteSpace: "nowrap", fontWeight: 600 }}>{e.username || "—"}</TableCell>
                                            <TableCell sx={CELL}>
                                                <Chip label={m.label} size="small" sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 700, bgcolor: m.bg, color: m.color, border: `1px solid ${m.color}30` }} />
                                            </TableCell>
                                            <TableCell sx={CELL}>
                                                <Box sx={{ fontWeight: 600, color: "#0f172a" }}>{e.entityLabel || `#${e.entityId}`}</Box>
                                                <Box sx={{ fontSize: "0.6875rem", color: "#94a3b8" }}>{TYPE_LABEL[e.entityType] || e.entityType}</Box>
                                            </TableCell>
                                            <TableCell sx={{ ...CELL, maxWidth: 420 }}>{e.summary || "—"}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                                                <Collapse in={isOpen} unmountOnExit>
                                                    <Box sx={{ px: 5, py: 2, bgcolor: "#fafafa", borderBottom: "1px solid #e2e8f0" }}>
                                                        <Details details={e.details} />
                                                        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                                            {e.voucherId && (
                                                                <Button size="small" variant="outlined" onClick={() => navigate(voucherPath(e.voucherId))}
                                                                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}>
                                                                    Open voucher
                                                                </Button>
                                                            )}
                                                            {e.entityType === "LEDGER" && e.action !== "DELETE" && (
                                                                <Button size="small" variant="outlined"
                                                                    onClick={() => navigate(`/accounting/reports/ledger?accountId=${e.entityId}`)}
                                                                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}>
                                                                    Open ledger
                                                                </Button>
                                                            )}
                                                        </Stack>
                                                    </Box>
                                                </Collapse>
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>
            )}
        </PageShell>
    );
};

export default AuditTrailPage;
