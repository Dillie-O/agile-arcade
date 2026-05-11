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
        const canRemove = isHost && !isMe;
        const stateLabel = participant.hasVoted || participant.vote ? "Ready!" : "Waiting...";
        const displayStatus = revealed && participant.vote ? `${stateLabel} ${participant.vote}` : stateLabel;
        const emojiClass = participant.isHost
          ? "participant-emoji participant-emoji--host"
          : isMe
          ? "participant-emoji participant-emoji--me"
          : "participant-emoji";

        return (
          <li className="participant-row" key={participant.id}>
            <div className="participant-main">
              <span className={emojiClass}>{participant.emoji}</span>
              <span className="participant-name">{participant.name}</span>
              <strong
                className={`participant-status ${stateLabel === "Ready!" ? "status-ready" : "status-waiting"}`}
              >
                {displayStatus}
              </strong>
            </div>
            {canRemove ? (
              <button
                className="button button-danger participant-remove-btn"
                type="button"
                onClick={() => onRemoveParticipant?.(participant)}
                aria-label={`Remove ${participant.name} from room`}
                title={`Remove ${participant.name} from room`}
              >
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6 1h4l1 1h3v2H2V2h3l1-1zm-2 5h8l-.7 8.1A2 2 0 0 1 9.31 16H6.69a2 2 0 0 1-1.99-1.9L4 6zm2 2v6h2V8H6zm4 0v6h2V8h-2z" />
                </svg>
                <span className="sr-only">{`Remove ${participant.name} from room`}</span>
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
