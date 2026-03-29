import React, { useState } from "react";
import {
    IconButton,
    Badge,
    Menu,
    MenuItem,
    Typography,
    Box,
} from "@mui/material";
import { NotificationsOutlined } from "@mui/icons-material";

export default function Notification() {
    const [notifications] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null);

    const unreadCount = notifications.filter((n) => n.status === "unread").length;

    return (
        <div>
            <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsOutlined />
                </Badge>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{ sx: { minWidth: 280, maxHeight: 400 } }}
            >
                {notifications.length === 0 ? (
                    <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
                        <NotificationsOutlined sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                            No notifications
                        </Typography>
                    </Box>
                ) : (
                    notifications.map((n) => (
                        <MenuItem key={n.id}>
                            {n.message}
                        </MenuItem>
                    ))
                )}
            </Menu>
        </div>
    );
}
