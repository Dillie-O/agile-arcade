"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [identity, setIdentity] = useState<Identity | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = localStorage.getItem(getIdentityKey(roomId));
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Identity;
      if (parsed.name && parsed.emoji) {
        return parsed;
      }
      return null;
    } catch {
      localStorage.removeItem(getIdentityKey(roomId));
      return null;
    }
  });
  const [myId, setMyId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialEmoji = useMemo(() => randomEmoji(), []);

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
      });
    };

    socket.on("connect", () => {
      setIsConnected(true);
      setMyId(socket.id ?? null);
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
    localStorage.setItem(getIdentityKey(roomId), JSON.stringify(nextIdentity));
    setIdentity(nextIdentity);
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

  const onChangeEmoji = () => {
    if (!identity) {
      return;
    }

    const emoji = randomEmoji();
    const nextIdentity = { ...identity, emoji };
    localStorage.setItem(getIdentityKey(roomId), JSON.stringify(nextIdentity));
    setIdentity(nextIdentity);
    socketRef.current?.emit("change_emoji", { roomId, emoji });
  };

  if (roomNotFound) {
    return (
      <LayoutShell>
        <main className="panel room-not-found">
          <h1>Room Not Found</h1>
          <p>That room has expired or does not exist.</p>
          <Link href="/" className="btn">
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
        isOpen={!identity}
        initialEmoji={initialEmoji}
        onSubmit={onJoin}
        onRandomizeEmoji={randomEmoji}
      />

      <main className="game-grid">
        <section className="panel participants-panel">
          <h2 className="section-heading">Participants</h2>
          <ParticipantList
            participants={room?.participants ?? []}
            revealed={Boolean(room?.revealed)}
            myId={myId}
            onChangeEmoji={onChangeEmoji}
          />
        </section>

        <section className="panel play-panel">
          <StatusBar
            roomId={roomId}
            isConnected={isConnected}
          />

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

          <ResultsSummary participants={room?.participants ?? []} revealed={Boolean(room?.revealed)} />

          {error ? <p className="error-text">{error}</p> : null}
        </section>
      </main>
    </LayoutShell>
  );
}