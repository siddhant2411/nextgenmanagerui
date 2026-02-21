import React, { useMemo, useState } from "react";
import {
    Avatar,
    Box,
    Divider,
    IconButton,
    ListItemIcon,
    Menu,
    MenuItem,
    Typography,
} from "@mui/material";
import Logout from "@mui/icons-material/Logout";
import Person from "@mui/icons-material/Person";
import Settings from "@mui/icons-material/Settings";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../auth/AuthContext";

export default function UserMenu() {
    const { user, roles, logout } = useAuth();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const username = user?.username || "User";
    const primaryRole = useMemo(() => (roles?.[0] ? roles[0] : "No role"), [roles]);
    const avatarLetter = username.charAt(0).toUpperCase();

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleMenuClose();
        logout();
    };

    const handleAccountSettings = () => {
        handleMenuClose();
        navigate("/account/settings");
    };

    return (
        <>
            <IconButton
                onClick={handleMenuOpen}
                size="small"
                sx={{
                    ml: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    textTransform: "none",
                }}
            >
                <Avatar sx={{ width: 34, height: 34, bgcolor: "#0f5f4d" }}>{avatarLetter}</Avatar>
                <Typography variant="body2" fontWeight={700}>
                    {username}
                </Typography>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                PaperProps={{
                    elevation: 4,
                    sx: {
                        mt: 1.5,
                        borderRadius: 2,
                        minWidth: 240,
                        p: 1,
                    },
                }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
                <Box sx={{ px: 1.5, py: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {primaryRole}
                    </Typography>
                </Box>

                <Divider sx={{ my: 0.5 }} />

                <MenuItem disabled>
                    <ListItemIcon>
                        <Person fontSize="small" />
                    </ListItemIcon>
                    Profile
                </MenuItem>

                <MenuItem onClick={handleAccountSettings}>
                    <ListItemIcon>
                        <Settings fontSize="small" />
                    </ListItemIcon>
                    Account Settings
                </MenuItem>

                <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                        <Logout fontSize="small" />
                    </ListItemIcon>
                    Logout
                </MenuItem>
            </Menu>
        </>
    );
}
