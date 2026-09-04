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
 * Records what actually arrived.
 *
 * <p>Quantities default to what was dispatched, so the common case is one click. Receiving less
 * does not balance itself away — the shortfall stays in transit at the source, which is a thing
 * to chase rather than a rounding difference — so the dialog says so before it is submitted.
 * Receiving is one-shot: whatever is not recorded now cannot be received later.
 */
const TransferReceiveDialog = ({ open, transfer, onClose, onSubmit, saving, error }) => {
    const [rows, setRows] = useState({});
    const [remarks, setRemarks] = useState("");

    useEffect(() => {
        if (!open || !transfer) return;
        const seeded = {};
        (transfer.lines || []).forEach((l) => {
            seeded[l.id] = String(l.quantity ?? "");
        });
        setRows(seeded);
        setRemarks("");
    }, [open, transfer]);

    const setQty = (lineId) => (event) =>
        setRows((prev) => ({ ...prev, [lineId]: event.target.value }));

    const problems = useMemo(() => {
        if (!transfer) return {};
        const out = {};
        (transfer.lines || []).forEach((l) => {
            const qty = toNum(rows[l.id]);
            if (!Number.isFinite(qty) || qty < 0) {
                out[l.id] = "Enter a quantity";
            } else if (qty > Number(l.quantity)) {
                out[l.id] = `More than the ${l.quantity} dispatched`;
            }
        });
        return out;
    }, [transfer, rows]);

    const shortfall = useMemo(() => {
        if (!transfer) return 0;
        return (transfer.lines || []).reduce((a, l) => {
            const qty = toNum(rows[l.id]);
            if (!Number.isFinite(qty)) return a;
            return a + Math.max(0, Number(l.quantity ?? 0) - qty);
        }, 0);
    }, [transfer, rows]);

    const hasProblems = Object.keys(problems).length > 0;

    const handleSubmit = () => {
        if (!transfer || hasProblems) return;
        onSubmit({
            remarks: remarks.trim() || undefined,
            lines: (transfer.lines || []).map((l) => ({
                lineId: l.id,
                receivedQuantity: toNum(rows[l.id]),
            })),
        });
    };

    if (!transfer) return null;

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle>Receive {transfer.transferNumber}</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Typography variant="caption" color="text.secondary">
                    {transfer.fromWarehouseCode} → {transfer.toWarehouseCode}
                </Typography>

                <Box sx={{ overflowX: "auto", mt: 1 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Item</TableCell>
                                <TableCell align="right">Dispatched</TableCell>
                                <TableCell align="right" sx={{ width: 180 }}>
                                    Received
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(transfer.lines || []).map((l) => (
                                <TableRow key={l.id}>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>
                                            {l.itemCode}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {l.itemName}
                                            {l.remarks ? ` · ${l.remarks}` : ""}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">{l.quantity}</TableCell>
                                    <TableCell align="right">
                                        <TextField
                                            size="small"
                                            type="number"
                                            value={rows[l.id] ?? ""}
                                            onChange={setQty(l.id)}
                                            error={Boolean(problems[l.id])}
                                            helperText={problems[l.id] || " "}
                                            inputProps={{ min: 0, step: "any", style: { textAlign: "right" } }}
                                            sx={{ width: 160 }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>

                <Stack spacing={2} sx={{ mt: 1 }}>
                    {shortfall > 0 && (
                        <Alert severity="warning">
                            {shortfall} unit(s) will not be received. They stay counted as in transit at{" "}
                            {transfer.fromWarehouseCode} until someone works out where they went — this
                            transfer cannot be received a second time.
                        </Alert>
                    )}
                    <TextField
                        label="Remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        multiline
                        minRows={2}
                        helperText="Replaces the remarks on the transfer"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={saving || hasProblems}>
                    {saving ? "Saving…" : "Receive"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TransferReceiveDialog;
