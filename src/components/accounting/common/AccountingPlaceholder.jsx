import React from "react";
import { Box, Typography } from "@mui/material";
import { ConstructionOutlined } from "@mui/icons-material";

const AccountingPlaceholder = ({ screenName }) => (
    <Box
        sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 420,
            gap: 2,
        }}
    >
        <ConstructionOutlined sx={{ fontSize: 48, color: "#cbd5e1" }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: "#475569" }}>
            {screenName}
        </Typography>
        <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            This screen is under construction — coming soon.
        </Typography>
    </Box>
);

export default AccountingPlaceholder;
