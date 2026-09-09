"use client";

import { useState } from "react";
import { ChangelogModal } from "@/components/ChangelogModal";
import { LATEST_RELEASE } from "@/lib/releases";
import { tip } from "@/lib/tooltip";

/**
 * The version stamp in the footer. It opens the changelog in a modal rather
 * than navigating, so a game in progress keeps its socket connection.
 */
export function FooterVersion() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="site-footer__link site-footer__version"
        onClick={() => setIsOpen(true)}
        {...tip("See what's new")}
      >
        Ver. {LATEST_RELEASE.version} ({LATEST_RELEASE.date})
      </button>
      <ChangelogModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
