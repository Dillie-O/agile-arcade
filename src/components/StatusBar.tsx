"use client";

import { useMemo, useState } from "react";

type Props = {
  roomId: string;
  isConnected: boolean;
};

export function StatusBar({ roomId, isConnected }: Props) {
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
      <div className="room-code-block">
        <span className="secondary-text">Room Code</span>
        <strong className="room-code">{roomId}</strong>
      </div>

      <div className="status-row room-url-row wrap">
        <span className="share-url secondary-text">{shareUrl}</span>
        <button className="btn" type="button" onClick={onCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="status-row">
        <span className="secondary-text">Connection</span>
        <span className="secondary-text">{isConnected ? "ONLINE" : "OFFLINE"}</span>
      </div>
    </section>
  );
}