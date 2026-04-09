import { DECKS } from "@/lib/constants";
import { DeckType, Participant } from "@/lib/types";

type Props = {
  participants: Participant[];
  revealed: boolean;
  deckType: DeckType;
};

function cardTone(value: string) {
  return ["1", "2", "3", "5"].includes(value) ? "card-red" : "card-green";
}

export function ResultsSummary({ participants, revealed, deckType }: Props) {
  if (!revealed) {
    return null;
  }

  const votes = participants.map((p) => p.vote).filter(Boolean) as string[];

  if (votes.length === 0) {
    return null;
  }

  const distribution = votes.reduce<Record<string, number>>((acc, vote) => {
    acc[vote] = (acc[vote] || 0) + 1;
    return acc;
  }, {});

  const deckOrder = DECKS[deckType];

  const maxCount = Math.max(...Object.values(distribution));

  const allSorted = Object.entries(distribution).sort(([a], [b]) => {
    const ai = deckOrder.indexOf(a) === -1 ? 999 : deckOrder.indexOf(a);
    const bi = deckOrder.indexOf(b) === -1 ? 999 : deckOrder.indexOf(b);
    return ai - bi;
  });

  const votersByValue = participants.reduce<Record<string, string[]>>((acc, p) => {
    if (p.vote) {
      acc[p.vote] = acc[p.vote] ? [...acc[p.vote], p.name] : [p.name];
    }
    return acc;
  }, {});

  const winnerEntries = allSorted.filter(([, c]) => c === maxCount);
  const minorEntries = allSorted.filter(([, c]) => c < maxCount);

  // Find the center position of the winning group for left/right split of minor cards
  const firstWinnerDeckIndex = deckOrder.indexOf(winnerEntries[0][0]);
  const lastWinnerDeckIndex = deckOrder.indexOf(winnerEntries[winnerEntries.length - 1][0]);

  const leftCards = minorEntries.filter(([v]) => {
    const idx = deckOrder.indexOf(v);
    return idx !== -1 && idx < firstWinnerDeckIndex;
  });

  const rightCards = minorEntries.filter(([v]) => {
    const idx = deckOrder.indexOf(v);
    return idx === -1 || idx > lastWinnerDeckIndex;
  });

  const renderWinner = (value: string, count: number) => {
    const pct = Math.round((count / votes.length) * 100);
    const voters = (votersByValue[value] ?? []).join(", ");
    return (
      <div key={value} className="result-center">
        <div className={`result-card card ${cardTone(value)}`} title={voters}>{value}</div>
        <p
          className="alignment-label"
          title={`${pct}% of voters chose this value (alignment)`}
        >
          <span className="alignment-pct">{pct}%</span>
        </p>
      </div>
    );
  };

  const renderMinor = (value: string, count: number) => {
    const pct = Math.round((count / votes.length) * 100);
    const voters = (votersByValue[value] ?? []).join(", ");
    return (
      <div key={value} className="result-minor">
        <div className={`result-card-minor card ${cardTone(value)}`} title={voters}>{value}</div>
        <p
          className="alignment-label alignment-label-minor"
          title={`${pct}% of voters chose this value`}
        >
          <span className="alignment-pct alignment-pct-minor">{pct}%</span>
        </p>
      </div>
    );
  };

  return (
    <section className="result-summary">
      <div className="result-row">
        <div className="result-side result-side-left">
          {leftCards.map(([v, c]) => renderMinor(v, c))}
        </div>
        {winnerEntries.map(([v, c]) => renderWinner(v, c))}
        <div className="result-side result-side-right">
          {rightCards.map(([v, c]) => renderMinor(v, c))}
        </div>
      </div>
    </section>
  );
}