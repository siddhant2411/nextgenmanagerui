import React, { useEffect, useRef, useState } from "react";
import {
    Alert, Box, Button, CircularProgress, Grid, MenuItem, Stack, Table, TableBody, TableCell,
    TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { UploadFileOutlined } from "@mui/icons-material";
import {
    getStatementMapping, importStatement, previewStatement, saveStatementMapping,
} from "../../../services/accounting/bankService";
import { CELL, COL_HEAD } from "../gst/gstCommon";

const COLUMN_FIELDS = [
    { key: "dateColumn", label: "Date", required: true },
    { key: "narrationColumn", label: "Narration" },
    { key: "referenceColumn", label: "Cheque / reference no." },
    { key: "withdrawalColumn", label: "Withdrawal (money out)" },
    { key: "depositColumn", label: "Deposit (money in)" },
    { key: "amountColumn", label: "Single signed amount", hint: "Only if the bank has one amount column" },
    { key: "balanceColumn", label: "Balance" },
];

// Guess each column from common Indian bank export titles, so a first-time mapping is mostly filled in.
const GUESSES = {
    dateColumn: [/^(txn|tran|transaction|value)?\s*date$/i, /date/i],
    narrationColumn: [/narration|description|particulars|remarks/i],
    referenceColumn: [/chq|cheque|ref/i],
    withdrawalColumn: [/withdraw|debit|^dr$/i],
    depositColumn: [/deposit|credit|^cr$/i],
    balanceColumn: [/balance/i],
};

const guess = (headers, key) => {
    for (const re of GUESSES[key] || []) {
        const h = headers.find((x) => re.test(x || ""));
        if (h) return h;
    }
    return "";
};

/**
 * Upload a statement: preview it, point at the header row, map the columns (saved per account and
 * reused next time), then import. Duplicate rows from an overlapping upload are skipped server-side.
 */
const StatementImportPanel = ({ ledgerId, onImported }) => {
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [mapping, setMapping] = useState(null);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);

    useEffect(() => {
        setFile(null); setPreview(null); setResult(null); setError("");
        if (!ledgerId) return;
        getStatementMapping(ledgerId).then(setMapping).catch(() => setMapping(null));
    }, [ledgerId]);

    const loadPreview = async (f, headerRow) => {
        setBusy("preview"); setError("");
        try {
            const p = await previewStatement(f, headerRow);
            setPreview(p);
            setMapping((m) => {
                const next = { ...m, headerRow: p.headerRow };
                if (!m?.saved) COLUMN_FIELDS.forEach(({ key }) => { if (!next[key]) next[key] = guess(p.headers, key); });
                return next;
            });
        } catch (e) {
            setError(e?.response?.data?.message || "Could not read that file.");
        } finally {
            setBusy("");
        }
    };

    const pickFile = (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        setFile(f); setResult(null);
        loadPreview(f, mapping?.headerRow || 1);
    };

    const set = (key, value) => setMapping((m) => ({ ...m, [key]: value }));

    const doImport = async () => {
        setBusy("import"); setError(""); setResult(null);
        try {
            const saved = await saveStatementMapping(ledgerId, mapping);
            setMapping(saved);
            const r = await importStatement(ledgerId, file);
            setResult(r);
            onImported?.(r);
        } catch (e) {
            setError(e?.response?.data?.message || "Import failed.");
        } finally {
            setBusy("");
        }
    };

    const saveOnly = async () => {
        setBusy("save"); setError("");
        try { setMapping(await saveStatementMapping(ledgerId, mapping)); }
        catch (e) { setError(e?.response?.data?.message || "Could not save the settings."); }
        finally { setBusy(""); }
    };

    const headers = preview?.headers?.filter((h) => h) || [];
    const amountsMapped = mapping && (mapping.withdrawalColumn || mapping.depositColumn || mapping.amountColumn);

    return (
        <Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" hidden onChange={pickFile} />
                <Button variant="contained" disableElevation startIcon={<UploadFileOutlined />}
                    onClick={() => fileRef.current?.click()} disabled={!ledgerId || !!busy}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#10b981", "&:hover": { bgcolor: "#059669" } }}>
                    Choose statement file
                </Button>
                <Typography sx={{ fontSize: "0.8125rem", color: "#64748b" }}>
                    {file ? `${file.name} · ${preview?.totalRows ?? "…"} rows` : "CSV or Excel export from your bank's net banking."}
                </Typography>
                {busy === "preview" && <CircularProgress size={16} />}
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}
            {result && (
                <Alert severity={result.imported ? "success" : "info"} sx={{ mb: 2, borderRadius: 1.5 }}>
                    Imported {result.imported} line{result.imported === 1 ? "" : "s"}
                    {result.duplicates ? `, skipped ${result.duplicates} already imported` : ""}
                    {result.imported ? `, matched ${result.autoMatched} automatically` : ""}.
                    {result.skipped?.length > 0 && (
                        <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5, fontSize: "0.75rem" }}>
                            {result.skipped.slice(0, 8).map((s) => <li key={s}>{s}</li>)}
                            {result.skipped.length > 8 && <li>…and {result.skipped.length - 8} more</li>}
                        </Box>
                    )}
                </Alert>
            )}

            {mapping && (
                <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 2, mb: 2 }}>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a", mb: 0.5 }}>
                        Statement format {mapping.saved && <Box component="span" sx={{ fontWeight: 500, color: "#16a34a", fontSize: "0.75rem", ml: 1 }}>saved for this account</Box>}
                    </Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mb: 2 }}>
                        Name the columns once. The next upload from this bank reuses them.
                    </Typography>
                    <Grid container spacing={1.5}>
                        <Grid item xs={6} sm={3}>
                            <TextField label="Header row" type="number" size="small" fullWidth value={mapping.headerRow || 1}
                                inputProps={{ min: 1 }}
                                onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 1); set("headerRow", v); if (file) loadPreview(file, v); }}
                                helperText="Row with the column titles" />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <TextField label="Date format" size="small" fullWidth value={mapping.dateFormat || ""}
                                onChange={(e) => set("dateFormat", e.target.value)} placeholder="dd/MM/yyyy"
                                helperText="Blank = detect" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Reconcile from" type="date" size="small" fullWidth value={mapping.reconcileFrom || ""}
                                InputLabelProps={{ shrink: true }} onChange={(e) => set("reconcileFrom", e.target.value || null)}
                                helperText="Book entries before this date count as already cleared, such as the opening balance at go-live" />
                        </Grid>
                        {COLUMN_FIELDS.map(({ key, label, required, hint }) => (
                            <Grid item xs={12} sm={6} md={4} key={key}>
                                {headers.length ? (
                                    <TextField select size="small" fullWidth label={label} required={required}
                                        value={headers.includes(mapping[key]) ? mapping[key] : ""} helperText={hint}
                                        onChange={(e) => set(key, e.target.value || null)}>
                                        <MenuItem value=""><em>Not in this file</em></MenuItem>
                                        {headers.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                                    </TextField>
                                ) : (
                                    <TextField size="small" fullWidth label={label} required={required} value={mapping[key] || ""}
                                        helperText={hint || "Exact column title"} onChange={(e) => set(key, e.target.value)} />
                                )}
                            </Grid>
                        ))}
                    </Grid>
                    <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 2 }}>
                        <Button onClick={saveOnly} disabled={!!busy || !mapping.dateColumn || !amountsMapped}
                            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                            Save format
                        </Button>
                        <Button variant="contained" disableElevation onClick={doImport}
                            disabled={!file || !!busy || !mapping.dateColumn || !amountsMapped}
                            startIcon={busy === "import" ? <CircularProgress size={14} color="inherit" /> : null}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#0f172a", "&:hover": { bgcolor: "#1e293b" } }}>
                            Import statement
                        </Button>
                    </Stack>
                </Box>
            )}

            {preview && preview.rows.length > 0 && (
                <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflowX: "auto" }}>
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b", p: 1.25 }}>
                        First {preview.rows.length} rows of the file. The highlighted row is the header.
                    </Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow><TableCell sx={COL_HEAD}>#</TableCell>{(preview.rows[preview.headerRow - 1] || []).map((_, i) => <TableCell key={i} sx={COL_HEAD} />)}</TableRow>
                        </TableHead>
                        <TableBody>
                            {preview.rows.map((row, i) => (
                                <TableRow key={i} sx={i + 1 === preview.headerRow ? { bgcolor: "#ecfdf5" } : undefined}>
                                    <TableCell sx={{ ...CELL, color: "#94a3b8", fontSize: "0.6875rem" }}>{i + 1}</TableCell>
                                    {row.map((c, j) => (
                                        <TableCell key={j} sx={{ ...CELL, fontSize: "0.75rem", whiteSpace: "nowrap", fontWeight: i + 1 === preview.headerRow ? 700 : 400 }}>{c}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            )}
        </Box>
    );
};

export default StatementImportPanel;
