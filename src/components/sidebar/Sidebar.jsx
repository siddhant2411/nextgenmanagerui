import React from "react";
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import {
    Dashboard,
    Person,
    TableChart,
    Notifications,
    Map,
    Language,
    FormatListBulleted,
    ListAltOutlined, Inventory2, InfoOutlined,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import {Contact} from "lucide-react";

const Sidebar = () => {
    const location = useLocation(); // Get the current location
    const navigate = useNavigate(); // For navigation

    const menuItems = [

        { text: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
        { text: "Products", icon: <ListAltOutlined />, path: "/inventory-item" },
        { text: "Bill Of Material", icon: <FormatListBulleted />, path: "/bom" },
        { text: "Company", icon: <Contact />, path: "/contact" },
        { text: "Inventory", icon: <Inventory2 />, path: "/inventory" },
        { text: "Enquiry", icon: <InfoOutlined />, path: "/enquiry" },
        { text: "Notifications", icon: <Notifications />, path: "/notifications" },
        { text: "RTL Support", icon: <Language />, path: "/rtl-support" },
        { text: "SuperAdmin", icon: <Person />, path: "/superadmin" },

        { text: "User Profile", icon: <Person />, path: "/user-profile" },
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
                    background: "#2c3e50", // Sidebar background color
                    color: "#fff",
                },
            }}
        >
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 2 }}>
                <Typography variant="h6" sx={{ color: "#00acc1" }}>
                    SMART MANAGER
                </Typography>
            </Box>
            <List>
                {menuItems.map((item, index) => (
                    <ListItem disablePadding key={index}>
                        <ListItemButton
                            onClick={() => navigate(item.path)} // Navigate to the path
                            sx={{
                                backgroundColor: location.pathname === item.path ? "#00acc1" : "transparent", // Highlight active item
                                "&:hover": { backgroundColor: "#00acc1" },
                            }}
                        >
                            <ListItemIcon sx={{ color: "#fff" }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Drawer>
    );
};

export default Sidebar;
