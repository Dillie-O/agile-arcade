import { Participant } from "@/lib/types";

type Props = {
  participants: Participant[];
  revealed: boolean;
  myId: string | null;
};

export function ParticipantList({ participants, revealed, myId }: Props) {
  return (
    <ul className="participant-list">
      {participants.slice(0, 8).map((participant) => {
        const isMe = participant.id === myId;
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
          </li>
        );
      })}
    </ul>
  );
}