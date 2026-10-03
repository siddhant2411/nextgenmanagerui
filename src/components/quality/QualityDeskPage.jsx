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
    AssignmentLateOutlined,
    ChevronRight,
    FactCheckOutlined,
    PendingActions,
    Refresh,
    ReportProblemOutlined,
    VerifiedOutlined,
    Warning,
} from "@mui/icons-material";
import {
    listInspectionLots,
    listNcrs,
    LOT_SOURCES,
    LOT_STATUSES,
    LOT_STATUS_SHORT,
    lotDocumentLabel,
    lotSourceMeta,
    lotStatusMeta,
    raiseInspection,
    resolveApiErrorMessage,
} from "../../services/inspectionLotService";
import RaiseInspectionDialog from "./RaiseInspectionDialog";
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
} from "../inventory/warehouse/listStyles";

const fmtDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? null
        : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const RailPanel = ({ border, wash, head, headColor, icon: Icon, iconColor, title, children }) => (
    <Paper elevation={0} sx={alertPanelSx(border, wash)}>
        <Box
            sx={{ p: 2, bgcolor: head, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 1 }}
        >
            <Icon sx={{ color: iconColor, fontSize: 18 }} />
            <Typography sx={{ fontWeight: 800, color: headColor, fontSize: "0.85rem" }}>{title}</Typography>
        </Box>
        {children}
    </Paper>
);

