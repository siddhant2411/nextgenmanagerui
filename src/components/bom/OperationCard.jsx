import {
  Paper,
  Box,
  Typography,
  Chip,
  IconButton,
  Collapse
} from "@mui/material";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import WorkIcon from "@mui/icons-material/Work";

import { useState } from "react";

export default function OperationCard({ operation }) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);

  const wc = operation?.workCenter;
  const machine = operation.productionJob?.machineDetails;
  const job = operation.productionJob;

  return (
    <Paper
      elevation={1}
      sx={{
        pl: 2,
        borderRadius: "16px",
        width: "50%",
        mx: "auto",
        mt: 3,
        cursor: "pointer",
        transition: "0.2s",
        "&:hover": { boxShadow: 4 },
      }}
    >
      {/* Top Row */}
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WorkIcon sx={{ color: "#555" }} />
          <Typography sx={{ fontWeight: 600 }}>
            {operation.sequenceNumber}. {operation.name}
          </Typography>
        </Box>

        <Box sx={{ textAlign: "right"}}>
          <IconButton onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

      </Box>


      {/* Expanded Content */}
      <Collapse in={expanded}>

        <Typography sx={{ fontSize: 14, mt: 1, color: "#555" }}>
          {job?.jobName ?? "No Job Assigned"}
        </Typography>

        {/* Chips */}
        <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
          {wc && <Chip size="small" label={wc.centerCode} />}
          {wc?.department && <Chip size="small" label={wc.department} />}
          {operation.inspection && (
            <Chip size="small" color="primary" label="Inspection" />
          )}
        </Box>

        {/* Main Info */}
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 14, color: "#444" }}>
            Setup: {operation.setupTime} hrs • Run: {operation.runTime} hrs
          </Typography>

          {wc && (
            <Typography sx={{ fontSize: 13, color: "#777", mt: 0.5 }}>
              {wc.centerName}, {wc.location}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
