/**
 * CRM chart palettes.
 *
 * Everything else this folder used to define — neutrals, page shell, severity, formatters — now
 * lives in theme/moduleTokens.js, because it was never CRM-specific: the purchase register needs
 * the same slate ramp and the same masthead, and two copies of a palette is how a product ends up
 * with three primaries.
 *
 * What stays here is the part that genuinely belongs to these charts. It is not taste. The colours
 * were run through a palette validator for lightness band, chroma floor, colour-vision-deficiency
 * separation and contrast against the surface, and they are deliberately NOT snapped to the
 * module's semantic blue/green/red — the separation is the reason they exist. Changing one without
 * re-validating the set is how a chart becomes unreadable for roughly 8% of men.
 */

/**
 * Categorical series. Fixed order, never cycled — colour follows the entity, not its rank, so a
 * filter that changes the series count must not repaint the survivors.
 *
 * Validated all-pairs: worst CVD delta-E 8.4, every slot at least 3:1 on the light surface.
 */
export const SERIES = {
  created: '#2a78d6',
  won: '#0f8f63',
  lost: '#e34948',
};

/**
 * Funnel ordinal ramp — one hue, monotone lightness, five steps.
 *
 * Five is load-bearing: the ramp only clears the adjacent-step and light-end contrast gates at
 * five, which is also the number of real funnel stages. LOST/CLOSED/JUNK are outcomes rather than
 * stages and never appear in a funnel; FOLLOW_UP is a mode, not a rung.
 */
export const FUNNEL_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];

/**
 * Revenue Desk series, aliased onto the validated set above rather than newly picked.
 *
 * Two hues is all this screen needs — order intake against invoicing, new business against repeat
 * — and SERIES already holds two that passed the all-pairs check. Inventing a fresh pair for a
 * second dashboard would mean either re-running the validator or shipping colours that never went
 * through it, and the semantic fit is honest: money booked reads as the leading series, money
 * realised as the settled one.
 */
export const REVENUE = {
  ordered: SERIES.created,
  invoiced: SERIES.won,
  newBusiness: SERIES.created,
  repeatBusiness: SERIES.won,
};
