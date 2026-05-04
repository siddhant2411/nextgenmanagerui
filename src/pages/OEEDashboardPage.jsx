import React, { useEffect, useState } from "react";
import {
    Box, Card, CardContent, Grid, Paper, Typography, MenuItem,
    Select, FormControl, InputLabel, Stack, Divider, CircularProgress,
    useTheme, useMediaQuery
} from "@mui/material";
import {
    PrecisionManufacturing, Speed, CheckCircle, Timer,
    TrendingUp, Warning, Settings
} from "@mui/icons-material";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
    BarChart, Bar
} from "recharts";
import productionAnalyticsService from "../services/productionAnalyticsService";
import { getMachineDetailsList } from "../services/machineAssetsService";

const COLORS = {
    OEE: "#1565c0",
    AVAILABILITY: "#7c3aed",
    PERFORMANCE: "#0369a1",
    QUALITY: "#16a34a",
    DOWNTIME: "#dc2626"
};

function MetricGauge({ label, value, color, icon }) {
    const percentage = (value * 100).toFixed(1);
    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #e5e7eb", textAlign: "center" }}>
            <Box sx={{ position: "relative", display: "inline-flex", mb: 1 }}>
                <CircularProgress
                    variant="determinate"
                    value={100}
                    size={80}
                    thickness={4}
                    sx={{ color: "#f1f5f9" }}
                />
                <CircularProgress
                    variant="determinate"
                    value={parseFloat(percentage)}
                    size={80}
                    thickness={4}
                    sx={{ color: color, position: "absolute", left: 0 }}
                />
                <Box
                    sx={{
                        top: 0, left: 0, bottom: 0, right: 0,
                        position: "absolute", display: "flex",
                        alignItems: "center", justifyContent: "center",
                    }}
                >
                    <Typography variant="caption" fontWeight={700} sx={{ color: "#0f2744" }}>
                        {percentage}%
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                {React.cloneElement(icon, { sx: { fontSize: 16, color: color } })}
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                    {label}
                </Typography>
            </Box>
        </Paper>
    );
}

