"use client";

import { useMemo } from "react";
import { ENGLISH_UNANIMOUS_TERM, UnanimousTerm, pickUnanimousTerms } from "@/lib/constants";

type Props = {
  /** Changing the seed draws a new pair of languages. */
  seed: number;
};

// The language name stays in the tooltip rather than on the line — available if
// anyone is curious, out of the way if not.
const Term = ({ term, isEnglish = false }: { term: UnanimousTerm; isEnglish?: boolean }) => (
  <span
    className={`unanimous-term${isEnglish ? " unanimous-term--english" : ""}`}
    dir="auto"
    title={`"Unanimous" in ${term.language}`}
  >
    {term.word}
  </span>
);

export function UnanimousBanner({ seed }: Props) {
  const [first, second] = useMemo(() => pickUnanimousTerms(seed), [seed]);

  return (
    <div
      className="unanimous-banner"
      role="status"
      aria-label={`Unanimous — also known as ${first.word} in ${first.language} and ${second.word} in ${second.language}`}
    >
      <span className="unanimous-poppers" aria-hidden="true">
        🎉🎉
      </span>
      <Term term={first} />
      <span className="unanimous-poppers" aria-hidden="true">
        🎉
      </span>
      <Term term={ENGLISH_UNANIMOUS_TERM} isEnglish />
      <span className="unanimous-poppers" aria-hidden="true">
        🎉
      </span>
      <Term term={second} />
      <span className="unanimous-poppers" aria-hidden="true">
        🎉🎉
      </span>
    </div>
  );
}
