import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
    Alert,
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
import {
    CheckCircleOutlined,
    CloudUploadOutlined,
    DescriptionOutlined,
    DownloadOutlined,
    InsertDriveFileOutlined,
} from "@mui/icons-material";
import { importOpeningBalances } from "../../../services/accounting/accountingOpeningService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n) => {
    if (n == null) return "—";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(n);
};

const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
        ["Ledger Code", "Contact Code (optional)", "Amount", "DR / CR"],
        ["1001", "", 500000, "DR"],
        ["1002", "", 50000, "DR"],
        ["2001", "", 550000, "CR"],
    ]);
    ws["!cols"] = [{ wch: 22 }, { wch: 26 }, { wch: 16 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, "Opening Balances");
    XLSX.writeFile(wb, "opening_balances_template.xlsx");
};

// ─── Format guide ─────────────────────────────────────────────────────────────

const COLUMNS = [
    { col: "A", name: "Ledger Code", note: "Required. Must match your Chart of Accounts exactly (case-sensitive)." },
    { col: "B", name: "Contact Code", note: "Optional. Only for party sub-ledgers (customer/vendor individual balances)." },
    { col: "C", name: "Amount", note: "Numeric. Positive values only. Do not include currency symbols." },
    { col: "D", name: "DR / CR", note: 'Must be exactly "DR" or "CR".' },
];

const RULES = [
    "Sum of all DR amounts must equal sum of all CR amounts (must balance).",
    "Opening balances for a given date can only be imported once.",
    "Row 1 is treated as the header row and is skipped — data starts from row 2.",
];

const FormatGuide = () => (
    <Paper
        elevation={0}
        sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden", height: "100%" }}
    >
        <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #f1f5f9", bgcolor: "#f8fafc" }}>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a" }}>
                Excel Format Guide
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.25 }}>
                One ledger account per row, starting from row 2
            </Typography>
        </Box>
        <Box sx={{ p: 2.5 }}>
            {/* Column table */}
            <Stack spacing={1} sx={{ mb: 2.5 }}>
                {COLUMNS.map(({ col, name, note }) => (
                    <Box key={col} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                        <Box
                            sx={{
                                minWidth: 24,
                                height: 24,
                                borderRadius: 1,
                                bgcolor: "#10b981",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.6875rem",
                                fontWeight: 800,
                                flexShrink: 0,
                            }}
                        >
                            {col}
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>
                                {name}
                            </Typography>
                            <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.25, lineHeight: 1.4 }}>
                                {note}
                            </Typography>
                        </Box>
                    </Box>
                ))}
            </Stack>

            <Divider sx={{ mb: 2, borderColor: "#f1f5f9" }} />

            {/* Rules */}
            <Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "#94a3b8", mb: 1 }}>
                Rules
            </Typography>
            <Stack spacing={0.75}>
                {RULES.map((rule, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                        <Box
                            sx={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                bgcolor: "#10b981",
                                mt: 0.75,
                                flexShrink: 0,
                            }}
                        />
                        <Typography sx={{ fontSize: "0.75rem", color: "#475569", lineHeight: 1.5 }}>
                            {rule}
                        </Typography>
                    </Box>
                ))}
            </Stack>

            <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadOutlined sx={{ fontSize: 15 }} />}
                onClick={downloadTemplate}
                sx={{
                    mt: 2.5,
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2,
                    borderColor: "#e2e8f0",
                    color: "#374151",
                    fontSize: "0.8125rem",
                    "&:hover": { borderColor: "#10b981", color: "#10b981", bgcolor: "#f0fdf4" },
                }}
                fullWidth
            >
                Download Template (.xlsx)
            </Button>
        </Box>
    </Paper>
);

// ─── File dropzone ────────────────────────────────────────────────────────────

const FileDropZone = ({ file, onFile, onClear }) => {
    const inputRef = useRef();
    const [dragging, setDragging] = useState(false);

    const handleFiles = (files) => {
        const f = Array.from(files).find(
            (x) => x.name.endsWith(".xlsx") || x.name.endsWith(".xls")
        );
        if (f) onFile(f);
    };

    if (file) {
        return (
            <Box
                sx={{
                    border: "1px solid #bbf7d0",
                    borderRadius: 2,
                    bgcolor: "#f0fdf4",
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                }}
            >
                <InsertDriveFileOutlined sx={{ fontSize: 22, color: "#16a34a", flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {file.name}
                    </Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {(file.size / 1024).toFixed(1)} KB
                    </Typography>
                </Box>
                <Button
                    size="small"
                    onClick={onClear}
                    sx={{ textTransform: "none", fontWeight: 600, color: "#ef4444", borderRadius: 1.5, px: 1, py: 0.25, "&:hover": { bgcolor: "#fef2f2" }, flexShrink: 0 }}
                >
                    Remove
                </Button>
            </Box>
        );
    }

    return (
        <Box
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current.click()}
            sx={{
                border: `2px dashed ${dragging ? "#10b981" : "#e2e8f0"}`,
                borderRadius: 2,
                bgcolor: dragging ? "#f0fdf4" : "#fafafa",
                p: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": { borderColor: "#10b981", bgcolor: "#f0fdf4" },
            }}
        >
            <CloudUploadOutlined sx={{ fontSize: 32, color: dragging ? "#10b981" : "#94a3b8" }} />
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>
                Click to browse or drag & drop
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Accepts .xlsx or .xls files
            </Typography>
            <input
                ref={inputRef}
                type="file"
                hidden
                accept=".xlsx,.xls"
                onChange={(e) => handleFiles(e.target.files)}
            />
        </Box>
    );
};

// ─── Success result ───────────────────────────────────────────────────────────

const SuccessResult = ({ voucher, onReset }) => (
    <Box
        sx={{
            border: "1px solid #bbf7d0",
            borderRadius: 2,
            bgcolor: "#f0fdf4",
            p: 2.5,
        }}
    >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <CheckCircleOutlined sx={{ fontSize: 20, color: "#16a34a" }} />
            <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, color: "#16a34a" }}>
                Opening balances imported successfully
            </Typography>
        </Stack>
        <Grid container spacing={1.5}>
            {[
                { label: "Voucher Number", value: voucher.voucherNumber },
                { label: "Date",           value: fmtDate(voucher.date) },
                { label: "Total Debit",    value: fmtCurrency(voucher.totalDr) },
                { label: "Total Credit",   value: fmtCurrency(voucher.totalCr) },
                { label: "Status",         value: voucher.status },
                { label: "Lines",          value: voucher.lines?.length ?? "—" },
            ].map(({ label, value }) => (
                <Grid item xs={6} key={label}>
                    <Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 }}>
                        {label}
                    </Typography>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", mt: 0.25 }}>
                        {value}
                    </Typography>
                </Grid>
            ))}
        </Grid>
        <Button
            size="small"
            onClick={onReset}
            sx={{ mt: 2, textTransform: "none", fontWeight: 600, color: "#64748b", borderRadius: 2, "&:hover": { bgcolor: "#e2e8f0" } }}
        >
            Import another date
        </Button>
    </Box>
);

