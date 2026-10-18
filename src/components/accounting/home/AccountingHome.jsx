import React, { useEffect, useMemo, useState } from "react";
import {
    Box, Button, Grid, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import {
    AddOutlined, CheckCircleOutlined, ChevronRightOutlined, ErrorOutlineOutlined, SearchOutlined, WarningAmberOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import ModuleHero from "../../ui/moduleshell/ModuleHero";
import ModuleBody from "../../ui/moduleshell/ModuleBody";
import { StatStrip, StatTile } from "../../ui/moduleshell/StatTile";
import {
    EYEBROW, STATUS, T, TABLE, fmtMoney as fmtCompact, heroButtonSx, heroCtaSx, panelSx,
} from "../../../theme/moduleTokens";
import { listLedgers } from "../../../services/accounting/accountingCoaService";
import { listVouchers } from "../../../services/accounting/accountingVoucherService";
import { listBankAccounts } from "../../../services/accounting/bankService";
import { listGstReturns } from "../../../services/accounting/gstService";
import { getFailedReversals } from "../../../services/accounting/auditTrailService";
import {
    getCreditorsAgeing, getDebtorsAgeing, getProfitLoss, getStockGlReconciliation, getTrialBalance,
} from "../../../services/accounting/accountingReportService";
import { useFinancialYears } from "../gst/gstCommon";
import { pickDefaultFy } from "../reports/statementCommon";
import { Kbd, TypeBadge, fmtBalance, fmtDate, sourceDoc, todayStr } from "../common/accountingUi";
import { voucherPath } from "../voucher/VoucherDetailPage";
import { openAccountingSearch } from "../common/AccountingSearch";

/*
 * The accounting landing page: where the money is, what is owed both ways, and the short list of
 * things that need someone today. Every figure opens the report behind it.
 */

const isBankOrCash = (l) => Boolean(l.isBankAccount ?? l.bankAccount) || Boolean(l.isCashAccount ?? l.cashAccount);
const num = (n) => Number(n) || 0;
const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00`) - new Date(`${a}T00:00`)) / 86400000);
const isoAddDays = (d, n) => {
    const x = new Date(`${d}T00:00`);
    x.setDate(x.getDate() + n);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

/** Runs every loader on its own, so one failing endpoint leaves a gap instead of a blank page. */
const useSettled = (loaders, deps) => {
    const [state, setState] = useState({ loading: true });
    useEffect(() => {
        if (!loaders) return undefined;
        let live = true;
        const keys = Object.keys(loaders);
        Promise.allSettled(keys.map((k) => loaders[k]())).then((results) => {
            if (!live) return;
            const next = { loading: false };
            results.forEach((r, i) => { next[keys[i]] = r.status === "fulfilled" ? r.value : undefined; });
            setState(next);
        });
        return () => { live = false; };
    }, deps); // eslint-disable-line react-hooks/exhaustive-deps
    return state;
};

const SEVERITY = {
    critical: { color: STATUS.critical, bg: STATUS.criticalBg, Icon: ErrorOutlineOutlined },
    warning:  { color: STATUS.warning,  bg: STATUS.warningBg,  Icon: WarningAmberOutlined },
};

/** Works out GST returns for last month that have not been filed, and how close their due dates are. */
const gstDue = (fy, returns, today) => {
    if (!fy?.periods?.length || !returns) return [];
    const [y, m] = today.split("-").map(Number);
    const lastMonthEnd = isoAddDays(`${y}-${String(m).padStart(2, "0")}-01`, -1);
    const period = fy.periods.find((p) => p.startDate <= lastMonthEnd && lastMonthEnd <= p.endDate);
    if (!period) return [];
    const due = (day) => `${y}-${String(m).padStart(2, "0")}-${day}`;
    return [
        { type: "GSTR1", label: "GSTR-1", dueDate: due("11"), path: "/accounting/gst/gstr1" },
        { type: "GSTR3B", label: "GSTR-3B", dueDate: due("20"), path: "/accounting/gst/gstr3b" },
    ]
        .filter((r) => !returns.some((x) => x.periodId === period.id && x.returnType === r.type))
        .map((r) => ({ ...r, period: period.periodLabel, daysLeft: daysBetween(today, r.dueDate) }));
};

const AttentionItem = ({ item, onGo }) => {
    const s = SEVERITY[item.severity];
    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start" onClick={() => onGo(item.path)}
            sx={{ p: 1.5, borderRadius: 2, bgcolor: s.bg, border: `1px solid ${s.color}30`, cursor: "pointer",
                transition: "transform .1s", "&:hover": { transform: "translateX(2px)" } }}>
            <s.Icon sx={{ fontSize: 18, color: s.color, mt: 0.25 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: T.ink }}>{item.title}</Typography>
                <Typography sx={{ fontSize: "0.75rem", color: T.ink2, mt: 0.25 }}>{item.detail}</Typography>
            </Box>
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: s.color, whiteSpace: "nowrap", alignSelf: "center" }}>
                {item.action} <ChevronRightOutlined sx={{ fontSize: 14, verticalAlign: "-3px" }} />
            </Typography>
        </Stack>
    );
};

const Panel = ({ title, hint, action, children, sx }) => (
    <Paper elevation={0} sx={{ ...panelSx, ...sx }}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
            <Box>
                <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: T.ink }}>{title}</Typography>
                {hint && <Typography sx={{ fontSize: "0.75rem", color: T.ink3, mt: 0.25 }}>{hint}</Typography>}
            </Box>
            {action}
        </Stack>
        {children}
    </Paper>
);

const LinkButton = ({ onClick, children }) => (
    <Button size="small" onClick={onClick} endIcon={<ChevronRightOutlined sx={{ fontSize: 16 }} />}
        sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.75rem", color: T.accent }}>
        {children}
    </Button>
);

const QUICK = [
    { key: "F4", label: "Contra", type: "contra" },
    { key: "F5", label: "Payment", type: "payment" },
    { key: "F6", label: "Receipt", type: "receipt" },
    { key: "F7", label: "Journal", type: "journal" },
];
const KEY_TO_TYPE = { F4: "contra", F5: "payment", F6: "receipt", F7: "journal" };

const AccountingHome = () => {
    const navigate = useNavigate();
    const today = todayStr();
    const { fys, loading: fyLoading } = useFinancialYears();
    const fy = useMemo(() => pickDefaultFy(fys), [fys]);
    const fyStart = fy?.startDate || `${Number(today.slice(5, 7)) >= 4 ? today.slice(0, 4) : Number(today.slice(0, 4)) - 1}-04-01`;

    // Figures that do not depend on the financial year load straight away.
    const base = useSettled({
        ledgers: listLedgers,
        tb: () => getTrialBalance(today),
        debtors: () => getDebtorsAgeing(today),
        creditors: () => getCreditorsAgeing(today),
        banks: listBankAccounts,
        stock: () => getStockGlReconciliation(today),
        recent: () => listVouchers({ from: isoAddDays(today, -30), to: today }),
        failedReversals: getFailedReversals,
    }, []);
    // These need the year's start, so they wait for the financial years.
    const yearly = useSettled(fyLoading ? null : {
        pl: () => getProfitLoss(fyStart, today),
        pending: () => listVouchers({ from: fyStart, to: today, status: "PENDING_APPROVAL" }),
        gst: () => (fy ? listGstReturns(fy.id) : Promise.resolve([])),
    }, [fyLoading, fyStart]);

    // F4–F7 open the voucher screen on that type, as they do inside it.
    useEffect(() => {
        const onKey = (e) => {
            const t = KEY_TO_TYPE[e.key];
            if (!t || e.ctrlKey || e.altKey || document.querySelector(".MuiModal-root")) return;
            e.preventDefault();
            navigate(`/accounting/vouchers/new?type=${t}`);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [navigate]);

    const balances = useMemo(() => {
        const m = {};
        (base.tb?.lines || []).forEach((l) => { m[l.accountId] = num(l.closingDr) - num(l.closingCr); });
        return m;
    }, [base.tb]);
    const cashBank = useMemo(
        () => (base.ledgers || []).filter(isBankOrCash).map((l) => ({ ...l, balance: balances[l.id] || 0 }))
            .sort((a, b) => b.balance - a.balance),
        [base.ledgers, balances],
    );
    const cashTotal = cashBank.reduce((s, l) => s + l.balance, 0);

    const dt = base.debtors?.totals;
    const ct = base.creditors?.totals;
    const overdue = (t) => (t ? num(t.days31_60) + num(t.days61_90) + num(t.days90Plus) : 0);
    const profit = yearly.pl ? num(yearly.pl.netProfit) : null;
    const prevProfit = yearly.pl ? num(yearly.pl.previousNetProfit) : null;

    const attention = useMemo(() => {
        const items = [];
        // A cancelled document whose voucher could not be reversed: the books still carry it.
        (base.failedReversals || []).forEach((f) => {
            items.push({ severity: "critical", title: `${f.entityLabel || "A voucher"} is still in the books`,
                detail: `Its document was cancelled but the automatic reversal failed${f.username ? ` (cancelled by ${f.username})` : ""}. Reverse it by hand.`,
                action: "Open", path: f.voucherId ? voucherPath(f.voucherId) : "/accounting/reports/audit-trail" });
        });
        if (base.tb && !base.tb.balanced) {
            items.push({ severity: "critical", title: "Trial balance does not tie",
                detail: `Debits and credits differ by ${fmtBalance(num(base.tb.totalDr) - num(base.tb.totalCr))}.`,
                action: "Open", path: "/accounting/reports/trial-balance" });
        }
        const offStock = (base.stock?.rows || []).filter((r) => !r.tiesOut);
        if (offStock.length) {
            const gap = offStock.reduce((s, r) => s + Math.abs(num(r.variance)), 0);
            items.push({ severity: "critical", title: `Stock and books disagree on ${offStock.length} account${offStock.length > 1 ? "s" : ""}`,
                detail: `${fmtCompact(gap)} between the stock valuation and the general ledger.`,
                action: "Reconcile", path: "/accounting/reports/stock-gl" });
        }
        gstDue(fy, yearly.gst, today).forEach((r) => {
            items.push({ severity: r.daysLeft < 0 ? "critical" : "warning",
                title: `${r.label} for ${r.period} not filed`,
                detail: r.daysLeft < 0 ? `Was due ${fmtDate(r.dueDate)} — ${-r.daysLeft} day${r.daysLeft === -1 ? "" : "s"} late.`
                    : r.daysLeft === 0 ? "Due today." : `Due ${fmtDate(r.dueDate)}, in ${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"}.`,
                action: "Prepare", path: r.path });
        });
        if (yearly.pending?.length) {
            items.push({ severity: "warning", title: `${yearly.pending.length} voucher${yearly.pending.length > 1 ? "s" : ""} waiting for approval`,
                detail: "They are not in the books until someone approves them.",
                action: "Review", path: "/accounting/vouchers" });
        }
        (base.banks || []).filter((b) => b.unmatchedStatementLines > 0).forEach((b) => {
            items.push({ severity: "warning", title: `${b.unmatchedStatementLines} unmatched line${b.unmatchedStatementLines > 1 ? "s" : ""} in ${b.name}`,
                detail: b.lastStatementDate ? `Statement imported up to ${fmtDate(b.lastStatementDate)}.` : "From the imported bank statement.",
                action: "Match", path: "/accounting/bank/reconciliation" });
        });
        if (dt && num(dt.days90Plus) > 0) {
            items.push({ severity: "warning", title: `${fmtCompact(dt.days90Plus)} owed to you for over 90 days`,
                detail: "The oldest receivables, from the debtors ageing.",
                action: "Chase", path: "/accounting/reports/debtors-ageing" });
        }
        return items;
    }, [base, yearly, fy, dt, today]);

    const recent = useMemo(
        () => [...(base.recent || [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id)).slice(0, 8),
        [base.recent],
    );
    const topDebtors = useMemo(
        () => (base.debtors?.rows || []).filter((d) => num(d.total) > 0).sort((a, b) => num(b.total) - num(a.total)).slice(0, 5),
        [base.debtors],
    );

    const openLedger = (id) => navigate(`/accounting/reports/ledger?accountId=${id}&from=${fyStart}&to=${today}`);
    const stillLoading = base.loading || yearly.loading;

    return (
        <Box sx={{ bgcolor: T.ground, minHeight: "100vh" }}>
            <ModuleHero
                title="Accounting"
                subtitle={`${fy?.label ? `${fy.label} · ` : ""}books as of ${fmtDate(today)}`}
                actions={(
                    <>
                        <Button variant="outlined" startIcon={<SearchOutlined />} onClick={openAccountingSearch} sx={heroButtonSx}>
                            Find anything <Box component="span" sx={{ ml: 1, opacity: 0.6, fontSize: "0.75rem" }}>Ctrl K</Box>
                        </Button>
                        <Button variant="contained" disableElevation startIcon={<AddOutlined />}
                            onClick={() => navigate("/accounting/vouchers/new")} sx={heroCtaSx}>
                            New Voucher
                        </Button>
                    </>
                )}
            />
            <ModuleBody>
                <StatStrip>
                    <StatTile label="Cash & bank" loading={base.loading} value={fmtCompact(cashTotal)}
                        hint={`${cashBank.length} account${cashBank.length === 1 ? "" : "s"}`}
                        severity={!base.loading && cashTotal < 0 ? STATUS.critical : undefined} />
                    <StatTile label="Owed to you" loading={base.loading} value={fmtCompact(num(dt?.total))}
                        hint={overdue(dt) > 0 ? `${fmtCompact(overdue(dt))} over 30 days` : "Nothing overdue"}
                        severity={overdue(dt) > 0 ? STATUS.warning : undefined} />
                    <StatTile label="You owe" loading={base.loading} value={fmtCompact(num(ct?.total))}
                        hint={overdue(ct) > 0 ? `${fmtCompact(overdue(ct))} over 30 days` : "Nothing overdue"}
                        severity={overdue(ct) > 0 ? STATUS.warning : undefined} />
                    <StatTile label={profit != null && profit < 0 ? "Loss, year to date" : "Profit, year to date"}
                        loading={yearly.loading} value={profit == null ? "—" : fmtCompact(Math.abs(profit))}
                        hint={prevProfit != null ? `Same period last year ${prevProfit < 0 ? "−" : ""}${fmtCompact(Math.abs(prevProfit))}` : undefined}
                        severity={profit != null && profit < 0 ? STATUS.critical : undefined} />
                </StatStrip>

                <Grid container spacing={3}>
                    <Grid item xs={12} lg={4}>
                        <Panel title="Needs attention" hint="Things to sort out, most serious first">
                            {stillLoading ? (
                                [...Array(3)].map((_, i) => <Skeleton key={i} height={64} sx={{ mb: 1 }} />)
                            ) : attention.length ? (
                                <Stack spacing={1}>
                                    {[...attention].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1))
                                        .map((it, i) => <AttentionItem key={i} item={it} onGo={navigate} />)}
                                </Stack>
                            ) : (
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2, borderRadius: 2, bgcolor: STATUS.goodBg }}>
                                    <CheckCircleOutlined sx={{ color: STATUS.good }} />
                                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: T.ink }}>
                                        Nothing waiting. The books tie, stock matches and returns are filed.
                                    </Typography>
                                </Stack>
                            )}
                        </Panel>

                        <Panel title="Enter a voucher" hint="Press the key here, or on the voucher screen to switch type" sx={{ mt: 3 }}>
                            <Grid container spacing={1}>
                                {QUICK.map((q) => (
                                    <Grid item xs={6} key={q.type}>
                                        <Button fullWidth variant="outlined" onClick={() => navigate(`/accounting/vouchers/new?type=${q.type}`)}
                                            sx={{ justifyContent: "space-between", textTransform: "none", fontWeight: 700, borderRadius: 2, borderColor: T.rule, color: T.ink, py: 1 }}>
                                            {q.label} <Kbd>{q.key}</Kbd>
                                        </Button>
                                    </Grid>
                                ))}
                            </Grid>
                        </Panel>
                    </Grid>

                    <Grid item xs={12} lg={8}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Panel title="Cash & bank" hint="Click an account for its ledger"
                                    action={<LinkButton onClick={() => navigate("/accounting/bank/reconciliation")}>Reconcile</LinkButton>}>
                                    {base.loading ? [...Array(3)].map((_, i) => <Skeleton key={i} height={36} />) : cashBank.length ? (
                                        <Stack divider={<Box sx={{ borderTop: `1px solid ${T.ruleSoft}` }} />}>
                                            {cashBank.map((l) => (
                                                <Stack key={l.id} direction="row" justifyContent="space-between" alignItems="center" onClick={() => openLedger(l.id)}
                                                    sx={{ py: 1, cursor: "pointer", "&:hover": { bgcolor: T.ground }, px: 0.5, borderRadius: 1 }}>
                                                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: T.ink }}>{l.name}</Typography>
                                                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, fontVariantNumeric: "tabular-nums",
                                                        color: l.balance < 0 ? STATUS.critical : T.ink }}>{fmtBalance(l.balance)}</Typography>
                                                </Stack>
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography sx={{ fontSize: "0.8125rem", color: T.ink3 }}>
                                            No ledger is marked as a bank or cash account yet. Tick "Bank account" or "Cash account" on the ledger in the Chart of Accounts.
                                        </Typography>
                                    )}
                                </Panel>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Panel title="Who owes you most" hint="Largest outstanding customer balances"
                                    action={<LinkButton onClick={() => navigate("/accounting/reports/debtors-ageing")}>Ageing</LinkButton>}>
                                    {base.loading ? [...Array(3)].map((_, i) => <Skeleton key={i} height={36} />) : topDebtors.length ? (
                                        <Stack divider={<Box sx={{ borderTop: `1px solid ${T.ruleSoft}` }} />}>
                                            {topDebtors.map((d) => (
                                                <Stack key={d.ledgerId} direction="row" justifyContent="space-between" alignItems="center" onClick={() => openLedger(d.ledgerId)}
                                                    sx={{ py: 1, cursor: "pointer", "&:hover": { bgcolor: T.ground }, px: 0.5, borderRadius: 1, gap: 1 }}>
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.partyName}</Typography>
                                                        {num(d.days90Plus) > 0 && (
                                                            <Typography sx={{ fontSize: "0.6875rem", color: STATUS.warningInk }}>{fmtCompact(d.days90Plus)} over 90 days</Typography>
                                                        )}
                                                    </Box>
                                                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: T.ink, whiteSpace: "nowrap" }}>{fmtCompact(d.total)}</Typography>
                                                </Stack>
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography sx={{ fontSize: "0.8125rem", color: T.ink3 }}>No customer owes you anything.</Typography>
                                    )}
                                </Panel>
                            </Grid>
                            <Grid item xs={12}>
                                <Panel title="Latest entries" hint="The last 30 days, newest first — click one to open it"
                                    action={<LinkButton onClick={() => navigate("/accounting/reports/day-book")}>Day Book</LinkButton>}>
                                    {base.loading ? [...Array(4)].map((_, i) => <Skeleton key={i} height={36} />) : recent.length ? (
                                        <Box sx={{ ...TABLE.container, overflowX: "auto" }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={TABLE.head}>Date</TableCell>
                                                        <TableCell sx={TABLE.head}>Voucher</TableCell>
                                                        <TableCell sx={TABLE.head}>Narration</TableCell>
                                                        <TableCell sx={TABLE.head}>From</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {recent.map((v) => {
                                                        const src = sourceDoc(v.sourceDocType, v.sourceDocId);
                                                        return (
                                                            <TableRow key={v.id} onClick={() => navigate(voucherPath(v.id))} sx={TABLE.row}>
                                                                <TableCell sx={{ ...TABLE.cell, whiteSpace: "nowrap", color: T.ink2 }}>{fmtDate(v.date)}</TableCell>
                                                                <TableCell sx={{ ...TABLE.cell, whiteSpace: "nowrap" }}>
                                                                    <TypeBadge type={v.voucherType} />
                                                                    <Box component="span" sx={{ ml: 1, fontFamily: "monospace", fontWeight: 700, color: T.accent }}>{v.voucherNumber}</Box>
                                                                </TableCell>
                                                                <TableCell sx={{ ...TABLE.cell, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.narration || "—"}</TableCell>
                                                                <TableCell sx={{ ...TABLE.cell, color: T.ink2, whiteSpace: "nowrap" }}>{src ? src.label : "Entered by hand"}</TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </Box>
                                    ) : (
                                        <Typography sx={{ fontSize: "0.8125rem", color: T.ink3 }}>Nothing entered in the last 30 days.</Typography>
                                    )}
                                </Panel>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>

                <Typography sx={{ ...EYEBROW, mt: 3, textAlign: "center" }}>
                    <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> find a ledger or report · <Kbd>F4</Kbd>–<Kbd>F7</Kbd> new voucher
                </Typography>
            </ModuleBody>
        </Box>
    );
};

export default AccountingHome;
