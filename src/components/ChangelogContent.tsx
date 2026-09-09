import { LORE, RELEASES, formatReleaseDate } from "@/lib/releases";

type Props = {
  /** Heading tag for the first section, so the page can own the document's
   *  single h1 while the modal — which is not the page — starts at h2. */
  leadHeading?: "h1" | "h2";
};

/**
 * The lore and the release notes, shared by the `/changelog` page and the
 * changelog modal so the two can never drift apart.
 */
export function ChangelogContent({ leadHeading: LeadHeading = "h2" }: Props) {
  return (
    <>
      <section className="changelog-section">
        <LeadHeading className="eyebrow">The Lore</LeadHeading>
        {LORE.map((paragraph) => (
          <p className="lore-paragraph" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </section>

      <section className="changelog-section">
        <h2 className="eyebrow">What&apos;s New</h2>

        <ol className="changelog-list">
          {RELEASES.map((release, index) => (
            <li className="panel nested-panel release-card" key={release.version}>
              <h3 className="release-headline">
                {release.headline}{" "}
                <span className="release-emoji" aria-hidden="true">
                  {release.emoji}
                </span>
              </h3>
              <p className="release-meta">
                <span className="release-stamp">
                  <span className="release-version">{release.version}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="release-date">{formatReleaseDate(release.date)}</span>
                </span>
                {index === 0 ? <span className="release-latest">Latest</span> : null}
              </p>
              <ul className="release-notes">
                {release.notes.map((note) => (
                  <li className="release-note" key={note}>
                    {note}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
