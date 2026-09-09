import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChangelogContent } from "@/components/ChangelogContent";
import { LayoutShell } from "@/components/LayoutShell";

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

        <ChangelogContent leadHeading="h1" />

        <div className="changelog-actions">
          <Link href="/" className="button">
            ← Back to the Arcade
          </Link>
        </div>
      </main>
    </LayoutShell>
  );
}
