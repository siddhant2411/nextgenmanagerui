import React, { useState } from "react";
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Collapse,
    IconButton,
    Tooltip,
} from "@mui/material";
import {
    Dashboard,
    Person,
    ListAltOutlined,
    Inventory2,
    FormatQuote,
    FactoryOutlined,
    ExpandLess,
    ExpandMore,
    Settings,
    RequestQuote,
    SellOutlined,
    PrecisionManufacturing,
    ChevronLeft,
    ChevronRight,
    ShoppingCart,
    AppsOutlined,
} from "@mui/icons-material";
import { Contact } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { resetViewState } from "../../../commonTools/useViewState";
import { useAuth } from "../../../auth/AuthContext";
import {
    MODULE_KEYS,
} from "../../../auth/roles";
import { FEATURES, useServerFeatures } from "../../../config/ServerFeaturesContext";

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 72;

const Sidebar = ({
    isSmallScreen = false,
    mobileOpen = false,
    onMobileClose = () => { },
    collapsed = false,
    onToggleCollapse = () => { },
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { canModule } = useAuth();
    const { isFeatureEnabled } = useServerFeatures();
    const [openSubMenus, setOpenSubMenus] = useState({});
    const canManageUsers = canModule(MODULE_KEYS.USER_MANAGEMENT);
    const canAccessSales = canModule(MODULE_KEYS.SALES);
    const canAccessPurchase = canModule(MODULE_KEYS.PURCHASE);
    const canAccessInventory = canModule(MODULE_KEYS.INVENTORY);
    const canAccessProduction = canModule(MODULE_KEYS.WORK_ORDER);
    const canAccessPlanning = canModule(MODULE_KEYS.PLANNING);
    const canAccessItemCode = canModule(MODULE_KEYS.ITEM_CODE_MAPPING);
    const canAccessContacts = canModule(MODULE_KEYS.CONTACT);
    // Not a permission: the AI Lead Agent is a separate service most installations do not run, so
    // the entry appears only where the server says one is configured (ai-agent.base-url).
    const aiLeadAgentEnabled = isFeatureEnabled(FEATURES.AI_LEAD_AGENT);
    const productChildren = [
        ...(canAccessItemCode ? [{ text: "Master", path: "/inventory-item" }] : []),
        ...(canAccessProduction ? [{ text: "Bill Of Material", path: "/bom" }] : []),
    ];

    const drawerWidth = collapsed && !isSmallScreen ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

    const showText = !collapsed || isSmallScreen;

    const drawerSx = {
        width: drawerWidth,
        flexShrink: 0,
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

    const toggleSubMenu = (text) => {
        setOpenSubMenus((prev) => ({ ...prev, [text]: !prev[text] }));
    };

    const handleNavigate = (path) => {
        // Clicking the section you are already inside is the "start clean" gesture:
        // drop preserved filters/sort/page so the list reloads at its defaults.
        if (path && (location.pathname === path || location.pathname.startsWith(`${path}/`))) {
            resetViewState(path);
        }
        navigate(path);
        if (isSmallScreen) {
            onMobileClose();
        }
    };

    const menuItems = [
        { text: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
        ...(productChildren.length > 0
            ? [
                {
                    text: "Products",
                    icon: <ListAltOutlined />,
                    children: productChildren,
                },
            ]
            : []),
        ...(canAccessProduction
            ? [
                {
                    text: "Production",
                    icon: <FactoryOutlined />,
                    children: [
                        { text: "Schedule Views", path: "/production/schedule" },
                        { text: "Shop Floor", path: "/production/shop-floor" },
                        { text: "Work Orders", path: "/production/work-order" },
                        { text: "Job Work Challan", path: "/production/job-work-challan" },
                        { text: "Make or Buy", path: "/production/make-or-buy" },
                        ...(canAccessPlanning ? [{ text: "Planning Desk", path: "/production/planning-desk" }] : []),
                        { text: "Machine Assets", path: "/production/machine-assets" },
                        { text: "OEE Dashboard", path: "/production/oee-dashboard" },
                    ],
                },
                {
                    text: "Manufacturing",
                    icon: <PrecisionManufacturing />,
                    children: [
                        { text: "Work Center", path: "/manufacturing/work-center" },
                        { text: "Routing", path: "/manufacturing/routing" },
                        { text: "Downtime Reasons", path: "/manufacturing/downtime-reasons" },
                        { text: "Production Job", path: "/production/production-job" },
                        { text: "Labor Roles", path: "/production/labor-role" },
                        { text: "Holiday Calendar", path: "/production/calendar" },
                    ],
                },
            ]
            : []),
        ...(canAccessSales
            ? [
                {
                    text: "Sales",
                    icon: <SellOutlined />,
                    children: [
                        { text: "Pipeline Desk", path: "/crm/pipeline" },
                        { text: "Revenue Desk", path: "/crm/revenue" },
                        { text: "Enquiries", path: "/enquiry" },
                        // Sits under the register it feeds. The queue holds leads the agent
                        // extracted but would not file unsupervised, so it is a step before
                        // /enquiry rather than a separate tool.
                        ...(aiLeadAgentEnabled
                            ? [{ text: "AI Lead Review", path: "/crm/ai-leads" }]
                            : []),
                        { text: "Quotations", path: "/quotation" },
                        { text: "Sales Orders", path: "/sales/sales-order" },
                        { text: "Delivery Challans", path: "/sales/sales-order/delivery-notes" },
                        { text: "Invoices", path: "/sales/sales-order/invoices" },
                    ],
                },
            ]
            : []),
        ...(canAccessContacts
            ? [{ text: "Company", icon: <Contact />, path: "/contact" }]
            : []),
        ...(canAccessPurchase
            ? [
                {
                    text: "Purchase",
                    icon: <ShoppingCart />,
                    children: [
                        { text: "Purchase Orders", path: "/purchase" },
                        { text: "Requisitions", path: "/purchase/requisitions" },
                    ],
                },
            ]
            : []),
        ...(canAccessInventory
            ? [
                {
                    text: "Inventory",
                    icon: <Inventory2 />,
                    children: [
                        { text: "Dashboard", path: "/inventory" },
                        { text: "Material Requests", path: "/inventory/material-requests" },
                    ],
                },
            ]
            : []),
        ...(canAccessItemCode
            ? [
                {
                    text: "Configuration",
                    icon: <Settings />,
                    children: [{ text: "Item Code", path: "/config/item-code-mapping" }],
                },
            ]
            : []),
        ...(canManageUsers
            ? [
                {
                    text: "SuperAdmin",
                    icon: <Person />,
                    children: [
                        { text: "User List", path: "/superadmin/users" },
                        { text: "Role Management", path: "/superadmin/roles" },
                        { text: "Company Details", path: "/superadmin/company" },
                    ],
                },
            ]
            : []),
    ];

    const menuContent = (
        <>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                    minHeight: 64,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                    <img src={process.env.PUBLIC_URL + '/NGM.png'} alt="logo" style={{ width: 24, height: 24 }} />
                    {(!collapsed || isSmallScreen) && (
                        <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>
                            NextGenManager
                        </Typography>
                    )}
                </Box>

                {!isSmallScreen && (
                    <IconButton size="small" onClick={onToggleCollapse} sx={{ color: "#94a3b8", "&:hover": { color: "#fff" } }}>
                        {collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
                    </IconButton>
                )}
            </Box>

            <List sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                {menuItems.map((item, index) => {
                    const pathMatches = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
                    const isChildActive = item.children && item.children.some((child) => pathMatches(child.path));
                    const isActive = (item.path && pathMatches(item.path)) || isChildActive;
                    const showText = !collapsed || isSmallScreen;

                    const listButton = (
                        <ListItemButton
                            onClick={() => (item.children ? toggleSubMenu(item.text) : handleNavigate(item.path))}
                            sx={{
                                m: "4px 12px",
                                borderRadius: 1.5,
                                transition: "all 0.2s ease-in-out",
                                backgroundColor: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                                color: isActive ? "#ffffff" : "#94a3b8",
                                "&:hover": { 
                                    backgroundColor: isActive ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)",
                                    color: "#ffffff"
                                },
                                justifyContent: showText ? "flex-start" : "center",
                                px: showText ? 2 : 1,
                                position: "relative",
                                ...(isActive && {
                                    "&::before": {
                                        content: '""',
                                        position: "absolute",
                                        left: -12,
                                        top: '15%',
                                        height: '70%',
                                        width: 4,
                                        backgroundColor: "#3b82f6",
                                        borderRadius: "0 4px 4px 0",
                                    }
                                })
                            }}
                        >
                            <ListItemIcon sx={{ 
                                color: "inherit", 
                                minWidth: showText ? 36 : 24,
                                "& svg": { fontSize: 20, transition: "color 0.2s ease-in-out" }
                             }}>
                                {item.icon}
                            </ListItemIcon>
                            {showText && (
                                <ListItemText
                                    primary={item.text}
                                    sx={{ my: 0 }}
                                    slotProps={{ primary: { fontSize: "0.875rem", fontWeight: isActive ? 600 : 500, color: "inherit", letterSpacing: 0.2 } }}
                                />
                            )}
                            {item.children && showText && (openSubMenus[item.text] ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />)}
                        </ListItemButton>
                    );

                    return (
                        <React.Fragment key={index}>
                            <ListItem disablePadding>
                                {showText ? listButton : <Tooltip title={item.text} placement="right">{listButton}</Tooltip>}
                            </ListItem>

                            {item.children && showText && (
                                <Collapse in={openSubMenus[item.text]} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding>
                                        {item.children.map((child, childIndex) => (
                                            <ListItemButton
                                                key={childIndex}
                                                onClick={() => handleNavigate(child.path)}
                                                sx={{
                                                    m: "2px 12px 2px 32px",
                                                    borderRadius: 1.5,
                                                    transition: "all 0.2s ease",
                                                    backgroundColor: pathMatches(child.path) ? "rgba(255, 255, 255, 0.08)" : "transparent",
                                                    color: pathMatches(child.path) ? "#ffffff" : "#94a3b8",
                                                    "&:hover": {
                                                        backgroundColor: pathMatches(child.path) ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)",
                                                        color: "#ffffff"
                                                    },
                                                    px: 2,
                                                    py: 0.75
                                                }}
                                            >
                                                <ListItemText
                                                    primary={child.text}
                                                    sx={{ my: 0 }}
                                                    slotProps={{ primary: { fontSize: "0.8125rem", fontWeight: pathMatches(child.path) ? 600 : 500, color: "inherit" } }}
                                                />
                                            </ListItemButton>
                                        ))}
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
                        onClick={() => navigate("/apps")}
                        sx={{
                            m: "4px 8px",
                            borderRadius: 1.5,
                            px: showText ? 2 : 1,
                            py: 1,
                            color: "#475569",
                            justifyContent: showText ? "flex-start" : "center",
                            "&:hover": { backgroundColor: "rgba(255,255,255,0.06)", color: "#94a3b8" },
                        }}
                    >
                        <ListItemIcon sx={{ color: "inherit", minWidth: showText ? 36 : 24 }}>
                            <AppsOutlined sx={{ fontSize: 20 }} />
                        </ListItemIcon>
                        {showText && (
                            <ListItemText
                                primary="All Modules"
                                sx={{ my: 0 }}
                                slotProps={{ primary: { fontSize: "0.875rem", fontWeight: 500, color: "inherit", letterSpacing: 0.2 } }}
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
                {menuContent}
            </Drawer>
        );
    }

    return (
        <Drawer variant="permanent" open sx={drawerSx}>
            {menuContent}
        </Drawer>
    );
};

export default Sidebar;
