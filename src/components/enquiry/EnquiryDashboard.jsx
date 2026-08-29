import React from 'react';
import { Box, Paper, Typography, Stack, Skeleton, Tooltip } from '@mui/material';
import { T, SHELL, STATUS, MONO, EYEBROW, fmtMoney, fmtNum } from '../../theme/moduleTokens';

/**
 * The compact tile strip above the enquiry register.
 *
 * This is now the ONLY definition of these tiles. Enquiry.jsx used to render its own inline copy
 * alongside this component; the two had already drifted apart on which figures they showed and how
 * they were coloured, which is the ordinary way a dashboard starts contradicting itself.
 *
 * The register asks for ALL_TIME, so what it shows is the state of the whole book — "Total Leads"
 * on a register page means every lead, not the ones raised since the 1st. The period-aware view of
 * the same data is the Pipeline Desk (components/crm/CrmDashboard.jsx).
 *
 * Stock figures (open, overdue, never contacted) carry a severity stripe because they describe
 * work waiting to be done. Flow figures do not — a stripe there would be decoration.
 *
 * Chrome comes from crmTokens.SHELL, the same tokens the Pipeline Desk's tiles use. Both strips
 * sit in the same place — floated up into the dark masthead — so a reader moving between the two
 * screens should not be able to tell that the tiles were built twice.
 */

const Tile = ({ label, value, hint, severity, loading, tip }) => {
  const body = (
    <Paper
      elevation={0}
      sx={{
        flex: '1 1 165px', minWidth: 158, p: '15px 17px', position: 'relative', overflow: 'hidden',
        border: `1px solid ${T.rule}`, borderRadius: SHELL.radius, bgcolor: T.surface,
        boxShadow: SHELL.cardShadow,
        ...(severity && {
          '&::before': {
            content: '""', position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px',
            bgcolor: severity,
          },
        }),
      }}
    >
      <Typography component="div" sx={EYEBROW}>{label}</Typography>
      {loading ? (
        <Skeleton width="65%" height={30} />
      ) : (
        <>
          <Typography sx={{
            fontFamily: MONO, fontSize: 22, fontWeight: 600, letterSpacing: '-.025em',
            lineHeight: 1.15, mt: 0.7, color: T.ink, fontVariantNumeric: 'tabular-nums',
          }}>
            {value}
          </Typography>
          {hint && (
            <Typography sx={{ fontSize: 11, color: T.ink3, mt: 0.35, fontWeight: 600 }}>{hint}</Typography>
          )}
        </>
      )}
    </Paper>
  );

  return tip ? <Tooltip arrow title={tip}>{body}</Tooltip> : body;
};

const EnquiryDashboard = ({ summary, loading }) => {
  const stock = summary?.stock;

  // The win-rate tile is only as trustworthy as how much of the book is coded, so the coverage
  // travels with it rather than sitting in a tooltip nobody opens.
  const coverage = summary?.closedCount
    ? `${summary.codedCount ?? 0} of ${summary.closedCount} coded`
    : 'nothing closed yet';

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={0} gap={1.6} flexWrap="wrap" useFlexGap>
        <Tile
          label="Total leads"
          value={fmtNum(stock?.totalLeads)}
          hint={`${fmtNum(stock?.openCount)} still open`}
          loading={loading}
        />
        <Tile
          label="Open pipeline"
          value={fmtMoney(stock?.openPipeline)}
          hint="expected value, open only"
          severity={T.accent}
          loading={loading}
        />
        <Tile
          label="Won"
          value={fmtNum(summary?.won)}
          hint={`${fmtMoney(summary?.bookedRevenue)} booked`}
          loading={loading}
        />
        <Tile
          label="Win rate"
          value={summary?.winRatePercent != null ? `${Number(summary.winRatePercent).toFixed(1)}%` : '—'}
          hint={coverage}
          loading={loading}
          tip="Won ÷ (won + lost). Enquiries we declined, or that went silent, are deliberately out of the denominator — we never lost those."
        />
        <Tile
          label="Overdue follow-up"
          value={fmtNum(stock?.overdueFollowups)}
          hint={stock?.overdueValue ? `${fmtMoney(stock.overdueValue)} unattended` : 'nothing overdue'}
          severity={stock?.overdueFollowups > 0 ? STATUS.critical : STATUS.good}
          loading={loading}
        />
        <Tile
          label="Never chased"
          value={fmtNum(stock?.openNeverContacted)}
          hint="open, no contact logged"
          severity={stock?.openNeverContacted > 0 ? STATUS.serious : STATUS.good}
          loading={loading}
        />
      </Stack>
    </Box>
  );
};

export default EnquiryDashboard;
