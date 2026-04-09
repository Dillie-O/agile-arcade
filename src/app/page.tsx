"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DeckType } from "@/lib/types";
import { LayoutShell } from "@/components/LayoutShell";
import { DeckSelector } from "@/components/DeckSelector";

export default function Home() {
  const router = useRouter();
  const [deckType, setDeckType] = useState<DeckType>("fibonacci");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreateGame = async () => {
    setIsCreating(true);
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
      setIsCreating(false);
    }
  };

  return (
    <LayoutShell>
      <main className="panel landing-panel">
        <header className="app-header home-header">
          <Image src="/logo_banner.webp" alt="Agile Arcade" className="banner-img" width={640} height={120} priority />
        </header>

        <DeckSelector deckType={deckType} onChange={setDeckType} />

        <button className="button" onClick={onCreateGame} disabled={isCreating}>
          {isCreating ? "Creating..." : "Create Game"}
        </button>

        {error ? <p className="error-text">{error}</p> : null}
      </main>
    </LayoutShell>
  );
}
