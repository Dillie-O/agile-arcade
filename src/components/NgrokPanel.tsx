"use client";

import { useState } from "react";

type TunnelState =
  | { status: "idle" }
  | { status: "starting" }
  | { status: "error"; message: string };

type Props = {
  tunnelActive: boolean;
  onTunnelChange: (url: string | null) => void;
};

export function NgrokPanel({ tunnelActive, onTunnelChange }: Props) {
  const [token, setToken] = useState("");
  const [tunnel, setTunnel] = useState<TunnelState>({ status: "idle" });
  const [dismissed, setDismissed] = useState(false);

  const onStart = async () => {
    if (!token.trim()) return;
    setTunnel({ status: "starting" });

    try {
      const res = await fetch("/api/start-tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authtoken: token.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTunnel({ status: "error", message: data.error ?? "Failed to start tunnel" });
        return;
      }

      setTunnel({ status: "idle" });
      setToken("");
      onTunnelChange(data.url);
    } catch {
      setTunnel({ status: "error", message: "Network error — is the server running?" });
    }
  };

  if (tunnelActive || dismissed) {
    return null;
  }

  const isBusy = tunnel.status === "starting";

  return (
    <section className="panel nested-panel ngrok-panel">
      <p className="label">Share via ngrok</p>
      <div className="row gap-sm">
        <input
          className="terminal-input ngrok-token-input"
          type="password"
          placeholder="ngrok auth token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          disabled={isBusy}
          maxLength={512}
          aria-label="ngrok auth token"
        />
        <button
          className="button"
          type="button"
          onClick={onStart}
          disabled={isBusy || !token.trim()}
        >
          {isBusy ? "Starting…" : "Start Tunnel"}
        </button>
        <button className="button" type="button" onClick={() => setDismissed(true)}>
          Close
        </button>
      </div>
      {tunnel.status === "error" ? (
        <p className="error-text">{tunnel.message}</p>
      ) : null}
    </section>
  );
}
