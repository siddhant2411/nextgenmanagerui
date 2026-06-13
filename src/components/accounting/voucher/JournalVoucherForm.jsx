import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    Divider,
    IconButton,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    AddOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    ListAltOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { listLedgers } from "../../../services/accounting/accountingCoaService";
import { postJournal } from "../../../services/accounting/accountingVoucherService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split("T")[0];
const fmtCurrency = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

let _keySeq = 0;
const newLine = (defaults = {}) => ({
    _key: ++_keySeq,
    ledgerAccount: null,
    drAmount: "",
    crAmount: "",
    narration: "",
    ...defaults,
});

// ─── Line Row ─────────────────────────────────────────────────────────────────

const LineRow = ({ line, ledgers, onChange, onDelete, isLast }) => {
    const set = (field, val) => onChange({ ...line, [field]: val });

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "1fr 130px 130px 160px 36px",
                gap: 1,
                alignItems: "center",
                py: 0.75,
                px: 1,
                borderBottom: isLast ? "none" : "1px solid #f1f5f9",
                "&:hover": { bgcolor: "#fafafa" },
            }}
        >
            <Autocomplete
                size="small"
                options={ledgers}
                getOptionLabel={(l) => `${l.code} — ${l.name}`}
                value={line.ledgerAccount}
                onChange={(_, v) => set("ledgerAccount", v)}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                filterOptions={(opts, { inputValue }) => {
                    const q = inputValue.toLowerCase();
                    return opts.filter((o) => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)).slice(0, 50);
                }}
                renderOption={(props, o) => (
                    <Box component="li" {...props} key={o.id} sx={{ fontSize: "0.8125rem" }}>
                        <Box component="span" sx={{ color: "#94a3b8", fontFamily: "monospace", mr: 1, fontSize: "0.75rem" }}>{o.code}</Box>
                        {o.name}
                    </Box>
                )}
                renderInput={(params) => (
                    <TextField {...params} placeholder="Search account…" sx={{ "& .MuiInputBase-input": { fontSize: "0.8125rem" } }} />
                )}
            />
            <TextField
                size="small" type="number" placeholder="0.00"
                value={line.drAmount}
                onChange={(e) => set("drAmount", e.target.value)}
                disabled={Boolean(line.crAmount)}
                inputProps={{ min: 0, step: "0.01", style: { textAlign: "right", fontSize: "0.8125rem" } }}
            />
            <TextField
                size="small" type="number" placeholder="0.00"
                value={line.crAmount}
                onChange={(e) => set("crAmount", e.target.value)}
                disabled={Boolean(line.drAmount)}
                inputProps={{ min: 0, step: "0.01", style: { textAlign: "right", fontSize: "0.8125rem" } }}
            />
            <TextField
                size="small" placeholder="Line narration…"
                value={line.narration}
                onChange={(e) => set("narration", e.target.value)}
                inputProps={{ style: { fontSize: "0.8125rem" } }}
            />
            <Tooltip title="Remove line">
                <IconButton size="small" onClick={onDelete} sx={{ color: "#94a3b8", "&:hover": { color: "#ef4444", bgcolor: "#fef2f2" } }}>
                    <DeleteOutlined sx={{ fontSize: 16 }} />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

// ─── Main Form ────────────────────────────────────────────────────────────────

