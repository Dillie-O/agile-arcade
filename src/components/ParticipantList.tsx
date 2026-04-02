import { Participant } from "@/lib/types";

type Props = {
  participants: Participant[];
  revealed: boolean;
  myId: string | null;
  onChangeEmoji: () => void;
};

export function ParticipantList({ participants, revealed, myId, onChangeEmoji }: Props) {
  return (
    <ul className="participant-list">
      {participants.map((participant) => (
        <li className="participant-row" key={participant.id}>
          <div className="participant-main">
            <span className="participant-emoji">{participant.emoji}</span>
            <span className="participant-name">{participant.name}</span>
            {participant.isHost ? <span className="host-badge">HOST</span> : null}
            <strong className="participant-status">
              {revealed ? participant.vote || "-" : participant.hasVoted ? "voted" : "waiting"}
            </strong>
          </div>

          {participant.id === myId ? (
            <button className="btn participant-emoji-btn" type="button" onClick={onChangeEmoji}>
              Change Emoji
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}