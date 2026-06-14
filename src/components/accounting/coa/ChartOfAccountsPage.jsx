import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    InputAdornment,
    Paper,
    Skeleton,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    AccountBalanceOutlined,
    AddCircleOutline,
    ChevronRight,
    DeleteOutlined,
    DescriptionOutlined,
    EditOutlined,
    ExpandMore,
    FolderOpenOutlined,
    FolderOutlined,
    SearchOutlined,
} from "@mui/icons-material";
import {
    createGroup,
    createLedger,
    deleteGroup,
    deleteLedger,
    getCoaTree,
    getLedger,
    listGroups,
    updateGroup,
    updateLedger,
} from "../../../services/accounting/accountingCoaService";
import GroupFormDialog from "./GroupFormDialog";
import LedgerFormDialog from "./LedgerFormDialog";

// ─── Constants ────────────────────────────────────────────────────────────────

const NATURE_META = {
    ASSET:     { label: "Assets",      color: "#3b82f6", bg: "#eff6ff" },
    LIABILITY: { label: "Liabilities", color: "#ef4444", bg: "#fef2f2" },
    EQUITY:    { label: "Equity",      color: "#8b5cf6", bg: "#f5f3ff" },
    INCOME:    { label: "Income",      color: "#10b981", bg: "#f0fdf4" },
    EXPENSE:   { label: "Expenses",    color: "#f59e0b", bg: "#fffbeb" },
};

const NATURE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const countLedgers = (nodes) =>
    nodes.reduce((acc, n) => {
        if (n.nodeType === "LEDGER") return acc + 1;
        return acc + countLedgers(n.children || []);
    }, 0);

const countLedgersWithFlag = (nodes, flag) =>
    nodes.reduce((acc, n) => {
        if (n.nodeType === "LEDGER") return acc + (n[flag] ? 1 : 0);
        return acc + countLedgersWithFlag(n.children || [], flag);
    }, 0);

const countSubLedgers = (nodes) =>
    nodes.reduce((acc, n) => {
        if (n.nodeType === "LEDGER") return acc + (n.subLedgerType && n.subLedgerType !== "NONE" ? 1 : 0);
        return acc + countSubLedgers(n.children || []);
    }, 0);

const filterTree = (nodes, query) => {
    if (!query) return nodes;
    const q = query.toLowerCase();
    return nodes.reduce((acc, node) => {
        if (node.nodeType === "LEDGER") {
            if (node.code.toLowerCase().includes(q) || node.name.toLowerCase().includes(q)) acc.push(node);
        } else {
            const filteredChildren = filterTree(node.children || [], q);
            const selfMatches =
                node.code.toLowerCase().includes(q) || node.name.toLowerCase().includes(q);
            if (selfMatches || filteredChildren.length > 0) {
                acc.push({ ...node, children: selfMatches ? node.children : filteredChildren });
            }
        }
        return acc;
    }, []);
};

// ─── Stat card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, accent = "#1e293b", loading }) => (
    <Paper
        elevation={0}
        sx={{
            flex: 1,
            minWidth: 150,
            p: "11px 14px",
            borderRadius: 1.5,
            border: "1px solid #e2e8f0",
            borderLeft: `3px solid ${accent}`,
            bgcolor: "#fff",
            transition: "box-shadow 0.15s",
            "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.07)" },
        }}
    >
        <Typography sx={{ fontSize: "0.65625rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", mb: "5px" }}>
            {label}
        </Typography>
        {loading ? (
            <Skeleton width="55%" height={32} />
        ) : (
            <Typography sx={{ fontSize: "1.625rem", fontWeight: 500, color: "#1e293b", lineHeight: 1 }}>
                {value}
            </Typography>
        )}
    </Paper>
);

// ─── Single tree row (recursive) ─────────────────────────────────────────────

