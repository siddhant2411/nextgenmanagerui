import React from 'react';
import { Box, Paper, Typography, Stack, Skeleton } from "@mui/material";

const StatCard = ({ label, value, accent = '#1565c0', loading }) => (
  <Paper
    elevation={0}
    sx={{
      flex: 1,
      minWidth: 160,
      p: '11px 14px',
      borderRadius: 1.5,
      border: '1px solid #e2e8f0',
      borderLeft: `3px solid ${accent}`,
      background: '#fff',
      transition: 'box-shadow 0.15s',
      '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.07)' },
    }}
  >
    <Typography sx={{ fontSize: '0.65625rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', mb: '5px' }}>
      {label}
    </Typography>
    {loading ? (
      <Skeleton width="60%" height={32} />
    ) : (
      <Typography sx={{ fontSize: '1.625rem', fontWeight: 500, color: '#1e293b', lineHeight: 1 }}>
        {value}
      </Typography>
    )}
  </Paper>
);

const EnquiryDashboard = ({ summary, loading }) => {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <StatCard 
          label="Total Leads" 
          value={summary?.totalLeads || 0} 
          accent="#1565c0" 
          loading={loading} 
        />
        <StatCard 
          label="New / Fresh" 
          value={summary?.newLeads || 0} 
          accent="#3b82f6" 
          loading={loading} 
        />
        <StatCard 
          label="In Follow-up" 
          value={summary?.followUp || 0} 
          accent="#f59e0b" 
          loading={loading} 
        />
        <StatCard 
          label="Overdue Follow-up" 
          value={summary?.overdueFollowups || 0} 
          accent="#ef4444" 
          loading={loading} 
        />
        <StatCard 
          label="Expected Revenue" 
          value={formatCurrency(summary?.totalExpectedRevenue)} 
          accent="#8b5cf6" 
          loading={loading} 
        />
        <StatCard 
          label="Won Revenue" 
          value={formatCurrency(summary?.wonRevenue)} 
          accent="#10b981" 
          loading={loading} 
        />
      </Stack>
    </Box>
  );
};

export default EnquiryDashboard;
