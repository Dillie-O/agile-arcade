import { DeckType } from "@/lib/types";

export const DECKS: Record<DeckType, string[]> = {
  fibonacci: ["1", "2", "3", "5", "8", "13", "21", "☕"],
  tshirt: ["XS", "S", "M", "L", "XL", "☕"],
};

export const EMOJI_OPTIONS = [
  "🎮",
  "🕹️",
  "👾",
  "🚀",
  "🧠",
  "🐉",
  "🦊",
  "🐙",
  "🤖",
  "🦄",
  "🐧",
  "🦜",
  "🌟",
  "🔥",
  "🍀",
  "🎯",
];

export const randomEmoji = () => {
  return EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)];
};