export type Release = {
  /** Semver string, e.g. "1.6.0". */
  version: string;
  /** ISO date, e.g. "2026-08-20". This is also what the footer shows. */
  date: string;
  /** Short, friendly title for the release. */
  headline: string;
  /** Plain-language notes — what changed for players, not for developers. */
  notes: string[];
};

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
    notes: [
      "The version number in the footer is now a link. Follow it here for a plain-language history of everything that has changed.",
      "Hover hints across the app were replaced with proper tooltips — they match the arcade theme, show up right away, and finally work on phones with a tap.",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-08-18",
    headline: "Confetti for a clean sweep",
    notes: [
      "When everyone lands on the same card, confetti rains down and a banner celebrates in three languages — English flanked by two of 41 others, drawn fresh each time. Hover a word to find out which language it is.",
      "Sitting a round out with ☕ or ? will not spoil the party, and the celebration shows on the kiosk screen too.",
      "You can change your avatar mid-game now: hover your own icon in the participant list and click the pencil.",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-08-14",
    headline: "Pick your own avatar",
    notes: [
      "The join screen has a “Pick Your Own” button that opens a full picker, sorted into Arcade, Creatures, Cosmic, Fantasy and Snacks.",
      "The icon set grew from 16 to 74, so big groups are far less likely to end up as twins.",
    ],
  },
  {
    version: "1.3.1",
    date: "2026-06-24",
    headline: "A cleaner participant list",
    notes: [
      "Status reads at a glance: ⏳ while someone is deciding, ✅ once their vote is in. Long names are no longer cut off.",
      "Hosts remove a player by hovering their avatar and clicking the ❌.",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-06-22",
    headline: "Install it, share it",
    notes: [
      "Agile Arcade can be added to your home screen on Chrome and Safari, and opens like a real app.",
      "The “Share Game” button pops up a QR code, so mobile players can scan their way in instead of typing a URL.",
    ],
  },
  {
    version: "1.2.9",
    date: "2026-06-04",
    headline: "Kiosk keeps its slot",
    notes: [
      "Closing a kiosk tab abruptly no longer locks the room out of kiosk mode.",
    ],
  },
  {
    version: "1.2.8",
    date: "2026-05-27",
    headline: "Tidier kiosk controls",
    notes: [
      "Kiosk open and exit moved into the top link bar instead of taking up a row of their own.",
      "While voting is underway the kiosk shows a placeholder card, then flips to the results when they are revealed.",
    ],
  },
  {
    version: "1.2.7",
    date: "2026-05-27",
    headline: "Kiosk mode",
    notes: [
      "Hosts can open a dedicated screen-sharing view that shows the room without voting cards or host controls.",
      "Kiosk tabs watch quietly — they do not join the participant list or hold up a reveal.",
    ],
  },
  {
    version: "1.2.6",
    date: "2026-05-26",
    headline: "Easier to remove a player",
    notes: [
      "The host's remove button is easier to hit, and stays visible on touch devices.",
    ],
  },
  {
    version: "1.2.5",
    date: "2026-05-11",
    headline: "Hosts in control",
    notes: [
      "Hosts can remove participants straight from the list.",
      "Anyone removed gets a clear message and a way home, instead of being dropped back into the join screen.",
    ],
  },
  {
    version: "1.2.4",
    date: "2026-05-11",
    headline: "A bigger front door",
    notes: [
      "The landing page got a “Choose your Quest” hero with one-click buttons for the Fibonacci and T-Shirt decks.",
    ],
  },
  {
    version: "1.2.3",
    date: "2026-04-28",
    headline: "Blips no longer kick you out",
    notes: [
      "A brief network hiccup will not drop you from the room any more — you have half a minute to come back, and hosts keep their crown.",
    ],
  },
  {
    version: "1.2.2",
    date: "2026-04-28",
    headline: "Styling touch-ups",
    notes: ["Assorted layout and styling fixes."],
  },
  {
    version: "1.2.1",
    date: "2026-04-16",
    headline: "Safer story links",
    notes: [
      "Story links are checked before they open, so only ordinary web addresses become clickable.",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-04-15",
    headline: "Beat the clock",
    notes: [
      "Hosts can start a countdown of 5 to 30 seconds. Everyone watches it tick down, and the cards flip automatically when it runs out.",
    ],
  },
  {
    version: "1.1.1",
    date: "2026-04-11",
    headline: "Housekeeping",
    notes: [
      "Typing a story no longer stutters for the host, and the app picked up a changelog and version details.",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-04-10",
    headline: "Play from anywhere",
    notes: [
      "Hosts can open the room to the internet through ngrok, so remote players can join a game running on a laptop.",
    ],
  },
  {
    version: "1.0.1",
    date: "2026-04-09",
    headline: "Game on",
    notes: ["The first release: create a room, deal a deck, vote, and reveal."],
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
