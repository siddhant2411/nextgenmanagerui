import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, Divider, Link, Paper, Skeleton, Stack,
    Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getLedgerStatement } from "../../../services/accounting/accountingReportService";
import { listLedgers } from "../../../services/accounting/accountingCoaService";
import { useFinancialYears } from "../gst/gstCommon";
import {
    Kbd, LedgerPicker, TypeBadge, fmtBalance, fmtDate, fmtMoney, fyStartFor, rowSx, sourceDoc, todayStr,
    useEscBack, useLedgerBalances, useRowKeys,
} from "../common/accountingUi";
import { voucherPath } from "../voucher/VoucherDetailPage";

const fmtAmt = (n) =>
    !n || Number(n) === 0
        ? "—"
        : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(Math.abs(n));

const CELL     = { fontSize: "0.8125rem", color: "#334155", py: 1, px: 1.5, borderBottom: "1px solid #f8fafc" };
const CELL_NUM = { ...CELL, textAlign: "right", fontVariantNumeric: "tabular-nums", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem" };
const COL_HEAD = { fontSize: "0.65625rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, py: 1.25, px: 1.5 };
const COL_NUM  = { ...COL_HEAD, textAlign: "right" };

// The service sends "DR" / "CR" with an unsigned amount; turn that into a signed net (Dr positive).
const net = (amount, side) => (String(side).toUpperCase() === "CR" ? -1 : 1) * (Number(amount) || 0);

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Quick ranges, worked out from today and the financial year it falls in. */
const presets = (fys) => {
    const now = new Date();
    const today = todayStr();
    const fyStart = fyStartFor(today, fys);
    const q = Math.floor(((now.getMonth() + 9) % 12) / 3); // Apr–Jun is Q1
    const qStartMonth = (3 + q * 3) % 12;
    const qStart = new Date(qStartMonth > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear(), qStartMonth, 1);
    const lastFyEnd = new Date(`${fyStart}T00:00`);
    lastFyEnd.setDate(lastFyEnd.getDate() - 1);
    return [
        { label: "This month", from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: today },
        { label: "This quarter", from: iso(qStart), to: today },
        { label: "Year to date", from: fyStart, to: today },
        { label: "Last year", from: fyStartFor(iso(lastFyEnd), fys), to: iso(lastFyEnd) },
    ];
};

const BalanceCard = ({ label, value, accent }) => (
    <Box sx={{ flex: 1, p: "12px 16px", border: "1px solid #e2e8f0", borderLeft: `3px solid ${accent}`, borderRadius: 1.5, bgcolor: "#fff" }}>
        <Typography sx={{ fontSize: "0.65625rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, mb: 0.5 }}>{label}</Typography>
        <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
    </Box>
);

const LedgerStatementPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { fys } = useFinancialYears();
    const [ledgers, setLedgers] = useState([]);
    const [account, setAccount] = useState(null);
    const [from, setFrom] = useState(() => searchParams.get("from") || fyStartFor(todayStr()));
    const [to, setTo] = useState(() => searchParams.get("to") || todayStr());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { balanceOf } = useLedgerBalances(to);

    useEscBack();

    useEffect(() => {
        listLedgers().then((list) => {
            setLedgers(list || []);
            const wanted = Number(searchParams.get("accountId"));
            const acc = wanted ? (list || []).find((l) => l.id === wanted) : null;
            if (acc) setAccount(acc);
        }).catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Runs whenever the account or dates change, and keeps them in the address so Back returns here.
    useEffect(() => {
        if (!account || !from || !to) return;
        setSearchParams({ accountId: account.id, from, to }, { replace: true });
        let live = true;
        setError(""); setLoading(true);
        getLedgerStatement(account.id, from, to)
            .then((d) => { if (live) setData(d); })
            .catch((e) => { if (live) { setData(null); setError(e?.response?.data?.message || "Failed to load ledger statement."); } })
            .finally(() => { if (live) setLoading(false); });
        return () => { live = false; };
    }, [account, from, to, setSearchParams]);

    const lines = useMemo(() => data?.lines || [], [data]);
    const openVoucher = useCallback((id) => id && navigate(voucherPath(id), { state: { ledgerRange: { from, to } } }), [navigate, from, to]);
    const openAt = useCallback((i) => lines[i] && openVoucher(lines[i].voucherId), [lines, openVoucher]);
    const { active, rowRef } = useRowKeys(lines.length, openAt);
    const totals = useMemo(() => lines.reduce((s, l) => ({ dr: s.dr + (Number(l.drAmount) || 0), cr: s.cr + (Number(l.crAmount) || 0) }), { dr: 0, cr: 0 }), [lines]);
    const ranges = useMemo(() => presets(fys), [fys]);

    const closingNet = data ? net(data.closingBalance, data.closingBalanceDrCr) : 0;

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "white" }}>

                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3, gap: 2, flexWrap: "wrap" }}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                            {data?.accountName || "Ledger Statement"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>
                            {data ? `Ledger statement · ${fmtDate(data.from)} – ${fmtDate(data.to)}` : "Every entry on one account, with the running balance"}
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8" }}>
                        <Kbd>↑</Kbd><Kbd>↓</Kbd> move · <Kbd>Enter</Kbd> open voucher · <Kbd>Esc</Kbd> back
                    </Typography>
                </Stack>

                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "flex-start" }} sx={{ mb: 2 }}>
                    <Box sx={{ width: { xs: "100%", md: 340 } }}>
                        <LedgerPicker ledgers={ledgers} value={account} onChange={(v) => v && setAccount(v)}
                            onPicked={() => document.activeElement?.blur()}
                            label="Ledger" balanceOf={balanceOf} autoFocus={!searchParams.get("accountId")}
                            helper="Type a few letters of the ledger name" />
                    </Box>
                    <TextField label="From" type="date" size="small" value={from}
                        onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 170 }} />
                    <TextField label="To" type="date" size="small" value={to}
                        onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 170 }} />
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap", rowGap: 1 }}>
                    {ranges.map((r) => {
                        const on = r.from === from && r.to === to;
                        return (
                            <Button key={r.label} size="small" onClick={() => { setFrom(r.from); setTo(r.to); }}
                                sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.75rem", borderRadius: 5, px: 1.5, py: 0.25,
                                    border: "1px solid", borderColor: on ? "#10b981" : "#e2e8f0",
                                    bgcolor: on ? "#ecfdf5" : "#fff", color: on ? "#047857" : "#475569" }}>
                                {r.label}
                            </Button>
                        );
                    })}
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>{error}</Alert>}

                {!account && !loading && (
                    <Box sx={{ textAlign: "center", py: 8, border: "1px dashed #e2e8f0", borderRadius: 2 }}>
                        <Typography sx={{ color: "#94a3b8", fontSize: "0.875rem" }}>Pick a ledger to see its entries.</Typography>
                    </Box>
                )}

                {loading && !data && [...Array(8)].map((_, i) => <Skeleton key={i} height={44} sx={{ mb: 0.5 }} />)}

                {data && (
                    <>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, opacity: loading ? 0.6 : 1 }}>
                            <BalanceCard label="Opening" value={fmtBalance(net(data.openingBalance, data.openingBalanceDrCr))} accent="#64748b" />
                            <BalanceCard label="Debits" value={fmtMoney(totals.dr)} accent="#2563eb" />
                            <BalanceCard label="Credits" value={fmtMoney(totals.cr)} accent="#dc2626" />
                            <BalanceCard label="Closing" value={fmtBalance(closingNet)} accent={closingNet >= 0 ? "#2563eb" : "#dc2626"} />
                        </Stack>

                        {lines.length === 0 ? (
                            <Box sx={{ textAlign: "center", py: 6, border: "1px solid #e2e8f0", borderRadius: 2 }}>
                                <Typography sx={{ color: "#94a3b8", fontSize: "0.875rem" }}>No entries in this period.</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflowX: "auto", opacity: loading ? 0.6 : 1 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                            <TableCell sx={COL_HEAD}>Date</TableCell>
                                            <TableCell sx={COL_HEAD}>Voucher</TableCell>
                                            <TableCell sx={COL_HEAD}>Particulars</TableCell>
                                            <TableCell sx={COL_NUM}>Debit</TableCell>
                                            <TableCell sx={COL_NUM}>Credit</TableCell>
                                            <TableCell sx={{ ...COL_NUM, color: "#0f172a", fontWeight: 800 }}>Balance</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {lines.map((l, i) => {
                                            const src = sourceDoc(l.sourceDocType, l.sourceDocId);
                                            return (
                                                <TableRow key={`${l.voucherId}-${i}`} ref={rowRef(i)} onClick={() => openVoucher(l.voucherId)}
                                                    sx={rowSx(i === active)}>
                                                    <TableCell sx={{ ...CELL, color: "#64748b", whiteSpace: "nowrap" }}>{fmtDate(l.date)}</TableCell>
                                                    <TableCell sx={{ ...CELL, whiteSpace: "nowrap" }}>
                                                        <TypeBadge type={l.voucherType} />
                                                        <Box component="span" sx={{ ml: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "#2563eb", fontWeight: 600 }}>
                                                            {l.voucherNumber}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell sx={{ ...CELL, maxWidth: 340 }}>
                                                        <Typography sx={{ fontSize: "0.8125rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                            {l.narration || "—"}
                                                        </Typography>
                                                        {src && (src.path ? (
                                                            <Link component="button" underline="hover"
                                                                onClick={(e) => { e.stopPropagation(); navigate(src.path); }}
                                                                sx={{ fontSize: "0.6875rem", fontWeight: 600, color: "#2563eb" }}>
                                                                {src.label}
                                                            </Link>
                                                        ) : (
                                                            <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8" }}>{src.label}</Typography>
                                                        ))}
                                                    </TableCell>
                                                    <TableCell sx={{ ...CELL_NUM, color: Number(l.drAmount) ? "#0f172a" : "#cbd5e1" }}>{fmtAmt(l.drAmount)}</TableCell>
                                                    <TableCell sx={{ ...CELL_NUM, color: Number(l.crAmount) ? "#0f172a" : "#cbd5e1" }}>{fmtAmt(l.crAmount)}</TableCell>
                                                    <TableCell sx={{ ...CELL_NUM, fontWeight: 700, whiteSpace: "nowrap" }}>
                                                        {fmtAmt(l.runningBalance)}
                                                        <Box component="span" sx={{ ml: 0.75, fontSize: "0.625rem", fontWeight: 800,
                                                            color: String(l.runningBalanceDrCr).toUpperCase() === "CR" ? "#dc2626" : "#2563eb" }}>
                                                            {String(l.runningBalanceDrCr).toUpperCase() === "CR" ? "Cr" : "Dr"}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                                            <TableCell colSpan={3} sx={{ ...CELL, fontWeight: 800, color: "#0f172a", py: 1.5 }}>Total for the period</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800, color: "#0f172a", py: 1.5 }}>{fmtAmt(totals.dr)}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800, color: "#0f172a", py: 1.5 }}>{fmtAmt(totals.cr)}</TableCell>
                                            <TableCell sx={{ ...CELL_NUM, fontWeight: 800, color: "#0f172a", py: 1.5 }}>{fmtBalance(closingNet)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </>
                )}
            </Paper>

        </Box>
    );
};

export default LedgerStatementPage;
