export type DeckType = "fibonacci" | "tshirt";

export type Participant = {
  id: string;
  name: string;
  emoji: string;
  vote?: string;
  hasVoted: boolean;
  isHost: boolean;
  isDisconnected: boolean;
};

export type Room = {
  id: string;
  deckType: DeckType;
  participants: Participant[];
  story: string;
  revealed: boolean;
  timerEndsAt: number | null;
  createdAt: number;
  lastActivityAt: number;
};

export type Identity = {
  name: string;
  emoji: string;
  participantId?: string;
  /** Private token from the join ack; needed to reclaim this seat after a disconnect. */
  rejoinToken?: string;
};
/** Reply to a Socket.IO event sent with an ack callback. See docs/PROTOCOL.md. */
export type SocketAck =
  | { ok: true; state: Room | null; participantId?: string; rejoinToken?: string; isHost?: boolean }
  | { ok: false; error: { code: string; message: string; retryAfterMs?: number } };
