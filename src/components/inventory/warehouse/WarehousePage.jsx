import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    Add,
    ChevronRight,
    EditOutlined,
    Inventory2,
    PlaceOutlined,
    Refresh,
    ReportProblemOutlined,
    ScienceOutlined,
    WarehouseOutlined,
} from "@mui/icons-material";
import {
    createWarehouse,
    getWarehouseStock,
    listWarehouses,
    resolveApiErrorMessage,
    updateWarehouse,
    warehouseTypeMeta,
    WAREHOUSE_TYPES,
} from "../../../services/warehouseService";
import WarehouseFormDialog from "./WarehouseFormDialog";
import {
    alertPanelSx,
    chipSx,
    clickableRowSx,
    headerCellSx,
    heroIconButtonSx,
    heroSx,
    INK,
    INK_SOFT,
    MUTED,
    primaryButtonSx,
    statCardSx,
    surfaceSx,
    T,
} from "./listStyles";

const num = (v) => Number(v ?? 0);
const fmtQty = (n) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3))));

const WarehousePage = () => {
    const navigate = useNavigate();

    const [warehouses, setWarehouses] = useState([]);
    const [stockByWarehouse, setStockByWarehouse] = useState({});
    const [loading, setLoading] = useState(true);
    const [stockLoading, setStockLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");

    const [formOpen, setFormOpen] = useState(false);
    const [formTarget, setFormTarget] = useState(null);
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setStockLoading(true);
        setError(null);
        try {
            const rows = await listWarehouses(false);
            const list = Array.isArray(rows) ? rows : [];
            setWarehouses(list);
            setLoading(false);

            // Stock is per warehouse, so the headline totals need one call each. The master is
            // small by nature, and a failure on one warehouse must not blank the whole page.
            const entries = await Promise.all(
                list.map(async (w) => {
                    try {
                        const s = await getWarehouseStock(w.id);
                        return [w.id, Array.isArray(s) ? s : []];
                    } catch {
                        return [w.id, []];
                    }
                })
            );
            setStockByWarehouse(Object.fromEntries(entries));
        } catch (e) {
            setError(resolveApiErrorMessage(e, "Could not load warehouses."));
            setWarehouses([]);
            setLoading(false);
        } finally {
            setStockLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const stats = useMemo(() => {
        const all = Object.values(stockByWarehouse).flat();
        return {
            count: warehouses.length,
            active: warehouses.filter((w) => w.active).length,
            locations: warehouses.reduce((a, w) => a + (w.locationCount ?? 0), 0),
            onHand: all.reduce((a, r) => a + num(r.onHand), 0),
            inTransit: all.reduce((a, r) => a + num(r.inTransit), 0),
        };
    }, [warehouses, stockByWarehouse]);

    /* A bin-tracked warehouse with no locations cannot be picked from properly — a real
       configuration gap worth surfacing rather than leaving to be discovered at the shelf. */
    const misconfigured = useMemo(
        () => warehouses.filter((w) => w.binTracked && (w.locationCount ?? 0) === 0),
        [warehouses]
    );
    const quarantine = useMemo(
        () =>
            warehouses.filter(
                (w) => w.warehouseType === "QUARANTINE" || w.warehouseType === "SCRAP"
            ),
        [warehouses]
    );

    const submit = async (dto) => {
        setSaving(true);
        setFormError(null);
        try {
            if (formTarget?.id) {
                await updateWarehouse(formTarget.id, dto);
                setToast({ severity: "success", message: `${dto.code} updated` });
            } else {
                await createWarehouse(dto);
                setToast({ severity: "success", message: `${dto.code} created` });
            }
            setFormOpen(false);
            await load();
        } catch (e) {
            setFormError(resolveApiErrorMessage(e, "Could not save this warehouse."));
        } finally {
            setSaving(false);
        }
    };

    const term = search.trim().toLowerCase();
    const visible = warehouses.filter((w) => {
        if (typeFilter && w.warehouseType !== typeFilter) return false;
        if (!term) return true;
        return (
            w.code?.toLowerCase().includes(term) ||
            w.name?.toLowerCase().includes(term) ||
            w.city?.toLowerCase().includes(term)
        );
    });

    const railVisible = misconfigured.length > 0 || quarantine.length > 0;

    const statCards = [
        { label: "Warehouses", value: stats.count, icon: WarehouseOutlined, color: "#3b82f6", tag: `${stats.active} active` },
        { label: "Bin Locations", value: stats.locations, icon: PlaceOutlined, color: "#8b5cf6", tag: stats.locations ? "Mapped" : "None" },
        { label: "Total On Hand", value: stockLoading ? null : fmtQty(stats.onHand), icon: Inventory2, color: "#10b981", tag: "All sites" },
        { label: "In Transit", value: stockLoading ? null : fmtQty(stats.inTransit), icon: ChevronRight, color: "#f59e0b", tag: "Between sites" },
    ];

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: "100vh", pb: 8 }}>
            <Box sx={heroSx}>
                <Container maxWidth="xl">
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        spacing={2}
                        mb={6}
                    >
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.02em", mb: 1 }}>
                                Warehouse Control
                            </Typography>
                            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                                Where stock sits, what each site holds, and what is moving between them.
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <Tooltip title="Refresh">
                                <IconButton onClick={load} sx={heroIconButtonSx}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="contained"
                                disableElevation
                                startIcon={<Add />}
                                onClick={() => {
                                    setFormTarget(null);
                                    setFormError(null);
                                    setFormOpen(true);
                                }}
                                sx={primaryButtonSx}
                            >
                                New Warehouse
                            </Button>
                        </Stack>
                    </Stack>

                    <Grid container spacing={3}>
                        {statCards.map((stat) => (
                            <Grid item xs={12} sm={6} md={3} key={stat.label}>
                                <Paper elevation={0} sx={statCardSx}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box
                                            sx={{
                                                p: 1,
                                                borderRadius: 2,
                                                bgcolor: `${stat.color}20`,
                                                color: stat.color,
                                                display: "flex",
                                            }}
                                        >
                                            <stat.icon />
                                        </Box>
                                        <Typography
                                            sx={{
                                                color: stat.color,
                                                fontSize: "0.7rem",
                                                fontWeight: 800,
                                                bgcolor: `${stat.color}10`,
                                                px: 1,
                                                borderRadius: 1,
                                            }}
                                        >
                                            {stat.tag}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 2, color: "white" }}>
                                        {stat.value === null ? (
                                            <CircularProgress size={20} color="inherit" />
                                        ) : (
                                            stat.value
                                        )}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: "rgba(255,255,255,0.5)",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        {stat.label}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ mt: -6 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={4}>
                    {railVisible && (
                        <Grid item xs={12} lg={4}>
                            <Stack spacing={3}>
                                {misconfigured.length > 0 && (
                                    <Paper elevation={0} sx={alertPanelSx("#fecaca", "#fff5f5")}>
                                        <Box
                                            sx={{
                                                p: 2,
                                                bgcolor: "#fee2e2",
                                                borderBottom: "1px solid #fecaca",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <ReportProblemOutlined sx={{ color: T.error, fontSize: 18 }} />
                                            <Typography sx={{ fontWeight: 800, color: "#991b1b", fontSize: "0.85rem" }}>
                                                Bins On, No Locations ({misconfigured.length})
                                            </Typography>
                                        </Box>
                                        {misconfigured.slice(0, 5).map((w) => (
                                            <Box
                                                key={w.id}
                                                onClick={() => navigate(`/inventory/warehouses/${w.id}`)}
                                                sx={{
                                                    p: 2,
                                                    borderBottom: "1px solid #fecaca",
                                                    cursor: "pointer",
                                                    "&:hover": { bgcolor: "#fef2f2" },
                                                }}
                                            >
                                                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                                                    {w.code}
                                                </Typography>
                                                <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>
                                                    Bin tracking is on but nothing is mapped — add locations
                                                    before picking from here.
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Paper>
                                )}

                                {quarantine.length > 0 && (
                                    <Paper elevation={0} sx={alertPanelSx("#fde68a", "#fffbeb")}>
                                        <Box
                                            sx={{
                                                p: 2,
                                                bgcolor: "#fef3c7",
                                                borderBottom: "1px solid #fde68a",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <ScienceOutlined sx={{ color: T.warning, fontSize: 18 }} />
                                            <Typography sx={{ fontWeight: 800, color: "#92400e", fontSize: "0.85rem" }}>
                                                Quarantine &amp; Scrap ({quarantine.length})
                                            </Typography>
                                        </Box>
                                        {quarantine.map((w) => {
                                            const held = (stockByWarehouse[w.id] || []).reduce(
                                                (a, r) => a + num(r.onHand),
                                                0
                                            );
                                            return (
                                                <Box
                                                    key={w.id}
                                                    onClick={() => navigate(`/inventory/warehouses/${w.id}`)}
                                                    sx={{
                                                        p: 2,
                                                        borderBottom: "1px solid #fde68a",
                                                        cursor: "pointer",
                                                        "&:hover": { bgcolor: "#fffaf0" },
                                                    }}
                                                >
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                                                            {w.code}
                                                        </Typography>
                                                        <Typography
                                                            sx={{
                                                                color: held > 0 ? T.warning : MUTED,
                                                                fontWeight: 700,
                                                                fontSize: "0.75rem",
                                                            }}
                                                        >
                                                            {fmtQty(held)} held
                                                        </Typography>
                                                    </Stack>
                                                    <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>
                                                        {w.name}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Paper>
                                )}
                            </Stack>
                        </Grid>
                    )}

                    <Grid item xs={12} lg={railVisible ? 8 : 12}>
                        <Paper elevation={0} sx={surfaceSx}>
                            <Box
                                sx={{
                                    p: 3,
                                    borderBottom: `1px solid ${T.border}`,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: 2,
                                }}
                            >
                                <Typography sx={{ fontWeight: 800, color: T.text }}>Warehouse Registry</Typography>
                                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                                    <TextField
                                        size="small"
                                        placeholder="Search code, name or city"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        sx={{ minWidth: 220 }}
                                    />
                                    <TextField
                                        select
                                        size="small"
                                        label="Type"
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        sx={{ minWidth: 160 }}
                                    >
                                        <MenuItem value="">All types</MenuItem>
                                        {WAREHOUSE_TYPES.map((t) => (
                                            <MenuItem key={t.value} value={t.value}>
                                                {t.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>
                            </Box>

                            <TableContainer component={Box}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={headerCellSx}>Code</TableCell>
                                            <TableCell sx={headerCellSx}>Name</TableCell>
                                            <TableCell sx={headerCellSx}>Location</TableCell>
                                            <TableCell sx={headerCellSx} align="center">Type</TableCell>
                                            <TableCell sx={headerCellSx} align="right">On Hand</TableCell>
                                            <TableCell sx={headerCellSx} align="center">Bins</TableCell>
                                            <TableCell sx={headerCellSx} align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                                    <CircularProgress size={32} />
                                                </TableCell>
                                            </TableRow>
                                        ) : visible.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                                    <Typography variant="body2" sx={{ color: MUTED }}>
                                                        {warehouses.length === 0
                                                            ? "No warehouses yet."
                                                            : "Nothing matches those filters."}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            visible.map((w) => {
                                                const meta = warehouseTypeMeta(w.warehouseType);
                                                const held = (stockByWarehouse[w.id] || []).reduce(
                                                    (a, r) => a + num(r.onHand),
                                                    0
                                                );
                                                return (
                                                    <TableRow
                                                        key={w.id}
                                                        hover
                                                        sx={clickableRowSx}
                                                        onClick={() => navigate(`/inventory/warehouses/${w.id}`)}
                                                    >
                                                        <TableCell sx={{ py: 1.5 }}>
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <Avatar
                                                                    sx={{
                                                                        width: 32,
                                                                        height: 32,
                                                                        bgcolor: `${meta.color}15`,
                                                                        color: meta.color,
                                                                    }}
                                                                >
                                                                    <WarehouseOutlined sx={{ fontSize: 16 }} />
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{ fontWeight: 700, color: INK }}
                                                                    >
                                                                        {w.code}
                                                                    </Typography>
                                                                    <Stack direction="row" spacing={0.5}>
                                                                        {w.isDefault && (
                                                                            <Chip
                                                                                label="Default"
                                                                                size="small"
                                                                                sx={{
                                                                                    height: 16,
                                                                                    fontSize: "0.625rem",
                                                                                    fontWeight: 700,
                                                                                    bgcolor: "#eff6ff",
                                                                                    color: T.primary,
                                                                                }}
                                                                            />
                                                                        )}
                                                                        {!w.active && (
                                                                            <Chip
                                                                                label="Inactive"
                                                                                size="small"
                                                                                sx={{
                                                                                    height: 16,
                                                                                    fontSize: "0.625rem",
                                                                                    bgcolor: "#f1f5f9",
                                                                                    color: MUTED,
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </Stack>
                                                                </Box>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontWeight: 500, color: INK_SOFT }}
                                                            >
                                                                {w.name}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontSize: "0.8125rem", color: INK_SOFT }}
                                                            >
                                                                {[w.city, w.state].filter(Boolean).join(", ") || "—"}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip label={meta.label} size="small" sx={chipSx(meta)} />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography
                                                                sx={{ fontWeight: 600, color: INK, fontSize: "0.875rem" }}
                                                            >
                                                                {stockLoading ? "…" : fmtQty(held)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            {w.binTracked ? (
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ fontWeight: 600, color: INK_SOFT }}
                                                                >
                                                                    {w.locationCount ?? 0}
                                                                </Typography>
                                                            ) : (
                                                                <Typography variant="caption" color="text.disabled">
                                                                    Off
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                                            <Tooltip title="Edit">
                                                                <IconButton
                                                                    size="small"
                                                                    sx={{ color: MUTED, "&:hover": { color: T.primary } }}
                                                                    onClick={() => {
                                                                        setFormTarget(w);
                                                                        setFormError(null);
                                                                        setFormOpen(true);
                                                                    }}
                                                                >
                                                                    <EditOutlined sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Open">
                                                                <IconButton
                                                                    size="small"
                                                                    sx={{ color: MUTED, "&:hover": { color: T.primary } }}
                                                                    onClick={() =>
                                                                        navigate(`/inventory/warehouses/${w.id}`)
                                                                    }
                                                                >
                                                                    <ChevronRight sx={{ fontSize: 18 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>

            <WarehouseFormDialog
                open={formOpen}
                warehouse={formTarget}
                onClose={() => setFormOpen(false)}
                onSubmit={submit}
                saving={saving}
                error={formError}
            />

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

export default WarehousePage;
