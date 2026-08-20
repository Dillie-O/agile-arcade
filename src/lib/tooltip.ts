/** Id of the single shared tooltip mounted in the root layout. */
export const TOOLTIP_ID = "app-tooltip";

/**
 * Spread onto any element to give it a themed tooltip:
 *
 *   <span {...tip("Still deciding")}>⏳</span>
 *
 * Tooltip text is decoration, not an accessible name — where the information
 * is not already on screen, pair this with an `aria-label` or an `.sr-only`
 * span so screen readers get it too.
 *
 * Lives outside Tooltip.tsx because that file is a client module: server
 * components can spread these attributes, but they cannot call a function
 * exported across the "use client" boundary.
 */
export const tip = (content: string) => ({
  "data-tooltip-id": TOOLTIP_ID,
  "data-tooltip-content": content,
});
