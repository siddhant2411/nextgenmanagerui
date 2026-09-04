import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";

const toNum = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));

/**
 * Records what the picker actually found.
 *
 * <p>Quantities default to what the order asked for, so the common case is one click. A tracked
 * line additionally needs the instance ids that left the shelf — the backend refuses the pick
 * without them, and refuses again if they do not add up to the quantity claimed, so both rules
 * are enforced here too rather than waiting for a round trip to say no.
 */
const PickConfirmDialog = ({ open, pick, onClose, onSubmit, saving, error }) => {
    const [rows, setRows] = useState({});
    const [pickedBy, setPickedBy] = useState("");

    useEffect(() => {
        if (!open || !pick) return;
        const seeded = {};
        pick.lines.forEach((l) => {
            seeded[l.id] = {
                quantityPicked: String(l.quantityToPick ?? ""),
                instanceIds: (l.allocatedInstanceIds || []).join(", "),
            };
        });
        setRows(seeded);
        setPickedBy(pick.pickedBy || "");
    }, [open, pick]);

    const setField = (lineId, key) => (event) =>
        setRows((prev) => ({ ...prev, [lineId]: { ...prev[lineId], [key]: event.target.value } }));

    const parseIds = (raw) =>
        String(raw || "")
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map(Number)
            .filter((n) => Number.isFinite(n));

    const problems = useMemo(() => {
        if (!pick) return {};
        const out = {};
        pick.lines.forEach((l) => {
            const row = rows[l.id] || {};
            const qty = toNum(row.quantityPicked);
            const ids = parseIds(row.instanceIds);

            if (!Number.isFinite(qty) || qty < 0) {
                out[l.id] = "Enter a quantity";
            } else if (qty > Number(l.quantityToPick)) {
                out[l.id] = `More than the ${l.quantityToPick} asked for`;
            } else if (l.tracked && qty > 0 && ids.length === 0) {
                out[l.id] = "Name the instances picked";
            }
        });
        return out;
    }, [pick, rows]);

    const hasProblems = Object.keys(problems).length > 0;

    const handleSubmit = () => {
        if (!pick || hasProblems) return;
        onSubmit({
            pickedBy: pickedBy.trim() || undefined,
            lines: pick.lines.map((l) => ({
                lineId: l.id,
                quantityPicked: toNum(rows[l.id]?.quantityPicked),
                instanceIds: parseIds(rows[l.id]?.instanceIds),
            })),
        });
    };

    if (!pick) return null;

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle>Confirm {pick.pickNumber}</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <TextField
                        label="Picked by"
                        value={pickedBy}
                        onChange={(e) => setPickedBy(e.target.value)}
                        size="small"
                        helperText="Leave blank to record the signed-in user"
                        sx={{ minWidth: 260 }}
                    />
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                        {pick.warehouseCode} · {pick.salesOrderNumber}
                    </Typography>
                </Stack>

                <Box sx={{ overflowX: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Item</TableCell>
                                <TableCell align="right">Asked</TableCell>
                                <TableCell align="right" sx={{ width: 140 }}>
                                    Picked
                                </TableCell>
                                <TableCell sx={{ width: 260 }}>Instance ids</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pick.lines.map((l) => (
                                <TableRow key={l.id}>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>
                                            {l.itemCode}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {l.itemName}
                                            {l.storageLocationCode ? ` · ${l.storageLocationCode}` : ""}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">{l.quantityToPick}</TableCell>
                                    <TableCell align="right">
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={rows[l.id]?.quantityPicked ?? ""}
                                            onChange={setField(l.id, "quantityPicked")}
                                            error={Boolean(problems[l.id])}
                                            inputProps={{ min: 0, step: "any", style: { textAlign: "right" } }}
                                            sx={{ width: 120 }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            placeholder="e.g. 101, 102"
                                            value={rows[l.id]?.instanceIds ?? ""}
                                            onChange={setField(l.id, "instanceIds")}
                                            error={Boolean(problems[l.id])}
                                            helperText={problems[l.id] || " "}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>

                <Typography variant="caption" color="text.secondary">
                    Picking less than asked is recorded as a short pick rather than reducing the order.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={saving || hasProblems}>
                    {saving ? "Saving…" : "Confirm pick"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PickConfirmDialog;