// ─── Import form ──────────────────────────────────────────────────────────────

const ImportForm = () => {
    const [openingDate, setOpeningDate] = useState("");
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const reset = () => {
        setFile(null);
        setResult(null);
        setError("");
        setOpeningDate("");
    };

    const handleImport = async () => {
        if (!openingDate) { setError("Please select an opening date."); return; }
        if (!file)        { setError("Please select an Excel file to upload."); return; }
        setError("");
        setImporting(true);
        try {
            const voucher = await importOpeningBalances(file, openingDate);
            setResult(voucher);
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e?.response?.data?.error ||
                e?.message ||
                "Import failed. Please check your file and try again.";
            setError(msg);
        } finally {
            setImporting(false);
        }
    };

    return (
        <Paper
            elevation={0}
            sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden", height: "100%" }}
        >
            <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #f1f5f9", bgcolor: "#f8fafc" }}>
                <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a" }}>
                    Import Opening Balances
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.25 }}>
                    Uploads and posts as a single OPENING voucher
                </Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>
                {result ? (
                    <SuccessResult voucher={result} onReset={reset} />
                ) : (
                    <Stack spacing={2.5}>
                        <TextField
                            label="Opening Date"
                            size="small"
                            fullWidth
                            required
                            type="date"
                            value={openingDate}
                            onChange={(e) => { setOpeningDate(e.target.value); setError(""); }}
                            InputLabelProps={{ shrink: true }}
                            helperText="The cutover date — balances as of this date will be posted."
                        />

                        <Box>
                            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "#374151", mb: 1 }}>
                                Excel File <span style={{ color: "#ef4444" }}>*</span>
                            </Typography>
                            <FileDropZone
                                file={file}
                                onFile={(f) => { setFile(f); setError(""); }}
                                onClear={() => setFile(null)}
                            />
                        </Box>

                        {error && (
                            <Alert severity="error" sx={{ borderRadius: 1.5 }}>
                                {error}
                            </Alert>
                        )}

                        <Alert severity="info" icon={<DescriptionOutlined fontSize="small" />} sx={{ borderRadius: 1.5, "& .MuiAlert-message": { fontSize: "0.8rem" } }}>
                            Opening balances for a date can only be imported once. Ensure your trial balance is provided by your CA before importing.
                        </Alert>

                        <Button
                            variant="contained"
                            disableElevation
                            fullWidth
                            onClick={handleImport}
                            disabled={importing || !file || !openingDate}
                            startIcon={importing ? <CircularProgress size={14} color="inherit" /> : <CloudUploadOutlined sx={{ fontSize: 17 }} />}
                            sx={{
                                borderRadius: 2,
                                fontWeight: 700,
                                fontSize: "0.875rem",
                                textTransform: "none",
                                py: 1.125,
                                bgcolor: "#10b981",
                                "&:hover": { bgcolor: "#059669" },
                                "&:disabled": { bgcolor: "#e2e8f0", color: "#94a3b8" },
                            }}
                        >
                            {importing ? "Importing…" : "Import Opening Balances"}
                        </Button>
                    </Stack>
                )}
            </Box>
        </Paper>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const OpeningBalancesPage = () => (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2, md: 3 },
                width: "100%",
                borderRadius: 2,
                border: "1px solid #e2e8f0",
                bgcolor: "white",
            }}
        >
            {/* ── Header ── */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                <Box>
                    <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                        Opening Balances
                    </Typography>
                    <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>
                        Import your trial balance as of the go-live date to establish your books
                    </Typography>
                </Box>
            </Stack>

            <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

            {/* ── Context alert ── */}
            <Alert
                severity="warning"
                sx={{ mb: 3, borderRadius: 1.5, "& .MuiAlert-message": { fontSize: "0.8125rem" } }}
            >
                <strong>Mid-year go-live:</strong> Import opening balances once — before any transactions are entered. Your CA should provide the trial balance as of the cutover date. Once imported, this creates a locked OPENING voucher in the General Ledger.
            </Alert>

            {/* ── Two-column layout ── */}
            <Grid container spacing={2.5} alignItems="stretch">
                <Grid item xs={12} md={5}>
                    <FormatGuide />
                </Grid>
                <Grid item xs={12} md={7}>
                    <ImportForm />
                </Grid>
            </Grid>
        </Paper>
    </Box>
);

export default OpeningBalancesPage;
