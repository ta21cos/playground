interface OpponentSideCounterProps {
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function OpponentSideCounter({
  count,
  onIncrement,
  onDecrement,
}: OpponentSideCounterProps) {
  return (
    <div className="opponent-side-counter">
      <span className="label">相手サイド</span>
      <button onClick={onDecrement} disabled={count <= 0}>
        -
      </button>
      <span className="count">{count}</span>
      <button onClick={onIncrement} disabled={count >= 6}>
        +
      </button>
    </div>
  );
}
