import type { GameState } from "../types/game-state";
import { Zone } from "./Zone";
import { Card } from "./Card";

interface GameBoardProps {
  state: GameState;
}

export function GameBoard({ state }: GameBoardProps) {
  function renderCards(instanceIds: string[]) {
    return instanceIds.map((id) => {
      const inst = state.cardInstances[id];
      if (!inst) return null;
      return (
        <Card key={id} card={inst.card} damageCounters={inst.damageCounters} />
      );
    });
  }

  return (
    <div className="game-board">
      <div className="board-top">
        <Zone name="山札" cardCount={state.zones.山札.length} />
        <Zone name="サイド" cardCount={state.zones.サイド.length} />
        <Zone name="トラッシュ" cardCount={state.zones.トラッシュ.length} />
      </div>

      <div className="board-center">
        <Zone name="バトル場" cardCount={state.zones.バトル場.length}>
          {renderCards(state.zones.バトル場)}
        </Zone>
        <Zone name="スタジアム" cardCount={state.zones.スタジアム.length}>
          {renderCards(state.zones.スタジアム)}
        </Zone>
      </div>

      <div className="board-bench">
        <Zone name="ベンチ" cardCount={state.zones.ベンチ.length}>
          {renderCards(state.zones.ベンチ)}
        </Zone>
      </div>

      <div className="board-bottom">
        <Zone name="手札" cardCount={state.zones.手札.length}>
          {renderCards(state.zones.手札)}
        </Zone>
      </div>
    </div>
  );
}
