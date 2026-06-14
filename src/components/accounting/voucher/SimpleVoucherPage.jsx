import React, { useState, useEffect } from "react";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    Divider,
    Grid,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { CheckCircleOutlined, ListAltOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { listLedgers } from "../../../services/accounting/accountingCoaService";

const todayStr = () => new Date().toISOString().split("T")[0];

const fmtCurrency = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (d) =>
    !d ? "—" : new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Shared layout for Receipt / Payment / Contra vouchers.
 *
 * Props:
 *   title, subtitle         — page header text
 *   field1 / field2         — { label, helperText } for the two account pickers
 *   amountLabel             — label for the amount field (default "Amount")
 *   onSubmit(dto)           — async fn; dto = { field1Id, field2Id, amount, date, narration }
 *                             maps those keys to the proper backend field names in the wrapper
 *   accentColor             — button / chip colour (default #10b981)
 */
const SimpleVoucherPage = ({
    title,
    subtitle,
    field1,
    field2,
    amountLabel = "Amount",
    onSubmit,
    accentColor = "#10b981",
    accentDark,
}) => {
    const navigate = useNavigate();
    const hover = accentDark || accentColor;
    const [ledgers, setLedgers] = useState([]);
    const [date, setDate] = useState(todayStr);
    const [account1, setAccount1] = useState(null);
    const [account2, setAccount2] = useState(null);
    const [amount, setAmount] = useState("");
    const [narration, setNarration] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);

    useEffect(() => {
        listLedgers().then(setLedgers).catch(() => {});
    }, []);

    const reset = () => {
        setDate(todayStr);
        setAccount1(null);
        setAccount2(null);
        setAmount("");
        setNarration("");
        setError("");
        setResult(null);
    };

    const handleSubmit = async () => {
        setError("");
        if (!date)     { setError("Date is required.");            return; }
        if (!account1) { setError(`${field1.label} is required.`); return; }
        if (!account2) { setError(`${field2.label} is required.`); return; }
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) { setError("Amount must be greater than zero."); return; }

        setSaving(true);
        try {
            const voucher = await onSubmit({
                field1Id: account1.id,
                field2Id: account2.id,
                amount: amt,
                date,
                narration: narration.trim() || undefined,
            });
            setResult(voucher);
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || "Failed to post voucher.");
        } finally {
            setSaving(false);
        }
    };

    const acOpts = (opts, { inputValue }) => {
        const q = inputValue.toLowerCase();
        return opts.filter((o) => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)).slice(0, 60);
    };
    const acLabel = (l) => `${l.code} — ${l.name}`;
    const acOption = (props, o) => (
        <Box component="li" {...props} key={o.id} sx={{ fontSize: "0.8125rem" }}>
            <Box component="span" sx={{ color: "#94a3b8", fontFamily: "monospace", mr: 1, fontSize: "0.75rem" }}>{o.code}</Box>
            {o.name}
        </Box>
    );

    if (result) {
        return (
            <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
                <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, maxWidth: 580, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                        <CheckCircleOutlined sx={{ fontSize: 26, color: "#16a34a" }} />
                        <Box>
                            <Typography sx={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a" }}>{title} Posted</Typography>
                            <Typography sx={{ fontSize: "0.875rem", color: "#64748b" }}>{result.voucherNumber} · {result.status}</Typography>
                        </Box>
                    </Stack>
                    <Box sx={{ bgcolor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2, p: 2, mb: 2.5 }}>
                        <Grid container spacing={2}>
                            {[
                                { label: "Date",         value: fmtDate(result.date) },
                                { label: "Debit Total",  value: fmtCurrency(result.totalDr) },
                                { label: "Credit Total", value: fmtCurrency(result.totalCr) },
                                { label: "Status",       value: result.status },
                            ].map(({ label, value }) => (
                                <Grid item xs={6} key={label}>
                                    <Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Typography>
                                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", mt: 0.25 }}>{value}</Typography>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                    <Stack direction="row" spacing={1.5}>
                        <Button variant="contained" disableElevation onClick={reset}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: accentColor, "&:hover": { bgcolor: hover } }}>
                            New Entry
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
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, maxWidth: 580, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>

                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                            {title}
                        </Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>{subtitle}</Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => navigate("/accounting/vouchers")}
                        startIcon={<ListAltOutlined sx={{ fontSize: 15 }} />}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, borderColor: "#e2e8f0", color: "#64748b", flexShrink: 0 }}>
                        Register
                    </Button>
                </Stack>

                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                <Stack spacing={2.5}>
                    <TextField label="Date" type="date" size="small" required value={date}
                        onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ maxWidth: 200 }} />

                    {/* Account 1 */}
                    <Autocomplete size="small" options={ledgers} getOptionLabel={acLabel}
                        value={account1} onChange={(_, v) => setAccount1(v)}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        filterOptions={acOpts} renderOption={acOption}
                        renderInput={(params) => (
                            <TextField {...params} label={field1.label} required
                                helperText={field1.helperText}
                                FormHelperTextProps={{ sx: { mt: 0.5 } }}
                            />
                        )}
                    />

                    {/* Account 2 */}
                    <Autocomplete size="small" options={ledgers} getOptionLabel={acLabel}
                        value={account2} onChange={(_, v) => setAccount2(v)}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        filterOptions={acOpts} renderOption={acOption}
                        renderInput={(params) => (
                            <TextField {...params} label={field2.label} required
                                helperText={field2.helperText}
                                FormHelperTextProps={{ sx: { mt: 0.5 } }}
                            />
                        )}
                    />

                    <TextField label={amountLabel} type="number" size="small" required
                        value={amount} onChange={(e) => setAmount(e.target.value)}
                        inputProps={{ min: 0, step: "0.01" }}
                        InputProps={{ startAdornment: <Box component="span" sx={{ mr: 0.5, color: "#64748b", fontSize: "0.8125rem" }}>₹</Box> }}
                    />

                    <TextField label="Narration" size="small" multiline rows={2}
                        value={narration} onChange={(e) => setNarration(e.target.value)}
                        placeholder="Optional description for this voucher"
                    />

                    {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

                    <Stack direction="row" spacing={1.5} sx={{ pt: 0.5 }}>
                        <Button variant="contained" disableElevation onClick={handleSubmit}
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 3, bgcolor: accentColor, "&:hover": { bgcolor: hover }, "&:disabled": { bgcolor: "#e2e8f0", color: "#94a3b8" } }}>
                            {saving ? "Posting…" : `Post ${title}`}
                        </Button>
                        <Button size="small" onClick={reset}
                            sx={{ textTransform: "none", fontWeight: 600, color: "#64748b", borderRadius: 2 }}>
                            Clear
                        </Button>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
};

export default SimpleVoucherPage;
