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

export type UnanimousTerm = {
  word: string;
  language: string;
};

// "Unanimous" around the world. The banner always keeps English in the middle
// and flanks it with two of these, so players pick up a word along the way.
export const UNANIMOUS_TERMS: UnanimousTerm[] = [
  { word: "unánime", language: "Spanish" },
  { word: "unanime", language: "French" },
  { word: "unanime", language: "Italian" },
  { word: "unânime", language: "Portuguese" },
  { word: "unànime", language: "Catalan" },
  { word: "unanim", language: "Romanian" },
  { word: "einstimmig", language: "German" },
  { word: "unaniem", language: "Dutch" },
  { word: "eenparig", language: "Afrikaans" },
  { word: "enhällig", language: "Swedish" },
  { word: "enstemmig", language: "Norwegian" },
  { word: "enstemmig", language: "Danish" },
  { word: "einróma", language: "Icelandic" },
  { word: "yksimielinen", language: "Finnish" },
  { word: "üksmeelne", language: "Estonian" },
  { word: "vienbalsīgs", language: "Latvian" },
  { word: "vieningas", language: "Lithuanian" },
  { word: "jednomyślny", language: "Polish" },
  { word: "jednomyslný", language: "Czech" },
  { word: "jednomyseľný", language: "Slovak" },
  { word: "jednoglasan", language: "Croatian" },
  { word: "soglasen", language: "Slovenian" },
  { word: "единодушен", language: "Bulgarian" },
  { word: "единогласный", language: "Russian" },
  { word: "одностайний", language: "Ukrainian" },
  { word: "ομόφωνος", language: "Greek" },
  { word: "egyhangú", language: "Hungarian" },
  { word: "unfrydol", language: "Welsh" },
  { word: "unanimis", language: "Latin" },
  { word: "unuanima", language: "Esperanto" },
  { word: "満場一致", language: "Japanese" },
  { word: "만장일치", language: "Korean" },
  { word: "一致同意", language: "Chinese" },
  { word: "nhất trí", language: "Vietnamese" },
  { word: "เป็นเอกฉันท์", language: "Thai" },
  { word: "सर्वसम्मत", language: "Hindi" },
  { word: "بالإجماع", language: "Arabic" },
  { word: "פה אחד", language: "Hebrew" },
  { word: "nagkakaisa", language: "Filipino" },
  { word: "mufakat", language: "Indonesian" },
  { word: "oybirliği", language: "Turkish" },
];

export const ENGLISH_UNANIMOUS_TERM: UnanimousTerm = { word: "Unanimous", language: "English" };

// Deterministic so a single celebration keeps the same pair across re-renders.
export const pickUnanimousTerms = (seed: number): [UnanimousTerm, UnanimousTerm] => {
  let state = Math.abs(Math.trunc(seed)) % 4294967296 || 1;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  const first = UNANIMOUS_TERMS[Math.floor(next() * UNANIMOUS_TERMS.length)];

  // A few languages share a spelling (French/Italian, Norwegian/Danish), so
  // compare the word itself rather than the entry.
  const others = UNANIMOUS_TERMS.filter((term) => term.word !== first.word);
  const second = others[Math.floor(next() * others.length)];

  return [first, second];
};
