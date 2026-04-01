type Props = {
  isHost: boolean;
  revealed: boolean;
  onReveal: () => void;
  onReset: () => void;
};

export function Controls({ isHost, revealed, onReveal, onReset }: Props) {
  if (!isHost) {
    return null;
  }

  return (
    <div className="row gap-sm wrap">
      <button className="btn" type="button" onClick={onReveal} disabled={revealed}>
        Reveal Votes
      </button>
      <button className="btn btn-danger" type="button" onClick={onReset}>
        Reset Round
      </button>
    </div>
  );
}