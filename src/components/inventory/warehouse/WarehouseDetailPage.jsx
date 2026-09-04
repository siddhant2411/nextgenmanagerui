import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Paper,
    Snackbar,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    Add,
    ArrowBack,
    DeleteOutlined,
    EditOutlined,
    Inventory2,
    LocalShipping,
    PlaceOutlined,
    Refresh,
} from "@mui/icons-material";
import {
    createLocation,
    deleteLocation,
    deleteWarehouse,
    getWarehouse,
    getWarehouseStock,
    listLocations,
    resolveApiErrorMessage,
    updateLocation,
    updateWarehouse,
    warehouseTypeMeta,
} from "../../../services/warehouseService";
import WarehouseFormDialog from "./WarehouseFormDialog";
import LocationFormDialog from "./LocationFormDialog";
import {
    chipSx,
    headerCellSx,
    heroIconButtonSx,
    heroSx,
    INK,
    INK_SOFT,
    MUTED,
    statCardSx,
    surfaceSx,
    T,
} from "./listStyles";

const num = (v) => Number(v ?? 0);
const fmtQty = (v) => {
    const n = num(v);
    return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
};

const StatTile = ({ label, value, tag, color, icon: Icon }) => (
    <Paper elevation={0} sx={statCardSx}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}20`, color, display: "flex" }}>
                <Icon />
            </Box>
            <Typography
                sx={{
                    color,
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    bgcolor: `${color}10`,
                    px: 1,
                    borderRadius: 1,
                }}
            >
                {tag}
            </Typography>
        </Stack>
        <Typography variant="h5" sx={{ fontWeight: 900, mt: 2, color: "white" }}>
            {value}
        </Typography>
        <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase" }}
        >
            {label}
        </Typography>
    </Paper>
);

const WarehouseDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [warehouse, setWarehouse] = useState(null);
    const [stock, setStock] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState("stock");

    const [formOpen, setFormOpen] = useState(false);
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);

    const [locOpen, setLocOpen] = useState(false);
    const [locTarget, setLocTarget] = useState(null);
    const [locError, setLocError] = useState(null);
    const [locSaving, setLocSaving] = useState(false);

    const [ask, setAsk] = useState(null);
    const [toast, setToast] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [w, s, l] = await Promise.all([
                getWarehouse(id),
                getWarehouseStock(id),
                listLocations(id),
            ]);
            setWarehouse(w);
            setStock(Array.isArray(s) ? s : []);
            setLocations(Array.isArray(l) ? l : []);
        } catch (e) {
            setError(resolveApiErrorMessage(e, "Could not load this warehouse."));
            setWarehouse(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const totals = useMemo(
        () => ({
            onHand: stock.reduce((a, r) => a + num(r.onHand), 0),
            reserved: stock.reduce((a, r) => a + num(r.reserved), 0),
            inTransit: stock.reduce((a, r) => a + num(r.inTransit), 0),
        }),
        [stock]
    );

    const saveWarehouse = async (dto) => {
        setSaving(true);
        setFormError(null);
        try {
            await updateWarehouse(id, dto);
            setToast({ severity: "success", message: "Warehouse updated" });
            setFormOpen(false);
            await load();
        } catch (e) {
            setFormError(resolveApiErrorMessage(e, "Could not save this warehouse."));
        } finally {
            setSaving(false);
        }
    };

    const saveLocation = async (dto) => {
        setLocSaving(true);
        setLocError(null);
        try {
            if (locTarget?.id) await updateLocation(locTarget.id, dto);
            else await createLocation(id, dto);
            setToast({ severity: "success", message: `${dto.code} saved` });
            setLocOpen(false);
            await load();
        } catch (e) {
            setLocError(resolveApiErrorMessage(e, "Could not save this location."));
        } finally {
            setLocSaving(false);
        }
    };

    const run = async (fn, okMessage, failMessage) => {
        try {
            await fn();
            setToast({ severity: "success", message: okMessage });
            return true;
        } catch (e) {
            setToast({ severity: "error", message: resolveApiErrorMessage(e, failMessage) });
            return false;
        }
    };

    if (loading) {
        return (
            <Box sx={{ bgcolor: T.bg, minHeight: "100vh", pt: 10, textAlign: "center" }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (error || !warehouse) {
        return (
            <Box sx={{ bgcolor: T.bg, minHeight: "100vh", p: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate("/inventory/warehouses")}>
                    Back to warehouses
                </Button>
                <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
                    {error || "Warehouse not found."}
                </Alert>
            </Box>
        );
    }

    const meta = warehouseTypeMeta(warehouse.warehouseType);
    const address = [warehouse.addressLine1, warehouse.city, warehouse.state, warehouse.pincode]
        .filter(Boolean)
        .join(", ");

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: "100vh", pb: 8 }}>
            <Box sx={heroSx}>
                <Container maxWidth="xl">
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate("/inventory/warehouses")}
                        sx={{ color: "rgba(255,255,255,0.7)", mb: 2, textTransform: "none" }}
                    >
                        Warehouses
                    </Button>

                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        spacing={2}
                        mb={5}
                    >
                        <Box>
                            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
                                    {warehouse.code}
                                </Typography>
                                <Chip label={meta.label} size="small" sx={chipSx(meta)} />
                                {warehouse.isDefault && (
                                    <Chip
                                        label="Default"
                                        size="small"
                                        sx={chipSx({ color: "#60a5fa", bg: "rgba(37,99,235,0.15)" })}
                                    />
                                )}
                                {!warehouse.active && (
                                    <Chip
                                        label="Inactive"
                                        size="small"
                                        sx={chipSx({ color: "#cbd5e1", bg: "rgba(255,255,255,0.08)" })}
                                    />
                                )}
                            </Stack>
                            <Typography
                                variant="body1"
                                sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500, mt: 1 }}
                            >
                                {warehouse.name}
                                {address ? ` · ${address}` : ""}
                            </Typography>
                            {warehouse.gstin && (
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
                                    GSTIN {warehouse.gstin}
                                </Typography>
                            )}
                        </Box>

                        <Stack direction="row" spacing={2}>
                            <Tooltip title="Refresh">
                                <IconButton onClick={load} sx={heroIconButtonSx}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit warehouse">
                                <IconButton
                                    sx={heroIconButtonSx}
                                    onClick={() => {
                                        setFormError(null);
                                        setFormOpen(true);
                                    }}
                                >
                                    <EditOutlined />
                                </IconButton>
                            </Tooltip>
                            <Tooltip
                                title={
                                    warehouse.isDefault
                                        ? "The default warehouse cannot be deleted"
                                        : "Delete this warehouse"
                                }
                            >
                                <span>
                                    <IconButton
                                        disabled={warehouse.isDefault}
                                        sx={{
                                            ...heroIconButtonSx,
                                            color: warehouse.isDefault
                                                ? "rgba(255,255,255,0.25)"
                                                : "#fca5a5",
                                        }}
                                        onClick={() =>
                                            setAsk({
                                                title: `Delete ${warehouse.code}?`,
                                                body:
                                                    "The warehouse is retired rather than erased and its code becomes free to reuse. " +
                                                    "It cannot be deleted while it still has locations.",
                                                confirmLabel: "Delete warehouse",
                                                onConfirm: async () => {
                                                    const ok = await run(
                                                        () => deleteWarehouse(id),
                                                        `${warehouse.code} deleted`,
                                                        "Could not delete this warehouse."
                                                    );
                                                    if (ok) navigate("/inventory/warehouses");
                                                },
                                            })
                                        }
                                    >
                                        <DeleteOutlined />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    </Stack>

                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={4}>
                            <StatTile
                                label="On Hand"
                                value={fmtQty(totals.onHand)}
                                tag="Free here"
                                color="#10b981"
                                icon={Inventory2}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <StatTile
                                label="Reserved"
                                value={fmtQty(totals.reserved)}
                                tag="Committed"
                                color="#f59e0b"
                                icon={Inventory2}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <StatTile
                                label="In Transit"
                                value={fmtQty(totals.inTransit)}
                                tag="Moving"
                                color="#8b5cf6"
                                icon={LocalShipping}
                            />
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -6 }}>
                <Paper elevation={0} sx={surfaceSx}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        sx={{ px: 3, borderBottom: `1px solid ${T.border}` }}
                    >
                        <Tab
                            value="stock"
                            icon={<Inventory2 sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label={`Stock (${stock.length})`}
                            sx={{ minHeight: 56, textTransform: "none", fontWeight: 800 }}
                        />
                        <Tab
                            value="locations"
                            icon={<PlaceOutlined sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label={`Locations (${locations.length})`}
                            sx={{ minHeight: 56, textTransform: "none", fontWeight: 800 }}
                        />
                    </Tabs>

                    {tab === "stock" ? (
                        <TableContainer component={Box}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={headerCellSx}>Item</TableCell>
                                        <TableCell sx={headerCellSx} align="right">On Hand</TableCell>
                                        <TableCell sx={headerCellSx} align="right">Reserved</TableCell>
                                        <TableCell sx={headerCellSx} align="right">In Transit</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {stock.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                                                <Typography variant="body2" sx={{ color: MUTED }}>
                                                    Nothing held here yet. A row appears the first time
                                                    stock moves into this warehouse.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        stock.map((r) => (
                                            <TableRow key={r.itemId} hover>
                                                <TableCell sx={{ py: 1.25 }}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 700, color: INK }}
                                                    >
                                                        {r.itemCode}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: MUTED }}>
                                                        {r.itemName}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 700, color: INK }}
                                                    >
                                                        {fmtQty(r.onHand)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                        {fmtQty(r.reserved)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {num(r.inTransit) > 0 ? (
                                                        <Chip
                                                            label={fmtQty(r.inTransit)}
                                                            size="small"
                                                            sx={chipSx({ color: "#b45309", bg: "#fffbeb" })}
                                                        />
                                                    ) : (
                                                        <Typography variant="caption" color="text.disabled">
                                                            —
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Box>
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{ px: 3, py: 2 }}
                            >
                                <Typography variant="caption" sx={{ color: MUTED }}>
                                    {warehouse.binTracked
                                        ? "Bins inside this warehouse."
                                        : "Bin tracking is off — turn it on in Edit to add locations."}
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<Add />}
                                    disabled={!warehouse.binTracked}
                                    sx={{ textTransform: "none", fontWeight: 700 }}
                                    onClick={() => {
                                        setLocTarget(null);
                                        setLocError(null);
                                        setLocOpen(true);
                                    }}
                                >
                                    Add Location
                                </Button>
                            </Stack>
                            <Divider />
                            <TableContainer component={Box}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={headerCellSx}>Code</TableCell>
                                            <TableCell sx={headerCellSx}>Aisle / Rack / Bin</TableCell>
                                            <TableCell sx={headerCellSx} align="center">Pickable</TableCell>
                                            <TableCell sx={headerCellSx} align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {locations.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                                                    <Typography variant="body2" sx={{ color: MUTED }}>
                                                        No locations.
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            locations.map((l) => (
                                                <TableRow key={l.id} hover>
                                                    <TableCell sx={{ py: 1.25 }}>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontWeight: 700, color: INK }}
                                                            >
                                                                {l.code}
                                                            </Typography>
                                                            {!l.active && (
                                                                <Chip
                                                                    label="Inactive"
                                                                    size="small"
                                                                    sx={chipSx({ color: MUTED, bg: "#f1f5f9" })}
                                                                />
                                                            )}
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                            {[l.aisle, l.rack, l.bin]
                                                                .filter(Boolean)
                                                                .join(" / ") || "—"}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {l.pickable ? (
                                                            <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                                Yes
                                                            </Typography>
                                                        ) : (
                                                            <Tooltip title="Holds stock but is never picked from">
                                                                <Chip
                                                                    label="No"
                                                                    size="small"
                                                                    sx={chipSx({ color: MUTED, bg: "#f1f5f9" })}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton
                                                            size="small"
                                                            sx={{ color: MUTED, "&:hover": { color: T.primary } }}
                                                            onClick={() => {
                                                                setLocTarget(l);
                                                                setLocError(null);
                                                                setLocOpen(true);
                                                            }}
                                                        >
                                                            <EditOutlined sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            sx={{ color: MUTED, "&:hover": { color: T.error } }}
                                                            onClick={() =>
                                                                setAsk({
                                                                    title: `Delete ${l.code}?`,
                                                                    body:
                                                                        "Any pick list already pointing at this location keeps its record.",
                                                                    confirmLabel: "Delete location",
                                                                    onConfirm: async () => {
                                                                        await run(
                                                                            () => deleteLocation(l.id),
                                                                            `${l.code} deleted`,
                                                                            "Could not delete this location."
                                                                        );
                                                                        await load();
                                                                    },
                                                                })
                                                            }
                                                        >
                                                            <DeleteOutlined sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </Paper>
            </Container>

            <WarehouseFormDialog
                open={formOpen}
                warehouse={warehouse}
                onClose={() => setFormOpen(false)}
                onSubmit={saveWarehouse}
                saving={saving}
                error={formError}
            />

            <LocationFormDialog
                open={locOpen}
                location={locTarget}
                warehouseCode={warehouse.code}
                onClose={() => setLocOpen(false)}
                onSubmit={saveLocation}
                saving={locSaving}
                error={locError}
            />

            <Dialog open={Boolean(ask)} onClose={() => setAsk(null)} maxWidth="xs" fullWidth>
                <DialogTitle>{ask?.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{ask?.body}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAsk(null)}>Cancel</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={async () => {
                            const action = ask?.onConfirm;
                            setAsk(null);
                            if (action) await action();
                        }}
                    >
                        {ask?.confirmLabel || "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={4000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert severity={toast?.severity || "info"} onClose={() => setToast(null)}>
                    {toast?.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default WarehouseDetailPage;
