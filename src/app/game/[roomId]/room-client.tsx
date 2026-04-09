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
import { StatusBar } from "@/components/StatusBar";
import { randomEmoji } from "@/lib/constants";
import { Identity, Room } from "@/lib/types";

type Props = {
  roomId: string;
};

const getIdentityKey = (roomId: string) => `agile-arcade:${roomId}:identity`;

export function GameRoom({ roomId }: Props) {
  const socketRef = useRef<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const socket = io({ transports: ["websocket"] });
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
      setMyId(identity.participantId ?? socket.id ?? null);
      emitJoin();
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("room_state", (incoming: Room) => {
      setRoom(incoming);
      setRoomNotFound(false);
      setError(null);
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
      setMyId(null);
    };
  }, [identity, roomId]);

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
    socketRef.current?.emit("cast_vote", { roomId, value });
  };

  const onRevealVotes = () => {
    socketRef.current?.emit("reveal_votes", { roomId });
  };

  const onResetRound = () => {
    socketRef.current?.emit("reset_round", { roomId });
  };

  const onUpdateStory = (story: string) => {
    socketRef.current?.emit("update_story", { roomId, story });
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

  const selectedVote = me?.vote;
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

        <StatusBar roomId={roomId} isConnected={isConnected} />

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
                <input
                  id="story-input"
                  type="text"
                  className="terminal-input story-input"
                  value={room?.story ?? ""}
                  onChange={(event) => onUpdateStory(event.target.value)}
                  placeholder="Enter story or URL..."
                  disabled={Boolean(room?.revealed)}
                />
              ) : (
                <span className="story-display">{room?.story || "No story set"}</span>
              )}
              {(room?.story ?? "").match(/^https?:\/\/\S+$/) ? (
                <a
                  href={room?.story}
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
              onReveal={onRevealVotes}
              onReset={onResetRound}
            />

            {error ? <p className="error-text">{error}</p> : null}
          </section>
        </section>
      </main>
    </LayoutShell>
  );
}