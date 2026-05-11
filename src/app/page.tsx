"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DeckType } from "@/lib/types";
import { LayoutShell } from "@/components/LayoutShell";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [pendingDeck, setPendingDeck] = useState<DeckType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onCreateGame = async (deckType: DeckType) => {
    setPendingDeck(deckType);
    setError(null);

    try {
      const response = await fetch("/api/create-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deckType }),
      });

      if (!response.ok) {
        throw new Error("Failed to create room");
      }

      const data = (await response.json()) as { roomId: string };
      router.push(`/game/${data.roomId}`);
    } catch {
      setError("Unable to create game right now.");
    } finally {
      setPendingDeck(null);
    }
  };

  return (
    <LayoutShell>
      <main className="panel landing-panel">
        <header className="app-header home-header">
          <Image src="/logo_banner.webp" alt="Agile Arcade" className="banner-img" width={640} height={120} priority />
        </header>

        <section className={`${styles.hero} panel nested-panel`}>
          <div className={styles.heroCopy}>
            <p className="tagline">Host a room and let the quest begin</p>
            <h1 className={styles.title}>Choose your Adventure</h1>
            <p className={styles.subtitle}>Pick a deck and we&apos;ll create the game room right away.</p>
          </div>

          <div className={styles.adventureGrid}>
            <button
              className={`button ${styles.adventureButton}`}
              onClick={() => onCreateGame("fibonacci")}
              disabled={pendingDeck !== null}
              type="button"
            >
              <span className={styles.avatar} aria-hidden="true">
                🧙
              </span>
              <span className={styles.adventureCopy}>
                <span className={styles.adventureName}>Fibonacci</span>
                <span className={styles.adventureHint}>
                  {pendingDeck === "fibonacci" ? "Creating room..." : "Classic point-estimating quest"}
                </span>
              </span>
            </button>

            <button
              className={`button ${styles.adventureButton}`}
              onClick={() => onCreateGame("tshirt")}
              disabled={pendingDeck !== null}
              type="button"
            >
              <span className={styles.avatar} aria-hidden="true">
                🧝
              </span>
              <span className={styles.adventureCopy}>
                <span className={styles.adventureName}>T-Shirt</span>
                <span className={styles.adventureHint}>
                  {pendingDeck === "tshirt" ? "Creating room..." : "Size stories from XS to XXL"}
                </span>
              </span>
            </button>
          </div>
        </section>

        {error ? <p className="error-text">{error}</p> : null}
      </main>
    </LayoutShell>
  );
}
