"use client";

import { useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";
import { TOOLTIP_ID } from "@/lib/tooltip";

// Touch browsers follow a tap with a synthetic mouseout on the tapped element,
// which closes a hover-driven tooltip the instant it opens. So pointer devices
// get hover and keyboard focus, and touch devices get tap to open, tap again
// (or anywhere else) to dismiss.
const TOUCH_QUERY = "(hover: none), (pointer: coarse)";

/**
 * The one tooltip instance for the whole app, mounted in the root layout.
 * Anchors opt in with the `tip()` helper from `@/lib/tooltip`.
 */
export function AppTooltip() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(TOUCH_QUERY);
    const sync = () => setIsTouch(query.matches);

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <Tooltip
      id={TOOLTIP_ID}
      className="app-tooltip"
      classNameArrow="app-tooltip__arrow"
      delayShow={isTouch ? 0 : 120}
      openEvents={isTouch ? { click: true } : { mouseenter: true, focus: true }}
      closeEvents={isTouch ? { click: true } : { mouseleave: true, blur: true }}
      globalCloseEvents={{ escape: true, scroll: true, resize: true, clickOutsideAnchor: true }}
    />
  );
}
