import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { ArrowForward, CheckCircleOutline } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useAuth } from "../auth/AuthContext";
import {
    ACCOUNTING_ACCESS_ROLES,
    ROLE_PURCHASE_ADMIN,
    ROLE_SALES_ADMIN,
    USER_MANAGEMENT_ACCESS_ROLES,
    hasAnyRole,
} from "../auth/roles";
import ModuleHero from "../components/ui/moduleshell/ModuleHero";
import ModuleBody from "../components/ui/moduleshell/ModuleBody";
import { StatStrip, StatTile } from "../components/ui/moduleshell/StatTile";
import { QUICK_LINKS, describeApproval, sectionsFor } from "../components/home/homeSections";
import { getMyApprovals } from "../services/dashboardService";
import { EYEBROW, MONO, SHELL, STATUS, T } from "../theme/moduleTokens";
import { formatDateShort, formatINR } from "../utils/formatters";

/**
 * The landing page. It is assembled from the modules the signed-in user's roles admit, so nobody
 * is shown — or made to request — figures from a module they cannot open.
 *
 * Admins get one condensed line per module; everyone else gets their own modules in full.
 */

const CARD = {
    borderRadius: SHELL.radius,
    border: `1px solid ${T.rule}`,
    bgcolor: T.surface,
    boxShadow: SHELL.cardShadow,
};

// Everyone who can be the approver of something: admins and accounts through ACCOUNTING_ACCESS_ROLES,
// plus the two module admins. Anyone else is never shown an empty approvals card.
const APPROVER_ROLES = [...ACCOUNTING_ACCESS_ROLES, ROLE_PURCHASE_ADMIN, ROLE_SALES_ADMIN];

// An admin oversees every module, so the masthead carries the three money-and-flow figures rather
// than one tile per module; the module strips below hold the rest.
const ADMIN_HERO_KEYS = ["sales", "production", "accounts"];

const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
};

/** Loads each visible section on its own, so a slow module does not hold the others back. */
const useSectionData = (sections, roles) => {
    const [data, setData] = useState({});
    const keys = sections.map((s) => s.key).join(",");

    useEffect(() => {
        let live = true;
        setData({});
        sections.forEach((section) => {
            section
                .load({ roles })
                .then((result) => live && setData((prev) => ({ ...prev, [section.key]: result })));
        });
        return () => {
            live = false;
        };
        // Sections are derived from roles; the joined keys change exactly when they do.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keys]);

    return data;
};

const CardHeader = ({ title, action, onAction }) => (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: T.ink }}>{title}</Typography>
        {action && (
            <Button size="small" endIcon={<ArrowForward sx={{ fontSize: 14 }} />} onClick={onAction}
                sx={{ textTransform: "none", fontWeight: 700 }}>
                {action}
            </Button>
        )}
    </Stack>
);

/** One figure inside a section. The stripe means work is waiting, the same as on a StatTile. */
const Figure = ({ stat, loading, compact }) => {
    const navigate = useNavigate();
    return (
        <Box
            onClick={(e) => {
                if (!stat.to) return;
                e.stopPropagation();
                navigate(stat.to);
            }}
            sx={{
                flex: compact ? "0 1 auto" : "1 1 130px",
                minWidth: compact ? 96 : 120,
                pl: 1.25,
                py: 0.25,
                borderLeft: `3px solid ${stat.severity || T.rule}`,
                cursor: stat.to ? "pointer" : "default",
                borderRadius: 0.5,
                "&:hover": stat.to ? { bgcolor: T.ruleSoft } : undefined,
            }}
        >
            <Typography component="div" sx={EYEBROW}>{stat.label}</Typography>
            {loading ? (
                <Skeleton width={48} height={26} />
            ) : (
                <Typography sx={{
                    fontFamily: MONO, fontWeight: 600, fontSize: compact ? 17 : 20,
                    color: T.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1.3,
                }}>
                    {stat.value}
                </Typography>
            )}
        </Box>
    );
};

const RowList = ({ list, loading }) => {
    const navigate = useNavigate();
    if (!list) return null;
    return (
        <Box sx={{ mt: 2.5 }}>
            <Typography component="div" sx={{ ...EYEBROW, mb: 0.75 }}>{list.title}</Typography>
            {loading ? (
                <Stack spacing={0.5}>{[0, 1, 2].map((i) => <Skeleton key={i} height={34} />)}</Stack>
            ) : list.rows.length === 0 ? (
                <Typography sx={{ fontSize: "0.8125rem", color: T.ink2, py: 1 }}>{list.empty}</Typography>
            ) : (
                list.rows.map((row) => (
                    <Stack
                        key={row.id}
                        direction="row"
                        alignItems="center"
                        gap={1.5}
                        onClick={() => row.to && navigate(row.to)}
                        sx={{
                            py: 0.9, px: 1, mx: -1, borderRadius: 1.5, cursor: "pointer",
                            borderTop: `1px solid ${T.ruleSoft}`,
                            "&:hover": { bgcolor: T.ruleSoft },
                        }}
                    >
                        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: T.accent, whiteSpace: "nowrap" }}>
                            {row.primary || "—"}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: "0.8125rem", color: "#334155", flex: 1, minWidth: 0 }}>
                            {row.secondary || ""}
                        </Typography>
                        <Typography sx={{ fontSize: "0.75rem", color: T.ink2, whiteSpace: "nowrap" }}>
                            {row.meta}
                        </Typography>
                    </Stack>
                ))
            )}
        </Box>
    );
};

