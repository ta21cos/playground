import { useState } from "react";
import { Card } from "./Card";
import type { CardInstance } from "../types/game-state";

interface SearchModalProps {
  cards: CardInstance[];
  onSelect: (selectedIds: string[]) => void;
  onClose: () => void;
}

export function SearchModal({ cards, onSelect, onClose }: SearchModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>山札サーチ</h3>
        <div className="search-cards">
          {cards.map((inst) => (
            <div
              key={inst.instanceId}
              className={`search-card ${selected.has(inst.instanceId) ? "selected" : ""}`}
              onClick={() => toggleSelect(inst.instanceId)}
            >
              <Card card={inst.card} />
            </div>
          ))}
          {cards.length === 0 && <p>山札にカードがありません</p>}
        </div>
        <div className="modal-actions">
          <button onClick={() => onSelect([...selected])}>
            {selected.size > 0 ? `${selected.size}枚を手札に加える` : "選ばずに終了"}
          </button>
          <button onClick={onClose}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}
