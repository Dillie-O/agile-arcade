import { Participant } from "@/lib/types";
import { tip } from "@/lib/tooltip";

type Props = {
  participants: Participant[];
  revealed: boolean;
  myId: string | null;
  isHost: boolean;
  onRemoveParticipant?: (participant: Participant) => void;
  onChangeAvatar?: () => void;
};

export function ParticipantList({
  participants,
  revealed,
  myId,
  isHost,
  onRemoveParticipant,
  onChangeAvatar,
}: Props) {
  return (
    <ul className="participant-list">
      {participants.map((participant) => {
        const isMe = participant.id === myId;
        const canRemove = isHost && !isMe && Boolean(onRemoveParticipant);
        const canChangeAvatar = isMe && Boolean(onChangeAvatar);
        const hasVoted = participant.hasVoted || Boolean(participant.vote);
        const stateEmoji = hasVoted ? "✅" : "⏳";
        const displayStatus = revealed && participant.vote ? participant.vote : stateEmoji;
        // The emoji alone tells a screen reader nothing useful ("hourglass"),
        // so the tooltip text doubles as the spoken status.
        const statusLabel =
          revealed && participant.vote
            ? `${participant.name} voted ${participant.vote}`
            : hasVoted
            ? "Vote is in"
            : "Still deciding";
        const emojiClass = participant.isHost
          ? "participant-emoji participant-emoji--host"
          : isMe
          ? "participant-emoji participant-emoji--me"
          : "participant-emoji";

        let emojiSlot;
        if (canRemove) {
          emojiSlot = (
            <button
              className={`${emojiClass} participant-emoji-remove`}
              type="button"
              onClick={() => onRemoveParticipant?.(participant)}
              aria-label={`Remove ${participant.name} from room`}
              {...tip(`Remove ${participant.name} from room`)}
            >
              <span className="participant-emoji-icon" aria-hidden="true">{participant.emoji}</span>
              <span className="participant-emoji-trash" aria-hidden="true">❌</span>
            </button>
          );
        } else if (canChangeAvatar) {
          emojiSlot = (
            <button
              className={`${emojiClass} participant-emoji-edit`}
              type="button"
              onClick={() => onChangeAvatar?.()}
              aria-label="Change your avatar"
              {...tip("Change your avatar")}
            >
              <span className="participant-emoji-icon" aria-hidden="true">{participant.emoji}</span>
              <span className="participant-emoji-pencil" aria-hidden="true">✏️</span>
            </button>
          );
        } else {
          emojiSlot = <span className={emojiClass}>{participant.emoji}</span>;
        }

        return (
          <li className="participant-row" key={participant.id}>
            <div className="participant-main">
              {emojiSlot}
              <span className="participant-name">{participant.name}</span>
              <strong
                className={`participant-status ${hasVoted ? "status-ready" : "status-waiting"}`}
                {...tip(statusLabel)}
              >
                <span aria-hidden="true">{displayStatus}</span>
                <span className="sr-only">{statusLabel}</span>
              </strong>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
