import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Alert, Box, Button, Chip, CircularProgress, Divider, IconButton, MenuItem, Snackbar, Stack,
    Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import {
    AutoFixHighOutlined, CheckCircleOutlined, DeleteOutline, LinkOffOutlined, LinkOutlined, WarningAmberOutlined,
} from "@mui/icons-material";
import {
    autoMatch, deleteStatementLine, getReconciliationStatement, getReconciliationWorkspace,
    listBankAccounts, matchLines, unmatchLine,
} from "../../../services/accounting/bankService";
import { CELL, CELL_MONO, CELL_NUM, COL_HEAD, COL_NUM, StatCard, fmtAmt, fmtDate, fmtMoney0, todayStr } from "../gst/gstCommon";
import { PageHeader, PageShell } from "../reports/statementCommon";
import StatementImportPanel from "./StatementImportPanel";

const signedStmt = (l) => Number(l.deposit || 0) - Number(l.withdrawal || 0);
const signedBook = (l) => Number(l.dr || 0) - Number(l.cr || 0);

const SideTitle = ({ title, count, hint }) => (
    <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 800, color: "#0f172a" }}>{title}</Typography>
        <Chip label={count} size="small" sx={{ height: 18, fontSize: "0.6875rem", fontWeight: 700 }} />
        {hint && <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8" }}>{hint}</Typography>}
    </Stack>
);

const rowSx = (selected) => ({
    cursor: "pointer",
    bgcolor: selected ? "#ecfdf5" : undefined,
    "&:hover": { bgcolor: selected ? "#d1fae5" : "#f8fafc" },
});

// ─── Match tab ───────────────────────────────────────────────────────────────

