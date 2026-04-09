"use client";

import { FormEvent, useEffect, useState } from "react";
import { Identity } from "@/lib/types";

type Props = {
  isOpen: boolean;
  onSubmit: (identity: Identity) => void;
  onRandomizeEmoji: () => string;
};

export function JoinModal({ isOpen, onSubmit, onRandomizeEmoji }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");

  useEffect(() => {
    setEmoji(onRandomizeEmoji());
  }, []);

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
        </div>

        <button className="button" type="submit">
          Enter Room
        </button>
      </form>
    </div>
  );
}