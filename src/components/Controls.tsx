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
    <section className="panel nested-panel host-controls">
      <div className="row gap-sm wrap" style={{ justifyContent: "center" }}>
        <button className="button button-danger" type="button" onClick={onReveal} disabled={revealed}>
          Reveal Cards
        </button>
        <button className="button button-blue" type="button" onClick={onReset}>
          Next Round
        </button>
      </div>
    </section>
  );
}