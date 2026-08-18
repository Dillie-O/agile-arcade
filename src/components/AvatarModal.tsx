"use client";

import { useEffect } from "react";
import { AvatarPicker } from "@/components/AvatarPicker";

type Props = {
  isOpen: boolean;
  currentEmoji: string;
  onSelect: (emoji: string) => void;
  onRandomize: () => string;
  onClose: () => void;
};

export function AvatarModal({ isOpen, currentEmoji, onSelect, onRandomize, onClose }: Props) {
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

  const handlePick = (nextEmoji: string) => {
    onSelect(nextEmoji);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="panel modal-panel" role="dialog" aria-modal="true" aria-label="Change your avatar">
        <h2>Change Avatar</h2>

        <div className="row gap-sm align-center">
          <span className="emoji-preview">{currentEmoji}</span>
          <button className="button" type="button" onClick={() => onSelect(onRandomize())} autoFocus>
            Random Emoji
          </button>
        </div>

        <AvatarPicker id="change-avatar-picker" selected={currentEmoji} onSelect={handlePick} />

        <button className="button" type="button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
