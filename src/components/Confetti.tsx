"use client";

import { useMemo } from "react";

const PIECE_COUNT = 70;
const COLORS = ["#d4af37", "#c0392b", "#2980b9", "#27ae60", "#e67e22", "#8e44ad", "#5b7f38"];

// Deterministic PRNG so server and client render identical pieces for a given seed.
const makeRandom = (seed: number) => {
  let state = (seed * 2654435761) % 4294967296 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

type Props = {
  /** Changing the seed regenerates the burst. */
  seed: number;
};

export function Confetti({ seed }: Props) {
  const pieces = useMemo(() => {
    const random = makeRandom(seed);

    return Array.from({ length: PIECE_COUNT }, (_, index) => ({
      key: index,
      left: random() * 100,
      delay: random() * 0.9,
      duration: 2.2 + random() * 1.6,
      drift: (random() - 0.5) * 22,
      spin: 360 + random() * 720,
      size: 6 + random() * 7,
      color: COLORS[Math.floor(random() * COLORS.length)],
      round: random() < 0.3,
    }));
  }, [seed]);

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.key}
          className={`confetti-piece${piece.round ? " confetti-piece--round" : ""}`}
          style={
            {
              left: `${piece.left}%`,
              width: `${piece.size}px`,
              height: `${piece.size * 1.6}px`,
              background: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              "--confetti-drift": `${piece.drift}vw`,
              "--confetti-spin": `${piece.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
