import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Dialog, InputBase, Stack, Typography } from "@mui/material";
import { AddOutlined, ArticleOutlined, MenuBookOutlined, SearchOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { MODULES } from "../../../config/modules";
import { listLedgers } from "../../../services/accounting/accountingCoaService";
import { Kbd, fyStartFor, todayStr } from "./accountingUi";

/*
 * Ctrl+K anywhere in Accounting: type a few letters and jump to a ledger, a report or a new
 * voucher — Tally's "Go To" without having to remember where the menu put it.
 */

const OPEN_EVENT = "ngm:accounting-search";
export const openAccountingSearch = () => window.dispatchEvent(new Event(OPEN_EVENT));

const VOUCHER_ACTIONS = [
    { label: "New Payment", hint: "F5", path: "/accounting/vouchers/new?type=payment", words: "pay paid voucher" },
    { label: "New Receipt", hint: "F6", path: "/accounting/vouchers/new?type=receipt", words: "receive received voucher" },
    { label: "New Contra", hint: "F4", path: "/accounting/vouchers/new?type=contra", words: "transfer bank cash voucher" },
    { label: "New Journal", hint: "F7", path: "/accounting/vouchers/new?type=journal", words: "jv adjustment voucher" },
];

/** Every screen in the accounting nav, flattened, with the section it lives in. */
const pages = () => {
    const nav = MODULES.find((m) => m.key === "accounting")?.nav || [];
    return nav.flatMap((s) => (s.children
        ? s.children.map((c) => ({ kind: "page", label: c.text, hint: s.text, path: c.path, words: s.text }))
        : [{ kind: "page", label: s.text, hint: "", path: s.path, words: "" }]));
};

const score = (item, q) => {
    const label = item.label.toLowerCase();
    if (label.startsWith(q)) return 3;
    if (label.split(/\s+/).some((w) => w.startsWith(q))) return 2;
    if (`${label} ${item.words || ""} ${item.hint || ""}`.toLowerCase().includes(q)) return 1;
    return 0;
};

const KIND = {
    action: { Icon: AddOutlined, title: "Create" },
    page: { Icon: ArticleOutlined, title: "Go to" },
    ledger: { Icon: MenuBookOutlined, title: "Ledgers" },
};

const AccountingSearch = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [active, setActive] = useState(0);
    const [ledgers, setLedgers] = useState(null);
    const listRef = useRef(null);

    useEffect(() => {
        const show = () => { setOpen(true); setQ(""); setActive(0); };
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
                e.preventDefault();
                show();
            }
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener(OPEN_EVENT, show);
        return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_EVENT, show); };
    }, []);

    // Ledgers are fetched the first time the box opens, then kept.
    useEffect(() => {
        if (open && ledgers === null) listLedgers().then((l) => setLedgers(l || [])).catch(() => setLedgers([]));
    }, [open, ledgers]);

    const results = useMemo(() => {
        const query = q.trim().toLowerCase();
        const actions = VOUCHER_ACTIONS.map((a) => ({ ...a, kind: "action" }));
        const pageItems = pages();
        if (!query) return [...actions, ...pageItems.slice(0, 8)];
        const today = todayStr();
        const ledgerItems = (ledgers || []).map((l) => ({
            kind: "ledger", label: l.name, hint: l.groupName || "", words: l.code,
            path: `/accounting/reports/ledger?accountId=${l.id}&from=${fyStartFor(today)}&to=${today}`,
        }));
        const rank = (items, max) => items
            .map((it) => ({ it, s: score(it, query) }))
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s || a.it.label.localeCompare(b.it.label))
            .slice(0, max)
            .map((x) => x.it);
        return [...rank(actions, 4), ...rank(pageItems, 6), ...rank(ledgerItems, 12)];
    }, [q, ledgers]);

    useEffect(() => { setActive(0); }, [q]);
    useEffect(() => {
        listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active]);

    const go = (item) => {
        if (!item) return;
        setOpen(false);
        navigate(item.path);
    };

    const onKeyDown = (e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
    };

    let lastKind = null;
    return (
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"
            PaperProps={{ sx: { borderRadius: 3, position: "absolute", top: "12vh", m: 2, overflow: "hidden" } }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2, py: 1.5, borderBottom: "1px solid #e2e8f0" }}>
                <SearchOutlined sx={{ color: "#94a3b8" }} />
                <InputBase autoFocus fullWidth value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
                    placeholder="Find a ledger, report or voucher type…" sx={{ fontSize: "1rem" }} />
                <Kbd>Esc</Kbd>
            </Stack>
            <Box ref={listRef} sx={{ maxHeight: "55vh", overflowY: "auto", py: 0.5 }}>
                {results.length === 0 && (
                    <Typography sx={{ px: 2, py: 3, fontSize: "0.875rem", color: "#94a3b8", textAlign: "center" }}>
                        {ledgers === null ? "Loading ledgers…" : `Nothing matches “${q}”.`}
                    </Typography>
                )}
                {results.map((item, i) => {
                    const heading = item.kind !== lastKind ? KIND[item.kind].title : null;
                    lastKind = item.kind;
                    const { Icon } = KIND[item.kind];
                    const on = i === active;
                    return (
                        <React.Fragment key={`${item.kind}-${item.path}`}>
                            {heading && (
                                <Typography sx={{ px: 2, pt: 1.25, pb: 0.5, fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                    {heading}
                                </Typography>
                            )}
                            <Stack direction="row" alignItems="center" spacing={1.5} data-idx={i}
                                onMouseMove={() => setActive(i)} onClick={() => go(item)}
                                sx={{ mx: 1, px: 1.25, py: 0.9, borderRadius: 1.5, cursor: "pointer", bgcolor: on ? "#ecfdf5" : "transparent" }}>
                                <Icon sx={{ fontSize: 18, color: on ? "#059669" : "#94a3b8" }} />
                                <Typography sx={{ flex: 1, fontSize: "0.875rem", fontWeight: on ? 700 : 500, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {item.label}
                                </Typography>
                                {item.hint && (item.kind === "action"
                                    ? <Kbd>{item.hint}</Kbd>
                                    : <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", whiteSpace: "nowrap" }}>{item.hint}</Typography>)}
                            </Stack>
                        </React.Fragment>
                    );
                })}
            </Box>
            <Stack direction="row" spacing={2} sx={{ px: 2, py: 1, borderTop: "1px solid #f1f5f9", bgcolor: "#f8fafc" }}>
                <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8" }}><Kbd>↑</Kbd><Kbd>↓</Kbd> move</Typography>
                <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8" }}><Kbd>Enter</Kbd> open</Typography>
            </Stack>
        </Dialog>
    );
};

export default AccountingSearch;
