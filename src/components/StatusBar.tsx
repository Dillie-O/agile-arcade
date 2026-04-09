"use client";

import { useMemo, useState } from "react";

type Props = {
  roomId: string;
  isConnected: boolean;
};

export function StatusBar({ roomId, isConnected }: Props) {
  const [copied, setCopied] = useState(false);

  const shareMeta = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        display: `game.local/game/${roomId}`,
        copyValue: `/game/${roomId}`,
      };
    }

    return {
      display: `${window.location.host}/game/${roomId}`,
      copyValue: `${window.location.origin}/game/${roomId}`,
    };
  }, [roomId]);

  const onCopy = async () => {
    await navigator.clipboard.writeText(shareMeta.copyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="panel room-info-bar">
      <div className="room-info-line wrap">
        <span className="room-info-label">Room Code:</span>
        <strong className="share-url room-url-text">{shareMeta.display}</strong>
        <button className="button room-copy-button" type="button" onClick={onCopy}>
          {copied ? "Copied ✓" : "Copy Link ✒️"}
        </button>
      </div>

      {!isConnected ? <div className="status-bar">Reconnecting to the party...</div> : null}
    </section>
  );
}