import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField,
    Typography,
} from "@mui/material";
import { AddOutlined, ReceiptLongOutlined } from "@mui/icons-material";
import { COL_HEAD, COL_NUM, CELL, CELL_NUM, CELL_MONO, fmtAmt, fmtDate, GST_FILE_ROLES } from "../gst/gstCommon";
import { FyQuarterSelector, TDS_QUARTERS } from "./tdsCommon";
import { useAuth } from "../../../auth/AuthContext";
import { listTdsChallans, createTdsChallan } from "../../../services/accounting/tdsService";

const todayStr = () => new Date().toISOString().split("T")[0];

export default function TdsChallansPage() {
    const { hasAnyRole } = useAuth();
    const canCreate = hasAnyRole(GST_FILE_ROLES);

    const [period, setPeriod] = useState(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ quarter: "Q1", section: "", challanNumber: "", bsrCode: "", depositDate: todayStr(), notes: "" });
    const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

    const load = useCallback(async (p) => {
        if (!p?.fy) return;
        setLoading(true);
        try {
            setRows(await listTdsChallans(p.fy) || []);
            setError("");
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load challans.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (period?.fy) load(period); }, [period, load]);

    const openDialog = () => {
        setForm({ quarter: period?.quarter || "Q1", section: "", challanNumber: "", bsrCode: "", depositDate: todayStr(), notes: "" });
        setDialogOpen(true);
    };

    const save = async () => {
        if (!form.challanNumber.trim()) {
            setSnack({ open: true, message: "Challan number is required.", severity: "error" });
            return;
        }
        setSaving(true);
        try {
            await createTdsChallan({
                financialYear: period.fy,
                quarter: form.quarter,
                section: form.section.trim() || null,
                challanNumber: form.challanNumber.trim(),
                bsrCode: form.bsrCode.trim() || null,
                depositDate: form.depositDate,
                notes: form.notes.trim() || null,
            });
            setDialogOpen(false);
            setSnack({ open: true, message: "Challan recorded — TDS Payable cleared.", severity: "success" });
            await load(period);
        } catch (e) {
            setSnack({ open: true, message: e?.response?.data?.message || "Failed to record challan.", severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>TDS Challans</Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>Deposit pending TDS for a quarter; this clears TDS Payable against the bank.</Typography>
                    </Box>
                    {canCreate && (
                        <Button variant="contained" disableElevation startIcon={<AddOutlined />} onClick={openDialog} disabled={!period}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5d57" } }}>
                            Record Challan
                        </Button>
                    )}
                </Stack>
                <Divider sx={{ mb: 2, borderColor: "#f1f5f9" }} />

                <Box sx={{ mb: 3 }}><FyQuarterSelector value={period} onChange={setPeriod} /></Box>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}
                {loading ? (
                    <Box sx={{ textAlign: "center", py: 5 }}><CircularProgress size={26} /></Box>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={COL_HEAD}>Challan No</TableCell>
                                <TableCell sx={COL_HEAD}>BSR Code</TableCell>
                                <TableCell sx={COL_HEAD}>Deposit Date</TableCell>
                                <TableCell sx={COL_HEAD}>FY / Qtr</TableCell>
                                <TableCell sx={COL_HEAD}>Section</TableCell>
                                <TableCell sx={COL_NUM}>Deductions</TableCell>
                                <TableCell sx={COL_NUM}>Amount</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((c) => (
                                <TableRow key={c.id} hover>
                                    <TableCell sx={{ ...CELL, fontWeight: 700 }}>{c.challanNumber}</TableCell>
                                    <TableCell sx={CELL_MONO}>{c.bsrCode || "—"}</TableCell>
                                    <TableCell sx={CELL}>{fmtDate(c.depositDate)}</TableCell>
                                    <TableCell sx={CELL}>{c.financialYear} · {c.quarter}</TableCell>
                                    <TableCell sx={CELL}>{c.section || "All"}</TableCell>
                                    <TableCell sx={CELL_NUM}>{c.entryCount}</TableCell>
                                    <TableCell sx={CELL_NUM}>{fmtAmt(c.amount)}</TableCell>
                                </TableRow>
                            ))}
                            {!rows.length && (
                                <TableRow><TableCell colSpan={7} sx={{ ...CELL, color: "#94a3b8", textAlign: "center", py: 3 }}>No challans recorded for this year.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </Paper>

            <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: 1 }}>
                    <ReceiptLongOutlined sx={{ color: "#0f766e" }} /> Record TDS Challan
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.8rem" }}>
                        This deposits all pending (deducted, not yet deposited) TDS for {period?.fy} {form.quarter}
                        {form.section ? ` · section ${form.section}` : ""} and posts Dr TDS Payable / Cr Bank.
                    </Alert>
                    <Stack spacing={2} sx={{ mt: 0.5 }}>
                        <Stack direction="row" spacing={2}>
                            <TextField select SelectProps={{ native: true }} label="Quarter" size="small" fullWidth
                                value={form.quarter} onChange={(e) => setForm((f) => ({ ...f, quarter: e.target.value }))}>
                                {TDS_QUARTERS.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
                            </TextField>
                            <TextField label="Section (optional)" size="small" fullWidth value={form.section}
                                onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} placeholder="All sections" />
                        </Stack>
                        <Stack direction="row" spacing={2}>
                            <TextField label="Challan No *" size="small" fullWidth value={form.challanNumber}
                                onChange={(e) => setForm((f) => ({ ...f, challanNumber: e.target.value }))} />
                            <TextField label="BSR Code" size="small" fullWidth value={form.bsrCode}
                                onChange={(e) => setForm((f) => ({ ...f, bsrCode: e.target.value }))} />
                        </Stack>
                        <TextField label="Deposit Date *" size="small" type="date" value={form.depositDate}
                            onChange={(e) => setForm((f) => ({ ...f, depositDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                        <TextField label="Notes" size="small" multiline rows={2} value={form.notes}
                            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}>Cancel</Button>
                    <Button onClick={save} variant="contained" disableElevation disabled={saving}
                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5d57" } }}>
                        Record
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
                <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
            </Snackbar>
        </Box>
    );
}
