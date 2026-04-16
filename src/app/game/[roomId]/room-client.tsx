"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { CardDeck } from "@/components/CardDeck";
import { Controls } from "@/components/Controls";
import { JoinModal } from "@/components/JoinModal";
import { LayoutShell } from "@/components/LayoutShell";
import { ParticipantList } from "@/components/ParticipantList";
import { ResultsSummary } from "@/components/ResultsSummary";
import { NgrokPanel } from "@/components/NgrokPanel";
import { StatusBar } from "@/components/StatusBar";
import { randomEmoji } from "@/lib/constants";
import { Identity, Room } from "@/lib/types";

type Props = {
  roomId: string;
};

const getIdentityKey = (roomId: string) => `agile-arcade:${roomId}:identity`;

const toSafeHttpUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
};

export function GameRoom({ roomId }: Props) {
  const socketRef = useRef<Socket | null>(null);
  const myIdRef = useRef<string | null>(null);
  const hostNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [storyDraft, setStoryDraft] = useState<string | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingVote, setPendingVote] = useState<string | null>(null);
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [newHostNotice, setNewHostNotice] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState<number | null>(null);
  const prevIsHostRef = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem(getIdentityKey(roomId));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Identity;
        if (parsed.name && parsed.emoji) {
          if (!parsed.participantId) {
            parsed.participantId = crypto.randomUUID();
            localStorage.setItem(getIdentityKey(roomId), JSON.stringify(parsed));
          }
          // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncing state from localStorage (external system)
          setIdentity(parsed);
        }
      } catch {
        localStorage.removeItem(getIdentityKey(roomId));
      }
    }
    setIdentityLoaded(true);
  }, [roomId]);

  useEffect(() => {
    if (!identity) {
      return;
    }

    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    const emitJoin = () => {
      socket.emit("join_room", {
        roomId,
        name: identity.name,
        emoji: identity.emoji,
        participantId: identity.participantId,
      });
    };

    socket.on("connect", () => {
      setIsConnected(true);
      const id = identity.participantId ?? socket.id ?? null;
      myIdRef.current = id;
      setMyId(id);
      emitJoin();
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("room_state", (incoming: Room) => {
      setRoom(incoming);
      // Only sync story from server if the host isn't actively typing
      setStoryDraft((prev) => (prev === null ? null : prev));
      setRoomNotFound(false);
      setError(null);
      const myParticipant = incoming.participants.find((p) => p.id === myIdRef.current);
      if (myParticipant && !myParticipant.hasVoted) {
        setPendingVote(null);
      }
      // Detect host promotion and show brief notice
      const isHostNow = myParticipant?.isHost ?? false;
      if (isHostNow && !prevIsHostRef.current) {
        setNewHostNotice(true);
        if (hostNoticeTimerRef.current) clearTimeout(hostNoticeTimerRef.current);
        hostNoticeTimerRef.current = setTimeout(() => setNewHostNotice(false), 5000);
      }
      prevIsHostRef.current = isHostNow;
    });

    socket.on("room_not_found", () => {
      setRoomNotFound(true);
    });

    socket.on("not_authorized", () => {
      setError("You are not authorized to run that action.");
    });

    socket.on("error", (message: string) => {
      setError(message || "Something went wrong.");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      myIdRef.current = null;
      setMyId(null);
      if (hostNoticeTimerRef.current) clearTimeout(hostNoticeTimerRef.current);
      if (storyDebounceRef.current) clearTimeout(storyDebounceRef.current);
    };
  }, [identity, roomId]);

  useEffect(() => {
    const timerEndsAt = room?.timerEndsAt ?? null;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (!timerEndsAt || room?.revealed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncing timer display from server state
      setTimerDisplay(null);
      return;
    }

    const update = () => {
      const remaining = Math.ceil((timerEndsAt - Date.now()) / 1000);
      setTimerDisplay(remaining > 0 ? remaining : 0);
    };

    update();
    timerIntervalRef.current = setInterval(update, 250);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [room?.timerEndsAt, room?.revealed]);

  const me = useMemo(() => {
    if (!room || !myId) {
      return null;
    }

    return room.participants.find((item) => item.id === myId) ?? null;
  }, [room, myId]);

  const onJoin = (nextIdentity: Identity) => {
    const identityWithId = { ...nextIdentity, participantId: crypto.randomUUID() };
    localStorage.setItem(getIdentityKey(roomId), JSON.stringify(identityWithId));
    setIdentity(identityWithId);
  };

  const onCastVote = (value: string) => {
    setPendingVote(value);
    socketRef.current?.emit("cast_vote", { roomId, value });
  };

  const onRevealVotes = () => {
    socketRef.current?.emit("reveal_votes", { roomId });
  };

  const onResetRound = () => {
    setPendingVote(null);
    setStoryDraft(null);
    socketRef.current?.emit("reset_round", { roomId });
  };

  const safeStoryUrl = toSafeHttpUrl(storyDraft ?? room?.story ?? "");

  const onStartTimer = (duration: number) => {
    socketRef.current?.emit("start_timer", { roomId, duration });
  };

  const onUpdateStory = (story: string) => {
    setStoryDraft(story);
    if (storyDebounceRef.current) clearTimeout(storyDebounceRef.current);
    storyDebounceRef.current = setTimeout(() => {
      socketRef.current?.emit("update_story", { roomId, story });
      storyDebounceRef.current = null;
    }, 400);
  };

  const handleStopTunnel = async () => {
    await fetch("/api/stop-tunnel", { method: "POST" });
    setTunnelUrl(null);
  };

  if (roomNotFound) {
    return (
      <LayoutShell>
        <main className="panel room-not-found">
          <h1>Room Not Found</h1>
          <p>That room has expired or does not exist.</p>
          <Link href="/" className="button">
            Return Home
          </Link>
        </main>
      </LayoutShell>
    );
  }

  const selectedVote = pendingVote ?? me?.vote;
  const isHost = Boolean(me?.isHost);

  return (
    <LayoutShell>
      <JoinModal
        isOpen={identityLoaded && !identity}
        onSubmit={onJoin}
        onRandomizeEmoji={randomEmoji}
      />

      <main className="room-layout">
        <header className="panel app-header room-header">
          <Image src="/logo_banner.webp" alt="Agile Arcade" className="banner-img" width={640} height={120} priority />
        </header>

        <StatusBar roomId={roomId} isConnected={isConnected} tunnelUrl={tunnelUrl} onStopTunnel={isHost ? handleStopTunnel : undefined} />

        {newHostNotice ? (
          <div className="host-notice" role="status">
            You are now the host
          </div>
        ) : null}

        {isHost ? <NgrokPanel tunnelActive={!!tunnelUrl} onTunnelChange={setTunnelUrl} /> : null}

        {timerDisplay !== null ? (
          <div className="timer-banner" role="status" aria-live="polite">
            ⏱ {timerDisplay}s
          </div>
        ) : null}

        <section className="game-grid">
          <section className="panel participants-panel">
            <h2 className="section-heading">Participants</h2>
            <ParticipantList
              participants={room?.participants ?? []}
              revealed={Boolean(room?.revealed)}
              myId={myId}
            />
          </section>

          <section className="panel play-panel">
            <div className="story-row">
              <span className="label">Story:</span>
              {isHost ? (
                <>
                  <input
                    id="story-input"
                    type="text"
                    className="terminal-input story-input"
                    value={storyDraft ?? room?.story ?? ""}
                    onChange={(event) => onUpdateStory(event.target.value)}
                    placeholder="Enter story or URL..."
                    maxLength={140}
                    disabled={Boolean(room?.revealed)}
                  />
                  <span className="story-char-count">{(storyDraft ?? room?.story ?? "").length}/140</span>
                </>
              ) : (
                <span className="story-display">{room?.story || "No story set"}</span>
              )}
              {safeStoryUrl ? (
                <a
                  href={safeStoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button story-link-btn"
                  title="Open link"
                >
                  ↗
                </a>
              ) : null}
            </div>

            <ResultsSummary
              participants={room?.participants ?? []}
              revealed={Boolean(room?.revealed)}
              deckType={room?.deckType ?? "fibonacci"}
            />

            <h2 className="section-heading">Select Your Card</h2>

            <CardDeck
              deckType={room?.deckType ?? "fibonacci"}
              selectedValue={selectedVote}
              onSelect={onCastVote}
            />

            <Controls
              isHost={isHost}
              revealed={Boolean(room?.revealed)}
              timerEndsAt={room?.timerEndsAt ?? null}
              onReveal={onRevealVotes}
              onReset={onResetRound}
              onStartTimer={onStartTimer}
            />

            {error ? <p className="error-text">{error}</p> : null}
          </section>
        </section>
      </main>
    </LayoutShell>
  );
}