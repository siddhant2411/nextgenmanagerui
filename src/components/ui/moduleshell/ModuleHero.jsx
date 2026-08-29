import React from 'react';
import { Box, Container, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { SHELL } from '../../../theme/moduleTokens';

/**
 * The dark masthead every register screen opens with.
 *
 * Deliberately not configurable beyond title/subtitle/actions: the whole point is that the sales
 * and purchase registers cannot look slightly different from each other. Screens used to hand-roll
 * this and had already drifted on background, title weight and padding.
 *
 * The masthead's bottom padding is deep because the page's first row of cards is pulled up into it
 * (`SHELL.contentPullUp`) — see ModuleBody. The two values are a matched pair.
 */
const ModuleHero = ({ title, subtitle, actions, onBack, backLabel = 'Back', badge, children }) => (
  <Box sx={{
    bgcolor: SHELL.heroBg,
    backgroundImage: SHELL.heroImage,
    color: SHELL.heroInk,
    pt: SHELL.heroPadTop,
    pb: SHELL.heroPadBottom,
  }}>
    <Container maxWidth="xl">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        gap={3}
      >
        <Stack direction="row" alignItems="center" gap={2}>
          {onBack && (
            <Tooltip title={backLabel}>
              <IconButton
                onClick={onBack}
                sx={{
                  color: SHELL.heroInk, border: `1px solid ${SHELL.heroLine}`, borderRadius: 3,
                  '&:hover': { bgcolor: SHELL.heroFill },
                }}
              >
                <ArrowBack />
              </IconButton>
            </Tooltip>
          )}
          <Box>
            <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-0.03em' }}>
                {title}
              </Typography>
              {badge}
            </Stack>
            {subtitle && (
              <Typography variant="h6" sx={{ color: SHELL.heroInkDim, fontWeight: 500, maxWidth: 620, mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        {actions && <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>{actions}</Stack>}
      </Stack>
      {children && <Box sx={{ mt: 4 }}>{children}</Box>}
    </Container>
  </Box>
);

export default ModuleHero;
