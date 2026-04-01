import { GameRoom } from "./room-client";

type Props = {
  params: Promise<{ roomId: string }>;
};

export default async function GamePage({ params }: Props) {
  const { roomId } = await params;
  return <GameRoom roomId={roomId.toUpperCase()} />;
}