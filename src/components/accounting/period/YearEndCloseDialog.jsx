import React, { useEffect, useState } from "react";
import {
    Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { CancelOutlined, CheckCircleOutlined } from "@mui/icons-material";
import {
    closeFinancialYear, getYearEndClosePreview, reopenFinancialYear,
} from "../../../services/accounting/accountingFyService";
import { CELL, CELL_NUM, COL_HEAD, COL_NUM, fmtAmt, fmtDate } from "../gst/gstCommon";

const money0 = (n) =>
    n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/**
 * mode "close": shows the checks and the closing voucher, then closes the year.
 * mode "reopen": asks for a reason, then reverses the closing voucher.
 */
const YearEndCloseDialog = ({ fy, mode, open, onClose, onDone }) => {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open || !fy) return;
        setError(""); setReason(""); setPreview(null);
        if (mode !== "close") return;
        setLoading(true);
        getYearEndClosePreview(fy.id)
            .then(setPreview)
            .catch((e) => setError(e?.response?.data?.message || "Failed to load the close preview."))
            .finally(() => setLoading(false));
    }, [open, fy, mode]);

    const submit = async () => {
        setBusy(true); setError("");
        try {
            const updated = mode === "close"
                ? await closeFinancialYear(fy.id)
                : await reopenFinancialYear(fy.id, reason.trim());
            onDone(updated, mode === "close" ? `${fy.label} closed.` : `${fy.label} reopened.`);
            onClose();
        } catch (e) {
            setError(e?.response?.data?.message || `Failed to ${mode} the year.`);
        } finally {
            setBusy(false);
        }
    };

    if (!fy) return null;
    const profit = Number(preview?.netProfit || 0);

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth={mode === "close" ? "md" : "sm"} fullWidth>
            <DialogTitle sx={{ fontWeight: 700, fontSize: "0.9375rem", pb: 1 }}>
                {mode === "close" ? `Close ${fy.label}` : `Reopen ${fy.label}`}
                <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.25 }}>
                    {fmtDate(fy.startDate)} – {fmtDate(fy.endDate)}
                </Typography>
            </DialogTitle>
            <DialogContent>
                {mode === "close" ? (
                    <>
                        <Typography sx={{ fontSize: "0.8125rem", color: "#475569", mb: 2 }}>
                            Closing posts one closing voucher dated {fmtDate(fy.endDate)}. It moves every income and
                            expense balance into Retained Earnings and marks all twelve months closed. Balance-sheet
                            ledgers carry into the next year as they stand. The year can be reopened later with a reason.
                        </Typography>

                        {loading && <Stack spacing={1}>{[...Array(6)].map((_, i) => <Skeleton key={i} height={28} />)}</Stack>}

                        {preview && (
                            <>
                                <Stack spacing={0.75} sx={{ mb: 2.5 }}>
                                    {preview.checks.map((c) => (
                                        <Stack key={c.code} direction="row" spacing={1} alignItems="flex-start">
                                            {c.passed
                                                ? <CheckCircleOutlined sx={{ fontSize: 17, color: "#16a34a", mt: "1px" }} />
                                                : <CancelOutlined sx={{ fontSize: 17, color: "#dc2626", mt: "1px" }} />}
                                            <Box>
                                                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: c.passed ? "#0f172a" : "#b91c1c" }}>{c.label}</Typography>
                                                {c.detail && <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>{c.detail}</Typography>}
                                            </Box>
                                        </Stack>
                                    ))}
                                </Stack>

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
                                    <Summary label="Income" value={money0(preview.totalIncome)} />
                                    <Summary label="Expenses" value={money0(preview.totalExpenses)} />
                                    <Summary label={profit >= 0 ? "Profit to Retained Earnings" : "Loss to Retained Earnings"}
                                        value={money0(Math.abs(profit))} tone={profit >= 0 ? "#16a34a" : "#dc2626"} />
                                </Stack>

                                {preview.lines.length === 0 ? (
                                    <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                                        No income or expense ledger has a balance, so no closing voucher is needed. The months are simply marked closed.
                                    </Alert>
                                ) : (
                                    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 1.5, maxHeight: 300, overflow: "auto" }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={COL_HEAD}>Ledger</TableCell>
                                                    <TableCell sx={COL_NUM}>Balance</TableCell>
                                                    <TableCell sx={COL_NUM}>Closing Dr</TableCell>
                                                    <TableCell sx={COL_NUM}>Closing Cr</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {preview.lines.map((l) => (
                                                    <TableRow key={l.accountId}>
                                                        <TableCell sx={CELL}>
                                                            {l.name}
                                                            <Box component="span" sx={{ ml: 1, color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6875rem" }}>{l.code}</Box>
                                                        </TableCell>
                                                        <TableCell sx={CELL_NUM}>{fmtAmt(l.balance)}</TableCell>
                                                        <TableCell sx={CELL_NUM}>{fmtAmt(l.closingDr)}</TableCell>
                                                        <TableCell sx={CELL_NUM}>{fmtAmt(l.closingCr)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {profit !== 0 && (
                                                    <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                                        <TableCell sx={{ ...CELL, fontWeight: 700 }}>
                                                            {preview.retainedEarningsName || "Retained Earnings"}
                                                            <Box component="span" sx={{ ml: 1, color: "#94a3b8", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.6875rem" }}>{preview.retainedEarningsCode}</Box>
                                                        </TableCell>
                                                        <TableCell sx={CELL_NUM} />
                                                        <TableCell sx={{ ...CELL_NUM, fontWeight: 700 }}>{profit < 0 ? fmtAmt(-profit) : "—"}</TableCell>
                                                        <TableCell sx={{ ...CELL_NUM, fontWeight: 700 }}>{profit > 0 ? fmtAmt(profit) : "—"}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <Stack spacing={2} sx={{ mt: 0.5 }}>
                        <Typography sx={{ fontSize: "0.8125rem", color: "#475569" }}>
                            Reopening reverses the closing voucher (it stays on record, with its reversal beside it) and
                            puts the twelve months back to Locked. Unlock a month to post the correction, then close the year again.
                        </Typography>
                        <TextField label="Reason" size="small" fullWidth required multiline minRows={2}
                            value={reason} onChange={(e) => setReason(e.target.value)} inputProps={{ maxLength: 500 }}
                            placeholder="e.g. Auditor's adjustment to depreciation" />
                    </Stack>
                )}

                {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={onClose} disabled={busy} size="small"
                    sx={{ textTransform: "none", fontWeight: 600, color: "#64748b", borderRadius: 2 }}>
                    Cancel
                </Button>
                <Button onClick={submit} variant="contained" disableElevation size="small"
                    disabled={busy || (mode === "close" ? !preview?.canClose : !reason.trim())}
                    startIcon={busy ? <CircularProgress size={13} color="inherit" /> : null}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 2,
                        bgcolor: mode === "close" ? "#0f172a" : "#d97706",
                        "&:hover": { bgcolor: mode === "close" ? "#1e293b" : "#b45309" } }}>
                    {mode === "close" ? "Close Year" : "Reopen Year"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const Summary = ({ label, value, tone = "#0f172a" }) => (
    <Box sx={{ flex: 1, p: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
        <Typography sx={{ fontSize: "0.65625rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</Typography>
        <Typography sx={{ fontSize: "1.0625rem", fontWeight: 700, color: tone, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
    </Box>
);

export default YearEndCloseDialog;
