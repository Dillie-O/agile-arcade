"use client";

import { FormEvent, useState } from "react";
import { EMOJI_CATEGORIES } from "@/lib/constants";
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

        {isPickerOpen ? (
          <div id="emoji-picker" className="emoji-picker" role="group" aria-label="Choose an avatar">
            {EMOJI_CATEGORIES.map((category) => (
              <div className="emoji-picker-group" key={category.label}>
                <span className="emoji-picker-heading">{category.label}</span>
                <div className="emoji-picker-grid">
                  {category.emojis.map((option) => (
                    <button
                      key={`${category.label}-${option}`}
                      className={`emoji-option${option === emoji ? " selected" : ""}`}
                      type="button"
                      onClick={() => handlePick(option)}
                      aria-label={`${category.label} avatar ${option}`}
                      aria-pressed={option === emoji}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <button className="button" type="submit">
          Enter Room
        </button>
      </form>
    </div>
  );
}
