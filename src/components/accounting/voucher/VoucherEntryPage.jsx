import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert, Box, Button, CircularProgress, IconButton, Paper, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { CheckCircleOutlined, DeleteOutlined, ListAltOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listLedgers } from "../../../services/accounting/accountingCoaService";
import { postContra, postJournal, postPayment, postReceipt } from "../../../services/accounting/accountingVoucherService";
import {
    Kbd, LedgerPicker, fmtBalance, fmtDate, fmtMoney, parseAmount, todayStr, useLedgerBalances,
} from "../common/accountingUi";
import { StatusChip, voucherPath } from "./VoucherDetailPage";

/*
 * One screen for every manual voucher, laid out the way a Tally operator works: pick the type with
 * its function key, Enter walks the fields, each ledger shows its current balance, Ctrl+S saves and
 * the form stays open for the next entry with the date and bank kept.
 */

const TYPES = {
    contra: {
        key: "F4", label: "Contra", color: "#7c3aed",
        hint: "Money moved between your own bank and cash accounts",
        accountLabel: "From (bank / cash)", partyLabel: "To (bank / cash)",
    },
    payment: {
        key: "F5", label: "Payment", color: "#d97706",
        hint: "Money paid out of a bank or cash account",
        accountLabel: "Paid from (bank / cash)", partyLabel: "Paid to",
    },
    receipt: {
        key: "F6", label: "Receipt", color: "#16a34a",
        hint: "Money received into a bank or cash account",
        accountLabel: "Received into (bank / cash)", partyLabel: "Received from",
    },
    journal: {
        key: "F7", label: "Journal", color: "#2563eb",
        hint: "Adjustments and transfers between any accounts — debits must equal credits",
    },
};
const KEY_TO_TYPE = { F4: "contra", F5: "payment", F6: "receipt", F7: "journal" };

// The DTO's boolean `isBankAccount` serialises as `bankAccount`; read both so either works.
const isBankOrCash = (l) => Boolean(l.isBankAccount ?? l.bankAccount) || Boolean(l.isCashAccount ?? l.cashAccount);
const isCash = (l) => Boolean(l.isCashAccount ?? l.cashAccount);

