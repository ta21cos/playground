import { Card } from "./Card";
import type { CardInstance } from "../types/game-state";

interface BenchSelectorProps {
  benchPokemon: CardInstance[];
  onSelect: (instanceId: string) => void;
}

export function BenchSelector({ benchPokemon, onSelect }: BenchSelectorProps) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>バトル場に出すポケモンを選んでください</h3>
        <div className="bench-selector-cards">
          {benchPokemon.map((inst) => (
            <div
              key={inst.instanceId}
              className="bench-selector-card"
              onClick={() => onSelect(inst.instanceId)}
            >
              <Card card={inst.card} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
