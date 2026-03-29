import React, { useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Box, Typography, Chip, Divider, Grid, Paper,
} from '@mui/material';

const RESULT_COLORS = {
    PASS: '#22c55e',
    FAIL: '#ef4444',
    CONDITIONAL_PASS: '#eab308',
    PENDING: '#9ca3af',
};

function SummaryCard({ label, value, color = '#3b82f6' }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.5,
                borderRadius: 1.5,
                textAlign: 'center',
                borderColor: color,
                borderWidth: 1.5,
            }}
        >
            <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
            <Typography fontWeight={700} fontSize="1.5rem" sx={{ color }}>{value ?? 0}</Typography>
        </Paper>
    );
}

export default function QCReportDialog({ open, onClose, data }) {
    const printRef = useRef();

    if (!data) return null;

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
      <html><head><title>QC Report</title>
      <style>
        body { font-family: 'IBM Plex Sans', system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { font-size: 1.5rem; margin: 0 0 4px; }
        .header p { color: #666; margin: 0; font-size: 0.9rem; }
        .cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center; }
        .card .label { font-size: 0.75rem; color: #666; }
        .card .value { font-size: 1.25rem; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 0.8rem; text-align: left; }
        th { background: #0b1b2b; color: #e6edf5; font-weight: 600; }
        .pass { color: #22c55e; font-weight: 600; }
        .fail { color: #ef4444; font-weight: 600; }
        .pending { color: #9ca3af; font-weight: 600; }
        .conditional { color: #eab308; font-weight: 600; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: 700; color: #fff; font-size: 0.85rem; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="header">
        <h1>Quality Control Report</h1>
        <p>${data.workOrderNumber || 'Work Order'} — ${data.itemName || ''}</p>
      </div>
      <div class="cards">
        <div class="card"><div class="label">Total Tests</div><div class="value">${data.totalTests ?? 0}</div></div>
        <div class="card"><div class="label">Completed</div><div class="value">${data.completedTests ?? 0}</div></div>
        <div class="card"><div class="label">Passed</div><div class="value" style="color:#22c55e">${data.passedTests ?? 0}</div></div>
        <div class="card"><div class="label">Failed</div><div class="value" style="color:#ef4444">${data.failedTests ?? 0}</div></div>
        <div class="card"><div class="label">Pending</div><div class="value" style="color:#9ca3af">${data.pendingTests ?? 0}</div></div>
      </div>
      <div style="text-align:center;margin-bottom:16px">
        <span class="badge" style="background:${data.overallResult === 'PASS' ? '#22c55e' : data.overallResult === 'FAIL' ? '#ef4444' : '#9ca3af'}">
          Overall: ${data.overallResult || 'PENDING'}
        </span>
      </div>
      <table>
        <thead><tr><th>#</th><th>Test Name</th><th>Type</th><th>Range</th><th>Value</th><th>Result</th><th>Tested By</th><th>Remarks</th></tr></thead>
        <tbody>
          ${(data.testResults || []).map((t, i) => `
            <tr>
              <td>${t.sequence ?? i + 1}</td>
              <td>${t.testName || '-'}${t.isMandatory ? ' *' : ''}</td>
              <td>${t.inspectionType || '-'}</td>
              <td>${t.minValue != null && t.maxValue != null ? `${t.minValue} – ${t.maxValue} ${t.unitOfMeasure || ''}` : '-'}</td>
              <td>${t.resultValue != null ? t.resultValue : '-'}</td>
              <td class="${t.result === 'PASS' ? 'pass' : t.result === 'FAIL' ? 'fail' : t.result === 'CONDITIONAL_PASS' ? 'conditional' : 'pending'}">${t.result || 'PENDING'}</td>
              <td>${t.testedBy || '-'}</td>
              <td>${t.remarks || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="margin-top:20px;font-size:0.75rem;color:#999;text-align:center">Generated on ${new Date().toLocaleString('en-IN')}</p>
      </body></html>
    `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, color: '#0f2744' }}>
                QC Report — {data.workOrderNumber || ''}
            </DialogTitle>

            <DialogContent ref={printRef}>
                {/* Summary Cards */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' },
                        gap: 1.5,
                        mb: 2,
                    }}
                >
                    <SummaryCard label="Total Tests" value={data.totalTests} />
                    <SummaryCard label="Completed" value={data.completedTests} color="#6366f1" />
                    <SummaryCard label="Passed" value={data.passedTests} color="#22c55e" />
                    <SummaryCard label="Failed" value={data.failedTests} color="#ef4444" />
                    <SummaryCard label="Pending" value={data.pendingTests} color="#9ca3af" />
                </Box>

                {/* Overall badge */}
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Chip
                        label={`Overall: ${data.overallResult || 'PENDING'}`}
                        sx={{
                            bgcolor: RESULT_COLORS[data.overallResult] || RESULT_COLORS.PENDING,
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            px: 2,
                            py: 0.5,
                        }}
                    />
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Detailed results */}
                {data.testResults?.length > 0 && (
                    <Box sx={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#0b1b2b', color: '#e6edf5' }}>
                                    <th style={{ padding: '8px', fontSize: '0.75rem', textAlign: 'left' }}>#</th>
                                    <th style={{ padding: '8px', fontSize: '0.75rem', textAlign: 'left' }}>Test Name</th>
                                    <th style={{ padding: '8px', fontSize: '0.75rem', textAlign: 'left' }}>Type</th>
                                    <th style={{ padding: '8px', fontSize: '0.75rem', textAlign: 'left' }}>Range</th>
                                    <th style={{ padding: '8px', fontSize: '0.75rem', textAlign: 'left' }}>Value</th>
                                    <th style={{ padding: '8px', fontSize: '0.75rem', textAlign: 'left' }}>Result</th>
                                    <th style={{ padding: '8px', fontSize: '0.75rem', textAlign: 'left' }}>Tested By</th>
                                    <th style={{ padding: '8px', fontSize: '0.75rem', textAlign: 'left' }}>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.testResults.map((t, i) => (
                                    <tr key={t.id || i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '6px 8px', fontSize: '0.8rem' }}>{t.sequence ?? i + 1}</td>
                                        <td style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 500 }}>
                                            {t.testName || '-'}{t.isMandatory ? ' *' : ''}
                                        </td>
                                        <td style={{ padding: '6px 8px', fontSize: '0.8rem' }}>{t.inspectionType || '-'}</td>
                                        <td style={{ padding: '6px 8px', fontSize: '0.8rem' }}>
                                            {t.minValue != null && t.maxValue != null ? `${t.minValue} – ${t.maxValue} ${t.unitOfMeasure || ''}` : '-'}
                                        </td>
                                        <td style={{ padding: '6px 8px', fontSize: '0.8rem' }}>{t.resultValue != null ? t.resultValue : '-'}</td>
                                        <td style={{ padding: '6px 8px' }}>
                                            <Chip
                                                size="small"
                                                label={t.result || 'PENDING'}
                                                sx={{
                                                    bgcolor: RESULT_COLORS[t.result] || RESULT_COLORS.PENDING,
                                                    color: '#fff',
                                                    fontWeight: 600,
                                                    fontSize: '0.65rem',
                                                }}
                                            />
                                        </td>
                                        <td style={{ padding: '6px 8px', fontSize: '0.8rem' }}>{t.testedBy || '-'}</td>
                                        <td style={{ padding: '6px 8px', fontSize: '0.8rem' }}>{t.remarks || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={handlePrint} variant="outlined" sx={{ textTransform: 'none' }}>
                    Print / Download
                </Button>
                <Button onClick={onClose} variant="contained" sx={{ textTransform: 'none' }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
