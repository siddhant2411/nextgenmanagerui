import React, { useEffect, useState } from "react";
import {
    Box, Card, CardContent, Chip, CircularProgress, Divider,
    Grid, Paper, Skeleton, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import {
    Assignment, CheckCircleOutline, ErrorOutline, HourglassEmpty,
    WarningAmber, Factory, Build,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getWorkOrderSummary, getWorkOrderList } from "../services/workOrderService";
import { formatDateShort } from "../utils/formatters";

const HEADER_BG = "#0f2744";

const STATUS_STYLE = {
    DRAFT: { bg: "#f1f5f9", color: "#64748b" },
    CREATED: { bg: "#f1f5f9", color: "#64748b" },
    SCHEDULED: { bg: "#e0f2fe", color: "#0369a1" },
    RELEASED: { bg: "#e3f2fd", color: "#1565c0" },
    IN_PROGRESS: { bg: "#ede9fe", color: "#7c3aed" },
    READY: { bg: "#fff7ed", color: "#c2410c" },
    COMPLETED: { bg: "#e8f5e9", color: "#2e7d32" },
    BLOCKED: { bg: "#ffebee", color: "#c62828" },
    CLOSED: { bg: "#fafafa", color: "#9e9e9e" },
    CANCELLED: { bg: "#ffebee", color: "#c62828" },
};

const STATUS_LABEL = {
    DRAFT: "Draft", CREATED: "Created", SCHEDULED: "Scheduled",
    RELEASED: "Released", IN_PROGRESS: "In Progress", READY: "Ready",
    COMPLETED: "Completed", BLOCKED: "Blocked", CLOSED: "Closed", CANCELLED: "Cancelled",
};

function KpiCard({ icon, label, value, accent = "#1565c0", loading, onClick }) {
    return (
        <Paper
            elevation={0}
            onClick={onClick}
            sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid #e5e7eb",
                cursor: onClick ? "pointer" : "default",
                transition: "box-shadow 0.2s, transform 0.15s",
                "&:hover": onClick ? { boxShadow: "0 6px 20px rgba(15,39,68,0.12)", transform: "translateY(-2px)" } : {},
                display: "flex",
                alignItems: "center",
                gap: 2,
            }}
        >
            <Box
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: `${accent}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                {React.cloneElement(icon, { sx: { color: accent, fontSize: 22 } })}
            </Box>
            <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {label}
                </Typography>
                {loading ? (
                    <Skeleton width={40} height={32} />
                ) : (
                    <Typography variant="h5" fontWeight={700} sx={{ color: "#0f2744", lineHeight: 1.2, mt: 0.25 }}>
                        {value ?? "—"}
                    </Typography>
                )}
            </Box>
        </Paper>
    );
}

function StatusChip({ status }) {
    const s = STATUS_STYLE[status] || { bg: "#f1f5f9", color: "#64748b" };
    return (
        <Chip
            label={STATUS_LABEL[status] || status}
            size="small"
            sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: "0.7rem", height: 22 }}
        />
    );
}

const QUICK_LINKS = [
    { label: "Work Orders", path: "/production/work-order", icon: <Assignment />, color: "#1565c0" },
    { label: "Bill of Materials", path: "/bom", icon: <Build />, color: "#7c3aed" },
    { label: "Shop Floor", path: "/production/shop-floor", icon: <Factory />, color: "#0369a1" },
    { label: "Job Work Challan", path: "/production/job-work-challan", icon: <HourglassEmpty />, color: "#c2410c" },
];

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [recentWOs, setRecentWOs] = useState([]);
    const [woLoading, setWoLoading] = useState(true);

    useEffect(() => {
        getWorkOrderSummary()
            .then(setSummary)
            .catch(() => {})
            .finally(() => setSummaryLoading(false));

        getWorkOrderList({
            page: 0,
            size: 8,
            sortBy: "createdDate",
            sortDir: "desc",
            filters: [
                { field: "status", operator: "!=", value: "CLOSED" },
                { field: "status", operator: "!=", value: "CANCELLED" },
            ],
        })
            .then((res) => setRecentWOs(res?.content || []))
            .catch(() => {})
            .finally(() => setWoLoading(false));
    }, []);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: "#0f2744" }}>
                    {greeting()}, {user?.username || "there"} 👋
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Here's what's happening in your factory today.
                </Typography>
            </Box>

            {/* KPI Row */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={4} md={2}>
                    <KpiCard
                        icon={<ErrorOutline />}
                        label="Overdue"
                        value={summary?.overdue}
                        accent="#dc2626"
                        loading={summaryLoading}
                        onClick={() => navigate("/production/work-order")}
                    />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <KpiCard
                        icon={<WarningAmber />}
                        label="Due Soon"
                        value={summary?.dueSoon}
                        accent="#ea580c"
                        loading={summaryLoading}
                        onClick={() => navigate("/production/work-order")}
                    />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <KpiCard
                        icon={<HourglassEmpty />}
                        label="In Progress"
                        value={summary?.inProgress}
                        accent="#7c3aed"
                        loading={summaryLoading}
                        onClick={() => navigate("/production/work-order")}
                    />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <KpiCard
                        icon={<Assignment />}
                        label="Ready"
                        value={summary?.ready}
                        accent="#0369a1"
                        loading={summaryLoading}
                        onClick={() => navigate("/production/work-order")}
                    />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <KpiCard
                        icon={<CheckCircleOutline />}
                        label="Done Today"
                        value={summary?.completedToday}
                        accent="#16a34a"
                        loading={summaryLoading}
                    />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                    <KpiCard
                        icon={<ErrorOutline />}
                        label="Blocked"
                        value={summary?.blocked}
                        accent="#dc2626"
                        loading={summaryLoading}
                        onClick={() => navigate("/production/work-order")}
                    />
                </Grid>
            </Grid>

            <Grid container spacing={2}>
                {/* Recent Work Orders */}
                <Grid item xs={12} md={8}>
                    <Card elevation={0} sx={{ borderRadius: 2, border: "1px solid #e5e7eb" }}>
                        <CardContent sx={{ pb: "12px !important" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#0f2744" }}>
                                    Recent Work Orders
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: "#1565c0", cursor: "pointer", fontWeight: 600 }}
                                    onClick={() => navigate("/production/work-order")}
                                >
                                    View all →
                                </Typography>
                            </Box>
                            <Divider sx={{ mb: 1.5 }} />

                            {woLoading ? (
                                <Stack spacing={1}>
                                    {[...Array(5)].map((_, i) => <Skeleton key={i} height={40} />)}
                                </Stack>
                            ) : recentWOs.length === 0 ? (
                                <Box sx={{ textAlign: "center", py: 4 }}>
                                    <Assignment sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                                    <Typography variant="body2" color="text.secondary">No open work orders</Typography>
                                </Box>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: HEADER_BG }}>
                                                {["WO Number", "BOM", "Qty", "Due Date", "Status"].map((h) => (
                                                    <TableCell
                                                        key={h}
                                                        sx={{ color: "#e8edf3", fontWeight: 600, fontSize: "0.75rem", py: 1, borderBottom: "none" }}
                                                    >
                                                        {h}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {recentWOs.map((wo) => (
                                                <TableRow
                                                    key={wo.id}
                                                    hover
                                                    onClick={() => navigate(`/production/work-order/${wo.id}`)}
                                                    sx={{ cursor: "pointer", "&:hover": { bgcolor: "#e3f2fd" } }}
                                                >
                                                    <TableCell sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "#1565c0" }}>
                                                        {wo.workOrderNumber || "—"}
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: "0.8125rem", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {wo.bomName || "—"}
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: "0.8125rem" }}>
                                                        {wo.plannedQuantity ?? "—"}
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: "0.8125rem", color: wo.dueDate && new Date(wo.dueDate) < new Date() ? "#dc2626" : "text.primary", fontWeight: wo.dueDate && new Date(wo.dueDate) < new Date() ? 600 : 400 }}>
                                                        {formatDateShort(wo.dueDate)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusChip status={wo.status} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Quick Links */}
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ borderRadius: 2, border: "1px solid #e5e7eb", mb: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#0f2744", mb: 1.5 }}>
                                Quick Access
                            </Typography>
                            <Divider sx={{ mb: 1.5 }} />
                            <Stack spacing={1}>
                                {QUICK_LINKS.map((link) => (
                                    <Box
                                        key={link.path}
                                        onClick={() => navigate(link.path)}
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            p: 1.25,
                                            borderRadius: 1.5,
                                            cursor: "pointer",
                                            border: "1px solid #e5e7eb",
                                            transition: "all 0.15s",
                                            "&:hover": { bgcolor: "#e3f2fd", borderColor: link.color },
                                        }}
                                    >
                                        <Box sx={{ color: link.color }}>{link.icon}</Box>
                                        <Typography variant="body2" fontWeight={600} sx={{ color: "#374151" }}>
                                            {link.label}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Summary totals */}
                    {!summaryLoading && summary && (
                        <Card elevation={0} sx={{ borderRadius: 2, border: "1px solid #e5e7eb" }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#0f2744", mb: 1.5 }}>
                                    Work Order Summary
                                </Typography>
                                <Divider sx={{ mb: 1.5 }} />
                                <Stack spacing={0.75}>
                                    {[
                                        { label: "Total Open", value: summary.totalOpen ?? "—", color: "#1565c0" },
                                        { label: "Scheduled", value: summary.scheduled ?? "—", color: "#0369a1" },
                                        { label: "Completed This Week", value: summary.completedThisWeek ?? "—", color: "#16a34a" },
                                    ].map((item) => (
                                        <Box key={item.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                                            <Typography variant="body2" fontWeight={700} sx={{ color: item.color }}>{item.value}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
}
