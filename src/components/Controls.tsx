"use client";

import { useEffect, useRef, useState } from "react";

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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!timerEndsAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncing timer display from external timerEndsAt prop
      setTimeLeft(null);
      return;
    }

    const update = () => {
      const remaining = Math.ceil((timerEndsAt - Date.now()) / 1000);
      setTimeLeft(remaining > 0 ? remaining : 0);
    };

    update();
    intervalRef.current = setInterval(update, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerEndsAt]);

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
          <select
            className="terminal-input timer-select"
            value={timerDuration}
            onChange={(e) => setTimerDuration(Number(e.target.value))}
            disabled={timerActive || revealed}
            aria-label="Timer duration"
          >
            {TIMER_DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d}s
              </option>
            ))}
          </select>
          <button
            className="button button-timer"
            type="button"
            onClick={() => onStartTimer(timerDuration)}
            disabled={timerActive || revealed}
          >
            Start Timer
          </button>
          {timerActive && timeLeft !== null ? (
            <span className="timer-countdown-host" aria-live="polite">
              {timeLeft}s
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}