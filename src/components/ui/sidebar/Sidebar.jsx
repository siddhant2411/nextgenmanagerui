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
} from "@mui/material";
import {
    Dashboard,
    Person,
    FormatListBulleted,
    ListAltOutlined,
    Inventory2,
    InfoOutlined,
    FormatQuote,
    FactoryOutlined,
    Notifications,
    Language,
    ExpandLess,
    ExpandMore,
    Settings,
    RequestQuote,
    SellOutlined,
    PrecisionManufacturing,
} from "@mui/icons-material";
import { Contact } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Enquiry from "../../enquiry/Enquiry";

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [openProduction, setOpenProduction] = useState(false);

    const [openSubMenus, setOpenSubMenus] = useState({});

    const toggleSubMenu = (text) => {
        setOpenSubMenus((prev) => ({ ...prev, [text]: !prev[text] }));
    };


    const menuItems = [
        {
            text: "Dashboard",
            icon: <Dashboard />,
            path: "/dashboard",
        },
        {
            text: "Products",
            icon: <ListAltOutlined />,
            children: [
                { text: "Master", path: "/inventory-item" },
                { text: "Bill Of Material", path: "/bom" },
            ]
        },
        {
            text: "Production",
            icon: <FactoryOutlined />,
            children: [
                { text: "Work Orders", path: "/production/work-order" },
                { text: "Manage Batches", path: "/production/manage-batches" },
                { text: "Production Report", path: "/production/reports" },
            ],
        },

        {
            text: "Manufacturing",
            icon: <PrecisionManufacturing />,
            children: [
                { text: "Work Center", path: "/manufacturing/work-center" },
                  { text: "Routing", path: "/manufacturing/routing" },
                { text: "Production Job", path: "/production/production-job" },
                { text: "Manage Batches", path: "/production/manage-batches" },
                { text: "Production Report", path: "/production/reports" },
            ],
        },

        {
            text: "Sells",
            icon: <SellOutlined />,
            children: [
                { text: "Sells Orders", path: "/sales/sales-order" }
            ],
        },
        {
            text: "Company",
            icon: <Contact />,
            path: "/contact",
        },
        {
            text: "Enquiry",
            icon: <RequestQuote />,
            path: "/enquiry",
        },
        {
            text: "Inventory",
            icon: <Inventory2 />,
            path: "/inventory",
        },
        {
            text: "Quotation",
            icon: <FormatQuote />,
            path: "/quotation",
        },
        {
            text: "Configuration",
            icon: <Settings />,
            children: [
                { text: "Item Code", path: "/config/item-code-mapping" },
            ]
        },
        {
            text: "SuperAdmin",
            icon: <Person />,
            children: [
                { text: "User List", path: "/superadmin/users" },
                { text: "Permissions", path: "/superadmin/permissions" },
            ],
        },
    ];


    return (
        <Drawer
            variant="permanent"
            sx={{
                width: 240,
                flexShrink: 0,
                "& .MuiDrawer-paper": {
                    width: 240,
                    boxSizing: "border-box",
                    background: "#00162cff",
                    color: "#fff",
                },
            }}
        >
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 2, borderBottom: "1px solid rgba(44, 73, 110, 0.5)" }}>

                <Typography
                    variant="h6"
                    sx={{
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 1   // adds spacing between logo and text
                    }}
                >
                    <img
                        src={process.env.PUBLIC_URL + '/NGM.png'}
                        alt="logo"
                        style={{ width: 28, height: 28 }} // adjust size as needed
                    />
                    NextGenManager
                </Typography>

            </Box>
            <List>
                {menuItems.map((item, index) => {
                    const isActive = location.pathname === item.path || (item.children && item.children.some(child => location.pathname === child.path));
                    return (
                        <React.Fragment key={index}>
                            <ListItem disablePadding>
                                <ListItemButton
                                    onClick={() => item.children ? toggleSubMenu(item.text) : navigate(item.path)}
                                    sx={{
                                        "&:hover": { backgroundColor: "#53535f8e" },
                                    }}
                                >
                                    <ListItemIcon sx={{ color: "#fff" }}>{item.icon}</ListItemIcon>
                                    <ListItemText
                                        primary={item.text}
                                        slotProps={{ primary: { fontSize: "0.875rem", color: "#fff" } }}
                                    />
                                    {item.children && (openSubMenus[item.text] ? <ExpandLess /> : <ExpandMore />)}
                                </ListItemButton>

                            </ListItem>

                            {item.children && (
                                <Collapse in={openSubMenus[item.text]} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding>
                                        {item.children.map((child, childIndex) => (
                                            <ListItemButton
                                                key={childIndex}
                                                onClick={() => navigate(child.path)}
                                                sx={{
                                                    pl: 4,
                                                    // backgroundColor: location.pathname === child.path ? "#00acc1" : "transparent",
                                                    "&:hover": { backgroundColor: "#53535f8e" },
                                                }}
                                            >
                                                <ListItemText primary={child.text} sx={{ color: "#fff" }} slotProps={{ primary: { fontSize: "0.875rem", color: "#fff" } }} />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </Collapse>
                            )}
                        </React.Fragment>
                    );
                })}
            </List>

        </Drawer>
    );
};

export default Sidebar;
