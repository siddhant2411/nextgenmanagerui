import React from 'react';
import { Paper, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { T, SHELL, MONO, EYEBROW } from '../../../theme/moduleTokens';

/**
 * One figure in the strip that floats up into the masthead.
 *
 * `severity` draws the left stripe and is for figures that describe work waiting to be done —
 * overdue, unapproved, unreceived. A figure that is merely a count does not get one; a stripe on
 * every tile is decoration and stops meaning anything.
 */
export const StatTile = ({ label, value, hint, severity, loading, tip }) => {
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

/** The strip itself. Tiles flow and wrap; there is no column count to keep in sync with a Grid. */
export const StatStrip = ({ children, sx }) => (
  <Stack direction="row" spacing={0} gap={1.6} flexWrap="wrap" useFlexGap sx={{ mb: 3, ...sx }}>
    {children}
  </Stack>
);

export default StatTile;
