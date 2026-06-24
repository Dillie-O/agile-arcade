import { Participant } from "@/lib/types";

type Props = {
  participants: Participant[];
  revealed: boolean;
  myId: string | null;
  isHost: boolean;
  onRemoveParticipant?: (participant: Participant) => void;
};

export function ParticipantList({ participants, revealed, myId, isHost, onRemoveParticipant }: Props) {
  return (
    <ul className="participant-list">
      {participants.map((participant) => {
        const isMe = participant.id === myId;
        const canRemove = isHost && !isMe && Boolean(onRemoveParticipant);
        const hasVoted = participant.hasVoted || Boolean(participant.vote);
        const stateEmoji = hasVoted ? "✅" : "⏳";
        const displayStatus = revealed && participant.vote ? participant.vote : stateEmoji;
        const emojiClass = participant.isHost
          ? "participant-emoji participant-emoji--host"
          : isMe
          ? "participant-emoji participant-emoji--me"
          : "participant-emoji";

        const emojiSlot = canRemove ? (
          <button
            className={`${emojiClass} participant-emoji-remove`}
            type="button"
            onClick={() => onRemoveParticipant?.(participant)}
            aria-label={`Remove ${participant.name} from room`}
            title={`Remove ${participant.name} from room`}
          >
            <span className="participant-emoji-icon" aria-hidden="true">{participant.emoji}</span>
            <span className="participant-emoji-trash" aria-hidden="true">❌</span>
          </button>
        ) : (
          <span className={emojiClass}>{participant.emoji}</span>
        );

        return (
          <li className="participant-row" key={participant.id}>
            <div className="participant-main">
              {emojiSlot}
              <span className="participant-name">{participant.name}</span>
              <strong
                className={`participant-status ${hasVoted ? "status-ready" : "status-waiting"}`}
              >
                {displayStatus}
              </strong>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
