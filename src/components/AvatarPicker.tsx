import { EMOJI_CATEGORIES } from "@/lib/constants";

type Props = {
  id?: string;
  selected: string;
  onSelect: (emoji: string) => void;
};

export function AvatarPicker({ id = "emoji-picker", selected, onSelect }: Props) {
  return (
    <div id={id} className="emoji-picker" role="group" aria-label="Choose an avatar">
      {EMOJI_CATEGORIES.map((category) => (
        <div className="emoji-picker-group" key={category.label}>
          <span className="emoji-picker-heading">{category.label}</span>
          <div className="emoji-picker-grid">
            {category.emojis.map((option) => (
              <button
                key={`${category.label}-${option}`}
                className={`emoji-option${option === selected ? " selected" : ""}`}
                type="button"
                onClick={() => onSelect(option)}
                aria-label={`${category.label} avatar ${option}`}
                aria-pressed={option === selected}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
