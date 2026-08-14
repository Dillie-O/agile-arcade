import { DeckType } from "@/lib/types";

export const DECKS: Record<DeckType, string[]> = {
  fibonacci: ["1", "2", "3", "5", "8", "13", "21", "☕"],
  tshirt: ["XS", "S", "M", "L", "XL", "☕"],
};

export type EmojiCategory = {
  label: string;
  emojis: string[];
};

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    label: "Arcade",
    emojis: ["🎮", "🕹️", "👾", "🎯", "🎲", "🃏", "🎰", "🎱", "🧩", "♟️", "🏆", "🥇", "🎸", "🎧"],
  },
  {
    label: "Creatures",
    emojis: [
      "🐉",
      "🦊",
      "🐙",
      "🦄",
      "🐧",
      "🦜",
      "🐺",
      "🦁",
      "🐯",
      "🐨",
      "🐼",
      "🦉",
      "🦈",
      "🐢",
      "🦖",
      "🐝",
      "🦋",
      "🐳",
      "🦩",
      "🦥",
      "🐸",
      "🐿️",
    ],
  },
  {
    label: "Cosmic",
    emojis: ["🚀", "🛸", "👽", "🤖", "🪐", "☄️", "🌟", "🌙", "🔭", "⚡", "🌈", "☀️"],
  },
  {
    label: "Fantasy",
    emojis: ["🧙", "🧝", "🧚", "🏰", "🗡️", "🛡️", "🔮", "🪄", "💎", "👑", "🧪", "🍄"],
  },
  {
    label: "Snacks",
    emojis: ["☕", "🍕", "🍔", "🌮", "🍩", "🍪", "🍿", "🧁", "🍎", "🥑", "🍀", "🔥", "🧠", "🎉"],
  },
];

export const EMOJI_OPTIONS = EMOJI_CATEGORIES.flatMap((category) => category.emojis);

export const randomEmoji = () => {
  return EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)];
};
