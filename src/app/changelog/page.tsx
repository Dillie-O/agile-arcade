import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LayoutShell } from "@/components/LayoutShell";
import { LORE, RELEASES, formatReleaseDate } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Changelog · Agile Arcade",
  description: "The story behind Agile Arcade, and what's new in every release.",
};

export default function ChangelogPage() {
  return (
    <LayoutShell>
      <main className="panel landing-panel">
        <header className="app-header home-header">
          <Image
            src="/logo_banner.webp"
            alt="Agile Arcade"
            className="banner-img"
            width={640}
            height={120}
            priority
          />
        </header>

        <section className="panel nested-panel changelog-lore">
          <p className="tagline">The lore</p>
          <h1 className="title">Why This Exists</h1>
          {LORE.map((paragraph) => (
            <p className="lore-paragraph" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <section className="changelog-releases">
          <h2 className="section-heading changelog-heading">What&apos;s New</h2>
          <p className="helper-text changelog-subheading">Every update in plain language, newest first.</p>

          <ol className="changelog-list">
            {RELEASES.map((release, index) => (
              <li className="panel nested-panel release-card" key={release.version}>
                <div className="release-head">
                  <span className="release-version">v{release.version}</span>
                  {index === 0 ? <span className="release-latest">Latest</span> : null}
                  <span className="release-date">{formatReleaseDate(release.date)}</span>
                </div>
                <h3 className="release-headline">{release.headline}</h3>
                <p className="release-summary">{release.summary}</p>
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

        <div className="changelog-actions">
          <Link href="/" className="button">
            ← Back to the Arcade
          </Link>
        </div>
      </main>
    </LayoutShell>
  );
}
