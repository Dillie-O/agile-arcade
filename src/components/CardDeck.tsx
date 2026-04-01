import { DECKS } from "@/lib/constants";
import { DeckType } from "@/lib/types";

type Props = {
  deckType: DeckType;
  selectedValue?: string;
  onSelect: (value: string) => void;
};

export function CardDeck({ deckType, selectedValue, onSelect }: Props) {
  return (
    <div className="card-grid">
      {DECKS[deckType].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={`card ${selectedValue === value ? "card-selected" : ""}`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}