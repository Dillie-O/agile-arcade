"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

type KioskAction = {
  href: string;
  label: string;
  external?: boolean;
};

type Props = {
  roomId: string;
  isConnected: boolean;
  tunnelUrl?: string | null;
  onStopTunnel?: () => void;
  kioskAction?: KioskAction;
};

type QrModal = { dataUrl: string; url: string };

export function StatusBar({ roomId, isConnected, tunnelUrl, onStopTunnel, kioskAction }: Props) {
  const [isStopping, setIsStopping] = useState(false);
  const [qrModal, setQrModal] = useState<QrModal | null>(null);
  const [modalCopied, setModalCopied] = useState(false);
  const modalCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shareMeta, setShareMeta] = useState<{ display: string; copyValue: string } | null>(null);

  useEffect(() => {
    setShareMeta({
      display: `${window.location.host}/game/${roomId}`,
      copyValue: `${window.location.origin}/game/${roomId}`,
    });
  }, [roomId]);

  useEffect(() => {
    return () => {
      if (modalCopiedTimerRef.current) clearTimeout(modalCopiedTimerRef.current);
    };
  }, []);

  const openQr = async (url: string) => {
    const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 2 });
    setQrModal({ dataUrl, url });
    setModalCopied(false);
  };

  const onModalCopy = async () => {
    if (!qrModal) return;
    await navigator.clipboard.writeText(qrModal.url);
    setModalCopied(true);
    if (modalCopiedTimerRef.current) clearTimeout(modalCopiedTimerRef.current);
    modalCopiedTimerRef.current = setTimeout(() => setModalCopied(false), 1200);
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
    <>
      <section className="panel room-info-bar">
        <div className="room-info-line wrap">
          <span className="room-info-label">Local:</span>
          <strong className="share-url room-url-text">{shareMeta?.display ?? `…/game/${roomId}`}</strong>
          <button className="button room-copy-button" type="button" onClick={() => openQr(shareMeta!.copyValue)} disabled={!shareMeta}>
            Share Game
          </button>
          {kioskAction ? (
            <Link
              href={kioskAction.href}
              className="button button-blue"
              target={kioskAction.external ? "_blank" : undefined}
              rel={kioskAction.external ? "noopener noreferrer" : undefined}
            >
              {kioskAction.label}
            </Link>
          ) : null}
        </div>

        {tunnelUrl ? (
          <div className="room-info-line wrap">
            <span className="room-info-label">ngrok:</span>
            <strong className="share-url room-url-text">{tunnelUrl}/game/{roomId}</strong>
            <button className="button room-copy-button" type="button" onClick={() => openQr(`${tunnelUrl}/game/${roomId}`)}>
              Share Game
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

      {qrModal ? (
        <div className="modal-overlay" onClick={() => setQrModal(null)}>
          <div className="panel qr-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-heading">Join Game</h3>
            <img className="qr-modal-img" src={qrModal.dataUrl} alt="Scan to join game" width={240} height={240} />
            <p className="qr-modal-url">{qrModal.url}</p>
            <div className="qr-modal-actions">
              <button className="button" type="button" onClick={onModalCopy}>
                {modalCopied ? "Copied ✓" : "Copy Link ✒️"}
              </button>
              <button className="button" type="button" onClick={() => setQrModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
