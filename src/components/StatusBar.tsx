"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  roomId: string;
  isConnected: boolean;
};

export function StatusBar({ roomId, isConnected }: Props) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shareMeta, setShareMeta] = useState<{ display: string; copyValue: string } | null>(null);

  useEffect(() => {
    setShareMeta({
      display: `${window.location.host}/game/${roomId}`,
      copyValue: `${window.location.origin}/game/${roomId}`,
    });
  }, [roomId]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const onCopy = async () => {
    if (!shareMeta) return;
    await navigator.clipboard.writeText(shareMeta.copyValue);
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="panel room-info-bar">
      <div className="room-info-line wrap">
        <span className="room-info-label">Room Code:</span>
        <strong className="share-url room-url-text">{shareMeta?.display ?? `…/game/${roomId}`}</strong>
        <button className="button room-copy-button" type="button" onClick={onCopy} disabled={!shareMeta}>
          {copied ? "Copied ✓" : "Copy Link ✒️"}
        </button>
      </div>

      {!isConnected ? <div className="status-bar">Reconnecting to the party...</div> : null}
    </section>
  );
}