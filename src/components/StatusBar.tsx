"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  roomId: string;
  isConnected: boolean;
  tunnelUrl?: string | null;
  onStopTunnel?: () => void;
};

export function StatusBar({ roomId, isConnected, tunnelUrl, onStopTunnel }: Props) {
  const [copied, setCopied] = useState(false);
  const [ngrokCopied, setNgrokCopied] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ngrokCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (ngrokCopiedTimerRef.current) clearTimeout(ngrokCopiedTimerRef.current);
    };
  }, []);

  const onCopy = async () => {
    if (!shareMeta) return;
    await navigator.clipboard.writeText(shareMeta.copyValue);
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 1200);
  };

  const onCopyNgrok = async () => {
    if (!tunnelUrl) return;
    await navigator.clipboard.writeText(`${tunnelUrl}/game/${roomId}`);
    setNgrokCopied(true);
    if (ngrokCopiedTimerRef.current) clearTimeout(ngrokCopiedTimerRef.current);
    ngrokCopiedTimerRef.current = setTimeout(() => setNgrokCopied(false), 1200);
  };

  const onStop = async () => {
    if (!onStopTunnel) return;
    setIsStopping(true);
    try {
      await onStopTunnel();
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <section className="panel room-info-bar">
      <div className="room-info-line wrap">
        <span className="room-info-label">Local:</span>
        <strong className="share-url room-url-text">{shareMeta?.display ?? `…/game/${roomId}`}</strong>
        <button className="button room-copy-button" type="button" onClick={onCopy} disabled={!shareMeta}>
          {copied ? "Copied ✓" : "Copy Link ✒️"}
        </button>
      </div>

      {tunnelUrl ? (
        <div className="room-info-line wrap">
          <span className="room-info-label">ngrok:</span>
          <strong className="share-url room-url-text">{tunnelUrl}/game/{roomId}</strong>
          <button className="button room-copy-button" type="button" onClick={onCopyNgrok}>
            {ngrokCopied ? "Copied ✓" : "Copy Link ✒️"}
          </button>
          {onStopTunnel ? (
            <button className="button button-danger" type="button" onClick={onStop} disabled={isStopping}>
              {isStopping ? "Stopping…" : "Stop Tunnel"}
            </button>
          ) : null}
        </div>
      ) : null}

      {!isConnected ? <div className="status-bar">Reconnecting to the party...</div> : null}
    </section>
  );
}