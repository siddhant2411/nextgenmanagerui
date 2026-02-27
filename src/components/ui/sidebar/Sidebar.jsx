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
} from "@mui/icons-material";
import { Contact } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import {
    MODULE_KEYS,
} from "../../../auth/roles";

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 72;

const Sidebar = ({
    isSmallScreen = false,
    mobileOpen = false,
    onMobileClose = () => {},
    collapsed = false,
    onToggleCollapse = () => {},
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { canModule } = useAuth();
    const [openSubMenus, setOpenSubMenus] = useState({});
    const canManageUsers = canModule(MODULE_KEYS.USER_MANAGEMENT);
    const canAccessSales = canModule(MODULE_KEYS.SALES);
    const canAccessInventory = canModule(MODULE_KEYS.INVENTORY);
    const canAccessProduction = canModule(MODULE_KEYS.WORK_ORDER);
    const canAccessItemCode = canModule(MODULE_KEYS.ITEM_CODE_MAPPING);
    const productChildren = [
        ...(canAccessItemCode ? [{ text: "Master", path: "/inventory-item" }] : []),
        ...(canAccessProduction ? [{ text: "Bill Of Material", path: "/bom" }] : []),
    ];

    const drawerWidth = collapsed && !isSmallScreen ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

    const drawerSx = {
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            background: "#00162cff",
            color: "#fff",
            overflowX: "hidden",
            transition: "width 180ms ease",
        },
    };

    const toggleSubMenu = (text) => {
        setOpenSubMenus((prev) => ({ ...prev, [text]: !prev[text] }));
    };

    const handleNavigate = (path) => {
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
                        { text: "Work Orders", path: "/production/work-order" },
                        { text: "Machine Assets", path: "/production/machine-assets" },
                    ],
                },
                {
                    text: "Manufacturing",
                    icon: <PrecisionManufacturing />,
                    children: [
                        { text: "Work Center", path: "/manufacturing/work-center" },
                        { text: "Routing", path: "/manufacturing/routing" },
                        { text: "Production Job", path: "/production/production-job" },
                    ],
                },
            ]
            : []),
        ...(canAccessSales
            ? [
                {
                    text: "Sells",
                    icon: <SellOutlined />,
                    children: [{ text: "Sells Orders", path: "/sales/sales-order" }],
                },
                { text: "Company", icon: <Contact />, path: "/contact" },
                { text: "Enquiry", icon: <RequestQuote />, path: "/enquiry" },
                { text: "Quotation", icon: <FormatQuote />, path: "/quotation" },
            ]
            : []),
        ...(canAccessInventory
            ? [{ text: "Inventory", icon: <Inventory2 />, path: "/inventory" }]
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
                    p: 1.25,
                    borderBottom: "1px solid rgba(44, 73, 110, 0.5)",
                    minHeight: 56,
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
                    <IconButton size="small" onClick={onToggleCollapse} sx={{ color: "#fff" }}>
                        {collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
                    </IconButton>
                )}
            </Box>

            <List>
                {menuItems.map((item, index) => {
                    const isChildActive = item.children && item.children.some((child) => location.pathname === child.path);
                    const isActive = location.pathname === item.path || isChildActive;
                    const showText = !collapsed || isSmallScreen;

                    const listButton = (
                        <ListItemButton
                            onClick={() => (item.children ? toggleSubMenu(item.text) : handleNavigate(item.path))}
                            sx={{
                                "&:hover": { backgroundColor: "#53535f8e" },
                                backgroundColor: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                                justifyContent: showText ? "flex-start" : "center",
                                px: showText ? 2 : 1,
                            }}
                        >
                            <ListItemIcon sx={{ color: "#fff", minWidth: showText ? 36 : 24 }}>{item.icon}</ListItemIcon>
                            {showText && (
                                <ListItemText
                                    primary={item.text}
                                    slotProps={{ primary: { fontSize: "0.875rem", color: "#fff" } }}
                                />
                            )}
                            {item.children && showText && (openSubMenus[item.text] ? <ExpandLess /> : <ExpandMore />)}
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
                                                    pl: 4,
                                                    "&:hover": { backgroundColor: "#53535f8e" },
                                                    backgroundColor: location.pathname === child.path ? "rgba(255,255,255,0.12)" : "transparent",
                                                }}
                                            >
                                                <ListItemText
                                                    primary={child.text}
                                                    sx={{ color: "#fff" }}
                                                    slotProps={{ primary: { fontSize: "0.875rem", color: "#fff" } }}
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
