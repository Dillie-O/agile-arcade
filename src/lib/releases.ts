export type Release = {
  /** Semver string, e.g. "1.6.0". */
  version: string;
  /** ISO date, e.g. "2026-08-20". This is also what the footer shows. */
  date: string;
  /** Short, friendly title for the release. */
  headline: string;
  /** Single emoji that trails the headline. */
  emoji: string;
  /** Plain-language bullets — what changed for players, not for developers.
   *  Written without trailing periods, the way a list of highlights reads. */
  notes: string[];
};

/**
 * The story behind the app, lifted from the README so newcomers landing on
 * /changelog get the same introduction contributors get on GitHub.
 */
export const LORE: string[] = [
  "Yes, this is “yet another agile poker planning” tool. It started as a fun train-hacking excursion, and it was inspired by a team lead who mentioned getting “paywalled” on a “free” tool after “too much use”. Sizing a backlog should not come with a seat count.",
  "So there are no accounts, no sign-up, and nothing to buy. Start a room, share the link, pick a card. It is small enough to self-host, too — fire it up on demand, or leave it running on an internal server for next to nothing.",
  "Play as much as you like.",
];

/**
 * Player-facing release notes, newest first.
 *
 * Deliberately separate from CHANGELOG.md: the markdown file is the technical
 * record, this is the story players read on /changelog. Update both when you
 * cut a release, and keep the top entry in step with the version in
 * package.json — the footer reads the version and date from here.
 */
export const RELEASES: Release[] = [
  {
    version: "1.6.0",
    date: "2026-08-20",
    headline: "A changelog worth reading",
    emoji: "📜",
    notes: [
      "The version number in the footer is a link — follow it here any time",
      "Every release gets a plain-language write-up instead of a wall of commit messages",
      "The story behind the app now lives at the top of this page",
      "Hover hints became proper tooltips, styled to match the rest of the arcade",
      "Tooltips finally work on phones: tap to open, tap again to dismiss",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-08-18",
    headline: "Confetti for a clean sweep",
    emoji: "🎉",
    notes: [
      "Everyone picks the same card? Confetti falls, and a banner calls it out in three languages",
      "English is flanked by two of 41 other languages, drawn fresh each time — hover a word to see which one you got",
      "☕ and ? count as sitting the round out, so an abstainer never spoils the celebration",
      "The party shows up on the kiosk screen too, and clears when the next round starts",
      "You can change your avatar mid-game: hover your own icon and click the pencil",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-08-14",
    headline: "Pick your own avatar",
    emoji: "🎭",
    notes: [
      "A “Pick Your Own” button on the join screen opens the full picker",
      "Icons are grouped into Arcade, Creatures, Cosmic, Fantasy and Snacks",
      "74 icons instead of 16, so big groups stop turning up as twins",
    ],
  },
  {
    version: "1.3.1",
    date: "2026-06-24",
    headline: "A cleaner participant list",
    emoji: "✨",
    notes: [
      "⏳ while someone is deciding, ✅ once their vote is in",
      "Long names are no longer cut off",
      "Hosts remove a player by hovering their avatar and clicking the ❌",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-06-22",
    headline: "Install it, share it",
    emoji: "📲",
    notes: [
      "Add Agile Arcade to your home screen on Chrome or Safari — it opens like a real app",
      "“Share Game” pops up a scannable QR code, so players can scan instead of typing a URL",
    ],
  },
  {
    version: "1.2.9",
    date: "2026-06-04",
    headline: "Kiosk keeps its slot",
    emoji: "🖥️",
    notes: ["Closing a kiosk tab abruptly used to lock the room out of kiosk mode. Not any more"],
  },
  {
    version: "1.2.8",
    date: "2026-05-27",
    headline: "Tidier kiosk controls",
    emoji: "🧹",
    notes: [
      "Kiosk open and exit moved into the top link bar instead of taking up a row of their own",
      "The kiosk shows a placeholder card while voting is underway, then flips to the results",
    ],
  },
  {
    version: "1.2.7",
    date: "2026-05-27",
    headline: "Kiosk mode",
    emoji: "📺",
    notes: [
      "Hosts can open a dedicated screen-sharing view with no voting cards or host controls",
      "Kiosk tabs watch quietly — they never join the participant list or hold up a reveal",
    ],
  },
  {
    version: "1.2.6",
    date: "2026-05-26",
    headline: "Easier to remove a player",
    emoji: "👋",
    notes: ["A bigger target to hit, and it stays visible on touch devices"],
  },
  {
    version: "1.2.5",
    date: "2026-05-11",
    headline: "Hosts in control",
    emoji: "👑",
    notes: [
      "Hosts can remove participants straight from the list",
      "Anyone removed gets a clear message and a way home, instead of being dropped back into the join screen",
    ],
  },
  {
    version: "1.2.4",
    date: "2026-05-11",
    headline: "A bigger front door",
    emoji: "🚪",
    notes: ["A “Choose your Quest” hero, with one-click buttons for the Fibonacci and T-Shirt decks"],
  },
  {
    version: "1.2.3",
    date: "2026-04-28",
    headline: "Blips no longer kick you out",
    emoji: "🔌",
    notes: [
      "Drop off briefly and you have half a minute to come back before the room forgets you",
      "Hosts who reconnect in time keep their crown",
    ],
  },
  {
    version: "1.2.2",
    date: "2026-04-28",
    headline: "Styling touch-ups",
    emoji: "🎨",
    notes: ["Assorted layout and styling fixes"],
  },
  {
    version: "1.2.1",
    date: "2026-04-16",
    headline: "Safer story links",
    emoji: "🔗",
    notes: ["Story links are checked before they open"],
  },
  {
    version: "1.2.0",
    date: "2026-04-15",
    headline: "Beat the clock",
    emoji: "⏱️",
    notes: [
      "Hosts can start a countdown of anywhere from 5 to 30 seconds",
      "Everyone watches it tick down, and the cards flip automatically when it runs out",
    ],
  },
  {
    version: "1.1.1",
    date: "2026-04-11",
    headline: "Housekeeping",
    emoji: "🧽",
    notes: [
      "Typing a story no longer stutters for the host",
      "The app picked up a changelog and version details",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-04-10",
    headline: "Play from anywhere",
    emoji: "🌐",
    notes: [
      "Hosts can open the room to the internet through ngrok, so a game running on a laptop can still reach the whole team",
    ],
  },
  {
    version: "1.0.1",
    date: "2026-04-09",
    headline: "Game on",
    emoji: "🕹️",
    notes: ["Create a room, deal a deck, vote, and reveal"],
  },
];

export const LATEST_RELEASE = RELEASES[0];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-08-20" to "August 20, 2026". Formatted by hand so the output never
 *  shifts with the renderer's timezone. */
export function formatReleaseDate(date: string): string {
  const [year, month, day] = date.split("-");
  const monthName = MONTHS[Number(month) - 1];

  if (!monthName || !year || !day) {
    return date;
  }

  return `${monthName} ${Number(day)}, ${year}`;
}