const JournalVoucherForm = () => {
    const navigate = useNavigate();
    const [ledgers, setLedgers] = useState([]);
    const [date, setDate] = useState(todayStr);
    const [narration, setNarration] = useState("");
    const [lines, setLines] = useState([newLine(), newLine()]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);

    useEffect(() => {
        listLedgers().then(setLedgers).catch(() => {});
    }, []);

    const updateLine = useCallback((idx, updated) => {
        setLines((prev) => prev.map((l, i) => (i === idx ? updated : l)));
    }, []);

    const deleteLine = useCallback((idx) => {
        setLines((prev) => prev.filter((_, i) => i !== idx));
    }, []);

    const addLine = () => setLines((prev) => [...prev, newLine()]);

    const totals = useMemo(() => {
        const dr = lines.reduce((s, l) => s + (parseFloat(l.drAmount) || 0), 0);
        const cr = lines.reduce((s, l) => s + (parseFloat(l.crAmount) || 0), 0);
        return { dr, cr, diff: Math.abs(dr - cr) };
    }, [lines]);

    const isBalanced = totals.dr > 0 && totals.diff < 0.005;
    const hasAllAccounts = lines.every((l) => l.ledgerAccount);
    const canSubmit = isBalanced && hasAllAccounts && lines.length >= 2;

    const handleSubmit = async () => {
        setError("");
        if (!canSubmit) {
            if (!hasAllAccounts) { setError("All lines must have an account selected."); return; }
            if (!isBalanced) { setError(`Voucher does not balance. Difference: ${fmtCurrency(totals.diff)}`); return; }
        }
        setSaving(true);
        try {
            const dto = {
                date,
                narration: narration.trim() || undefined,
                lines: lines.map((l) => ({
                    ledgerAccountId: l.ledgerAccount.id,
                    drAmount: parseFloat(l.drAmount) || 0,
                    crAmount: parseFloat(l.crAmount) || 0,
                    narration: l.narration.trim() || undefined,
                })),
            };
            const voucher = await postJournal(dto);
            setResult(voucher);
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || "Failed to post journal entry.");
        } finally {
            setSaving(false);
        }
    };

    const reset = () => {
        setDate(todayStr);
        setNarration("");
        setLines([newLine(), newLine()]);
        setError("");
        setResult(null);
    };

    if (result) {
        return (
            <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
                <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, maxWidth: 700, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                        <CheckCircleOutlined sx={{ fontSize: 26, color: "#16a34a" }} />
                        <Box>
                            <Typography sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a" }}>Journal Entry Posted</Typography>
                            <Typography sx={{ fontSize: "0.875rem", color: "#64748b" }}>{result.voucherNumber} · {result.status}</Typography>
                        </Box>
                    </Stack>
                    <Box sx={{ bgcolor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2, p: 2, mb: 2.5 }}>
                        <Stack direction="row" spacing={4}>
                            <Box><Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Debit Total</Typography>
                                <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{fmtCurrency(result.totalDr)}</Typography></Box>
                            <Box><Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Credit Total</Typography>
                                <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{fmtCurrency(result.totalCr)}</Typography></Box>
                            <Box><Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Lines</Typography>
                                <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{result.lines?.length}</Typography></Box>
                        </Stack>
                    </Box>
                    <Stack direction="row" spacing={1.5}>
                        <Button variant="contained" disableElevation onClick={reset}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" } }}>
                            New Journal Entry
                        </Button>
                        <Button variant="outlined" disableElevation onClick={() => navigate("/accounting/vouchers")}
                            startIcon={<ListAltOutlined sx={{ fontSize: 16 }} />}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, borderColor: "#e2e8f0", color: "#374151" }}>
                            View Register
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>

                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                            Journal Entry
                        </Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>
                            Free-form double-entry — provisions, corrections, depreciation
                        </Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => navigate("/accounting/vouchers")}
                        startIcon={<ListAltOutlined sx={{ fontSize: 15 }} />}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, borderColor: "#e2e8f0", color: "#64748b", flexShrink: 0 }}>
                        Register
                    </Button>
                </Stack>

                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                {/* Date + Narration */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
                    <TextField label="Date" type="date" size="small" required value={date}
                        onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { sm: 200 } }} />
                    <TextField label="Narration" size="small" fullWidth value={narration}
                        onChange={(e) => setNarration(e.target.value)} placeholder="Overall description for this journal entry" />
                </Stack>

                {/* Column headers */}
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 130px 130px 160px 36px", gap: 1, px: 1, mb: 0.5 }}>
                    {["Account", "Debit (Dr)", "Credit (Cr)", "Line Narration", ""].map((h) => (
                        <Typography key={h} sx={{ fontSize: "0.65625rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, textAlign: h === "Debit (Dr)" || h === "Credit (Cr)" ? "right" : "left" }}>
                            {h}
                        </Typography>
                    ))}
                </Box>

                {/* Lines */}
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 2 }}>
                    {lines.map((line, idx) => (
                        <LineRow key={line._key} line={line} ledgers={ledgers}
                            onChange={(updated) => updateLine(idx, updated)}
                            onDelete={() => deleteLine(idx)}
                            isLast={idx === lines.length - 1}
                        />
                    ))}
                </Paper>

                <Button size="small" startIcon={<AddOutlined sx={{ fontSize: 15 }} />} onClick={addLine}
                    sx={{ textTransform: "none", fontWeight: 600, color: "#64748b", borderRadius: 2, mb: 3, "&:hover": { bgcolor: "#f8fafc" } }}>
                    Add Line
                </Button>

                {/* Balance indicator */}
                <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 3, bgcolor: isBalanced ? "#f0fdf4" : totals.dr > 0 ? "#fffbeb" : "#f8fafc" }}>
                    <Stack direction="row" spacing={4} alignItems="center">
                        <Box>
                            <Typography sx={{ fontSize: "0.65625rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Debit Total</Typography>
                            <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{fmtCurrency(totals.dr)}</Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: "0.65625rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Credit Total</Typography>
                            <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{fmtCurrency(totals.cr)}</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: "0.65625rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Difference</Typography>
                            <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: isBalanced ? "#16a34a" : "#ef4444" }}>
                                {isBalanced ? "✓ Balanced" : fmtCurrency(totals.diff)}
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>

                {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }}>{error}</Alert>}

                {/* Actions */}
                <Stack direction="row" spacing={1.5}>
                    <Button variant="contained" disableElevation onClick={handleSubmit} disabled={saving || !canSubmit}
                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 3, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" }, "&:disabled": { bgcolor: "#e2e8f0", color: "#94a3b8" } }}>
                        {saving ? "Posting…" : "Post Journal Entry"}
                    </Button>
                    <Button size="small" onClick={reset}
                        sx={{ textTransform: "none", fontWeight: 600, color: "#64748b", borderRadius: 2 }}>
                        Clear
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
};

export default JournalVoucherForm;
