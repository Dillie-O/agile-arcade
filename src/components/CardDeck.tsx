import { DECKS } from "@/lib/constants";
import { DeckType } from "@/lib/types";

type Props = {
  deckType: DeckType;
  selectedValue?: string;
  onSelect: (value: string) => void;
};

export function CardDeck({ deckType, selectedValue, onSelect }: Props) {
  const NEUTRAL = new Set(["☕", "?"]);
  const GREEN   = new Set(["1", "2", "3", "5", "XS", "S", "M"]);

  return (
    <div className={`card-grid${selectedValue ? " has-voted" : ""}`}>
      {DECKS[deckType].map((value) => {
        let toneClass = "card-red";
        if (NEUTRAL.has(value)) toneClass = "card-brown";
        else if (GREEN.has(value)) toneClass = "card-green";

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