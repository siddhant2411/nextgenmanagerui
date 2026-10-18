import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    Grid, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Typography,
} from "@mui/material";
import { OpenInNewOutlined, ReplayOutlined } from "@mui/icons-material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getVoucher, reverseVoucher } from "../../../services/accounting/accountingVoucherService";
import { getAuditHistory } from "../../../services/accounting/auditTrailService";
import ModuleHero from "../../ui/moduleshell/ModuleHero";
import ModuleBody from "../../ui/moduleshell/ModuleBody";
import { EYEBROW, T, TABLE, heroButtonSx, panelSx } from "../../../theme/moduleTokens";
import { Kbd, VOUCHER_TYPE_META, fmtDate, fmtMoney, fyStartFor, sourceDoc, todayStr, useEscBack } from "../common/accountingUi";

const STATUS_META = {
    DRAFT:            { label: "Draft",            color: "#2563eb", bg: "#eff6ff" },
    PENDING_APPROVAL: { label: "Pending Approval", color: "#d97706", bg: "#fffbeb" },
    POSTED:           { label: "Posted",           color: "#16a34a", bg: "#f0fdf4" },
    REVERSED:         { label: "Reversed",         color: "#94a3b8", bg: "#f8fafc" },
};

const chip = (m) => ({ height: 20, fontSize: "0.6875rem", fontWeight: 700, bgcolor: m.bg, color: m.color, border: `1px solid ${m.color}30` });

export const TypeChip = ({ type }) => {
    const m = VOUCHER_TYPE_META[type] || { label: type, color: "#64748b", bg: "#f8fafc" };
    return <Chip label={m.label} size="small" sx={chip(m)} />;
};

export const StatusChip = ({ status }) => {
    const m = STATUS_META[status] || { label: status, color: "#64748b", bg: "#f8fafc" };
    return <Chip label={m.label} size="small" sx={chip(m)} />;
};

/**
 * Where a report row goes when opened: the voucher's own page. Reports pass the range they were
 * showing so an account clicked here opens its ledger for the same dates.
 */
export const voucherPath = (id) => `/accounting/vouchers/${id}`;

const Fact = ({ label, children }) => (
    <Box>
        <Typography sx={EYEBROW}>{label}</Typography>
        <Box sx={{ fontSize: "0.875rem", fontWeight: 600, color: T.ink, mt: 0.5 }}>{children}</Box>
    </Box>
);

const VoucherDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const range = location.state?.ledgerRange;
    const [voucher, setVoucher] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reverseOpen, setReverseOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [reversing, setReversing] = useState(false);
    const [reverseError, setReverseError] = useState("");
    const [history, setHistory] = useState([]);

    useEscBack();

    const load = useCallback(() => {
        setLoading(true);
        setError("");
        getVoucher(id)
            .then(setVoucher)
            .catch((e) => setError(e?.response?.data?.message || "This voucher could not be loaded."))
            .finally(() => setLoading(false));
        // Who posted, approved and reversed it — from the audit trail, which nothing can edit.
        getAuditHistory("VOUCHER", id).then((h) => setHistory(h || [])).catch(() => setHistory([]));
    }, [id]);
    useEffect(() => { load(); }, [load]);

    const back = () => (location.key === "default" ? navigate("/accounting/vouchers") : navigate(-1));

    const openLedger = (line) => {
        const from = range?.from || fyStartFor(voucher.date);
        const to = range?.to || todayStr();
        navigate(`/accounting/reports/ledger?accountId=${line.ledgerAccountId}&from=${from}&to=${to}`);
    };

    const doReverse = async () => {
        if (!reason.trim()) { setReverseError("Give a reason for the reversal."); return; }
        setReversing(true);
        setReverseError("");
        try {
            await reverseVoucher(id, reason);
            setReverseOpen(false);
            load();
        } catch (e) {
            setReverseError(e?.response?.data?.message || "Reversal failed.");
        } finally {
            setReversing(false);
        }
    };

    const src = voucher ? sourceDoc(voucher.sourceDocType, voucher.sourceDocId) : null;

    return (
        <Box sx={{ bgcolor: T.ground, minHeight: "100vh" }}>
            <ModuleHero
                title={voucher?.voucherNumber || "Voucher"}
                subtitle={voucher ? `${VOUCHER_TYPE_META[voucher.voucherType]?.label || voucher.voucherType} · ${fmtDate(voucher.date)}` : " "}
                onBack={back}
                badge={voucher && <StatusChip status={voucher.status} />}
                actions={voucher?.status === "POSTED" && (
                    <Button variant="outlined" startIcon={<ReplayOutlined />} sx={heroButtonSx}
                        onClick={() => { setReason(""); setReverseError(""); setReverseOpen(true); }}>
                        Reverse
                    </Button>
                )}
            />
            <ModuleBody>
                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
                <Paper elevation={0} sx={panelSx}>
                    {loading && !voucher ? (
                        [...Array(6)].map((_, i) => <Skeleton key={i} height={36} />)
                    ) : voucher && (
                        <>
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid item xs={6} md={3}><Fact label="Type"><TypeChip type={voucher.voucherType} /></Fact></Grid>
                                <Grid item xs={6} md={3}><Fact label="Date">{fmtDate(voucher.date)}</Fact></Grid>
                                <Grid item xs={6} md={3}><Fact label="Entered by">{voucher.createdBy || "—"}</Fact></Grid>
                                <Grid item xs={6} md={3}>
                                    <Fact label="Raised by">
                                        {!src ? "Entered by hand" : src.path ? (
                                            <Button size="small" variant="outlined" endIcon={<OpenInNewOutlined sx={{ fontSize: 14 }} />}
                                                onClick={() => navigate(src.path)}
                                                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, py: 0.25, borderColor: T.rule, color: T.ink }}>
                                                {src.label}
                                            </Button>
                                        ) : src.label}
                                    </Fact>
                                </Grid>
                            </Grid>

                            {voucher.narration && (
                                <Typography sx={{ fontSize: "0.875rem", color: "#374151", bgcolor: T.ground, px: 2, py: 1.25, borderRadius: 2, border: `1px solid ${T.ruleSoft}`, mb: 2 }}>
                                    {voucher.narration}
                                </Typography>
                            )}
                            {voucher.reversalOfId && (
                                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}
                                    action={<Button size="small" onClick={() => navigate(voucherPath(voucher.reversalOfId))}>Open</Button>}>
                                    This voucher reverses another one.
                                </Alert>
                            )}
                            {voucher.reversedByVoucherId && (
                                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}
                                    action={<Button size="small" onClick={() => navigate(voucherPath(voucher.reversedByVoucherId))}>Open</Button>}>
                                    This voucher has been reversed.
                                </Alert>
                            )}

                            <TableContainer sx={TABLE.container}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={TABLE.head}>Account</TableCell>
                                            <TableCell sx={{ ...TABLE.head, textAlign: "right" }}>Debit</TableCell>
                                            <TableCell sx={{ ...TABLE.head, textAlign: "right" }}>Credit</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {voucher.lines?.map((l) => (
                                            <TableRow key={l.id} onClick={() => openLedger(l)} sx={TABLE.row}>
                                                <TableCell sx={TABLE.cell}>
                                                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: T.accent }}>{l.ledgerAccountName}</Typography>
                                                    <Typography sx={{ fontSize: "0.6875rem", color: T.ink3, fontFamily: "monospace" }}>{l.ledgerAccountCode}</Typography>
                                                    {l.narration && <Typography sx={{ fontSize: "0.6875rem", color: T.ink2, fontStyle: "italic" }}>{l.narration}</Typography>}
                                                </TableCell>
                                                <TableCell sx={{ ...TABLE.num, color: l.drAmount > 0 ? T.ink : "#cbd5e1" }}>{l.drAmount > 0 ? fmtMoney(l.drAmount) : "—"}</TableCell>
                                                <TableCell sx={{ ...TABLE.num, color: l.crAmount > 0 ? T.ink : "#cbd5e1" }}>{l.crAmount > 0 ? fmtMoney(l.crAmount) : "—"}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow sx={{ bgcolor: T.ground }}>
                                            <TableCell sx={{ ...TABLE.cell, fontWeight: 800, color: T.ink }}>Total</TableCell>
                                            <TableCell sx={{ ...TABLE.num, fontWeight: 800 }}>{fmtMoney(voucher.totalDr)}</TableCell>
                                            <TableCell sx={{ ...TABLE.num, fontWeight: 800 }}>{fmtMoney(voucher.totalCr)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            {history.length > 0 && (
                                <Box sx={{ mt: 3 }}>
                                    <Typography sx={{ ...EYEBROW, mb: 1 }}>History</Typography>
                                    {history.map((h) => (
                                        <Stack key={h.id} direction="row" spacing={1.5} sx={{ py: 0.5, fontSize: "0.8125rem" }}>
                                            <Box sx={{ color: T.ink3, minWidth: 150, whiteSpace: "nowrap" }}>
                                                {new Date(h.eventTime).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </Box>
                                            <Box sx={{ fontWeight: 600, color: T.ink, minWidth: 100 }}>{h.username || "—"}</Box>
                                            <Box sx={{ color: "#475569" }}>{h.summary}</Box>
                                        </Stack>
                                    ))}
                                </Box>
                            )}
                            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5 }}>
                                <Typography sx={{ fontSize: "0.75rem", color: T.ink3 }}>Click an account to open its ledger.</Typography>
                                <Typography sx={{ fontSize: "0.75rem", color: T.ink3 }}><Kbd>Esc</Kbd> back</Typography>
                            </Stack>
                        </>
                    )}
                </Paper>
            </ModuleBody>

            <Dialog open={reverseOpen} onClose={() => setReverseOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, fontSize: "0.9375rem" }}>Reverse {voucher?.voucherNumber}</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: "0.8125rem", color: "#475569", mb: 2 }}>
                        A counter-entry is posted that undoes every line, and this voucher is marked Reversed. This cannot be undone.
                    </Typography>
                    <TextField label="Reason" size="small" fullWidth required multiline rows={2} autoFocus
                        value={reason} onChange={(e) => { setReason(e.target.value); setReverseError(""); }}
                        error={!!reverseError} helperText={reverseError} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={() => setReverseOpen(false)} size="small" sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}>Cancel</Button>
                    <Button onClick={doReverse} variant="contained" disableElevation size="small" disabled={reversing}
                        startIcon={reversing ? <CircularProgress size={13} color="inherit" /> : null}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 2, bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" } }}>
                        Reverse voucher
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default VoucherDetailPage;
