export type DeckType = "fibonacci" | "tshirt";

export type Participant = {
  id: string;
  name: string;
  emoji: string;
  vote?: string;
  hasVoted: boolean;
  isHost: boolean;
  isDisconnected?: boolean;
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
};