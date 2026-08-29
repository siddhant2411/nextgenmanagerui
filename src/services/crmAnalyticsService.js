import apiService from './apiService';

/**
 * CRM dashboard reads.
 *
 * Two calls, one window. They are issued together so the tiles and the charts describe the same
 * moment — six separate breakdown endpoints would each resolve the period a few hundred
 * milliseconds apart and briefly disagree on screen while the page loads.
 */

/**
 * Builds the query the API accepts, and only that.
 *
 * The endpoints reject any parameter they do not recognise, so a stray key here comes back as a
 * 400 rather than being silently dropped and answered with the default period. That is on purpose:
 * a wrong number under a correct-looking label is worse than an error.
 */
const periodParams = (period) => {
  if (!period) return {};
  if (period.from || period.to) {
    const p = {};
    if (period.from) p.from = period.from;
    if (period.to) p.to = period.to;
    return p;
  }
  return period.preset ? { preset: period.preset } : {};
};

/** Headline figures for the window, the prior window, and the as-of-today stock block. */
export const getCrmSummary = (period) =>
  apiService.get('/enquiry/summary', periodParams(period));

/** Funnel, trend and every grouped breakdown for the same window. */
export const getCrmAnalytics = (period) =>
  apiService.get('/enquiry/analytics', periodParams(period));

/** Both, in parallel. The dashboard has nothing useful to show until each has arrived. */
export const getCrmDashboard = async (period) => {
  const [summary, analytics] = await Promise.all([
    getCrmSummary(period),
    getCrmAnalytics(period),
  ]);
  return { summary, analytics };
};

/**
 * The presets the period rail offers.
 *
 * ALL_TIME is deliberately last and deliberately present: the summary now defaults to THIS_MONTH,
 * so asking for every row is something a caller has to say out loud rather than something they get
 * by omission.
 */
export const PERIOD_PRESETS = [
  { key: 'THIS_MONTH', label: 'This month' },
  { key: 'LAST_MONTH', label: 'Last month' },
  { key: 'THIS_QUARTER', label: 'This quarter' },
  { key: 'THIS_FY', label: 'This FY' },
  { key: 'LAST_FY', label: 'Last FY' },
  { key: 'ALL_TIME', label: 'All time' },
];
