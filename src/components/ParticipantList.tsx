import { Participant } from "@/lib/types";

type Props = {
  participants: Participant[];
  revealed: boolean;
};

export function ParticipantList({ participants, revealed }: Props) {
  return (
    <ul className="participant-list">
      {participants.map((participant) => (
        <li className="participant-row" key={participant.id}>
          <span>
            {participant.emoji} {participant.name} {participant.isHost ? "(Host)" : ""}
          </span>
          <strong>
            {revealed ? participant.vote || "-" : participant.hasVoted ? "voted" : "waiting"}
          </strong>
        </li>
      ))}
    </ul>
  );
}