import { Participant } from "@/lib/types";

type Props = {
  participants: Participant[];
  revealed: boolean;
};

export function ResultsSummary({ participants, revealed }: Props) {
  if (!revealed) {
    return null;
  }

  const distribution = participants.reduce<Record<string, number>>((acc, participant) => {
    if (!participant.vote) {
      return acc;
    }

    acc[participant.vote] = (acc[participant.vote] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="panel nested-panel">
      <h3>Results</h3>
      <ul className="distribution-list">
        {Object.entries(distribution).map(([vote, count]) => (
          <li key={vote}>
            <span>{vote}</span>
            <strong>{count}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}