const RailRow = ({ border, hover, title, subtitle, onClick }) => (
    <Box onClick={onClick} sx={{ p: 2, borderBottom: `1px solid ${border}`, cursor: "pointer", "&:hover": { bgcolor: hover } }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{title}</Typography>
        <Typography sx={{ color: MUTED, fontSize: "0.75rem" }}>{subtitle}</Typography>
    </Box>
);

const QualityDeskPage = () => {
    const navigate = useNavigate();

    const [lots, setLots] = useState([]);
    const [ncrs, setNcrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sourceFilter, setSourceFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");

    const [raiseOpen, setRaiseOpen] = useState(false);
    const [raiseError, setRaiseError] = useState(null);
    const [raising, setRaising] = useState(false);
    const [toast, setToast] = useState(null);

    // One fetch of everything; the filters narrow the table, never the headline numbers.
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [allLots, allNcrs] = await Promise.all([listInspectionLots({}), listNcrs({}).catch(() => [])]);
            setLots(Array.isArray(allLots) ? allLots : []);
            setNcrs(Array.isArray(allNcrs) ? allNcrs : []);
        } catch (e) {
            setError(resolveApiErrorMessage(e, "Could not load inspections."));
            setLots([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const stats = useMemo(() => {
        const reported = new Set(ncrs.map((n) => n.inspectionLotId));
        const failed = lots.filter((l) => l.status === "FAILED");
        return {
            pending: lots.filter((l) => l.status === "PENDING"),
            failed,
            // A failed lot nobody has written up: the goods are stopped and nothing says what happens next.
            unreported: failed.filter((l) => !reported.has(l.id)),
            openNcrs: ncrs.filter((n) => n.status === "OPEN"),
            passed: lots.filter((l) => l.status === "PASSED").length,
            waived: lots.filter((l) => l.status === "WAIVED").length,
        };
    }, [lots, ncrs]);

    const submitRaise = async (request) => {
        setRaising(true);
        setRaiseError(null);
        try {
            const created = await raiseInspection(request);
            setRaiseOpen(false);
            setToast({ severity: "success", message: `${created.lotNumber} raised` });
            if (created?.id) navigate(`/quality/inspections/${created.id}`);
            else await load();
        } catch (e) {
            setRaiseError(resolveApiErrorMessage(e, "Could not raise this inspection."));
        } finally {
            setRaising(false);
        }
    };

    const term = search.trim().toLowerCase();
    const visible = lots.filter(
        (l) =>
            (!sourceFilter || l.source === sourceFilter) &&
            (!statusFilter || l.status === statusFilter) &&
            (!term ||
                l.lotNumber?.toLowerCase().includes(term) ||
                l.itemCode?.toLowerCase().includes(term) ||
                l.itemName?.toLowerCase().includes(term) ||
                lotDocumentLabel(l).toLowerCase().includes(term))
    );

    const railVisible = stats.pending.length > 0 || stats.unreported.length > 0 || stats.openNcrs.length > 0;

    const statCards = [
        { label: "Awaiting Judgement", value: stats.pending.length, icon: PendingActions, color: "#f59e0b", tag: stats.pending.length ? "Blocking" : "Clear" },
        { label: "Failed", value: stats.failed.length, icon: Warning, color: "#ef4444", tag: `${stats.unreported.length} unreported` },
        { label: "Open Reports", value: stats.openNcrs.length, icon: AssignmentLateOutlined, color: "#8b5cf6", tag: "Need a decision" },
        { label: "Passed", value: stats.passed, icon: VerifiedOutlined, color: "#10b981", tag: `${stats.waived} waived` },
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
                                Quality Desk
                            </Typography>
                            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                                What is waiting to be looked at, what failed, and what was decided about it.
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <Tooltip title="Refresh">
                                <IconButton aria-label="Refresh" onClick={load} sx={heroIconButtonSx}>
                                    <Refresh />
                                </IconButton>
                            </Tooltip>
                            <Button
                                variant="contained"
                                disableElevation
                                startIcon={<Add />}
                                onClick={() => {
                                    setRaiseError(null);
                                    setRaiseOpen(true);
                                }}
                                sx={primaryButtonSx}
                            >
                                Raise Inspection
                            </Button>
                        </Stack>
                    </Stack>

                    <Grid container spacing={3}>
                        {statCards.map((stat) => (
                            <Grid item xs={12} sm={6} md={3} key={stat.label}>
                                <Paper elevation={0} sx={statCardSx}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${stat.color}20`, color: stat.color, display: "flex" }}>
                                            <stat.icon />
                                        </Box>
                                        <Typography
                                            sx={{ color: stat.color, fontSize: "0.7rem", fontWeight: 800, bgcolor: `${stat.color}10`, px: 1, borderRadius: 1 }}
                                        >
                                            {stat.tag}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="h5" sx={{ fontWeight: 900, mt: 2, color: "white" }}>
                                        {loading ? <CircularProgress size={20} color="inherit" /> : stat.value}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase" }}
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
                                {stats.unreported.length > 0 && (
                                    <RailPanel
                                        border="#fecaca"
                                        wash="#fff5f5"
                                        head="#fee2e2"
                                        headColor="#991b1b"
                                        icon={ReportProblemOutlined}
                                        iconColor={T.error}
                                        title={`Failed, Not Written Up (${stats.unreported.length})`}
                                    >
                                        {stats.unreported.slice(0, 5).map((l) => (
                                            <RailRow
                                                key={l.id}
                                                border="#fecaca"
                                                hover="#fef2f2"
                                                onClick={() => navigate(`/quality/inspections/${l.id}`)}
                                                title={`${l.lotNumber} · ${l.itemCode}`}
                                                subtitle={`${lotSourceMeta(l.source).label} · ${lotDocumentLabel(l)} · ${l.quantityRejected} rejected`}
                                            />
                                        ))}
                                    </RailPanel>
                                )}

                                {stats.pending.length > 0 && (
                                    <RailPanel
                                        border="#fde68a"
                                        wash="#fffbeb"
                                        head="#fef3c7"
                                        headColor="#92400e"
                                        icon={PendingActions}
                                        iconColor={T.warning}
                                        title={`Awaiting Judgement (${stats.pending.length})`}
                                    >
                                        {stats.pending.slice(0, 5).map((l) => (
                                            <RailRow
                                                key={l.id}
                                                border="#fde68a"
                                                hover="#fffaf0"
                                                onClick={() => navigate(`/quality/inspections/${l.id}`)}
                                                title={`${l.lotNumber} · ${l.itemCode}`}
                                                subtitle={`${lotSourceMeta(l.source).label} · ${lotDocumentLabel(l)} · ${l.quantityOffered} offered`}
                                            />
                                        ))}
                                    </RailPanel>
                                )}

                                {stats.openNcrs.length > 0 && (
                                    <RailPanel
                                        border="#ddd6fe"
                                        wash="#faf8ff"
                                        head="#ede9fe"
                                        headColor="#5b21b6"
                                        icon={AssignmentLateOutlined}
                                        iconColor="#7c3aed"
                                        title={`Reports Needing A Decision (${stats.openNcrs.length})`}
                                    >
                                        {stats.openNcrs.slice(0, 5).map((n) => (
                                            <RailRow
                                                key={n.id}
                                                border="#ddd6fe"
                                                hover="#f5f3ff"
                                                onClick={() => navigate(`/quality/inspections/${n.inspectionLotId}`)}
                                                title={`${n.ncrNumber} · ${n.itemCode}`}
                                                subtitle={`${n.quantity} on ${n.inspectionLotNumber} · ${n.problem || "no description"}`}
                                            />
                                        ))}
                                    </RailPanel>
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
                                <Typography sx={{ fontWeight: 800, color: T.text }}>Inspection Registry</Typography>
                                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <TextField
                                        size="small"
                                        placeholder="Search lot, item or document"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        sx={{ minWidth: 220 }}
                                    />
                                    <TextField
                                        select
                                        size="small"
                                        label="Stage"
                                        value={sourceFilter}
                                        onChange={(e) => setSourceFilter(e.target.value)}
                                        sx={{ minWidth: 140 }}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        {LOT_SOURCES.map((s) => (
                                            <MenuItem key={s} value={s}>
                                                {lotSourceMeta(s).label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        select
                                        size="small"
                                        label="Status"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        sx={{ minWidth: 140 }}
                                    >
                                        <MenuItem value="">All</MenuItem>
                                        {LOT_STATUSES.map((s) => (
                                            <MenuItem key={s} value={s}>
                                                {LOT_STATUS_SHORT[s]}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>
                            </Box>

                            <TableContainer component={Box}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={headerCellSx}>Lot</TableCell>
                                            <TableCell sx={headerCellSx}>Stage</TableCell>
                                            <TableCell sx={headerCellSx}>Item</TableCell>
                                            <TableCell sx={headerCellSx}>Against</TableCell>
                                            <TableCell sx={headerCellSx} align="right">Offered</TableCell>
                                            <TableCell sx={headerCellSx} align="right">Accepted</TableCell>
                                            <TableCell sx={headerCellSx} align="center">Status</TableCell>
                                            <TableCell sx={headerCellSx} />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                                    <CircularProgress size={32} />
                                                </TableCell>
                                            </TableRow>
                                        ) : visible.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                                    <Typography variant="body2" sx={{ color: MUTED }}>
                                                        {lots.length === 0
                                                            ? "No inspections yet. Raise one against a goods receipt or a work order."
                                                            : "Nothing matches those filters."}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            visible.map((l) => {
                                                const st = lotStatusMeta(l.status);
                                                const src = lotSourceMeta(l.source);
                                                return (
                                                    <TableRow
                                                        key={l.id}
                                                        hover
                                                        sx={clickableRowSx}
                                                        onClick={() => navigate(`/quality/inspections/${l.id}`)}
                                                    >
                                                        <TableCell sx={{ py: 1.5 }}>
                                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                                <Avatar sx={{ width: 32, height: 32, bgcolor: `${st.color}15`, color: st.color }}>
                                                                    <FactCheckOutlined sx={{ fontSize: 16 }} />
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: INK }}>
                                                                        {l.lotNumber}
                                                                    </Typography>
                                                                    {fmtDate(l.inspectedDate) && (
                                                                        <Typography variant="caption" sx={{ color: MUTED }}>
                                                                            {fmtDate(l.inspectedDate)}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Stack>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={src.label} size="small" sx={chipSx(src)} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: INK }}>
                                                                {l.itemCode}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: MUTED }}>
                                                                {l.itemName}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                                {lotDocumentLabel(l)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                                {l.quantityOffered}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" sx={{ color: INK_SOFT }}>
                                                                {l.status === "PENDING" ? "—" : l.quantityAccepted}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip label={LOT_STATUS_SHORT[l.status] || l.status} size="small" sx={chipSx(st)} />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <ChevronRight sx={{ fontSize: 18, color: MUTED }} />
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

            <RaiseInspectionDialog
                open={raiseOpen}
                onClose={() => setRaiseOpen(false)}
                onSubmit={submitRaise}
                saving={raising}
                error={raiseError}
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

export default QualityDeskPage;
