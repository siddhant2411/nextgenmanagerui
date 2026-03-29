import React from 'react';
import { Box, Button, Chip, LinearProgress, Paper, Typography } from '@mui/material';

const PRIORITY_COLORS = { URGENT: '#ef4444', HIGH: '#f97316', NORMAL: '#3b82f6', LOW: '#9ca3af' };

const STATUS_CHIP_COLOR = {
  COMPLETED: 'success',
  IN_PROGRESS: 'primary',
  READY: 'warning',
  PLANNED: 'default',
};

export default function ShopFloorTaskCard({ task, onComplete }) {
  const progressPct = task.plannedQuantity > 0
    ? Math.min((task.completedQuantity / task.plannedQuantity) * 100, 100)
    : 0;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        borderLeft: `5px solid ${PRIORITY_COLORS[task.priority] || '#3b82f6'}`,
        border: '1px solid #e3e8ef',
        borderLeftWidth: 5,
        borderLeftColor: PRIORITY_COLORS[task.priority] || '#3b82f6',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        transition: 'box-shadow 0.2s ease',
        '&:hover': { boxShadow: '0 6px 18px rgba(2, 12, 27, 0.1)' },
      }}
    >
      {/* WO Number + Priority Badge */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.2rem' }, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {task.workOrderNumber}
        </Typography>
        <Chip
          label={task.priority}
          size="small"
          sx={{
            bgcolor: PRIORITY_COLORS[task.priority] || '#3b82f6',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.7rem',
          }}
        />
      </Box>

      {/* Operation Name + Status */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography sx={{ fontSize: { xs: '0.95rem', sm: '1.05rem' }, fontWeight: 500, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {task.operationName}
        </Typography>
        <Chip
          label={task.status}
          size="small"
          variant="outlined"
          color={STATUS_CHIP_COLOR[task.status] || 'default'}
          sx={{ fontSize: '0.7rem', fontWeight: 600 }}
        />
      </Box>

      {/* Qty Progress Bar */}
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" fontWeight={600} color="text.primary">
            {task.completedQuantity} / {task.plannedQuantity}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {Math.round(progressPct)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPct}
          sx={{
            height: 10,
            borderRadius: 5,
            bgcolor: '#e5e9f2',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
            },
          }}
        />
      </Box>

      {/* Available Input Info */}
      {task.availableInputQuantity !== undefined && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
          Available input: <strong>{task.availableInputQuantity}</strong>
        </Typography>
      )}

      {/* Complete Button */}
      <Button
        variant="contained"
        fullWidth
        onClick={() => onComplete(task)}
        disabled={task.status === 'COMPLETED'}
        sx={{
          py: 1.25,
          fontSize: { xs: '0.95rem', sm: '1rem' },
          fontWeight: 700,
          borderRadius: 1.5,
          textTransform: 'none',
          boxShadow: '0 4px 12px rgba(25, 118, 210, 0.22)',
        }}
      >
        Complete Qty
      </Button>
    </Paper>
  );
}
