import React, { useState } from "react";
import {
    Box,
    Chip,
    Collapse,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    AppsOutlined,
    ChevronLeft,
    ChevronRight,
    ExpandLess,
    ExpandMore,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { MODULES } from "../../../config/modules";

const SIDEBAR_WIDTH = 240;
const COLLAPSED_WIDTH = 72;
const accounting = MODULES.find((m) => m.key === "accounting");

const AccountingSubSidebar = ({
    isSmallScreen = false,
    mobileOpen = false,
    onMobileClose = () => {},
}) => {
    const location = useLocation();
    const navigate = useNavigate();

    const [collapsed, setCollapsed] = useState(
        () => localStorage.getItem("ngm.accounting.sidebar.collapsed") === "true"
    );

    const [openSections, setOpenSections] = useState(() => {
        const initial = {};
        accounting.nav.forEach((section) => {
            initial[section.text] =
                !section.comingSoon &&
                (section.children?.some((c) =>
                    location.pathname.startsWith(c.path)
                ) ?? false);
        });
        if (!Object.values(initial).some(Boolean)) {
            initial["Masters"] = true;
        }
        return initial;
    });

    const showText = !collapsed || isSmallScreen;

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem("ngm.accounting.sidebar.collapsed", String(next));
            return next;
        });
    };

    const toggleSection = (text) =>
        setOpenSections((prev) => ({ ...prev, [text]: !prev[text] }));

    const pathMatches = (path) =>
        location.pathname === path || location.pathname.startsWith(path + "/");

    const handleNavigate = (path) => {
        navigate(path);
        if (isSmallScreen) onMobileClose();
    };

    const handleSectionClick = (section, isSoon) => {
        if (isSoon) return;
        if (collapsed && !isSmallScreen) {
            // Expand sidebar and open this section
            setCollapsed(false);
            localStorage.setItem("ngm.accounting.sidebar.collapsed", "false");
            setOpenSections((prev) => ({ ...prev, [section.text]: true }));
        } else {
            toggleSection(section.text);
        }
    };

    const drawerWidth = collapsed && !isSmallScreen ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;

    const drawerSx = {
        width: drawerWidth,
        flexShrink: 0,
        transition: "width 240ms cubic-bezier(0.4, 0, 0.2, 1)",
        "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            background: "#0f172a",
            color: "#f8fafc",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            transition: "width 240ms cubic-bezier(0.4, 0, 0.2, 1)",
            borderRight: "1px solid rgba(255, 255, 255, 0.05)",
        },
    };

    const content = (
        <>
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 2,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    minHeight: 64,
                    flexShrink: 0,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                    <Box
                        sx={{
                            width: 30,
                            height: 30,
                            borderRadius: 1.5,
                            backgroundColor: `${accounting.color}22`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <accounting.Icon sx={{ fontSize: 16, color: accounting.color }} />
                    </Box>
                    {showText && (
                        <Typography
                            variant="subtitle2"
                            sx={{
                                color: "#f8fafc",
                                fontWeight: 600,
                                fontSize: "0.875rem",
                                whiteSpace: "nowrap",
                            }}
                        >
                            Accounting
                        </Typography>
                    )}
                </Box>

                {!isSmallScreen && (
                    <IconButton
                        size="small"
                        onClick={toggleCollapsed}
                        sx={{ color: "#94a3b8", "&:hover": { color: "#fff" } }}
                    >
                        {collapsed ? (
                            <ChevronRight fontSize="small" />
                        ) : (
                            <ChevronLeft fontSize="small" />
                        )}
                    </IconButton>
                )}
            </Box>

            {/* Nav sections */}
            <List sx={{ pt: 1, pb: 2, flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                {accounting.nav.map((section) => {
                    const isSoon = Boolean(section.comingSoon);
                    const isOpen = Boolean(openSections[section.text]);
                    const isChildActive =
                        !isSoon &&
                        section.children?.some((c) => pathMatches(c.path));
                    const { Icon: SectionIcon } = section;

                    const sectionButton = (
                        <ListItemButton
                            onClick={() => handleSectionClick(section, isSoon)}
                            sx={{
                                m: "2px 8px",
                                borderRadius: 1.5,
                                px: showText ? 1.5 : 1,
                                py: 0.875,
                                justifyContent: showText ? "flex-start" : "center",
                                color: isSoon
                                    ? "rgba(100, 116, 139, 0.5)"
                                    : isChildActive
                                    ? "#e2e8f0"
                                    : "#94a3b8",
                                backgroundColor: isChildActive
                                    ? "rgba(255,255,255,0.06)"
                                    : "transparent",
                                cursor: isSoon ? "default" : "pointer",
                                "&:hover": {
                                    backgroundColor: isSoon
                                        ? "transparent"
                                        : "rgba(255,255,255,0.05)",
                                    color: isSoon
                                        ? "rgba(100, 116, 139, 0.5)"
                                        : "#e2e8f0",
                                },
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    color: "inherit",
                                    minWidth: showText ? 32 : 24,
                                    justifyContent: "center",
                                }}
                            >
                                <SectionIcon sx={{ fontSize: 17 }} />
                            </ListItemIcon>
                            {showText && (
                                <>
                                    <ListItemText
                                        primary={section.text}
                                        sx={{ my: 0 }}
                                        slotProps={{
                                            primary: {
                                                fontSize: "0.8125rem",
                                                fontWeight: isChildActive ? 600 : 500,
                                                color: "inherit",
                                                letterSpacing: 0.15,
                                            },
                                        }}
                                    />
                                    {isSoon ? (
                                        <Chip
                                            label="Soon"
                                            size="small"
                                            sx={{
                                                height: 16,
                                                fontSize: "0.6rem",
                                                backgroundColor: "rgba(100,116,139,0.15)",
                                                color: "rgba(100,116,139,0.6)",
                                                "& .MuiChip-label": { px: 0.75 },
                                            }}
                                        />
                                    ) : isOpen ? (
                                        <ExpandLess sx={{ fontSize: 16, color: "#64748b" }} />
                                    ) : (
                                        <ExpandMore sx={{ fontSize: 16, color: "#64748b" }} />
                                    )}
                                </>
                            )}
                        </ListItemButton>
                    );

                    return (
                        <React.Fragment key={section.text}>
                            <ListItem disablePadding>
                                {!showText ? (
                                    <Tooltip
                                        title={isSoon ? `${section.text} — Coming Soon` : section.text}
                                        placement="right"
                                        arrow
                                    >
                                        {sectionButton}
                                    </Tooltip>
                                ) : (
                                    sectionButton
                                )}
                            </ListItem>

                            {!isSoon && showText && (
                                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding>
                                        {section.children.map((child) => {
                                            const active = pathMatches(child.path);
                                            return (
                                                <ListItemButton
                                                    key={child.path}
                                                    onClick={() => handleNavigate(child.path)}
                                                    sx={{
                                                        m: "1px 8px 1px 28px",
                                                        borderRadius: 1.5,
                                                        px: 1.5,
                                                        py: 0.625,
                                                        position: "relative",
                                                        color: active ? "#fff" : "#64748b",
                                                        backgroundColor: active
                                                            ? "rgba(16, 185, 129, 0.12)"
                                                            : "transparent",
                                                        transition: "all 0.15s ease",
                                                        "&:hover": {
                                                            backgroundColor: active
                                                                ? "rgba(16, 185, 129, 0.15)"
                                                                : "rgba(255,255,255,0.04)",
                                                            color: "#e2e8f0",
                                                        },
                                                        ...(active && {
                                                            "&::before": {
                                                                content: '""',
                                                                position: "absolute",
                                                                left: -8,
                                                                top: "15%",
                                                                height: "70%",
                                                                width: 3,
                                                                backgroundColor: accounting.color,
                                                                borderRadius: "0 3px 3px 0",
                                                            },
                                                        }),
                                                    }}
                                                >
                                                    <ListItemText
                                                        primary={child.text}
                                                        sx={{ my: 0 }}
                                                        slotProps={{
                                                            primary: {
                                                                fontSize: "0.8rem",
                                                                fontWeight: active ? 600 : 450,
                                                                color: "inherit",
                                                            },
                                                        }}
                                                    />
                                                </ListItemButton>
                                            );
                                        })}
                                    </List>
                                </Collapse>
                            )}
                        </React.Fragment>
                    );
                })}
            </List>

            {/* Footer — All Modules */}
            <Box sx={{ flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <Tooltip title="All Modules" placement="right" disableHoverListener={showText}>
                    <ListItemButton
                        onClick={() => handleNavigate("/apps")}
                        sx={{
                            m: "4px 8px",
                            borderRadius: 1.5,
                            px: showText ? 1.5 : 1,
                            py: 1,
                            justifyContent: showText ? "flex-start" : "center",
                            color: "#475569",
                            "&:hover": { backgroundColor: "rgba(255,255,255,0.06)", color: "#94a3b8" },
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                color: "inherit",
                                minWidth: showText ? 32 : 24,
                                justifyContent: "center",
                            }}
                        >
                            <AppsOutlined sx={{ fontSize: 18 }} />
                        </ListItemIcon>
                        {showText && (
                            <ListItemText
                                primary="All Modules"
                                sx={{ my: 0 }}
                                slotProps={{
                                    primary: {
                                        fontSize: "0.8125rem",
                                        fontWeight: 500,
                                        color: "inherit",
                                        letterSpacing: 0.15,
                                    },
                                }}
                            />
                        )}
                    </ListItemButton>
                </Tooltip>
            </Box>
        </>
    );

    if (isSmallScreen) {
        return (
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={onMobileClose}
                ModalProps={{ keepMounted: true }}
                sx={drawerSx}
            >
                {content}
            </Drawer>
        );
    }

    return (
        <Drawer variant="permanent" open sx={drawerSx}>
            {content}
        </Drawer>
    );
};

export default AccountingSubSidebar;
