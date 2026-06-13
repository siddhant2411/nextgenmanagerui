import React from "react";
import { Box, Card, CardContent, Chip, ButtonBase, Typography } from "@mui/material";
import { ArrowForwardIos } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { MODULES } from "../config/modules";
import UserMenu from "../components/ui/toolbar/userinfo/UserMenu";

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
};

const AppLauncherPage = () => {
    const navigate = useNavigate();
    const { canModule, user } = useAuth();

    const isAccessible = (module) => {
        if (module.moduleKey === null) return true;
        return module.status === "active" && canModule(module.moduleKey);
    };

    const handleClick = (module) => {
        if (module.status === "coming_soon" || !isAccessible(module)) return;
        navigate(module.landingRoute);
    };

    const username = user?.username || "";
    const greeting = `${getGreeting()}${username ? `, ${username}` : ""}.`;

    return (
        <Box sx={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
            {/* Standalone header — no sidebar here */}
            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                    background: "#ffffff",
                    borderBottom: "1px solid #e2e8f0",
                    height: 64,
                    display: "flex",
                    alignItems: "center",
                    px: { xs: 3, md: 5 },
                    justifyContent: "space-between",
                    flexShrink: 0,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <img
                        src={process.env.PUBLIC_URL + "/NGM.png"}
                        alt="NGM"
                        style={{ width: 28, height: 28 }}
                    />
                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: "0.9375rem",
                            color: "#0f172a",
                            letterSpacing: -0.1,
                        }}
                    >
                        NextGenManager
                    </Typography>
                </Box>
                <UserMenu />
            </Box>

            {/* Page body */}
            <Box sx={{ flex: 1, px: { xs: 3, sm: 5, md: 8 }, pt: { xs: 5, md: 8 }, pb: 10 }}>
                <Box sx={{ maxWidth: 1100, mx: "auto" }}>
                    {/* Greeting */}
                    <Box sx={{ mb: 7 }}>
                        <Typography
                            sx={{
                                fontSize: { xs: "1.625rem", md: "2rem" },
                                fontWeight: 800,
                                color: "#0f172a",
                                letterSpacing: -0.5,
                                lineHeight: 1.15,
                            }}
                        >
                            {greeting}
                        </Typography>
                        <Typography sx={{ color: "#64748b", mt: 1.25, fontSize: "1rem" }}>
                            Select a module to get started.
                        </Typography>
                    </Box>

                    {/* Module cards — 4-column on large screens, 2 on tablet, 1 on mobile */}
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "1fr 1fr",
                                lg: "repeat(4, 1fr)",
                            },
                            gap: 3,
                        }}
                    >
                        {MODULES.map((module) => {
                            const accessible = isAccessible(module);
                            const isSoon = module.status === "coming_soon";
                            const { Icon } = module;

                            return (
                                <ButtonBase
                                    key={module.key}
                                    onClick={() => handleClick(module)}
                                    disabled={isSoon}
                                    sx={{
                                        display: "block",
                                        width: "100%",
                                        borderRadius: "18px",
                                        textAlign: "left",
                                        outline: "none",
                                        WebkitTapHighlightColor: "transparent",
                                        transition: "transform 0.2s ease",
                                        "&:not(:disabled):hover": { transform: "translateY(-5px)" },
                                        "&:focus-visible": {
                                            boxShadow: `0 0 0 3px ${module.color}55`,
                                            borderRadius: "18px",
                                        },
                                    }}
                                >
                                    <Card
                                        elevation={0}
                                        sx={{
                                            borderRadius: "18px",
                                            border: "1.5px solid",
                                            borderColor: isSoon ? "#f1f5f9" : "#e2e8f0",
                                            background: isSoon ? "#f8fafc" : "#ffffff",
                                            opacity: isSoon ? 0.6 : 1,
                                            height: "100%",
                                            transition: "border-color 0.18s ease, box-shadow 0.18s ease",
                                            ...(accessible && !isSoon && {
                                                "&:hover": {
                                                    borderColor: `${module.color}55`,
                                                    boxShadow: `0 10px 36px ${module.color}1a`,
                                                },
                                            }),
                                        }}
                                    >
                                        <CardContent sx={{ p: "32px", "&:last-child": { pb: "32px" } }}>
                                            {/* Large icon block */}
                                            <Box
                                                sx={{
                                                    width: 72,
                                                    height: 72,
                                                    borderRadius: "16px",
                                                    background: isSoon
                                                        ? "#f1f5f9"
                                                        : `${module.color}18`,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    mb: 3,
                                                }}
                                            >
                                                <Icon
                                                    sx={{
                                                        fontSize: 34,
                                                        color: isSoon ? "#cbd5e1" : module.color,
                                                    }}
                                                />
                                            </Box>

                                            {/* Module name */}
                                            <Typography
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: "1.0625rem",
                                                    color: isSoon ? "#94a3b8" : "#0f172a",
                                                    letterSpacing: -0.15,
                                                    mb: 0.875,
                                                }}
                                            >
                                                {module.label}
                                            </Typography>

                                            {/* Description */}
                                            <Typography
                                                sx={{
                                                    color: isSoon ? "#cbd5e1" : "#64748b",
                                                    fontSize: "0.8125rem",
                                                    lineHeight: 1.65,
                                                    mb: 3,
                                                }}
                                            >
                                                {module.description}
                                            </Typography>

                                            {/* Footer — Open link or Coming Soon chip */}
                                            {isSoon ? (
                                                <Chip
                                                    label="Coming Soon"
                                                    size="small"
                                                    sx={{
                                                        height: 24,
                                                        fontSize: "0.69rem",
                                                        fontWeight: 500,
                                                        backgroundColor: "#f1f5f9",
                                                        color: "#94a3b8",
                                                        letterSpacing: 0.1,
                                                    }}
                                                />
                                            ) : accessible ? (
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 0.5,
                                                        color: module.color,
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{
                                                            fontSize: "0.8125rem",
                                                            fontWeight: 600,
                                                            color: "inherit",
                                                        }}
                                                    >
                                                        Open
                                                    </Typography>
                                                    <ArrowForwardIos
                                                        sx={{
                                                            fontSize: 10,
                                                            color: "inherit",
                                                            transition: "transform 0.15s",
                                                            ".MuiButtonBase-root:hover &": {
                                                                transform: "translateX(3px)",
                                                            },
                                                        }}
                                                    />
                                                </Box>
                                            ) : null}
                                        </CardContent>
                                    </Card>
                                </ButtonBase>
                            );
                        })}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default AppLauncherPage;
