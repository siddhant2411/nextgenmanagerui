import apiService from './apiService';

/**
 * Revenue Desk read.
 *
 * One call, unlike the pipeline dashboard's two: the whole screen — headline, mix, trend, rankings
 * and the stock blocks — comes back as a single snapshot, so nothing on it can describe a different
 * moment from anything else on it.
 */

/**
 * Builds the query the API accepts, and only that.
 *
 * The endpoint rejects any parameter it does not recognise, so a stray key comes back as a 400
 * rather than being silently dropped and answered with the default period. A wrong number under a
 * correct-looking label is worse than an error.
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

/** Order intake, customer mix, product and customer rankings, plus the as-of-today stock blocks. */
export const getSalesAnalytics = (period) =>
  apiService.get('/sales/analytics', periodParams(period));