const MatchPanel = ({ ws, onMatch, onUnmatch, onDelete, onAutoMatch, busy }) => {
    const [stmtId, setStmtId] = useState(null);
    const [bookId, setBookId] = useState(null);
    useEffect(() => { setStmtId(null); setBookId(null); }, [ws]);

    const stmt = ws.unmatchedStatementLines.find((l) => l.id === stmtId);
    const book = ws.unmatchedBookLines.find((l) => l.voucherLineId === bookId);
    const sameAmount = stmt && book && Math.abs(signedStmt(stmt) - signedBook(book)) < 0.005;

    // With a statement line picked, entries of the same amount float to the top.
    const books = useMemo(() => {
        if (!stmt) return ws.unmatchedBookLines;
        const target = signedStmt(stmt);
        return [...ws.unmatchedBookLines].sort((a, b) =>
            (Math.abs(signedBook(a) - target) < 0.005 ? 0 : 1) - (Math.abs(signedBook(b) - target) < 0.005 ? 0 : 1));
    }, [stmt, ws.unmatchedBookLines]);

    return (
        <Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
                <Button variant="outlined" startIcon={busy === "auto" ? <CircularProgress size={14} /> : <AutoFixHighOutlined />}
                    onClick={onAutoMatch} disabled={!!busy || !ws.unmatchedStatementLines.length}
                    sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                    Auto-match
                </Button>
                <Button variant="contained" disableElevation startIcon={<LinkOutlined />}
                    disabled={!sameAmount || !!busy} onClick={() => onMatch(stmtId, bookId)}
                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: "#0f172a", "&:hover": { bgcolor: "#1e293b" } }}>
                    Match selected
                </Button>
                <Typography sx={{ fontSize: "0.75rem", color: stmt && book && !sameAmount ? "#b45309" : "#64748b" }}>
                    {stmt && book && !sameAmount
                        ? "The amounts differ. Match only the same amount on the same side."
                        : "Pick a bank line on the left and the book entry it clears on the right."}
                </Typography>
            </Stack>

            <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="flex-start">
                <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
                    <SideTitle title="On the statement, not matched" count={ws.unmatchedStatementLines.length} />
                    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "auto", maxHeight: 520 }}>
                        <Table size="small" stickyHeader>
                            <TableHead><TableRow>
                                <TableCell sx={COL_HEAD}>Date</TableCell>
                                <TableCell sx={COL_HEAD}>Narration</TableCell>
                                <TableCell sx={COL_NUM}>Out</TableCell>
                                <TableCell sx={COL_NUM}>In</TableCell>
                                <TableCell sx={COL_HEAD} />
                            </TableRow></TableHead>
                            <TableBody>
                                {ws.unmatchedStatementLines.map((l) => (
                                    <TableRow key={l.id} sx={rowSx(l.id === stmtId)} onClick={() => setStmtId(l.id === stmtId ? null : l.id)}>
                                        <TableCell sx={{ ...CELL, whiteSpace: "nowrap" }}>{fmtDate(l.txnDate)}</TableCell>
                                        <TableCell sx={{ ...CELL, fontSize: "0.75rem" }}>
                                            {l.narration}
                                            {l.reference && <Box component="span" sx={{ ml: 0.75, color: "#94a3b8" }}>{l.reference}</Box>}
                                            {l.staleMatch && <Chip label="entry reversed" size="small" sx={{ ml: 0.75, height: 16, fontSize: "0.625rem", bgcolor: "#fffbeb", color: "#b45309" }} />}
                                        </TableCell>
                                        <TableCell sx={CELL_NUM}>{fmtAmt(l.withdrawal)}</TableCell>
                                        <TableCell sx={CELL_NUM}>{fmtAmt(l.deposit)}</TableCell>
                                        <TableCell sx={{ ...CELL, px: 0.5 }}>
                                            <Tooltip title="Remove this imported line">
                                                <IconButton size="small" aria-label="Remove imported line"
                                                    onClick={(e) => { e.stopPropagation(); onDelete(l); }}>
                                                    <DeleteOutline sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!ws.unmatchedStatementLines.length && (
                                    <TableRow><TableCell colSpan={5} sx={{ ...CELL, color: "#94a3b8" }}>Every imported line is matched.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
                    <SideTitle title="In the books, not matched" count={ws.unmatchedBookLines.length}
                        hint={ws.reconcileFrom ? `from ${fmtDate(ws.reconcileFrom)}` : null} />
                    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "auto", maxHeight: 520 }}>
                        <Table size="small" stickyHeader>
                            <TableHead><TableRow>
                                <TableCell sx={COL_HEAD}>Date</TableCell>
                                <TableCell sx={COL_HEAD}>Voucher</TableCell>
                                <TableCell sx={COL_NUM}>Paid</TableCell>
                                <TableCell sx={COL_NUM}>Received</TableCell>
                            </TableRow></TableHead>
                            <TableBody>
                                {books.map((l) => {
                                    const fits = stmt && Math.abs(signedBook(l) - signedStmt(stmt)) < 0.005;
                                    return (
                                        <TableRow key={l.voucherLineId} sx={rowSx(l.voucherLineId === bookId)}
                                            onClick={() => setBookId(l.voucherLineId === bookId ? null : l.voucherLineId)}>
                                            <TableCell sx={{ ...CELL, whiteSpace: "nowrap" }}>{fmtDate(l.date)}</TableCell>
                                            <TableCell sx={{ ...CELL, fontSize: "0.75rem" }}>
                                                <Box component="span" sx={{ ...CELL_MONO, p: 0, border: 0, mr: 0.75 }}>{l.voucherNumber}</Box>
                                                {l.narration}
                                                {fits && <Chip label="same amount" size="small" sx={{ ml: 0.75, height: 16, fontSize: "0.625rem", bgcolor: "#ecfdf5", color: "#047857" }} />}
                                            </TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(l.cr)}</TableCell>
                                            <TableCell sx={CELL_NUM}>{fmtAmt(l.dr)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!books.length && (
                                    <TableRow><TableCell colSpan={4} sx={{ ...CELL, color: "#94a3b8" }}>Every book entry is matched.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>
                </Box>
            </Stack>

            {ws.recentlyMatched.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    <SideTitle title="Matched" count={ws.recentlyMatched.length} hint="last 90 days" />
                    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "auto", maxHeight: 360 }}>
                        <Table size="small" stickyHeader>
                            <TableHead><TableRow>
                                <TableCell sx={COL_HEAD}>Bank date</TableCell>
                                <TableCell sx={COL_HEAD}>Narration</TableCell>
                                <TableCell sx={COL_NUM}>Amount</TableCell>
                                <TableCell sx={COL_HEAD}>Book entry</TableCell>
                                <TableCell sx={COL_HEAD} />
                            </TableRow></TableHead>
                            <TableBody>
                                {ws.recentlyMatched.map((l) => (
                                    <TableRow key={l.id}>
                                        <TableCell sx={{ ...CELL, whiteSpace: "nowrap" }}>{fmtDate(l.txnDate)}</TableCell>
                                        <TableCell sx={{ ...CELL, fontSize: "0.75rem" }}>{l.narration}</TableCell>
                                        <TableCell sx={CELL_NUM}>{fmtAmt(Math.abs(signedStmt(l)))} {signedStmt(l) < 0 ? "out" : "in"}</TableCell>
                                        <TableCell sx={{ ...CELL, fontSize: "0.75rem" }}>{l.voucherNumber} · {fmtDate(l.voucherDate)}</TableCell>
                                        <TableCell sx={{ ...CELL, px: 0.5 }}>
                                            <Tooltip title="Unmatch">
                                                <IconButton size="small" aria-label="Unmatch" onClick={() => onUnmatch(l.id)} disabled={!!busy}>
                                                    <LinkOffOutlined sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

// ─── Reconciliation statement tab ────────────────────────────────────────────

const BrsBlock = ({ title, sign, total, rows }) => (
    <>
        <TableRow sx={{ bgcolor: "#f8fafc" }}>
            <TableCell sx={{ ...CELL, fontWeight: 700 }}>{sign} {title}</TableCell>
            <TableCell sx={{ ...CELL_NUM, fontWeight: 700 }}>{fmtAmt(total) === "—" ? "0.00" : fmtAmt(total)}</TableCell>
        </TableRow>
        {rows.map((r) => (
            <TableRow key={r.key}>
                <TableCell sx={{ ...CELL, pl: 4, fontSize: "0.75rem", color: "#475569" }}>
                    {fmtDate(r.date)} · {r.label}
                </TableCell>
                <TableCell sx={{ ...CELL_NUM, color: "#475569" }}>{fmtAmt(r.amount)}</TableCell>
            </TableRow>
        ))}
    </>
);

const BrsPanel = ({ brs }) => {
    const bookRows = (lines, side) => lines.map((l) => ({
        key: `b${l.voucherLineId}`, date: l.date, amount: side === "dr" ? l.dr : l.cr,
        label: `${l.voucherNumber}${l.narration ? ` · ${l.narration}` : ""}${l.statementDate ? ` (bank: ${fmtDate(l.statementDate)})` : ""}`,
    }));
    const bankRows = (lines, side) => lines.map((l) => ({
        key: `s${l.id}`, date: l.txnDate, amount: side === "in" ? l.deposit : l.withdrawal,
        label: `${l.narration || "—"}${l.reference ? ` · ${l.reference}` : ""}`,
    }));
    return (
        <Box>
            {brs.statementBalance == null ? (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
                    No statement balance up to {fmtDate(brs.asOf)}. Import a statement with a balance column to check the result against the bank.
                </Alert>
            ) : brs.tiesOut ? (
                <Alert icon={<CheckCircleOutlined />} severity="success" sx={{ mb: 2, borderRadius: 1.5 }}>
                    Reconciled. The books explain the bank balance of {fmtMoney0(brs.statementBalance)} on {fmtDate(brs.statementBalanceDate)} exactly.
                </Alert>
            ) : (
                <Alert icon={<WarningAmberOutlined />} severity="warning" sx={{ mb: 2, borderRadius: 1.5 }}>
                    Off by {fmtAmt(brs.difference)}. The statement shows {fmtAmt(brs.statementBalance)} on {fmtDate(brs.statementBalanceDate)}.
                    Look for a missing statement upload, a book entry dated on the wrong side of {fmtDate(brs.asOf)}, or a
                    wrong opening balance or reconcile-from date.
                </Alert>
            )}
            <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflowX: "auto" }}>
                <Table size="small">
                    <TableBody>
                        <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                            <TableCell sx={{ ...CELL, fontWeight: 800 }}>Balance as per books on {fmtDate(brs.asOf)}</TableCell>
                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800 }}>{fmtAmt(brs.bookBalance)}</TableCell>
                        </TableRow>
                        <BrsBlock sign="Less:" title="Deposits recorded but not yet credited by the bank"
                            total={brs.depositsNotCreditedTotal} rows={bookRows(brs.depositsNotCredited, "dr")} />
                        <BrsBlock sign="Add:" title="Payments recorded but not yet debited by the bank (e.g. cheques not presented)"
                            total={brs.paymentsNotDebitedTotal} rows={bookRows(brs.paymentsNotDebited, "cr")} />
                        <BrsBlock sign="Add:" title="Credits on the statement not in the books"
                            total={brs.bankCreditsNotInBooksTotal} rows={bankRows(brs.bankCreditsNotInBooks, "in")} />
                        <BrsBlock sign="Less:" title="Debits on the statement not in the books (e.g. bank charges)"
                            total={brs.bankDebitsNotInBooksTotal} rows={bankRows(brs.bankDebitsNotInBooks, "out")} />
                        <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                            <TableCell sx={{ ...CELL, fontWeight: 800 }}>Balance as per bank (worked out)</TableCell>
                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800 }}>{fmtAmt(brs.computedBankBalance)}</TableCell>
                        </TableRow>
                        {brs.statementBalance != null && (
                            <TableRow>
                                <TableCell sx={{ ...CELL, fontWeight: 700 }}>Balance on the statement ({fmtDate(brs.statementBalanceDate)})</TableCell>
                                <TableCell sx={{ ...CELL_NUM, fontWeight: 700, color: brs.tiesOut ? "#16a34a" : "#dc2626" }}>{fmtAmt(brs.statementBalance)}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Box>
            <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 1.5 }}>
                Items in the last two groups belong in the books. Post them as receipt, payment or journal vouchers, then match them.
            </Typography>
        </Box>
    );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const BankReconciliationPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [accounts, setAccounts] = useState(null);
    const [ledgerId, setLedgerId] = useState(Number(searchParams.get("account")) || null);
    const [asOf, setAsOf] = useState(todayStr);
    const [tab, setTab] = useState(searchParams.get("tab") || "match");
    const [ws, setWs] = useState(null);
    const [brs, setBrs] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [snack, setSnack] = useState(null);

    useEffect(() => {
        listBankAccounts().then((list) => {
            setAccounts(list);
            if (!ledgerId && list.length) setLedgerId(list[0].ledgerId);
        }).catch(() => setError("Failed to load bank accounts."));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const load = useCallback(async () => {
        if (!ledgerId) return;
        setLoading(true); setError("");
        try {
            const [w, b] = await Promise.all([getReconciliationWorkspace(ledgerId, asOf), getReconciliationStatement(ledgerId, asOf)]);
            setWs(w); setBrs(b);
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load the reconciliation.");
        } finally {
            setLoading(false);
        }
    }, [ledgerId, asOf]);

    useEffect(() => { load(); }, [load]);

    const chooseAccount = (id) => {
        setLedgerId(id); setWs(null); setBrs(null);
        setSearchParams((p) => { p.set("account", id); return p; }, { replace: true });
    };

    const act = async (key, fn, message) => {
        setBusy(key);
        try {
            const r = await fn();
            setSnack({ severity: "success", message: typeof message === "function" ? message(r) : message });
            await load();
        } catch (e) {
            setSnack({ severity: "error", message: e?.response?.data?.message || "That did not work." });
        } finally {
            setBusy("");
        }
    };

    const account = accounts?.find((a) => a.ledgerId === ledgerId);

    return (
        <PageShell>
            <PageHeader title="Bank Reconciliation"
                subtitle="Import the bank statement, match it to the books, and explain every difference"
                right={brs && brs.statementBalance != null && (
                    <Chip icon={brs.tiesOut ? <CheckCircleOutlined sx={{ fontSize: 15 }} /> : <WarningAmberOutlined sx={{ fontSize: 15 }} />}
                        label={brs.tiesOut ? "Reconciled" : "Not reconciled"} size="small"
                        sx={{ fontWeight: 700, fontSize: "0.75rem",
                            bgcolor: brs.tiesOut ? "#f0fdf4" : "#fffbeb", color: brs.tiesOut ? "#16a34a" : "#b45309",
                            border: `1px solid ${brs.tiesOut ? "#bbf7d0" : "#fde68a"}` }} />
                )} />
            <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

            {accounts && !accounts.length && (
                <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                    No bank account is set up yet. Open the ledger in Chart of Accounts and tick "Bank account".
                </Alert>
            )}

            {accounts?.length > 0 && (
                <>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
                        <TextField select size="small" label="Bank account" value={ledgerId || ""} sx={{ minWidth: 260 }}
                            onChange={(e) => chooseAccount(Number(e.target.value))}>
                            {accounts.map((a) => (
                                <MenuItem key={a.ledgerId} value={a.ledgerId}>{a.code} — {a.name}</MenuItem>
                            ))}
                        </TextField>
                        <TextField label="As at" type="date" size="small" value={asOf} InputLabelProps={{ shrink: true }}
                            onChange={(e) => setAsOf(e.target.value)} sx={{ width: 170 }} />
                        {loading && <CircularProgress size={20} sx={{ alignSelf: "center" }} />}
                    </Stack>

                    {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{error}</Alert>}

                    {brs && (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
                            <StatCard label="Book balance" value={fmtMoney0(brs.bookBalance)} accent="#2563eb" />
                            <StatCard label="Statement balance" value={brs.statementBalance != null ? fmtMoney0(brs.statementBalance) : "—"} accent="#7c3aed" />
                            <StatCard label="Unmatched bank lines" value={ws?.unmatchedStatementLines.length ?? "—"} accent="#f59e0b" />
                            <StatCard label="Unmatched book entries" value={ws?.unmatchedBookLines.length ?? "—"} accent="#64748b" />
                        </Stack>
                    )}

                    {account && !account.mapped && tab !== "import" && (
                        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}
                            action={<Button size="small" onClick={() => setTab("import")} sx={{ textTransform: "none" }}>Import a statement</Button>}>
                            No statement has been imported for this account yet.
                        </Alert>
                    )}

                    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: "1px solid #f1f5f9", minHeight: 40,
                        "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 40 } }}>
                        <Tab value="match" label="Match" />
                        <Tab value="statement" label="Reconciliation statement" />
                        <Tab value="import" label="Import statement" />
                    </Tabs>

                    {tab === "match" && ws && (
                        <MatchPanel ws={ws} busy={busy}
                            onAutoMatch={() => act("auto", () => autoMatch(ledgerId), (r) => `Matched ${r.matched} line${r.matched === 1 ? "" : "s"} automatically.`)}
                            onMatch={(s, b) => act("match", () => matchLines(s, b), "Matched.")}
                            onUnmatch={(id) => act("unmatch", () => unmatchLine(id), "Unmatched.")}
                            onDelete={(l) => {
                                if (!window.confirm(`Remove the imported line of ${fmtDate(l.txnDate)} (${l.narration || "no narration"})?`)) return;
                                act("delete", () => deleteStatementLine(l.id), "Line removed.");
                            }} />
                    )}
                    {tab === "statement" && brs && <BrsPanel brs={brs} />}
                    {tab === "import" && (
                        <StatementImportPanel ledgerId={ledgerId} onImported={() => {
                            listBankAccounts().then(setAccounts).catch(() => {});
                            load();
                        }} />
                    )}
                </>
            )}

            <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
                {snack ? <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(null)}>{snack.message}</Alert> : <span />}
            </Snackbar>
        </PageShell>
    );
};

export default BankReconciliationPage;
