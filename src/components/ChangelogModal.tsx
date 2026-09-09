"use client";

import { useEffect } from "react";
import { ChangelogContent } from "@/components/ChangelogContent";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * The changelog, shown over whatever the player is doing. The footer link used
 * to navigate to `/changelog`, which tore down an in-progress game along with
 * its socket connection; the page still exists for anyone who links to it.
 */
export function ChangelogModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="panel modal-panel changelog-modal"
        role="dialog"
        aria-modal="true"
        aria-label="What's new in Agile Arcade"
      >
        <div className="changelog-modal__scroll">
          <ChangelogContent />
        </div>

        <div className="changelog-actions">
          <button className="button" type="button" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
