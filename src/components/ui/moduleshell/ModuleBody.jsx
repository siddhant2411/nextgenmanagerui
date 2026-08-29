import React from 'react';
import { Container } from '@mui/material';
import { SHELL } from '../../../theme/moduleTokens';

/**
 * The content column beneath a ModuleHero, pulled up so its first row of cards overlaps the
 * masthead's bottom edge. Paired with ModuleHero's bottom padding — neither value means anything
 * on its own.
 */
const ModuleBody = ({ children, sx }) => (
  <Container maxWidth="xl" sx={{ mt: SHELL.contentPullUp, pb: 6, ...sx }}>
    {children}
  </Container>
);

export default ModuleBody;
