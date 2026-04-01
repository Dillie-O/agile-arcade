export type DeckType = "fibonacci" | "tshirt";

export type Participant = {
  id: string;
  name: string;
  emoji: string;
  vote?: string;
  hasVoted: boolean;
  isHost: boolean;
};

export type Room = {
  id: string;
  deckType: DeckType;
  participants: Participant[];
  revealed: boolean;
  createdAt: number;
  lastActivityAt: number;
};

export type Identity = {
  name: string;
  emoji: string;
};