/** A module in full: its figures, then the handful of documents most worth opening. */
const SectionCard = ({ section, view, loading }) => {
    const navigate = useNavigate();
    return (
        <Paper elevation={0} sx={{ ...CARD, p: 2.5 }}>
            <CardHeader title={section.label} action="Open" onAction={() => navigate(section.hub)} />
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={2}>
                {view.stats.map((stat) => <Figure key={stat.label} stat={stat} loading={loading} />)}
            </Stack>
            <RowList list={view.list} loading={loading} />
        </Paper>
    );
};

/** The same module as one line, for someone who oversees all of them. */
const SectionStrip = ({ section, view, loading, first }) => {
    const navigate = useNavigate();
    return (
        <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            gap={{ xs: 1, sm: 2 }}
            onClick={() => navigate(section.hub)}
            sx={{
                py: 1.75, px: 1, mx: -1, borderRadius: 2, cursor: "pointer",
                borderTop: first ? "none" : `1px solid ${T.ruleSoft}`,
                "&:hover": { bgcolor: T.ground },
            }}
        >
            <Typography sx={{ fontWeight: 800, color: T.ink, width: { sm: 110 }, flexShrink: 0 }}>
                {section.label}
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={{ xs: 2, md: 3 }} sx={{ flex: 1, minWidth: 0 }}>
                {view.stats.slice(0, 4).map((stat) => (
                    <Figure key={stat.label} stat={stat} loading={loading} compact />
                ))}
            </Stack>
            <ArrowForward sx={{ fontSize: 18, color: T.ink3, display: { xs: "none", sm: "block" } }} />
        </Stack>
    );
};

