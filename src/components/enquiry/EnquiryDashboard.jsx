import React from 'react';
import { Box, Paper, Typography, Stack, LinearProgress, Tooltip } from "@mui/material";
import {
  TrendingUp, People, CurrencyRupee, EmojiEvents,
  Schedule, WarningAmber
} from '@mui/icons-material';

const StatCard = ({ icon, label, value, subtitle, color, bgColor, borderColor }) => (
  <Paper elevation={0} sx={{
    p: 2.5, flex: 1, minWidth: 180, borderRadius: 3,
    bgcolor: bgColor || 'white', border: `1px solid ${borderColor || '#e2e8f0'}`,
    display: 'flex', alignItems: 'center', gap: 2,
    transition: 'box-shadow 0.2s, transform 0.15s',
    '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)', transform: 'translateY(-1px)' }
  }}>
    <Box sx={{
      bgcolor: `${color}15`, p: 1.25, borderRadius: 2,
      color: color, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ letterSpacing: '0.02em' }}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ color: '#1e293b', lineHeight: 1.2 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  </Paper>
);

const EnquiryDashboard = ({ enquiries }) => {
  const total = enquiries.length;
  const openEnquiries = enquiries.filter(e => !['CONVERTED', 'LOST', 'CLOSED'].includes(e.status));
  const totalOpen = openEnquiries.length;
  const pipelineValue = openEnquiries.reduce((sum, e) => sum + (parseFloat(e.expectedRevenue) || 0), 0);

  // Count by status
  const statusCounts = {};
  enquiries.forEach(e => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });

  const converted = statusCounts['CONVERTED'] || 0;
  const lost = statusCounts['LOST'] || 0;
  const followUp = statusCounts['FOLLOW_UP'] || 0;
  const newLeads = statusCounts['NEW'] || 0;

  // Win rate
  const closedDeals = converted + lost;
  const winRate = closedDeals > 0 ? ((converted / closedDeals) * 100).toFixed(0) : '—';

  // Overdue follow-ups (daysForNextFollowup <= 0 means overdue)
  const overdueCount = enquiries.filter(e =>
    !['CONVERTED', 'LOST', 'CLOSED'].includes(e.status) &&
    e.daysForNextFollowup !== null && e.daysForNextFollowup <= 0
  ).length;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Stats Row */}
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <StatCard
          icon={<People />} label="Open Leads" value={totalOpen}
          subtitle={`${newLeads} new · ${followUp} follow-up`}
          color="#3b82f6"
        />
        <StatCard
          icon={<CurrencyRupee />} label="Pipeline Value" 
          value={`₹${pipelineValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subtitle={`across ${totalOpen} opportunities`}
          color="#8b5cf6"
        />
        <StatCard
          icon={<EmojiEvents />} label="Converted" value={converted}
          subtitle={`Win rate: ${winRate}%`}
          color="#10b981"
        />
        <StatCard
          icon={<TrendingUp />} label="Lost" value={lost}
          subtitle={closedDeals > 0 ? `${closedDeals} total decided` : 'No decisions yet'}
          color="#ef4444"
        />
        {overdueCount > 0 && (
          <StatCard
            icon={<WarningAmber />} label="Overdue Follow-ups" value={overdueCount}
            subtitle="Need immediate attention"
            color="#f59e0b" bgColor="#fffbeb" borderColor="#fde68a"
          />
        )}
      </Stack>

      {/* Pipeline bar */}
      {total > 0 && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e2e8f0' }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block', letterSpacing: '0.04em' }}>
            PIPELINE DISTRIBUTION
          </Typography>
          <Stack direction="row" sx={{ height: 8, borderRadius: 4, overflow: 'hidden' }}>
            {[
              { status: 'NEW', color: '#3b82f6', count: newLeads },
              { status: 'CONTACTED', color: '#6366f1', count: statusCounts['CONTACTED'] || 0 },
              { status: 'FOLLOW_UP', color: '#f59e0b', count: followUp },
              { status: 'CONVERTED', color: '#10b981', count: converted },
              { status: 'LOST', color: '#ef4444', count: lost },
              { status: 'CLOSED', color: '#94a3b8', count: statusCounts['CLOSED'] || 0 },
            ].filter(s => s.count > 0).map(s => (
              <Tooltip key={s.status} title={`${s.status.replace('_', ' ')}: ${s.count}`} arrow>
                <Box sx={{
                  width: `${(s.count / total) * 100}%`, bgcolor: s.color,
                  transition: 'width 0.4s ease'
                }} />
              </Tooltip>
            ))}
          </Stack>
          <Stack direction="row" spacing={2} mt={1} flexWrap="wrap">
            {[
              { label: 'New', color: '#3b82f6', count: newLeads },
              { label: 'Contacted', color: '#6366f1', count: statusCounts['CONTACTED'] || 0 },
              { label: 'Follow Up', color: '#f59e0b', count: followUp },
              { label: 'Converted', color: '#10b981', count: converted },
              { label: 'Lost', color: '#ef4444', count: lost },
            ].filter(s => s.count > 0).map(s => (
              <Stack key={s.label} direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                <Typography variant="caption" color="text.secondary">{s.label}: {s.count}</Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default EnquiryDashboard;
