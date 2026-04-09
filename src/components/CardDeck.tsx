import { DECKS } from "@/lib/constants";
import { DeckType } from "@/lib/types";

type Props = {
  deckType: DeckType;
  selectedValue?: string;
  onSelect: (value: string) => void;
};

export function CardDeck({ deckType, selectedValue, onSelect }: Props) {
  return (
    <div className={`card-grid${selectedValue ? " has-voted" : ""}`}>
      {DECKS[deckType].map((value) => {
        const toneClass = ["1", "2", "3", "5"].includes(value) ? "card-red" : "card-green";

        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`card ${toneClass} ${selectedValue === value ? "selected" : ""}`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}