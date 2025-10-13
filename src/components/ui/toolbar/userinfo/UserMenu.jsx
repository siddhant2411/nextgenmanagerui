import React, { useState } from "react";
import {
    Avatar,
    IconButton,
    Menu,
    MenuItem,
    Divider,
    ListItemIcon,
    Typography,
    Box,
} from "@mui/material";
import Logout from "@mui/icons-material/Logout";
import Settings from "@mui/icons-material/Settings";
import Person from "@mui/icons-material/Person";

export default function UserMenu() {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    // Example user data (replace with API response / auth context)
    const user = {
        username: "smavani",
        name: "Siddhant Mavani",
        role: "Admin",
        email: "siddhant@example.com",
    };

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    return (
        <>
            <IconButton
                onClick={handleMenuOpen}
                size="small"
                sx={{
                    ml: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1, // space between avatar and text
                    textTransform: "none",
                }}
            >
                <Avatar sx={{ width: 36, height: 36,bgcolor: "green"  }}>
                    {user.name.charAt(0)}
                </Avatar>
                <Typography variant="body2" fontWeight="bold">
                    {user.username}
                </Typography>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                PaperProps={{
                    elevation: 3,
                    sx: {
                        mt: 1.5,
                        borderRadius: 2,
                        minWidth: 250,
                        p: 1,
                    },
                }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
                {/* User Info Header */}
                <Box sx={{ px: 2, py: 1, textAlign: "center" }}>
                    <Avatar sx={{ width: 72, height: 72, mx: "auto", mb: 1, bgcolor: "green" }}>
                        {user.name.charAt(0)}
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight="bold">
                        {user.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {user.role}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {user.email}
                    </Typography>
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Menu Items */}
                <MenuItem>
                    <ListItemIcon>
                        <Person fontSize="small" />
                    </ListItemIcon>
                    Profile
                </MenuItem>

                <MenuItem>
                    <ListItemIcon>
                        <Settings fontSize="small" />
                    </ListItemIcon>
                    Settings
                </MenuItem>

                <Divider />

                <MenuItem onClick={() => alert("Logout clicked")}>
                    <ListItemIcon>
                        <Logout fontSize="small" />
                    </ListItemIcon>
                    Logout
                </MenuItem>
            </Menu>
        </>

    );
}
