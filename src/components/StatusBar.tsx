"use client";

import { useMemo, useState } from "react";

type Props = {
  roomId: string;
  isConnected: boolean;
  identityEmoji: string;
  onChangeEmoji: () => void;
};

export function StatusBar({ roomId, isConnected, identityEmoji, onChangeEmoji }: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/game/${roomId}`;
    }

    return `${window.location.origin}/game/${roomId}`;
  }, [roomId]);

  const onCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="panel nested-panel">
      <div className="status-row">
        <span>Room: {roomId}</span>
        <span>{isConnected ? "ONLINE" : "OFFLINE"}</span>
      </div>

      <div className="status-row wrap">
        <span className="share-url">{shareUrl}</span>
        <button className="btn" type="button" onClick={onCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <button className="btn" type="button" onClick={onChangeEmoji}>
        Change Emoji {identityEmoji}
      </button>
    </section>
  );
}