import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LayoutShell } from "@/components/LayoutShell";
import { RELEASES, formatReleaseDate } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Changelog · Agile Arcade",
  description: "What's new in Agile Arcade, release by release.",
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

        <section className="panel nested-panel changelog-intro">
          <p className="tagline">Patch notes from the arcade</p>
          <h1 className="title">What&apos;s New</h1>
          <p className="helper-text">Every update in plain language, newest first.</p>
        </section>

        <ol className="changelog-list">
          {RELEASES.map((release, index) => (
            <li className="panel nested-panel release-card" key={release.version}>
              <div className="release-head">
                <span className="release-version">v{release.version}</span>
                {index === 0 ? <span className="release-latest">Latest</span> : null}
                <span className="release-date">{formatReleaseDate(release.date)}</span>
              </div>
              <h2 className="release-headline">{release.headline}</h2>
              {release.notes.map((note) => (
                <p className="release-note" key={note}>
                  {note}
                </p>
              ))}
            </li>
          ))}
        </ol>

        <div className="changelog-actions">
          <Link href="/" className="button">
            ← Back to the Arcade
          </Link>
        </div>
      </main>
    </LayoutShell>
  );
}
