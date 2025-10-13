import React, { useEffect, useState } from "react";
import { IconButton, Badge, Menu, MenuItem } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { NotificationsOutlined } from "@mui/icons-material";


export default function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    // fetch("/api/notifications/123") // replace with userId
    //   .then(res => res.json())
    //   .then(data => setNotifications(data));
    setNotifications([{
      id: 1,
      message: "Notification 1",
      date: new Date(),
      status: "unread"
    },
    {
      id: 2,
      message: "Notification 2",
      date: new Date(),
      status: "read"
    },]
    )
  }, []);

  const unreadCount = notifications.filter(n => n.status === "unread").length;

  return (
    <div>
      <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsOutlined />
        </Badge>
      </IconButton>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {notifications.length === 0 && <MenuItem>No notifications</MenuItem>}
        {notifications.map((n) => (
          <MenuItem key={n.id} onClick={() => window.location.href = n.link}>
            {n.message}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