const AttentionRail = ({ alerts }) => {
    const navigate = useNavigate();
    if (alerts.length === 0) return null;
    return (
        <Paper elevation={0} sx={{ ...CARD, p: 2, mb: 3 }}>
            <Typography component="div" sx={{ ...EYEBROW, mb: 1 }}>Needs attention</Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
                {alerts.map((alert) => (
                    <Stack
                        key={alert.text}
                        direction="row"
                        alignItems="center"
                        gap={1}
                        onClick={() => navigate(alert.to)}
                        sx={{
                            px: 1.5, py: 0.75, borderRadius: 99, cursor: "pointer",
                            border: `1px solid ${alert.severity}40`, bgcolor: `${alert.severity}0d`,
                            "&:hover": { bgcolor: `${alert.severity}1a` },
                        }}
                    >
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: alert.severity, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: T.ink }}>
                            {alert.text}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        </Paper>
    );
};

const ApprovalsCard = ({ approvals }) => {
    const navigate = useNavigate();
    // Undefined means the read failed or has not arrived; an empty list means nothing is waiting.
    if (!Array.isArray(approvals)) return null;
    const shown = approvals.slice(0, 6);
    return (
        <Paper elevation={0} sx={{ ...CARD, p: 2.5 }}>
            <CardHeader title={approvals.length > 0 ? `Waiting for your approval · ${approvals.length}` : "Approvals"} />
            {approvals.length === 0 ? (
                <Stack direction="row" alignItems="center" gap={1} sx={{ color: T.ink2 }}>
                    <CheckCircleOutline sx={{ fontSize: 18, color: STATUS.good }} />
                    <Typography sx={{ fontSize: "0.8125rem" }}>Nothing is waiting on you.</Typography>
                </Stack>
            ) : (
                shown.map((approval) => {
                    const { label, to } = describeApproval(approval);
                    return (
                        <Box
                            key={`${approval.kind}-${approval.documentId}-${approval.requiredRole}`}
                            onClick={() => to && navigate(to)}
                            sx={{
                                py: 1, px: 1, mx: -1, borderRadius: 1.5, cursor: "pointer",
                                borderTop: `1px solid ${T.ruleSoft}`,
                                "&:hover": { bgcolor: T.ruleSoft },
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" gap={1}>
                                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: T.accent }}>
                                    {approval.number}
                                </Typography>
                                <Typography sx={{ fontFamily: MONO, fontSize: "0.8125rem", color: T.ink }}>
                                    {approval.amount != null ? formatINR(approval.amount, 0) : ""}
                                </Typography>
                            </Stack>
                            <Typography noWrap sx={{ fontSize: "0.75rem", color: T.ink2 }}>
                                {[label, approval.party, approval.date && formatDateShort(approval.date)]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </Typography>
                        </Box>
                    );
                })
            )}
            {approvals.length > shown.length && (
                <Typography sx={{ fontSize: "0.75rem", color: T.ink2, mt: 1 }}>
                    and {approvals.length - shown.length} more
                </Typography>
            )}
        </Paper>
    );
};

const QuickAccess = ({ links }) => {
    const navigate = useNavigate();
    if (links.length === 0) return null;
    return (
        <Paper elevation={0} sx={{ ...CARD, p: 2.5 }}>
            <CardHeader title="Quick access" />
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
                {links.map((link) => (
                    <Button
                        key={link.path}
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(link.path)}
                        sx={{ textTransform: "none", fontWeight: 600, borderColor: T.rule, color: T.ink, borderRadius: 99 }}
                    >
                        {link.label}
                    </Button>
                ))}
            </Stack>
        </Paper>
    );
};

const NoModules = () => {
    const navigate = useNavigate();
    return (
        <Paper elevation={0} sx={{ ...CARD, p: 4, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: T.ink }}>
                No modules are assigned to you yet
            </Typography>
            <Typography sx={{ color: T.ink2, mt: 1, mb: 2.5 }}>
                Your account can sign in, but it has no module role. Ask an administrator to give you one.
            </Typography>
            <Button variant="outlined" onClick={() => navigate("/account/settings")} sx={{ textTransform: "none" }}>
                Account settings
            </Button>
        </Paper>
    );
};

export default function Home() {
    const { user, roles, canAction, isAdmin } = useAuth();
    const admin = isAdmin();
    const sections = useMemo(() => sectionsFor(roles), [roles]);
    const data = useSectionData(sections, roles);

    const [approvals, setApprovals] = useState(undefined);
    useEffect(() => {
        let live = true;
        getMyApprovals()
            .then((list) => live && setApprovals(Array.isArray(list) ? list : undefined))
            .catch(() => {});
        return () => {
            live = false;
        };
    }, []);

    const views = sections.map((section) => {
        const loaded = data[section.key];
        return {
            section,
            loading: !loaded,
            view: section.build(loaded || {}, { roles, canAction }),
        };
    });

    const alerts = [
        ...(approvals?.length
            ? [{
                severity: STATUS.warning,
                text: `${approvals.length} ${approvals.length === 1 ? "approval" : "approvals"} waiting on you`,
                to: describeApproval(approvals[0]).to,
            }]
            : []),
        ...views.flatMap(({ view }) => view.alerts || []),
    ];

    // With a single module the section card itself floats up into the masthead; a one-tile strip
    // above it would only repeat a figure the card already shows.
    const heroTiles = views.length < 2
        ? []
        : admin
            ? views.filter(({ section }) => ADMIN_HERO_KEYS.includes(section.key))
            : views.slice(0, 5);
    const canApprove = hasAnyRole(roles, APPROVER_ROLES);
    const approvalsToShow = canApprove || approvals?.length ? approvals : undefined;

    const links = admin
        ? [
            ...QUICK_LINKS.filter((link) => link.roles === USER_MANAGEMENT_ACCESS_ROLES),
            { label: "All apps", path: "/apps" },
        ]
        : QUICK_LINKS.filter((link) => hasAnyRole(roles, link.roles));

    return (
        <Box sx={{ bgcolor: T.ground, minHeight: "100vh" }}>
            <ModuleHero
                title={`${greeting()}, ${user?.username || "there"}`}
                subtitle={dayjs().format("dddd, D MMMM YYYY")}
            />
            <ModuleBody>
                {heroTiles.length > 0 && (
                    <StatStrip>
                        {heroTiles.map(({ section, view, loading }) => (
                            <StatTile
                                key={section.key}
                                label={view.headline.label}
                                value={view.headline.value}
                                hint={view.headline.hint}
                                loading={loading}
                            />
                        ))}
                        {canApprove && (
                            <StatTile
                                label="Approvals waiting"
                                value={Array.isArray(approvals) ? approvals.length : "—"}
                                severity={approvals?.length ? STATUS.warning : undefined}
                            />
                        )}
                    </StatStrip>
                )}

                {views.length === 0 ? (
                    <Stack spacing={3}>
                        <NoModules />
                        <ApprovalsCard approvals={approvalsToShow} />
                    </Stack>
                ) : (
                    <>
                        <AttentionRail alerts={alerts} />
                        <Grid container spacing={3}>
                            <Grid item xs={12} lg={8}>
                                {admin ? (
                                    <Paper elevation={0} sx={{ ...CARD, p: 2.5 }}>
                                        <CardHeader title="Modules" />
                                        {views.map(({ section, view, loading }, i) => (
                                            <SectionStrip
                                                key={section.key}
                                                section={section}
                                                view={view}
                                                loading={loading}
                                                first={i === 0}
                                            />
                                        ))}
                                    </Paper>
                                ) : (
                                    <Stack spacing={3}>
                                        {views.map(({ section, view, loading }) => (
                                            <SectionCard key={section.key} section={section} view={view} loading={loading} />
                                        ))}
                                    </Stack>
                                )}
                            </Grid>
                            <Grid item xs={12} lg={4}>
                                <Stack spacing={3}>
                                    <ApprovalsCard approvals={approvalsToShow} />
                                    <QuickAccess links={links} />
                                </Stack>
                            </Grid>
                        </Grid>
                    </>
                )}
            </ModuleBody>
        </Box>
    );
}
