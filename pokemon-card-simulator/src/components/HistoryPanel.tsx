interface HistoryEntry {
  index: number;
  description: string;
}

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onJumpTo: (index: number) => void;
  onClose: () => void;
}

export function HistoryPanel({ entries, onJumpTo, onClose }: HistoryPanelProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>操作履歴</h3>
        <div className="history-list">
          {entries.map((entry) => (
            <button
              key={entry.index}
              className="history-entry"
              onClick={() => onJumpTo(entry.index)}
            >
              #{entry.index}: {entry.description}
            </button>
          ))}
          {entries.length === 0 && <p>操作履歴がありません</p>}
        </div>
        <button onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}
