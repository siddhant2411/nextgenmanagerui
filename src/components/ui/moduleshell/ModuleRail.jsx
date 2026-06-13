import React from "react";
import {
    Box,
    Drawer,
    Tooltip,
    IconButton,
    Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { MODULES } from "../../../config/modules";

const RAIL_WIDTH = 64;

const getActiveModuleKey = (pathname) => {
    if (pathname.startsWith("/accounting")) return "accounting";
    if (pathname.startsWith("/hr")) return "hr";
    if (pathname.startsWith("/payroll")) return "payroll";
    return "operations";
};

const ModuleRail = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { canModule } = useAuth();

    const activeModuleKey = getActiveModuleKey(location.pathname);

    const isAccessible = (module) => {
        if (module.moduleKey === null) return true;
        return module.status === "active" && canModule(module.moduleKey);
    };

    const handleClick = (module) => {
        if (module.status === "coming_soon" || !isAccessible(module)) return;
        navigate(module.landingRoute);
    };

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: RAIL_WIDTH,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: RAIL_WIDTH,
                    left: 0,
                    boxSizing: "border-box",
                    background: "#080f1e",
                    border: "none",
                    borderRight: "1px solid rgba(255, 255, 255, 0.07)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                },
            }}
        >
            {/* Logo — clicks to /apps launcher */}
            <Tooltip title="All Modules" placement="right" arrow>
                <Box
                    onClick={() => navigate("/apps")}
                    sx={{
                        width: 44,
                        height: 44,
                        my: 1.25,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "background 0.2s",
                        "&:hover": { background: "rgba(255,255,255,0.07)" },
                    }}
                >
                    <img
                        src={process.env.PUBLIC_URL + "/NGM.png"}
                        alt="NGM"
                        style={{ width: 26, height: 26 }}
                    />
                </Box>
            </Tooltip>

            <Box
                sx={{
                    width: 32,
                    height: 1,
                    background: "rgba(255,255,255,0.08)",
                    mb: 1,
                }}
            />

            {/* Module icons */}
            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.75,
                    pt: 0.5,
                }}
            >
                {MODULES.map((module) => {
                    const isActive = module.key === activeModuleKey;
                    const accessible = isAccessible(module);
                    const isSoon = module.status === "coming_soon";
                    const { Icon } = module;

                    return (
                        <Tooltip
                            key={module.key}
                            title={isSoon ? `${module.label} — Coming Soon` : module.label}
                            placement="right"
                            arrow
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 0.25,
                                }}
                            >
                                <IconButton
                                    onClick={() => handleClick(module)}
                                    disableRipple={isSoon}
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 2,
                                        color: isActive
                                            ? "#fff"
                                            : isSoon
                                            ? "rgba(148, 163, 184, 0.3)"
                                            : "#64748b",
                                        backgroundColor: isActive
                                            ? module.color
                                            : "transparent",
                                        cursor: isSoon ? "not-allowed" : "pointer",
                                        transition: "all 0.18s ease",
                                        "&:hover": {
                                            backgroundColor: isActive
                                                ? module.color
                                                : accessible && !isSoon
                                                ? "rgba(255,255,255,0.08)"
                                                : "transparent",
                                            color:
                                                accessible && !isSoon
                                                    ? isActive
                                                        ? "#fff"
                                                        : "#cbd5e1"
                                                    : undefined,
                                        },
                                    }}
                                >
                                    <Icon sx={{ fontSize: 20 }} />
                                </IconButton>

                                {isSoon && (
                                    <Typography
                                        sx={{
                                            fontSize: "0.525rem",
                                            fontWeight: 500,
                                            color: "rgba(148, 163, 184, 0.45)",
                                            letterSpacing: 0.3,
                                            lineHeight: 1,
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        Soon
                                    </Typography>
                                )}
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>
        </Drawer>
    );
};

export default ModuleRail;
