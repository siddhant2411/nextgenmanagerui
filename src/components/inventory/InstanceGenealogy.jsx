import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Stack, Chip, Divider
} from '@mui/material';
import {
  RadioButtonChecked,
  LocalShipping,
  AssignmentTurnedIn,
  Factory,
  Inventory2,
  Person
} from '@mui/icons-material';
import { format } from 'date-fns';
import { getInstanceHistory } from '../../services/inventoryService';

const StepIcon = ({ type }) => {
  const iconStyle = { fontSize: 20 };
  switch (type) {
    case 'RECEIVE': return <Inventory2 sx={{ ...iconStyle, color: '#2563eb' }} />;
    case 'DISPATCH': return <LocalShipping sx={{ ...iconStyle, color: '#059669' }} />;
    case 'ALLOCATE': return <AssignmentTurnedIn sx={{ ...iconStyle, color: '#d97706' }} />;
    case 'TRANSFER': return <Factory sx={{ ...iconStyle, color: '#7c3aed' }} />;
    default: return <RadioButtonChecked sx={{ ...iconStyle, color: '#64748b' }} />;
  }
};

const InstanceGenealogy = ({ instanceId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (instanceId) {
      fetchHistory();
    }
  }, [instanceId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getInstanceHistory(instanceId);
      setHistory(res || []);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress size={24} /></Box>;
  if (history.length === 0) return <Typography variant="body2" color="text.secondary" textAlign="center" p={4}>No movement history found for this instance.</Typography>;

  return (
    <Box sx={{ py: 2 }}>
      {history.map((step, index) => (
        <Box key={step.id} sx={{ position: 'relative', pb: index === history.length - 1 ? 0 : 4 }}>
          {/* Vertical Line */}
          {index !== history.length - 1 && (
            <Box sx={{
              position: 'absolute',
              left: 20,
              top: 24,
              bottom: 0,
              width: 2,
              bgcolor: '#e2e8f0',
              zIndex: 0
            }} />
          )}

          <Stack direction="row" spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              bgcolor: 'white',
              border: '2px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <StepIcon type={step.transactionType} />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {step.transactionType} 
                    {step.referenceNumber && (
                      <Chip 
                        label={step.referenceNumber} 
                        size="small" 
                        sx={{ ml: 1.5, height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#f1f5f9' }} 
                      />
                    )}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                    {format(new Date(step.timestamp), 'dd MMM yyyy, hh:mm a')}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Person sx={{ fontSize: 14, color: '#94a3b8' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>
                    {step.actionBy || 'System'}
                  </Typography>
                </Stack>
              </Stack>

              <Paper elevation={0} sx={{ mt: 1.5, p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>From</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>{step.fromLocation || '—'}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>To</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>{step.toLocation || '—'}</Typography>
                    </Box>
                  </Stack>
                  {step.remarks && (
                    <>
                      <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />
                      <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>
                        "{step.remarks}"
                      </Typography>
                    </>
                  )}
                </Stack>
              </Paper>
            </Box>
          </Stack>
        </Box>
      ))}
    </Box>
  );
};

export default InstanceGenealogy;
