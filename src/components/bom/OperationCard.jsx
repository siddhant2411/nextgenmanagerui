import React, { useState } from 'react';
import { Box, Chip, Collapse, Paper, Typography } from '@mui/material';
import {
  AccessTime, ExpandMore, ExpandLess, Visibility, Build, Engineering
} from '@mui/icons-material';

const BORDER_COLOR = '#e5e7eb';

export default function OperationCard({ operation, onClick, highlight }) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = (e) => { e.stopPropagation(); setExpanded(!expanded); };

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 1, borderRadius: 1.5, cursor: "pointer", overflow: "hidden",
        borderColor: highlight ? '#1565c0' : BORDER_COLOR,
        borderWidth: highlight ? 2 : 1,
        bgcolor: highlight ? '#f0f7ff' : '#fff',
        transition: 'all 0.15s',
        '&:hover': { borderColor: '#90caf9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
      }}
      onClick={onClick}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Box sx={{
            width: 24, height: 24, borderRadius: '50%',
            bgcolor: '#0f2744', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
          }}>
            {operation.sequenceNumber || '#'}
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f2744', fontSize: '0.8rem' }}>
            {operation.name || 'Unnamed'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {operation.inspection && (
            <Chip icon={<Visibility sx={{ fontSize: 12 }} />} label="QC" size="small"
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 500, bgcolor: '#e8f5e9', color: '#2e7d32' }} />
          )}
          {operation.costType && operation.costType !== 'CALCULATED' && (
            <Chip label={operation.costType === 'FIXED_RATE' ? 'Fixed' : 'Sub-con'} size="small"
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 500, bgcolor: '#fff3e0', color: '#e65100' }} />
          )}
          <Box onClick={handleToggle} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', ml: 0.5 }}>
            {expanded ? <ExpandLess sx={{ fontSize: 16, color: '#6b7280' }} /> : <ExpandMore sx={{ fontSize: 16, color: '#6b7280' }} />}
          </Box>
        </Box>
      </Box>

      {/* Summary row */}
      <Box sx={{ display: 'flex', gap: 2, px: 1.5, pb: 1, flexWrap: 'wrap' }}>
        {operation.productionJob?.jobName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Build sx={{ fontSize: 11, color: '#6b7280' }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {operation.productionJob.jobName}
            </Typography>
          </Box>
        )}
        {operation.workCenter?.centerName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Engineering sx={{ fontSize: 11, color: '#6b7280' }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {operation.workCenter.centerName}
            </Typography>
          </Box>
        )}
        {(operation.setupTime || operation.runTime) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 11, color: '#6b7280' }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {operation.setupTime || 0}h + {operation.runTime || 0}h
            </Typography>
          </Box>
        )}
      </Box>

      {/* Expanded Details */}
      <Collapse in={expanded}>
        <Box sx={{ px: 1.5, pb: 1, pt: 0.5, borderTop: `1px solid ${BORDER_COLOR}` }}>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={0.75}>
            <DetailItem label="Labor Role" value={operation.laborRole?.roleName} />
            <DetailItem label="Machine" value={operation.machineDetails?.machineName} />
            <DetailItem label="Operators" value={operation.numberOfOperators} />
            <DetailItem label="Cost Type" value={operation.costType?.replace(/_/g, ' ')} />
            {operation.fixedCostPerUnit != null && (
              <DetailItem label="Fixed Cost" value={`₹${operation.fixedCostPerUnit}`} />
            )}
          </Box>
          {operation.notes && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
              Notes: {operation.notes}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <Box>
      <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151' }}>{value}</Typography>
    </Box>
  );
}
