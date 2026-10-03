import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

const toNum = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));

const TITLES = {
    raise: "Raise package inspection",
    judge: "Record inspection result",
    waive: "Waive inspection",
};

/**
 * The three package-QC actions, as phase H defines them.
 *
 * raise — offer one item in one box for inspection. Raising it is what makes the box block the
 *         slip: an unjudged lot stops closing just as a failed one does.
 * judge — accepted vs rejected. Nothing accepted is a FAILED lot; the server decides the verdict.
 * waive — release a failed or unjudged lot anyway. Needs a reason, and is admin-only server side.
 */
const PackageQcDialog = ({ open, mode, box, lot, onClose, onSubmit, saving, error }) => {
    const [form, setForm] = useState({});

    const items = useMemo(() => {
        const seen = new Map();
        (box?.lines || []).forEach((l) => {
            const prev = seen.get(l.inventoryItemId);
            seen.set(l.inventoryItemId, {
                inventoryItemId: l.inventoryItemId,
                itemCode: l.itemCode,
                itemName: l.itemName,
                quantity: (prev?.quantity || 0) + Number(l.quantity || 0),
            });
        });
        return [...seen.values()];
    }, [box]);

    useEffect(() => {
        if (!open) return;
        if (mode === "raise") {
            const first = items[0];
            setForm({
                inventoryItemId: first?.inventoryItemId ?? "",
                quantityOffered: first ? String(first.quantity) : "",
                remarks: "",
            });
        } else if (mode === "judge") {
            setForm({
                quantityAccepted: String(lot?.quantityOffered ?? ""),
                quantityRejected: "0",
                inspectedBy: "",
                remarks: "",
            });
        } else {
            setForm({ reason: "", waivedBy: "" });
        }
    }, [open, mode, items, lot]);

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const problem = useMemo(() => {
        if (mode === "raise") {
            if (form.inventoryItemId === "" || form.inventoryItemId == null) return "Choose the item inspected";
            const q = toNum(form.quantityOffered);
            if (!Number.isFinite(q) || q <= 0) return "Quantity offered must be greater than zero";
            return null;
        }
        if (mode === "judge") {
            const a = toNum(form.quantityAccepted);
            const r = toNum(form.quantityRejected);
            if (!Number.isFinite(a) || !Number.isFinite(r) || a < 0 || r < 0) return "Enter both quantities";
            if (a + r > Number(lot?.quantityOffered ?? 0))
                return `Accepted plus rejected is more than the ${lot?.quantityOffered} offered`;
            return null;
        }
        return form.reason?.trim() ? null : "A waiver needs a reason — it is the record of why these goods went out";
    }, [mode, form, lot]);

    const verdictHint =
        mode === "judge" && !problem
            ? toNum(form.quantityAccepted) > 0
                ? "This will record the lot as PASSED, unless a critical check on it failed."
                : "Nothing accepted — this will record the lot as FAILED and the box will block the slip."
            : null;

    const handleSubmit = () => {
        if (problem) return;
        if (mode === "raise") {
            onSubmit({
                packageBoxId: box.id,
                inventoryItemId: Number(form.inventoryItemId),
                quantityOffered: toNum(form.quantityOffered),
                remarks: form.remarks?.trim() || undefined,
            });
        } else if (mode === "judge") {
            onSubmit({
                quantityAccepted: toNum(form.quantityAccepted),
                quantityRejected: toNum(form.quantityRejected),
                inspectedBy: form.inspectedBy?.trim() || undefined,
                remarks: form.remarks?.trim() || undefined,
            });
        } else {
            onSubmit({ reason: form.reason.trim(), waivedBy: form.waivedBy?.trim() || undefined });
        }
    };

    if (!mode) return null;

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                {TITLES[mode]}
                {box ? ` — box ${box.boxNumber}` : ""}
            </DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                {lot && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {lot.lotNumber} · {lot.itemCode} · {lot.quantityOffered} offered
                    </Typography>
                )}

                <Stack spacing={2}>
                    {mode === "raise" && (
                        <>
                            <TextField
                                select
                                size="small"
                                label="Item"
                                value={form.inventoryItemId ?? ""}
                                onChange={(e) => {
                                    const it = items.find((i) => i.inventoryItemId === Number(e.target.value));
                                    setForm((f) => ({
                                        ...f,
                                        inventoryItemId: e.target.value,
                                        quantityOffered: it ? String(it.quantity) : f.quantityOffered,
                                    }));
                                }}
                            >
                                {items.map((i) => (
                                    <MenuItem key={i.inventoryItemId} value={i.inventoryItemId}>
                                        {i.itemCode} — {i.quantity} in this box
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                size="small"
                                type="number"
                                label="Quantity offered"
                                value={form.quantityOffered ?? ""}
                                onChange={set("quantityOffered")}
                                inputProps={{ min: 0, step: "any" }}
                            />
                            <TextField
                                size="small"
                                label="Remarks"
                                value={form.remarks ?? ""}
                                onChange={set("remarks")}
                                multiline
                                minRows={2}
                            />
                            <Alert severity="info">
                                Once raised, this box blocks the slip from closing until the lot is judged
                                passed or waived.
                            </Alert>
                        </>
                    )}

                    {mode === "judge" && (
                        <>
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    size="small"
                                    type="number"
                                    label="Accepted"
                                    value={form.quantityAccepted ?? ""}
                                    onChange={set("quantityAccepted")}
                                    inputProps={{ min: 0, step: "any" }}
                                    fullWidth
                                />
                                <TextField
                                    size="small"
                                    type="number"
                                    label="Rejected"
                                    value={form.quantityRejected ?? ""}
                                    onChange={set("quantityRejected")}
                                    inputProps={{ min: 0, step: "any" }}
                                    fullWidth
                                />
                            </Stack>
                            <TextField
                                size="small"
                                label="Inspected by"
                                helperText="Leave blank to record the signed-in user"
                                value={form.inspectedBy ?? ""}
                                onChange={set("inspectedBy")}
                            />
                            <TextField
                                size="small"
                                label="Remarks"
                                value={form.remarks ?? ""}
                                onChange={set("remarks")}
                                multiline
                                minRows={2}
                            />
                        </>
                    )}

                    {mode === "waive" && (
                        <>
                            <TextField
                                size="small"
                                label="Reason"
                                required
                                value={form.reason ?? ""}
                                onChange={set("reason")}
                                multiline
                                minRows={3}
                            />
                            <TextField
                                size="small"
                                label="Waived by"
                                helperText="Leave blank to record the signed-in user"
                                value={form.waivedBy ?? ""}
                                onChange={set("waivedBy")}
                            />
                            <Alert severity="warning">
                                A waiver releases this box despite the inspection. It is kept as WAIVED, never
                                as a pass.
                            </Alert>
                        </>
                    )}

                    {problem && <Alert severity="warning">{problem}</Alert>}
                    {verdictHint && <Alert severity="info">{verdictHint}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    color={mode === "waive" ? "warning" : "primary"}
                    onClick={handleSubmit}
                    disabled={saving || Boolean(problem)}
                >
                    {saving ? "Saving…" : mode === "raise" ? "Raise" : mode === "judge" ? "Record" : "Waive"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PackageQcDialog;