// The list of vouchers saved this sitting outlives a trip to a voucher and back.
const POSTED_KEY = "ngm.accounting.voucherEntry.posted";
const readPosted = () => {
    try { return JSON.parse(sessionStorage.getItem(POSTED_KEY)) || []; } catch { return []; }
};
const writePosted = (list) => {
    try { sessionStorage.setItem(POSTED_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
};

let keySeq = 0;
const newLine = (dr = "", cr = "") => ({ key: ++keySeq, ledger: null, dr, cr });

const amountBoxSx = (big) => ({
    "& input": { textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: big ? "1.125rem" : "0.8125rem", fontWeight: big ? 700 : 500 },
});

const focusSoon = (el) => setTimeout(() => el?.focus(), 0);

const VoucherEntryPage = () => {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const type = TYPES[params.get("type")] ? params.get("type") : "payment";
    const meta = TYPES[type];

    const [ledgers, setLedgers] = useState([]);
    const [date, setDate] = useState(todayStr);
    const { balanceOf, reload: reloadBalances } = useLedgerBalances(date);

    // Payment / Receipt / Contra
    const [account, setAccount] = useState(null);
    const [party, setParty] = useState(null);
    const [amount, setAmount] = useState("");
    // Journal
    const [lines, setLines] = useState(() => [newLine(), newLine()]);

    const [narration, setNarration] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [posted, setPosted] = useState(readPosted);

    const dateRef = useRef(null);
    const accountRef = useRef(null);
    const partyRef = useRef(null);
    const amountRef = useRef(null);
    const narrationRef = useRef(null);
    const saveRef = useRef(null);
    const lineRefs = useRef({});

    useEffect(() => { listLedgers().then((l) => setLedgers(l || [])).catch(() => {}); }, []);

    const bankCash = useMemo(() => {
        const bc = ledgers.filter(isBankOrCash);
        return bc.length ? bc : ledgers; // no ledger flagged as bank/cash yet: offer them all rather than nothing
    }, [ledgers]);
    const partyOptions = useMemo(() => {
        const base = type === "contra" ? bankCash : ledgers;
        return account ? base.filter((l) => l.id !== account.id) : base;
    }, [type, bankCash, ledgers, account]);

    const lineRef = (key, field) => (el) => {
        lineRefs.current[key] = { ...(lineRefs.current[key] || {}), [field]: el };
    };
    const focusLine = (key, field) => focusSoon(lineRefs.current[key]?.[field]);

    const switchType = useCallback((t) => {
        setParams({ type: t }, { replace: true });
        setError("");
        setParty(null);
        if (t === "contra" && account && !isBankOrCash(account)) setAccount(null);
    }, [setParams, account]);

    // Put the cursor where the operator would start: the bank if none is chosen yet, else the party.
    useEffect(() => {
        if (type === "journal") { const first = lines[0]; if (first) focusLine(first.key, "ledger"); }
        else focusSoon(account ? partyRef.current : accountRef.current);
    }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Journal arithmetic ────────────────────────────────────────────────
    const totals = useMemo(() => {
        const dr = lines.reduce((s, l) => s + parseAmount(l.dr), 0);
        const cr = lines.reduce((s, l) => s + parseAmount(l.cr), 0);
        return { dr, cr, diff: dr - cr };
    }, [lines]);
    const balanced = totals.dr > 0 && Math.abs(totals.diff) < 0.005;

    const setLine = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    const removeLine = (key) => setLines((prev) => (prev.length > 2 ? prev.filter((l) => l.key !== key) : prev));

    /** Moves on from a journal line: to the next line, adding one that carries the difference if still unbalanced. */
    const advanceFromLine = (key) => {
        const idx = lines.findIndex((l) => l.key === key);
        const next = lines[idx + 1];
        const d = Math.round(totals.diff * 100) / 100;
        if (next) {
            // An untouched next line takes the difference on the side that balances, as in Tally.
            if (!balanced && !next.ledger && !parseAmount(next.dr) && !parseAmount(next.cr)) {
                setLine(next.key, d > 0 ? { cr: String(d), dr: "" } : { dr: String(-d), cr: "" });
            }
            focusLine(next.key, "ledger");
            return;
        }
        if (balanced) { focusSoon(narrationRef.current); return; }
        const line = d > 0 ? newLine("", String(d)) : newLine(String(-d), "");
        setLines((prev) => [...prev, line]);
        focusLine(line.key, "ledger");
    };

    // ── Save ──────────────────────────────────────────────────────────────
    const reset = () => {
        setParty(null);
        setAmount("");
        setNarration("");
        setLines([newLine(), newLine()]);
        setError("");
    };

    const save = async () => {
        if (saving) return;
        setError("");
        if (!date) { setError("Enter the voucher date."); return; }
        let request;
        let summary;
        if (type === "journal") {
            const used = lines.filter((l) => l.ledger || parseAmount(l.dr) || parseAmount(l.cr));
            if (used.length < 2) { setError("A journal needs at least two lines."); return; }
            if (used.some((l) => !l.ledger)) { setError("Every line with an amount needs an account."); return; }
            if (used.some((l) => parseAmount(l.dr) && parseAmount(l.cr))) { setError("A line can be debit or credit, not both."); return; }
            if (!balanced) { setError(`Debits and credits differ by ${fmtMoney(Math.abs(totals.diff))}.`); return; }
            request = () => postJournal({
                date,
                narration: narration.trim() || undefined,
                lines: used.map((l) => ({ ledgerAccountId: l.ledger.id, drAmount: parseAmount(l.dr), crAmount: parseAmount(l.cr) })),
            });
            summary = `${used.length} lines`;
        } else {
            const amt = parseAmount(amount);
            if (!account) { setError("Choose the bank or cash account."); focusSoon(accountRef.current); return; }
            if (!party) {
                setError({
                    payment: "Choose who it was paid to.",
                    receipt: "Choose who it was received from.",
                    contra: "Choose the account the money goes to.",
                }[type]);
                focusSoon(partyRef.current);
                return;
            }
            if (amt <= 0) { setError("Enter an amount greater than zero."); focusSoon(amountRef.current); return; }
            const n = narration.trim() || undefined;
            request = {
                payment: () => postPayment({ date, bankOrCashAccountId: account.id, toAccountId: party.id, amount: amt, narration: n }),
                receipt: () => postReceipt({ date, bankOrCashAccountId: account.id, fromAccountId: party.id, amount: amt, narration: n }),
                contra:  () => postContra({ date, fromAccountId: account.id, toAccountId: party.id, amount: amt, narration: n }),
            }[type];
            summary = party.name;
        }

        setSaving(true);
        try {
            const v = await request();
            setPosted((prev) => {
                const next = [{ id: v.id, voucherNumber: v.voucherNumber, date: v.date, totalDr: v.totalDr, status: v.status, summary }, ...prev].slice(0, 8);
                writePosted(next);
                return next;
            });
            savedOnce.current = true;
            reset();
            reloadBalances();
            if (type !== "journal") focusSoon(partyRef.current);
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || "The voucher could not be saved.");
        } finally {
            setSaving(false);
        }
    };

    // After a journal saves, the new first line only exists after render — focus it then.
    useEffect(() => {
        if (type === "journal" && posted.length && savedOnce.current) focusLine(lines[0]?.key, "ledger");
    }, [posted]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Keyboard ──────────────────────────────────────────────────────────
    const savedOnce = useRef(false);
    const saveRefFn = useRef(save);
    saveRefFn.current = save;
    useEffect(() => {
        const onKey = (e) => {
            if (KEY_TO_TYPE[e.key] && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                switchType(KEY_TO_TYPE[e.key]);
            } else if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S" || e.key === "Enter")) {
                e.preventDefault();
                saveRefFn.current();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [switchType]);

    /** Enter on a field moves to the next one; an open ledger list handles its own Enter first. */
    const enterTo = (next) => (e) => {
        if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.defaultPrevented || e.shiftKey) return;
        e.preventDefault();
        next();
    };

    // ── Projected balances (Payment / Receipt / Contra) ───────────────────
    const amt = parseAmount(amount);
    const accountAfter = account ? balanceOf(account.id) + (type === "receipt" ? amt : -amt) : 0;
    const overdrawn = account && amt > 0 && accountAfter < -0.005;

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
            <Box sx={{ maxWidth: 980 }}>
                {/* Title + type switcher */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 2, gap: 2, flexWrap: "wrap" }}>
                    <Box>
                        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                            New Voucher
                        </Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>{meta.hint}</Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => navigate("/accounting/vouchers")}
                        startIcon={<ListAltOutlined sx={{ fontSize: 15 }} />}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, borderColor: "#e2e8f0", color: "#64748b" }}>
                        Voucher Register
                    </Button>
                </Stack>

                <Stack direction="row" sx={{ mb: 2, bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, p: 0.5, gap: 0.5, flexWrap: "wrap" }}>
                    {Object.entries(TYPES).map(([k, t]) => {
                        const on = k === type;
                        return (
                            <Button key={k} onClick={() => switchType(k)} disableElevation
                                sx={{ flex: 1, minWidth: 120, textTransform: "none", borderRadius: 1.5, py: 1,
                                    fontWeight: 700, fontSize: "0.875rem",
                                    bgcolor: on ? t.color : "transparent", color: on ? "#fff" : "#475569",
                                    "&:hover": { bgcolor: on ? t.color : "#f1f5f9" } }}>
                                <Box component="span" sx={{ mr: 1, fontSize: "0.6875rem", fontFamily: "'IBM Plex Mono', monospace", opacity: on ? 0.85 : 0.6 }}>{t.key}</Box>
                                {t.label}
                            </Button>
                        );
                    })}
                </Stack>

                <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid #e2e8f0", borderTop: `3px solid ${meta.color}`, bgcolor: "#fff" }}>
                    <Box sx={{ p: { xs: 2, md: 3 } }}>
                        {/* Date */}
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                            <TextField label="Date" type="date" size="small" value={date} inputRef={dateRef}
                                onChange={(e) => setDate(e.target.value)}
                                onKeyDown={enterTo(() => (type === "journal" ? focusLine(lines[0].key, "ledger") : accountRef.current?.focus()))}
                                InputLabelProps={{ shrink: true }} sx={{ width: 180 }} />
                            <Typography sx={{ fontSize: "0.8125rem", color: "#64748b" }}>
                                {date && new Date(`${date}T00:00`).toLocaleDateString("en-IN", { weekday: "long" })}
                                <Box component="span" sx={{ mx: 1, color: "#cbd5e1" }}>·</Box>
                                Number assigned on save
                            </Typography>
                        </Stack>

                        {type !== "journal" ? (
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
                                <Box onKeyDown={enterTo(() => partyRef.current?.focus())}>
                                    <LedgerPicker ledgers={bankCash} value={account} onChange={setAccount}
                                        onPicked={() => focusSoon(partyRef.current)}
                                        label={meta.accountLabel} balanceOf={balanceOf} inputRef={accountRef}
                                        helper="Kept for the next voucher" />
                                </Box>
                                <Box onKeyDown={enterTo(() => amountRef.current?.focus())}>
                                    <LedgerPicker ledgers={partyOptions} value={party} onChange={setParty}
                                        onPicked={() => focusSoon(amountRef.current)}
                                        label={meta.partyLabel} balanceOf={balanceOf} inputRef={partyRef}
                                        helper="Start typing a ledger name" />
                                </Box>
                                <Box>
                                    <TextField label="Amount" size="small" fullWidth value={amount} inputRef={amountRef}
                                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                                        onKeyDown={enterTo(() => narrationRef.current?.focus())}
                                        inputProps={{ inputMode: "decimal", autoComplete: "off" }}
                                        InputProps={{ startAdornment: <Box component="span" sx={{ mr: 0.5, color: "#64748b" }}>₹</Box> }}
                                        sx={amountBoxSx(true)} />
                                    <Typography sx={{ fontSize: "0.75rem", mt: 0.5, minHeight: 18, color: overdrawn ? "#dc2626" : "#64748b" }}>
                                        {account && amt > 0 && (
                                            <>
                                                {overdrawn && <WarningAmberOutlined sx={{ fontSize: 13, mr: 0.5, verticalAlign: "-2px" }} />}
                                                {account.name} after this: <b>{fmtBalance(accountAfter)}</b>
                                                {overdrawn && (isCash(account) ? " — cash cannot go below zero" : " — overdrawn")}
                                            </>
                                        )}
                                    </Typography>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 150px 150px 36px", gap: 1, px: 1.5, py: 1, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                    {["Particulars", "Debit", "Credit", ""].map((h, i) => (
                                        <Typography key={i} sx={{ fontSize: "0.65625rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, textAlign: i === 1 || i === 2 ? "right" : "left" }}>{h}</Typography>
                                    ))}
                                </Box>
                                {lines.map((l) => (
                                    <Box key={l.key} sx={{ display: "grid", gridTemplateColumns: "1fr 150px 150px 36px", gap: 1, px: 1.5, py: 0.75, alignItems: "start", borderBottom: "1px solid #f1f5f9" }}>
                                        <Box onKeyDown={enterTo(() => focusLine(l.key, parseAmount(l.cr) ? "cr" : "dr"))}>
                                            <LedgerPicker dense ledgers={ledgers} value={l.ledger} placeholder="Search ledger…"
                                                onChange={(v) => setLine(l.key, { ledger: v })}
                                                onPicked={() => focusLine(l.key, parseAmount(l.cr) ? "cr" : "dr")}
                                                balanceOf={balanceOf} inputRef={lineRef(l.key, "ledger")} />
                                            {l.ledger && (
                                                <Typography sx={{ fontSize: "0.6875rem", color: "#64748b", mt: 0.25, pl: 0.25 }}>
                                                    Current balance {fmtBalance(balanceOf(l.ledger.id))}
                                                </Typography>
                                            )}
                                        </Box>
                                        <TextField size="small" placeholder="0.00" value={l.dr} inputRef={lineRef(l.key, "dr")}
                                            onChange={(e) => setLine(l.key, { dr: e.target.value.replace(/[^0-9.,]/g, ""), cr: "" })}
                                            onKeyDown={enterTo(() => (parseAmount(l.dr) ? advanceFromLine(l.key) : focusLine(l.key, "cr")))}
                                            inputProps={{ inputMode: "decimal", autoComplete: "off" }} sx={amountBoxSx(false)} />
                                        <TextField size="small" placeholder="0.00" value={l.cr} inputRef={lineRef(l.key, "cr")}
                                            onChange={(e) => setLine(l.key, { cr: e.target.value.replace(/[^0-9.,]/g, ""), dr: "" })}
                                            onKeyDown={enterTo(() => advanceFromLine(l.key))}
                                            inputProps={{ inputMode: "decimal", autoComplete: "off" }} sx={amountBoxSx(false)} />
                                        <Tooltip title="Remove line">
                                            <span>
                                                <IconButton size="small" tabIndex={-1} onClick={() => removeLine(l.key)} disabled={lines.length <= 2}
                                                    sx={{ mt: 0.25, color: "#94a3b8", "&:hover": { color: "#ef4444", bgcolor: "#fef2f2" } }}>
                                                    <DeleteOutlined sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                ))}
                                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 150px 150px 36px", gap: 1, px: 1.5, py: 1.25, bgcolor: balanced ? "#f0fdf4" : "#f8fafc", alignItems: "center" }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Button size="small" onClick={() => { const nl = newLine(); setLines((p) => [...p, nl]); focusLine(nl.key, "ledger"); }}
                                            sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.75rem", color: "#2563eb" }}>
                                            + Add line
                                        </Button>
                                        {totals.dr > 0 && (balanced ? (
                                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#16a34a" }}>
                                                <CheckCircleOutlined sx={{ fontSize: 14, mr: 0.5, verticalAlign: "-3px" }} />Balanced
                                            </Typography>
                                        ) : (
                                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#d97706" }}>
                                                Difference {fmtMoney(Math.abs(totals.diff))} {totals.diff > 0 ? "Dr" : "Cr"}
                                            </Typography>
                                        ))}
                                    </Stack>
                                    <Typography sx={{ textAlign: "right", fontWeight: 700, fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums", pr: 1.75 }}>{fmtMoney(totals.dr)}</Typography>
                                    <Typography sx={{ textAlign: "right", fontWeight: 700, fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums", pr: 1.75 }}>{fmtMoney(totals.cr)}</Typography>
                                    <span />
                                </Box>
                            </Box>
                        )}

                        <TextField label="Narration" size="small" fullWidth value={narration} inputRef={narrationRef}
                            onChange={(e) => setNarration(e.target.value)}
                            onKeyDown={enterTo(() => saveRef.current?.focus())}
                            placeholder="What was this for? e.g. cheque no., bill no."
                            sx={{ mt: 3 }} />

                        {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>{error}</Alert>}
                    </Box>

                    {/* Action bar */}
                    <Stack direction="row" alignItems="center" spacing={1.5}
                        sx={{ px: { xs: 2, md: 3 }, py: 1.5, borderTop: "1px solid #f1f5f9", bgcolor: "#fafafa", borderRadius: "0 0 8px 8px", flexWrap: "wrap", rowGap: 1 }}>
                        <Button ref={saveRef} variant="contained" disableElevation onClick={save} disabled={saving}
                            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
                            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 3, bgcolor: meta.color, "&:hover": { bgcolor: meta.color, filter: "brightness(0.92)" },
                                "&:focus-visible": { outline: `3px solid ${meta.color}55`, outlineOffset: 2 } }}>
                            {saving ? "Saving…" : `Save ${meta.label}`}
                        </Button>
                        <Button size="small" onClick={reset} sx={{ textTransform: "none", fontWeight: 600, color: "#64748b", borderRadius: 2 }}>Clear</Button>
                        <Box sx={{ flex: 1 }} />
                        <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8" }}>
                            <Kbd>Enter</Kbd> next field · <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save · <Kbd>F4</Kbd>–<Kbd>F7</Kbd> voucher type
                        </Typography>
                    </Stack>
                </Paper>

                {/* Entries saved in this sitting — replaces the old success screen so entry never stops */}
                {posted.length > 0 && (
                    <Paper elevation={0} sx={{ mt: 2, borderRadius: 2, border: "1px solid #e2e8f0", bgcolor: "#fff", overflow: "hidden" }}>
                        <Typography sx={{ px: 2, py: 1.25, fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #f1f5f9" }}>
                            Saved just now
                        </Typography>
                        {posted.map((v) => (
                            <Stack key={v.id} direction="row" alignItems="center" spacing={2} onClick={() => navigate(voucherPath(v.id))}
                                sx={{ px: 2, py: 1, cursor: "pointer", borderBottom: "1px solid #f8fafc", "&:hover": { bgcolor: "#f8fafc" } }}>
                                <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", fontWeight: 700, color: "#2563eb", minWidth: 140 }}>{v.voucherNumber}</Typography>
                                <Typography sx={{ fontSize: "0.75rem", color: "#64748b", minWidth: 90 }}>{fmtDate(v.date)}</Typography>
                                <Typography sx={{ fontSize: "0.8125rem", color: "#0f172a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.summary}</Typography>
                                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(v.totalDr)}</Typography>
                                <StatusChip status={v.status} />
                            </Stack>
                        ))}
                    </Paper>
                )}
            </Box>
        </Box>
    );
};

export default VoucherEntryPage;
