"use client";

import { FormEvent, useState } from "react";
import { AvatarPicker } from "@/components/AvatarPicker";
import { Identity } from "@/lib/types";

type Props = {
  isOpen: boolean;
  onSubmit: (identity: Identity) => void;
  onRandomizeEmoji: () => string;
};

export function JoinModal({ isOpen, onSubmit, onRandomizeEmoji }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(() => onRandomizeEmoji());
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    onSubmit({
      name: name.trim(),
      emoji,
    });
  };

  const handleRandomize = () => {
    setEmoji(onRandomizeEmoji());
  };

  const handlePick = (nextEmoji: string) => {
    setEmoji(nextEmoji);
    setIsPickerOpen(false);
  };

  return (
    <div className="modal-overlay">
      <form className="panel modal-panel" onSubmit={handleSubmit}>
        <h2>Join Game</h2>

        <label className="label" htmlFor="name-input">
          Name
        </label>
        <input
          id="name-input"
          className="terminal-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={30}
          required
          autoFocus
        />

        <label className="label">Avatar</label>
        <div className="row gap-sm align-center">
          <span className="emoji-preview">{emoji}</span>
          <button className="button" type="button" onClick={handleRandomize}>
            Random Emoji
          </button>
          <button
            className="button"
            type="button"
            onClick={() => setIsPickerOpen((open) => !open)}
            aria-expanded={isPickerOpen}
            aria-controls="emoji-picker"
          >
            {isPickerOpen ? "Close Picker ✕" : "Pick Your Own"}
          </button>
        </div>

        {isPickerOpen ? <AvatarPicker selected={emoji} onSelect={handlePick} /> : null}

        <button className="button" type="submit">
          Enter Room
        </button>
      </form>
    </div>
  );
}
