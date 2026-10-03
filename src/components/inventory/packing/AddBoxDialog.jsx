import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { packedByPickLine, packedInstanceIds } from "../../../services/packingSlipService";

const BOX_TYPES = ["Carton", "Wooden crate", "Wooden box", "Pallet", "Drum", "Bundle", "Loose"];

const toNum = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));
const optNum = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

const EMPTY_BOX = {
    boxType: "Carton",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    grossWeightKg: "",
    netWeightKg: "",
    shippingMarks: "",
};

/**
 * Records one physical box.
 *
 * <p>Each pick line shows what is still unpacked across the boxes already on the slip, and a line
 * can take at most that. A tracked line picks its units from the ones this pick allocated and no
 * earlier box took — chosen as chips, so a unit cannot be named twice. The server checks all of
 * this again; enforcing it here means the user hears "no" before the round trip, not after.
 */
const AddBoxDialog = ({ open, slip, pick, onClose, onSubmit, saving, error }) => {
    const [box, setBox] = useState(EMPTY_BOX);
    const [rows, setRows] = useState({});

    const packed = useMemo(() => packedByPickLine(slip), [slip]);
    const usedIds = useMemo(() => packedInstanceIds(slip), [slip]);

    const lines = useMemo(
        () =>
            (pick?.lines || []).map((l) => {
                const remaining = Math.max(0, Number(l.quantityPicked || 0) - (packed[l.id] || 0));
                const available = (l.allocatedInstanceIds || []).filter((id) => !usedIds.has(id));
                return { ...l, remaining, available };
            }),
        [pick, packed, usedIds]
    );

    useEffect(() => {
        if (!open) return;
        setBox(EMPTY_BOX);
        const seeded = {};
        lines.forEach((l) => {
            seeded[l.id] = { quantity: "", instanceIds: [] };
        });
        setRows(seeded);
        // Re-seed only when the dialog opens, not on every recompute of lines.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const setBoxField = (key) => (e) => setBox((b) => ({ ...b, [key]: e.target.value }));
    const setQty = (lineId) => (e) =>
        setRows((r) => ({ ...r, [lineId]: { ...r[lineId], quantity: e.target.value } }));
    const toggleInstance = (lineId, instanceId) =>
        setRows((r) => {
            const current = r[lineId]?.instanceIds || [];
            const next = current.includes(instanceId)
                ? current.filter((id) => id !== instanceId)
                : [...current, instanceId];
            return { ...r, [lineId]: { ...r[lineId], instanceIds: next } };
        });

    const fillRemaining = () => {
        const next = {};
        lines.forEach((l) => {
            next[l.id] = {
                quantity: l.remaining > 0 ? String(l.remaining) : "",
                instanceIds: l.tracked ? [...l.available] : [],
            };
        });
        setRows(next);
    };

    const problems = useMemo(() => {
        const out = {};
        lines.forEach((l) => {
            const row = rows[l.id] || {};
            if (row.quantity === "" || row.quantity == null) return;
            const qty = toNum(row.quantity);
            if (!Number.isFinite(qty) || qty < 0) out[l.id] = "Enter a quantity";
            else if (qty > l.remaining) out[l.id] = `Only ${l.remaining} still unpacked`;
            else if (l.tracked && qty > 0 && (row.instanceIds || []).length === 0)
                out[l.id] = "Choose the units going into this box";
        });
        return out;
    }, [lines, rows]);

    const chosen = lines.filter((l) => toNum(rows[l.id]?.quantity) > 0);

    const boxProblem = useMemo(() => {
        const gross = optNum(box.grossWeightKg);
        const net = optNum(box.netWeightKg);
        if (gross != null && net != null && net > gross) return "Net weight cannot exceed gross weight";
        const negative = ["lengthCm", "widthCm", "heightCm", "grossWeightKg", "netWeightKg"].some(
            (k) => optNum(box[k]) != null && optNum(box[k]) < 0
        );
        return negative ? "Dimensions and weights cannot be negative" : null;
    }, [box]);

    const blocked = Object.keys(problems).length > 0 || chosen.length === 0 || Boolean(boxProblem);

    const handleSubmit = () => {
        if (blocked) return;
        onSubmit({
            boxType: box.boxType?.trim() || null,
            lengthCm: optNum(box.lengthCm),
            widthCm: optNum(box.widthCm),
            heightCm: optNum(box.heightCm),
            grossWeightKg: optNum(box.grossWeightKg),
            netWeightKg: optNum(box.netWeightKg),
            shippingMarks: box.shippingMarks?.trim() || null,
            lines: chosen.map((l) => ({
                pickListLineId: l.id,
                quantity: toNum(rows[l.id].quantity),
                instanceIds: l.tracked ? rows[l.id].instanceIds : [],
            })),
        });
    };

    if (!slip || !pick) return null;

    const nothingLeft = lines.every((l) => l.remaining <= 0);

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Add box {(slip.boxes || []).length + 1} to {slip.slipNumber}
            </DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                {nothingLeft && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Everything on {pick.pickNumber} is already in a box. Mark the slip packed instead.
                    </Alert>
                )}

                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                        <Autocomplete
                            freeSolo
                            options={BOX_TYPES}
                            value={box.boxType}
                            onInputChange={(_, v) => setBox((b) => ({ ...b, boxType: v }))}
                            renderInput={(params) => <TextField {...params} size="small" label="Box type" />}
                        />
                    </Grid>
                    {[
                        ["lengthCm", "Length (cm)"],
                        ["widthCm", "Width (cm)"],
                        ["heightCm", "Height (cm)"],
                    ].map(([k, label]) => (
                        <Grid item xs={4} sm={2} key={k}>
                            <TextField
                                size="small"
                                type="number"
                                label={label}
                                value={box[k]}
                                onChange={setBoxField(k)}
                                inputProps={{ min: 0, step: "any" }}
                                fullWidth
                            />
                        </Grid>
                    ))}
                    <Grid item xs={6} sm={3}>
                        <TextField
                            size="small"
                            type="number"
                            label="Gross weight (kg)"
                            value={box.grossWeightKg}
                            onChange={setBoxField("grossWeightKg")}
                            inputProps={{ min: 0, step: "any" }}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <TextField
                            size="small"
                            type="number"
                            label="Net weight (kg)"
                            value={box.netWeightKg}
                            onChange={setBoxField("netWeightKg")}
                            inputProps={{ min: 0, step: "any" }}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            size="small"
                            label="Shipping marks"
                            placeholder="e.g. consignee, PO no, THIS SIDE UP"
                            value={box.shippingMarks}
                            onChange={setBoxField("shippingMarks")}
                            fullWidth
                        />
                    </Grid>
                </Grid>
                {boxProblem && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {boxProblem}
                    </Alert>
                )}

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                        What goes in this box
                    </Typography>
                    <Button size="small" onClick={fillRemaining} disabled={nothingLeft || saving}>
                        Put everything remaining in this box
                    </Button>
                </Stack>

                <Box sx={{ overflowX: "auto" }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Item</TableCell>
                                <TableCell align="right">Picked</TableCell>
                                <TableCell align="right">Unpacked</TableCell>
                                <TableCell align="right" sx={{ width: 130 }}>
                                    In this box
                                </TableCell>
                                <TableCell sx={{ minWidth: 220 }}>Units</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map((l) => {
                                const row = rows[l.id] || {};
                                const done = l.remaining <= 0;
                                return (
                                    <TableRow key={l.id} sx={done ? { opacity: 0.5 } : undefined}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {l.itemCode}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {l.itemName}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">{l.quantityPicked}</TableCell>
                                        <TableCell align="right">{l.remaining}</TableCell>
                                        <TableCell align="right">
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={row.quantity ?? ""}
                                                onChange={setQty(l.id)}
                                                disabled={done || saving}
                                                error={Boolean(problems[l.id])}
                                                helperText={problems[l.id] || " "}
                                                inputProps={{ min: 0, step: "any", style: { textAlign: "right" } }}
                                                sx={{ width: 120 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {!l.tracked ? (
                                                <Typography variant="caption" color="text.secondary">
                                                    Untracked — counted by quantity
                                                </Typography>
                                            ) : l.available.length === 0 ? (
                                                <Typography variant="caption" color="text.secondary">
                                                    No unpacked units left on this pick
                                                </Typography>
                                            ) : (
                                                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                                    {l.available.map((id) => {
                                                        const on = (row.instanceIds || []).includes(id);
                                                        return (
                                                            <Tooltip key={id} title={`Instance ${id}`}>
                                                                <Chip
                                                                    label={`#${id}`}
                                                                    size="small"
                                                                    clickable
                                                                    color={on ? "primary" : "default"}
                                                                    variant={on ? "filled" : "outlined"}
                                                                    onClick={() => toggleInstance(l.id, id)}
                                                                    disabled={saving}
                                                                />
                                                            </Tooltip>
                                                        );
                                                    })}
                                                </Stack>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>

                <Typography variant="caption" color="text.secondary">
                    For tracked items the units chosen must add up to the quantity — the server checks the
                    real unit sizes and will say so if they do not.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={saving || blocked}>
                    {saving ? "Saving…" : "Add box"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddBoxDialog;
