import { DeckType } from "@/lib/types";

type Props = {
  deckType: DeckType;
  onChange: (value: DeckType) => void;
};

export function DeckSelector({ deckType, onChange }: Props) {
  return (
    <div className="panel nested-panel">
      <p className="label">Deck</p>
      <div className="row gap-sm">
        <button
          className={`button ${deckType === "fibonacci" ? "selected" : ""}`}
          onClick={() => onChange("fibonacci")}
          type="button"
        >
          Fibonacci
        </button>
        <button
          className={`button ${deckType === "tshirt" ? "selected" : ""}`}
          onClick={() => onChange("tshirt")}
          type="button"
        >
          T-Shirt
        </button>
      </div>
    </div>
  );
}