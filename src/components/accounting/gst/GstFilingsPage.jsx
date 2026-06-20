import React, { useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider,
    IconButton, MenuItem, Paper, Skeleton, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { VisibilityOutlined, CloseOutlined } from "@mui/icons-material";
import { listGstReturns, getGstReturn } from "../../../services/accounting/gstService";
import { useFinancialYears, COL_HEAD, COL_NUM, CELL, CELL_NUM, fmtAmt, fmtDate } from "./gstCommon";

const TYPE_META = {
    GSTR1: { label: "GSTR-1", c: "#2563eb", bg: "#eff6ff" },
    GSTR3B: { label: "GSTR-3B", c: "#7c3aed", bg: "#f5f3ff" },
};

const StatusChip = ({ status }) => {
    const filed = status === "FILED";
    return <Chip label={status} size="small" sx={{ height: 20, fontSize: "0.625rem", fontWeight: 700, color: filed ? "#15803d" : "#64748b", bgcolor: filed ? "#f0fdf4" : "#f1f5f9", border: `1px solid ${filed ? "#bbf7d0" : "#e2e8f0"}` }} />;
};

const PayloadDialog = ({ open, loading, data, onClose }) => (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 700, fontSize: "0.9375rem" }}>
            <span>{data ? `${TYPE_META[data.returnType]?.label || data.returnType} — ${data.periodLabel}` : "Filing snapshot"}</span>
            <IconButton size="small" onClick={onClose}><CloseOutlined sx={{ fontSize: 18 }} /></IconButton>
        </DialogTitle>
        <DialogContent>
            {loading ? (
                <Box sx={{ py: 4, textAlign: "center" }}><CircularProgress size={22} /></Box>
            ) : (
                <Box component="pre" sx={{ m: 0, p: 2, bgcolor: "#0f172a", color: "#e2e8f0", borderRadius: 1.5, fontSize: "0.72rem", fontFamily: "'IBM Plex Mono', monospace", overflow: "auto", maxHeight: "60vh", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {formatPayload(data?.payload)}
                </Box>
            )}
        </DialogContent>
    </Dialog>
);

const formatPayload = (payload) => {
    if (!payload) return "No snapshot stored for this filing.";
    try {
        return JSON.stringify(JSON.parse(payload), null, 2);
    } catch {
        return payload;
    }
};

const GstFilingsPage = () => {
    const { fys, loading: fyLoading, error: fyError } = useFinancialYears();
    const [fyId, setFyId] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [dialog, setDialog] = useState({ open: false, loading: false, data: null });

    useEffect(() => {
        if (fyLoading || !fys.length || fyId) return;
        const active = fys.find((f) => f.status === "ACTIVE") || fys[0];
        setFyId(active?.id ?? "");
    }, [fyLoading, fys, fyId]);

    useEffect(() => {
        if (!fyId) return;
        let on = true;
        setLoading(true);
        setError("");
        listGstReturns(fyId)
            .then((d) => { if (on) setRows(d || []); })
            .catch(() => { if (on) setError("Failed to load filings."); })
            .finally(() => { if (on) setLoading(false); });
        return () => { on = false; };
    }, [fyId]);

    const sorted = useMemo(
        () => [...rows].sort((a, b) => new Date(b.filedDate || 0) - new Date(a.filedDate || 0)),
        [rows]
    );

    const view = async (id) => {
        setDialog({ open: true, loading: true, data: null });
        try {
            const full = await getGstReturn(id);
            setDialog({ open: true, loading: false, data: full });
        } catch {
            setDialog({ open: true, loading: false, data: { payload: "Failed to load snapshot." } });
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>GST Filings</Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>Recorded GSTR-1 and GSTR-3B filing snapshots</Typography>
                    </Box>
                </Stack>

                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ mb: 3 }}>
                    <TextField select label="Financial Year" size="small" value={fyId}
                        onChange={(e) => setFyId(e.target.value)} disabled={fyLoading || !fys.length} sx={{ minWidth: 200 }}>
                        {fys.map((f) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
                    </TextField>
                </Stack>

                {(fyError || error) && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{fyError || error}</Alert>}

                {loading ? (
                    <Box>{[...Array(4)].map((_, i) => <Skeleton key={i} height={42} sx={{ mb: 0.5 }} />)}</Box>
                ) : sorted.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                        <Typography sx={{ color: "#94a3b8", fontSize: "0.875rem" }}>No GST returns filed for this financial year yet.</Typography>
                    </Box>
                ) : (
                    <TableContainer component={Box} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "auto" }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                    <TableCell sx={COL_HEAD}>Return</TableCell>
                                    <TableCell sx={COL_HEAD}>Period</TableCell>
                                    <TableCell sx={COL_HEAD}>Status</TableCell>
                                    <TableCell sx={COL_NUM}>Taxable</TableCell>
                                    <TableCell sx={COL_NUM}>CGST</TableCell>
                                    <TableCell sx={COL_NUM}>SGST</TableCell>
                                    <TableCell sx={COL_NUM}>IGST</TableCell>
                                    <TableCell sx={COL_NUM}>Cess</TableCell>
                                    <TableCell sx={{ ...COL_NUM, color: "#0f172a", fontWeight: 800 }}>Total</TableCell>
                                    <TableCell sx={COL_HEAD}>Filed By</TableCell>
                                    <TableCell sx={COL_HEAD}>Filed On</TableCell>
                                    <TableCell sx={COL_HEAD} align="center">View</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sorted.map((r) => {
                                    const tm = TYPE_META[r.returnType] || { label: r.returnType, c: "#64748b", bg: "#f1f5f9" };
                                    return (
                                        <TableRow key={r.id} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                                            <TableCell sx={CELL}><Chip label={tm.label} size="small" sx={{ height: 20, fontSize: "0.625rem", fontWeight: 700, color: tm.c, bgcolor: tm.bg }} /></TableCell>
                                            <TableCell sx={{ ...CELL, fontWeight: 500, color: "#0f172a" }}>{r.periodLabel}</TableCell>
                                            <TableCell sx={CELL}><StatusChip status={r.status} /></TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.taxableValue)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.cgst)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.sgst)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.igst)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(r.cess)}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: 700, color: "#0f172a" }}>{fmtAmt(r.total)}</TableCell>
                                            <TableCell sx={CELL}>{r.filedBy || "—"}</TableCell>
                                            <TableCell sx={CELL}>{fmtDate(r.filedDate)}</TableCell>
                                            <TableCell sx={CELL} align="center">
                                                <Tooltip title="View snapshot" placement="top">
                                                    <IconButton size="small" onClick={() => view(r.id)} sx={{ color: "#94a3b8", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }}>
                                                        <VisibilityOutlined sx={{ fontSize: 17 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <PayloadDialog open={dialog.open} loading={dialog.loading} data={dialog.data} onClose={() => setDialog({ open: false, loading: false, data: null })} />
        </Box>
    );
};

export default GstFilingsPage;
