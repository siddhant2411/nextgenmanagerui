import React, { useEffect, useState } from "react";
import {
    Box, Button, Card, CardContent, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, Grid, IconButton,
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Typography, MenuItem,
    Select, FormControl, InputLabel, Chip, Stack
} from "@mui/material";
import { Add, Edit, Delete, WarningAmber, Build } from "@mui/icons-material";
import productionAnalyticsService from "../services/productionAnalyticsService";

const DOWNTIME_CATEGORIES = ["PLANNED", "UNPLANNED"];

export default function DowntimeReasonPage() {
    const [reasons, setReasons] = useState([]);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({ code: "", description: "", category: "UNPLANNED" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchReasons();
    }, []);

    const fetchReasons = async () => {
        try {
            const data = await productionAnalyticsService.getDowntimeReasons();
            setReasons(data);
        } catch (error) {
            console.error("Failed to fetch reasons", error);
        }
    };

    const handleOpen = () => {
        setFormData({ code: "", description: "", category: "UNPLANNED" });
        setOpen(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            await productionAnalyticsService.createDowntimeReason(formData);
            fetchReasons();
            setOpen(false);
        } catch (error) {
            console.error("Failed to save reason", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight={700} sx={{ color: "#0f2744" }}>
                        Downtime Reasons
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage machine downtime categories and codes
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleOpen}
                    sx={{ bgcolor: "#1565c0", textTransform: "none", borderRadius: 2, fontWeight: 600 }}
                >
                    Add Reason
                </Button>
            </Box>

            <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                <TableCell sx={{ fontWeight: 600, color: "#475569" }}>Code</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: "#475569" }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: "#475569" }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: "#475569" }}>Status</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, color: "#475569" }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reasons.map((reason) => (
                                <TableRow key={reason.id} hover>
                                    <TableCell sx={{ fontWeight: 600, color: "#1565c0" }}>{reason.code}</TableCell>
                                    <TableCell>{reason.description}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={reason.category}
                                            size="small"
                                            icon={reason.category === "PLANNED" ? <Build sx={{ fontSize: 14 }} /> : <WarningAmber sx={{ fontSize: 14 }} />}
                                            sx={{
                                                bgcolor: reason.category === "PLANNED" ? "#e0f2fe" : "#fff7ed",
                                                color: reason.category === "PLANNED" ? "#0369a1" : "#c2410c",
                                                fontWeight: 600,
                                                fontSize: "0.75rem"
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={reason.isActive ? "Active" : "Inactive"}
                                            size="small"
                                            sx={{
                                                bgcolor: reason.isActive ? "#e8f5e9" : "#f1f5f9",
                                                color: reason.isActive ? "#2e7d32" : "#64748b",
                                                fontWeight: 600
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small"><Edit fontSize="small" /></IconButton>
                                        <IconButton size="small" color="error"><Delete fontSize="small" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, color: "#0f2744" }}>New Downtime Reason</DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <TextField
                            label="Reason Code"
                            fullWidth
                            variant="outlined"
                            placeholder="e.g. MB01, POW01"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        />
                        <TextField
                            label="Description"
                            fullWidth
                            multiline
                            rows={3}
                            variant="outlined"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={formData.category}
                                label="Category"
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                {DOWNTIME_CATEGORIES.map(cat => (
                                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setOpen(false)} sx={{ color: "#64748b", textTransform: "none" }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={loading || !formData.code}
                        sx={{ bgcolor: "#1565c0", borderRadius: 2, textTransform: "none", px: 4 }}
                    >
                        Save Reason
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