export default function OEEDashboardPage() {
    const [machines, setMachines] = useState([]);
    const [selectedMachine, setSelectedMachine] = useState("");
    const [metrics, setMetrics] = useState(null);
    const [trend, setTrend] = useState([]);
    const [downtimeData, setDowntimeData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // We'll need a service to get machines. I'll mock for now if not found.
                // Assuming it returns [{id, machineName}]
                const machineList = await getMachineDetailsList(); 
                setMachines(machineList || []);
                if (machineList?.length > 0) {
                    setSelectedMachine(machineList[0].id);
                }
            } catch (error) {
                console.error("Failed to load machines", error);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedMachine) {
            fetchMetrics();
        }
    }, [selectedMachine]);

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];
            const data = await productionAnalyticsService.getMachineOEE(selectedMachine, today);
            setMetrics(data);

            // Fetch trend for last 7 days
            const endDate = today;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            const trendData = await productionAnalyticsService.getMachineTrend(
                selectedMachine, 
                startDate.toISOString().split('T')[0], 
                endDate
            );
            setTrend(trendData);

            // Mock or fetch downtime pareto data
            const pareto = [
                { reason: "Machine Breakdown", minutes: 120 },
                { reason: "Power Failure", minutes: 45 },
                { reason: "Tooling Issue", minutes: 30 },
                { reason: "No Operator", minutes: 15 },
                { reason: "Others", minutes: 10 }
            ];
            setDowntimeData(pareto);
        } catch (error) {
            console.error("Failed to fetch metrics", error);
        } finally {
            setLoading(false);
        }
    };

    if (!metrics && loading) return <Box sx={{ display: "flex", justifyContent: "center", p: 10 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: 3, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700} sx={{ color: "#0f2744" }}>
                        OEE Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Overall Equipment Effectiveness & Production Performance
                    </Typography>
                </Box>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Select Machine</InputLabel>
                    <Select
                        value={selectedMachine}
                        label="Select Machine"
                        onChange={(e) => setSelectedMachine(e.target.value)}
                        sx={{ borderRadius: 2, bgcolor: "#fff" }}
                    >
                        {machines.map(m => <MenuItem key={m.id} value={m.id}>{m.machineName}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>

            {metrics && (
                <Grid container spacing={3}>
                    {/* Main Gauges */}
                    <Grid item xs={12} md={3}>
                        <MetricGauge label="Overall OEE" value={metrics.oee} color={COLORS.OEE} icon={<PrecisionManufacturing />} />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <MetricGauge label="Availability" value={metrics.availability} color={COLORS.AVAILABILITY} icon={<Timer />} />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <MetricGauge label="Performance" value={metrics.performance} color={COLORS.PERFORMANCE} icon={<Speed />} />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <MetricGauge label="Quality" value={metrics.quality} color={COLORS.QUALITY} icon={<CheckCircle />} />
                    </Grid>

                    {/* Trend Chart */}
                    <Grid item xs={12} md={8}>
                        <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e5e7eb" }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#0f2744", mb: 3 }}>
                                    OEE Performance Trend (Last 7 Days)
                                </Typography>
                                <Box sx={{ height: 300, width: "100%" }}>
                                    <ResponsiveContainer>
                                        <AreaChart data={trend}>
                                            <defs>
                                                <linearGradient id="colorOee" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.OEE} stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor={COLORS.OEE} stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                formatter={(value) => [`${(value * 100).toFixed(1)}%`, 'OEE']}
                                            />
                                            <Area type="monotone" dataKey="oee" stroke={COLORS.OEE} strokeWidth={3} fillOpacity={1} fill="url(#colorOee)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Downtime Pareto */}
                    <Grid item xs={12} md={4}>
                        <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e5e7eb", height: "100%" }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#0f2744", mb: 3 }}>
                                    Downtime Analysis (Pareto)
                                </Typography>
                                <Box sx={{ height: 240, width: "100%" }}>
                                    <ResponsiveContainer>
                                        <BarChart data={downtimeData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="reason" type="category" stroke="#94a3b8" fontSize={10} width={100} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Bar dataKey="minutes" fill={COLORS.DOWNTIME} radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, textAlign: "center" }}>
                                    Top downtime causes by total duration (minutes)
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Stats Breakout */}
                    <Grid item xs={12} md={4}>
                        <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #e5e7eb", height: "100%" }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#0f2744", mb: 2.5 }}>
                                    Production Statistics
                                </Typography>
                                <Stack spacing={2}>
                                    {[
                                        { label: "Operating Time", value: `${metrics.runtimeMinutes} min`, icon: <Timer />, color: COLORS.AVAILABILITY },
                                        { label: "Downtime", value: `${metrics.downtimeMinutes} min`, icon: <Warning />, color: COLORS.DOWNTIME },
                                        { label: "Total Units", value: metrics.actualQuantity, icon: <TrendingUp />, color: COLORS.PERFORMANCE },
                                        { label: "Rejected", value: metrics.rejectedQuantity, icon: <Settings />, color: COLORS.DOWNTIME },
                                    ].map((stat, i) => (
                                        <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1.5, bgcolor: "#f8fafc", borderRadius: 2 }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                                <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                                                <Typography variant="body2" color="text.secondary" fontWeight={500}>{stat.label}</Typography>
                                            </Box>
                                            <Typography variant="body2" fontWeight={700} sx={{ color: "#0f2744" }}>{stat.value}</Typography>
                                        </Box>
                                    ))}
                                </Stack>
                                <Divider sx={{ my: 3 }} />
                                <Box sx={{ textAlign: "center" }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>
                                        Quality Yield
                                    </Typography>
                                    <Typography variant="h4" fontWeight={800} sx={{ color: COLORS.QUALITY }}>
                                        {((metrics.actualQuantity - metrics.rejectedQuantity) / (metrics.actualQuantity || 1) * 100).toFixed(1)}%
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}
