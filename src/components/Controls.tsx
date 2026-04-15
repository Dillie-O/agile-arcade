"use client";

import { useState } from "react";

type Props = {
  isHost: boolean;
  revealed: boolean;
  timerEndsAt: number | null;
  onReveal: () => void;
  onReset: () => void;
  onStartTimer: (duration: number) => void;
};

const TIMER_DURATIONS = [5, 10, 15, 20, 25, 30];

export function Controls({ isHost, revealed, timerEndsAt, onReveal, onReset, onStartTimer }: Props) {
  const [timerDuration, setTimerDuration] = useState(15);

  if (!isHost) {
    return null;
  }

  const timerActive = timerEndsAt !== null && !revealed;

  return (
    <section className="panel nested-panel host-controls">
      <div className="row gap-sm wrap" style={{ justifyContent: "center" }}>
        <button className="button button-danger" type="button" onClick={onReveal} disabled={revealed}>
          Reveal Cards
        </button>
        <button className="button button-blue" type="button" onClick={onReset}>
          Next Round
        </button>
        <div className="row gap-sm align-center timer-control-group">
          {!timerActive ? (
            <>
              <button
                className="button button-timer"
                type="button"
                onClick={() => onStartTimer(timerDuration)}
                disabled={revealed}
              >
                Start Timer
              </button>
              <select
                className="terminal-input timer-select"
                value={timerDuration}
                onChange={(e) => setTimerDuration(Number(e.target.value))}
                disabled={revealed}
                aria-label="Timer duration"
              >
                {TIMER_DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}s
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}