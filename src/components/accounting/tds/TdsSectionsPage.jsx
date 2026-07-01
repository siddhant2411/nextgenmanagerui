import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, IconButton, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableHead,
    TableRow, TextField, Typography,
} from "@mui/material";
import { AddOutlined, DeleteOutline, EditOutlined } from "@mui/icons-material";
import { COL_HEAD, COL_NUM, CELL, CELL_NUM, fmtAmt, GST_FILE_ROLES } from "../gst/gstCommon";
import { useAuth } from "../../../auth/AuthContext";
import {
    listTdsSections, createTdsSection, updateTdsSection, deleteTdsSection,
} from "../../../services/accounting/tdsService";

const EMPTY = {
    section: "", description: "", rate: "", panMissingRate: "20",
    thresholdSingle: "", thresholdAnnual: "", active: true,
};

export default function TdsSectionsPage() {
    const { hasAnyRole } = useAuth();
    const canEdit = hasAnyRole(GST_FILE_ROLES);

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [dialog, setDialog] = useState(null); // { mode: 'create'|'edit', form }
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setRows(await listTdsSections(false) || []);
            setError("");
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load TDS sections.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => setDialog({ mode: "create", form: { ...EMPTY } });
    const openEdit = (row) => setDialog({
        mode: "edit", id: row.id, form: {
            section: row.section, description: row.description, rate: row.rate ?? "",
            panMissingRate: row.panMissingRate ?? "20", thresholdSingle: row.thresholdSingle ?? "",
            thresholdAnnual: row.thresholdAnnual ?? "", active: row.active,
        },
    });

    const setField = (k, v) => setDialog((d) => ({ ...d, form: { ...d.form, [k]: v } }));

    const save = async () => {
        const f = dialog.form;
        if (!f.section?.trim() || !f.description?.trim() || f.rate === "") {
            setSnack({ open: true, message: "Section, description and rate are required.", severity: "error" });
            return;
        }
        setSaving(true);
        const payload = {
            section: f.section.trim(),
            description: f.description.trim(),
            rate: Number(f.rate),
            panMissingRate: f.panMissingRate === "" ? null : Number(f.panMissingRate),
            thresholdSingle: f.thresholdSingle === "" ? null : Number(f.thresholdSingle),
            thresholdAnnual: f.thresholdAnnual === "" ? null : Number(f.thresholdAnnual),
            active: f.active,
        };
        try {
            if (dialog.mode === "create") await createTdsSection(payload);
            else await updateTdsSection(dialog.id, payload);
            setDialog(null);
            setSnack({ open: true, message: "TDS section saved.", severity: "success" });
            await load();
        } catch (e) {
            setSnack({ open: true, message: e?.response?.data?.message || "Save failed.", severity: "error" });
        } finally {
            setSaving(false);
        }
    };

    const remove = async (row) => {
        if (!window.confirm(`Delete section ${row.section}?`)) return;
        try {
            await deleteTdsSection(row.id);
            setSnack({ open: true, message: "Section deleted.", severity: "success" });
            await load();
        } catch (e) {
            setSnack({ open: true, message: e?.response?.data?.message || "Delete failed.", severity: "error" });
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>TDS Sections</Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>Rates, PAN-missing rates and thresholds used when deducting TDS on vendor payments.</Typography>
                    </Box>
                    {canEdit && (
                        <Button variant="contained" disableElevation startIcon={<AddOutlined />} onClick={openCreate}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5d57" } }}>
                            Add Section
                        </Button>
                    )}
                </Stack>

                <Divider sx={{ mb: 2, borderColor: "#f1f5f9" }} />

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}
                {loading ? (
                    <Box sx={{ textAlign: "center", py: 5 }}><CircularProgress size={26} /></Box>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={COL_HEAD}>Section</TableCell>
                                <TableCell sx={COL_HEAD}>Description</TableCell>
                                <TableCell sx={COL_NUM}>Rate %</TableCell>
                                <TableCell sx={COL_NUM}>No-PAN %</TableCell>
                                <TableCell sx={COL_NUM}>Single Limit</TableCell>
                                <TableCell sx={COL_NUM}>Annual Limit</TableCell>
                                <TableCell sx={COL_HEAD}>Status</TableCell>
                                {canEdit && <TableCell sx={COL_HEAD} />}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r.id} hover>
                                    <TableCell sx={{ ...CELL, fontWeight: 700 }}>{r.section}</TableCell>
                                    <TableCell sx={CELL}>{r.description}</TableCell>
                                    <TableCell sx={CELL_NUM}>{r.rate}</TableCell>
                                    <TableCell sx={CELL_NUM}>{r.panMissingRate}</TableCell>
                                    <TableCell sx={CELL_NUM}>{fmtAmt(r.thresholdSingle)}</TableCell>
                                    <TableCell sx={CELL_NUM}>{fmtAmt(r.thresholdAnnual)}</TableCell>
                                    <TableCell sx={{ ...CELL, color: r.active ? "#0f766e" : "#94a3b8", fontWeight: 600 }}>
                                        {r.active ? "Active" : "Inactive"}
                                    </TableCell>
                                    {canEdit && (
                                        <TableCell sx={{ ...CELL, whiteSpace: "nowrap" }} align="right">
                                            <IconButton size="small" onClick={() => openEdit(r)} sx={{ color: "#64748b" }}>
                                                <EditOutlined sx={{ fontSize: 16 }} />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => remove(r)} sx={{ color: "#94a3b8", "&:hover": { color: "#dc2626" } }}>
                                                <DeleteOutline sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {!rows.length && (
                                <TableRow><TableCell colSpan={8} sx={{ ...CELL, color: "#94a3b8", textAlign: "center", py: 3 }}>No TDS sections defined.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </Paper>

            <Dialog open={!!dialog} onClose={() => !saving && setDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, fontSize: "1rem" }}>
                    {dialog?.mode === "create" ? "Add TDS Section" : "Edit TDS Section"}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 0.5 }}>
                        <Stack direction="row" spacing={2}>
                            <TextField label="Section *" size="small" fullWidth value={dialog?.form.section ?? ""}
                                onChange={(e) => setField("section", e.target.value)} placeholder="194C" />
                            <TextField label="Rate % *" size="small" type="number" fullWidth value={dialog?.form.rate ?? ""}
                                onChange={(e) => setField("rate", e.target.value)} inputProps={{ step: 0.01, min: 0 }} />
                        </Stack>
                        <TextField label="Description *" size="small" fullWidth value={dialog?.form.description ?? ""}
                            onChange={(e) => setField("description", e.target.value)} />
                        <Stack direction="row" spacing={2}>
                            <TextField label="No-PAN Rate %" size="small" type="number" fullWidth value={dialog?.form.panMissingRate ?? ""}
                                onChange={(e) => setField("panMissingRate", e.target.value)} inputProps={{ step: 0.01, min: 0 }} />
                            <TextField label="Single Txn Limit" size="small" type="number" fullWidth value={dialog?.form.thresholdSingle ?? ""}
                                onChange={(e) => setField("thresholdSingle", e.target.value)} inputProps={{ min: 0 }} />
                            <TextField label="Annual Limit" size="small" type="number" fullWidth value={dialog?.form.thresholdAnnual ?? ""}
                                onChange={(e) => setField("thresholdAnnual", e.target.value)} inputProps={{ min: 0 }} />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={() => setDialog(null)} disabled={saving} sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}>Cancel</Button>
                    <Button onClick={save} variant="contained" disableElevation disabled={saving}
                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d5d57" } }}>
                        Save
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
