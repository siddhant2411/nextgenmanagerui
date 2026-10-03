import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Autocomplete,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import { getWorkOrder, getWorkOrderList } from "../../services/workOrderService";
import { getGRN, searchGRNs } from "../../services/grnService";
import { lotSourceMeta } from "../../services/inspectionLotService";

const rowsOf = (resp) => (Array.isArray(resp) ? resp : resp?.content || resp?.data?.content || resp?.data || []);
const toNum = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));

// Package inspections are raised from the box itself, on the packing slip.
const SOURCES = ["INCOMING", "IN_PROCESS", "FINAL"];

/**
 * Says "these goods are to be looked at". Which document is asked for follows from the source:
 * a goods receipt for incoming, a work order for final, one of its operations for in-process.
 * From the moment it is raised the lot blocks whatever it gates until someone judges it.
 */
const RaiseInspectionDialog = ({ open, onClose, onSubmit, saving, error }) => {
    const [source, setSource] = useState("FINAL");
    const [search, setSearch] = useState("");
    const [options, setOptions] = useState([]);
    const [searching, setSearching] = useState(false);
    const [doc, setDoc] = useState(null);
    const [detail, setDetail] = useState(null);
    const [itemId, setItemId] = useState("");
    const [operationId, setOperationId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [remarks, setRemarks] = useState("");
    const [loadError, setLoadError] = useState(null);

    const isGrn = source === "INCOMING";

    useEffect(() => {
        if (!open) return;
        setSource("FINAL");
        setSearch("");
        setDoc(null);
        setDetail(null);
        setItemId("");
        setOperationId("");
        setQuantity("");
        setRemarks("");
        setLoadError(null);
    }, [open]);

    // Search the documents for the chosen source as the user types.
    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        const handle = setTimeout(async () => {
            setSearching(true);
            try {
                const resp = isGrn
                    ? await searchGRNs({ grnNumber: search || undefined, page: 0, size: 15 })
                    : await getWorkOrderList({
                          page: 0,
                          size: 15,
                          sortBy: "workOrderNumber",
                          sortDir: "desc",
                          filters: search
                              ? [{ field: "workOrderNumber", operator: "contains", value: search }]
                              : [],
                      });
                if (!cancelled) setOptions(rowsOf(resp));
            } catch (e) {
                if (!cancelled) setOptions([]);
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
    }, [open, isGrn, search]);

    // The chosen document's lines decide which items (and operations) can be inspected.
    useEffect(() => {
        if (!doc?.id) {
            setDetail(null);
            return undefined;
        }
        let cancelled = false;
        (async () => {
            setLoadError(null);
            try {
                const d = isGrn ? await getGRN(doc.id) : await getWorkOrder(doc.id);
                if (!cancelled) setDetail(d);
            } catch (e) {
                if (!cancelled) {
                    setDetail(null);
                    setLoadError("Could not load that document's lines.");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [doc, isGrn]);

    const items = useMemo(() => {
        if (!detail) return [];
        if (isGrn) {
            return (detail.items || []).map((l) => ({
                id: l.inventoryItemId,
                code: l.itemCode,
                name: l.itemName,
                quantity: Number(l.receivedQty || 0),
            }));
        }
        const lines = (detail.lines || []).filter((l) => l.inventoryItem);
        const fromLines = lines.map((l) => ({
            id: l.inventoryItem.inventoryItemId,
            code: l.inventoryItem.itemCode,
            name: l.inventoryItem.name,
            quantity: Number(l.plannedQuantity || 0),
        }));
        if (fromLines.length) return fromLines;
        return detail.inventoryItem
            ? [
                  {
                      id: detail.inventoryItem.inventoryItemId,
                      code: detail.inventoryItem.itemCode,
                      name: detail.inventoryItem.name,
                      quantity: Number(detail.plannedQuantity || 0),
                  },
              ]
            : [];
    }, [detail, isGrn]);

    const operations = useMemo(() => (isGrn ? [] : detail?.operations || []), [detail, isGrn]);

    // One item on the document is no choice at all: pick it, and offer its quantity.
    useEffect(() => {
        if (items.length === 1) {
            setItemId(items[0].id);
            setQuantity(items[0].quantity > 0 ? String(items[0].quantity) : "");
        } else {
            setItemId("");
            setQuantity("");
        }
        setOperationId("");
    }, [items]);

    const changeSource = (_, next) => {
        if (!next) return;
        setSource(next);
        setDoc(null);
        setDetail(null);
        setSearch("");
        setOptions([]);
    };

    const problem = useMemo(() => {
        if (!doc) return isGrn ? "Choose the goods receipt" : "Choose the work order";
        if (source === "IN_PROCESS" && !operationId) return "Choose the operation being inspected";
        if (itemId === "" || itemId == null) return "Choose the item being inspected";
        const q = toNum(quantity);
        if (!Number.isFinite(q) || q <= 0) return "Quantity offered must be greater than zero";
        return null;
    }, [doc, isGrn, source, operationId, itemId, quantity]);

    const handleSubmit = () => {
        if (problem) return;
        onSubmit({
            source,
            goodsReceiptNoteId: isGrn ? doc.id : undefined,
            workOrderId: source === "FINAL" ? doc.id : undefined,
            workOrderOperationId: source === "IN_PROCESS" ? Number(operationId) : undefined,
            inventoryItemId: Number(itemId),
            quantityOffered: toNum(quantity),
            remarks: remarks.trim() || undefined,
        });
    };

    const meta = lotSourceMeta(source);

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Raise an inspection</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Stack spacing={2}>
                    <ToggleButtonGroup exclusive fullWidth size="small" value={source} onChange={changeSource}>
                        {SOURCES.map((s) => (
                            <ToggleButton key={s} value={s} sx={{ textTransform: "none", fontWeight: 700 }}>
                                {lotSourceMeta(s).label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="text.secondary">
                        {meta.hint}.{" "}
                        {source === "FINAL" &&
                            "While this lot is unjudged or failed, the work order cannot produce finished stock."}
                        {source === "IN_PROCESS" &&
                            "It carries no readings of its own — the operator's measurements already live on the operation."}
                        {source === "INCOMING" && "Raised against what a goods receipt brought in."} Package
                        inspections are raised from the box, on its packing slip.
                    </Typography>

                    <Autocomplete
                        options={options}
                        value={doc}
                        loading={searching}
                        onChange={(_, v) => setDoc(v)}
                        onInputChange={(_, v, reason) => reason === "input" && setSearch(v)}
                        filterOptions={(x) => x}
                        isOptionEqualToValue={(a, b) => a?.id === b?.id}
                        getOptionLabel={(o) =>
                            !o
                                ? ""
                                : isGrn
                                ? `${o.grnNumber || `GRN #${o.id}`}${o.vendorName ? ` — ${o.vendorName}` : ""}`
                                : `${o.workOrderNumber || `WO #${o.id}`}${o.status ? ` — ${o.status}` : ""}`
                        }
                        noOptionsText={isGrn ? "No goods receipts found" : "No work orders found"}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                size="small"
                                label={isGrn ? "Goods receipt" : "Work order"}
                                placeholder="Type a number to search"
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {searching ? <CircularProgress size={16} /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                    />
                    {loadError && <Alert severity="warning">{loadError}</Alert>}

                    {source === "IN_PROCESS" && doc && (
                        <TextField
                            select
                            size="small"
                            label="Operation"
                            value={operationId}
                            onChange={(e) => setOperationId(e.target.value)}
                            helperText={operations.length === 0 && detail ? "This work order has no operations" : " "}
                        >
                            {operations.map((op) => (
                                <MenuItem key={op.id} value={op.id}>
                                    {op.sequence != null ? `${op.sequence}. ` : ""}
                                    {op.operationName || op.routingOperation?.name || `Operation ${op.id}`}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}

                    {doc && (
                        <Stack direction="row" spacing={2}>
                            <TextField
                                select
                                size="small"
                                label="Item"
                                value={itemId}
                                onChange={(e) => {
                                    setItemId(e.target.value);
                                    const it = items.find((i) => i.id === Number(e.target.value));
                                    if (it && it.quantity > 0) setQuantity(String(it.quantity));
                                }}
                                sx={{ flex: 2 }}
                                helperText={items.length === 0 && detail ? "No items on this document" : " "}
                            >
                                {items.map((i) => (
                                    <MenuItem key={i.id} value={i.id}>
                                        {i.code} — {i.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                size="small"
                                type="number"
                                label="Quantity offered"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                inputProps={{ min: 0, step: "any" }}
                                sx={{ flex: 1 }}
                            />
                        </Stack>
                    )}

                    <TextField
                        size="small"
                        label="Remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        multiline
                        minRows={2}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1, pl: 2 }}>
                    {problem || ""}
                </Typography>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={saving || Boolean(problem)}>
                    {saving ? "Raising…" : "Raise"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RaiseInspectionDialog;