const CoaTreeNode = ({ node, level, expandedIds, onToggle, onEdit, onDelete, query, editLoadingId }) => {
    const isGroup = node.nodeType === "GROUP";
    const hasChildren = isGroup && node.children?.length > 0;
    const isExpanded = Boolean(query) || expandedIds.has(node.id);
    const isEditLoading = editLoadingId === node.id;

    return (
        <>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    pl: `${8 + level * 20}px`,
                    pr: 1.5,
                    py: 0.75,
                    cursor: isGroup && hasChildren ? "pointer" : "default",
                    transition: "background 0.1s",
                    borderBottom: "1px solid #f8fafc",
                    "&:hover": { bgcolor: "#f8fafc" },
                    "&:hover .row-actions": { visibility: "visible" },
                }}
                onClick={isGroup && hasChildren ? () => onToggle(node.id) : undefined}
            >
                {/* Expand toggle */}
                <Box sx={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isGroup && hasChildren ? (
                        <IconButton
                            size="small"
                            sx={{ p: 0, color: "#94a3b8", "&:hover": { color: "#374151" } }}
                            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
                        >
                            {isExpanded
                                ? <ExpandMore sx={{ fontSize: 16 }} />
                                : <ChevronRight sx={{ fontSize: 16 }} />
                            }
                        </IconButton>
                    ) : null}
                </Box>

                {/* Node icon */}
                <Box sx={{ mr: 1, display: "flex", alignItems: "center", color: isGroup ? "#64748b" : "#94a3b8", flexShrink: 0 }}>
                    {isGroup
                        ? isExpanded
                            ? <FolderOpenOutlined sx={{ fontSize: 15 }} />
                            : <FolderOutlined sx={{ fontSize: 15 }} />
                        : <DescriptionOutlined sx={{ fontSize: 14 }} />
                    }
                </Box>

                {/* Code */}
                <Typography sx={{ fontSize: "0.6875rem", color: "#94a3b8", fontFamily: "monospace", minWidth: 64, mr: 1.5, flexShrink: 0 }}>
                    {node.code}
                </Typography>

                {/* Name */}
                <Typography
                    sx={{
                        fontSize: "0.8125rem",
                        fontWeight: isGroup ? 600 : 400,
                        color: isGroup ? "#0f172a" : "#374151",
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {node.name}
                </Typography>

                {/* Badges */}
                <Box sx={{ display: "flex", gap: 0.5, mr: 1, flexShrink: 0 }}>
                    {node.isControlAccount && (
                        <Chip label="Control" size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 600, bgcolor: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }} />
                    )}
                    {node.subLedgerType && node.subLedgerType !== "NONE" && (
                        <Chip label={node.subLedgerType} size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 600, bgcolor: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }} />
                    )}
                    {node.gstApplicable && (
                        <Chip label="GST" size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 600, bgcolor: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" }} />
                    )}
                </Box>

                {/* Row actions */}
                <Box
                    className="row-actions"
                    sx={{ display: "flex", gap: 0.25, visibility: "hidden", flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {isEditLoading ? (
                        <Box sx={{ display: "flex", alignItems: "center", px: 0.75 }}>
                            <CircularProgress size={13} />
                        </Box>
                    ) : (
                        <Tooltip title="Edit" placement="top">
                            <IconButton size="small" sx={{ p: 0.5, color: "#64748b", "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" } }} onClick={() => onEdit(node)}>
                                <EditOutlined sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="Delete" placement="top">
                        <IconButton size="small" sx={{ p: 0.5, color: "#94a3b8", "&:hover": { color: "#ef4444", bgcolor: "#fef2f2" } }} onClick={() => onDelete(node)}>
                            <DeleteOutlined sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Children */}
            {isGroup && hasChildren && isExpanded &&
                node.children.map((child) => (
                    <CoaTreeNode
                        key={`${child.nodeType}-${child.id}`}
                        node={child}
                        level={level + 1}
                        expandedIds={expandedIds}
                        onToggle={onToggle}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        query={query}
                        editLoadingId={editLoadingId}
                    />
                ))
            }
        </>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ChartOfAccountsPage = () => {
    const [tree, setTree] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [editLoadingId, setEditLoadingId] = useState(null);

    const [groupDialog, setGroupDialog] = useState({ open: false, group: null });
    const [ledgerDialog, setLedgerDialog] = useState({ open: false, ledger: null, defaultGroupId: null });
    const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });

    const showSnack = useCallback(
        (message, severity = "success") => setSnack({ open: true, message, severity }),
        []
    );

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [treeData, groupsData] = await Promise.all([getCoaTree(), listGroups()]);
            setTree(treeData || []);
            setGroups(groupsData || []);
            setExpandedIds(new Set((treeData || []).map((n) => n.id)));
        } catch {
            setError("Failed to load Chart of Accounts. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleToggle = useCallback((id) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const displayTree = useMemo(() => filterTree(tree, searchQuery), [tree, searchQuery]);

    const byNature = useMemo(() => {
        const m = {};
        NATURE_ORDER.forEach((n) => { m[n] = []; });
        displayTree.forEach((node) => { if (m[node.nature]) m[node.nature].push(node); });
        return m;
    }, [displayTree]);

    // Stats (computed from full unfiltered tree)
    const totalLedgers = useMemo(() => countLedgers(tree), [tree]);
    const controlCount = useMemo(() => countLedgersWithFlag(tree, "isControlAccount"), [tree]);
    const subLedgerCount = useMemo(() => countSubLedgers(tree), [tree]);

    const handleEditClick = useCallback(async (node) => {
        if (node.nodeType === "GROUP") {
            const fullGroup = groups.find((g) => g.id === node.id) || node;
            setGroupDialog({ open: true, group: fullGroup });
        } else {
            setEditLoadingId(node.id);
            try {
                const fullLedger = await getLedger(node.id);
                setLedgerDialog({ open: true, ledger: fullLedger, defaultGroupId: null });
            } catch {
                showSnack("Failed to load ledger details.", "error");
            } finally {
                setEditLoadingId(null);
            }
        }
    }, [groups, showSnack]);

    const handleDeleteClick = useCallback(async (node) => {
        // eslint-disable-next-line no-alert
        if (!window.confirm(`Delete "${node.name}"? This cannot be undone.`)) return;
        try {
            if (node.nodeType === "GROUP") {
                await deleteGroup(node.id);
                showSnack("Group deleted.");
            } else {
                await deleteLedger(node.id);
                showSnack("Ledger deleted.");
            }
            await loadData();
        } catch {
            showSnack("Cannot delete — it may have children or active entries.", "error");
        }
    }, [loadData, showSnack]);

    const handleSaveGroup = useCallback(async (dto) => {
        if (groupDialog.group) {
            await updateGroup(groupDialog.group.id, dto);
            showSnack("Group updated.");
        } else {
            await createGroup(dto);
            showSnack("Group created.");
        }
        await loadData();
    }, [groupDialog.group, loadData, showSnack]);

    const handleSaveLedger = useCallback(async (dto) => {
        if (ledgerDialog.ledger) {
            await updateLedger(ledgerDialog.ledger.id, dto);
            showSnack("Ledger updated.");
        } else {
            await createLedger(dto);
            showSnack("Ledger created.");
        }
        await loadData();
    }, [ledgerDialog.ledger, loadData, showSnack]);

    const isEmpty = NATURE_ORDER.every((n) => !byNature[n]?.length);

    return (
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
                            Chart of Accounts
                        </Typography>
                        <Typography sx={{ fontSize: "0.875rem", color: "#64748b", mt: 0.5 }}>
                            Manage your ledger groups, accounts, and opening balances
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                        <Button
                            variant="outlined"
                            disableElevation
                            startIcon={<AddCircleOutline sx={{ fontSize: 17 }} />}
                            onClick={() => setGroupDialog({ open: true, group: null })}
                            sx={{
                                borderRadius: 2,
                                fontWeight: 700,
                                fontSize: "0.8125rem",
                                textTransform: "none",
                                px: 2,
                                py: 0.875,
                                borderColor: "#e2e8f0",
                                color: "#374151",
                                "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
                            }}
                        >
                            New Group
                        </Button>
                        <Button
                            variant="contained"
                            disableElevation
                            startIcon={<AddCircleOutline sx={{ fontSize: 17 }} />}
                            onClick={() => setLedgerDialog({ open: true, ledger: null, defaultGroupId: null })}
                            sx={{
                                borderRadius: 2,
                                fontWeight: 700,
                                fontSize: "0.8125rem",
                                textTransform: "none",
                                px: 2,
                                py: 0.875,
                                bgcolor: "#10b981",
                                "&:hover": { bgcolor: "#059669" },
                            }}
                        >
                            New Ledger
                        </Button>
                    </Stack>
                </Stack>

                <Divider sx={{ mb: 3, borderColor: "#f1f5f9" }} />

                {/* ── Stat cards ── */}
                <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
                    <StatCard label="Account Groups" value={groups.length} accent="#1e293b" loading={loading} />
                    <StatCard label="Ledger Accounts" value={totalLedgers} accent="#10b981" loading={loading} />
                    <StatCard label="Control Accounts" value={controlCount} accent="#2563eb" loading={loading} />
                    <StatCard label="Sub-Ledger Types" value={subLedgerCount} accent="#d97706" loading={loading} />
                </Stack>

                {/* ── Search ── */}
                <Box sx={{ mb: 2.5 }}>
                    <TextField
                        size="small"
                        placeholder="Search by code or name…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{
                            width: 280,
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                                fontSize: "0.875rem",
                                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#94a3b8" },
                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#2563eb" },
                            },
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchOutlined sx={{ fontSize: 17, color: "#94a3b8" }} />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}

                {/* ── Tree ── */}
                {loading ? (
                    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden", p: 2 }}>
                        {[...Array(8)].map((_, i) => (
                            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75 }}>
                                <Skeleton variant="circular" width={16} height={16} />
                                <Skeleton width={i % 3 === 0 ? "30%" : "55%"} height={18} />
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
                        {NATURE_ORDER.map((nature) => {
                            const nodes = byNature[nature];
                            if (!nodes?.length) return null;
                            const meta = NATURE_META[nature];
                            return (
                                <Box key={nature}>
                                    {/* Section header */}
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 0.875,
                                            bgcolor: meta.bg,
                                            borderBottom: `1px solid ${meta.color}22`,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                        }}
                                    >
                                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: meta.color, flexShrink: 0 }} />
                                        <Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", color: meta.color }}>
                                            {meta.label}
                                        </Typography>
                                    </Box>

                                    {/* Tree rows */}
                                    <Box>
                                        {nodes.map((node) => (
                                            <CoaTreeNode
                                                key={`${node.nodeType}-${node.id}`}
                                                node={node}
                                                level={0}
                                                expandedIds={expandedIds}
                                                onToggle={handleToggle}
                                                onEdit={handleEditClick}
                                                onDelete={handleDeleteClick}
                                                query={searchQuery}
                                                editLoadingId={editLoadingId}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            );
                        })}

                        {isEmpty && (
                            <Box sx={{ textAlign: "center", py: 8, color: "#94a3b8" }}>
                                <AccountBalanceOutlined sx={{ fontSize: 40, mb: 1.5, opacity: 0.3 }} />
                                <Typography variant="body2">
                                    {searchQuery ? "No accounts match your search." : "No accounts configured yet."}
                                </Typography>
                                {!searchQuery && (
                                    <Typography variant="caption" sx={{ color: "#cbd5e1", display: "block", mt: 0.5 }}>
                                        Start by creating an account group, then add ledger accounts under it.
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>
                )}
            </Paper>

            <GroupFormDialog
                open={groupDialog.open}
                onClose={() => setGroupDialog((d) => ({ ...d, open: false }))}
                onSave={handleSaveGroup}
                group={groupDialog.group}
                groups={groups}
            />
            <LedgerFormDialog
                open={ledgerDialog.open}
                onClose={() => setLedgerDialog((d) => ({ ...d, open: false }))}
                onSave={handleSaveLedger}
                ledger={ledgerDialog.ledger}
                groups={groups}
                defaultGroupId={ledgerDialog.defaultGroupId}
            />

            <Snackbar
                open={snack.open}
                autoHideDuration={3500}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ChartOfAccountsPage;
