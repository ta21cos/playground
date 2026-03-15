import type { GamePhase } from "../types/game-state";

interface ActionBarProps {
  phase: GamePhase;
  turnNumber: number;
  hasSeedInBattle: boolean;
  needsMulligan: boolean;
  onEndTurn: () => void;
  onUndo: () => void;
  onHistory: () => void;
  onMulligan: () => void;
  onStartGame: () => void;
  onReset: () => void;
}

export function ActionBar({
  phase,
  turnNumber,
  hasSeedInBattle,
  needsMulligan,
  onEndTurn,
  onUndo,
  onHistory,
  onMulligan,
  onStartGame,
  onReset,
}: ActionBarProps) {
  return (
    <div className="action-bar">
      {phase === "進行中" && (
        <>
          <span className="turn-display">ターン {turnNumber}</span>
          <button onClick={onEndTurn}>ターン終了</button>
        </>
      )}
      <button onClick={onUndo}>Undo</button>
      <button onClick={onHistory}>履歴</button>
      {phase === "セットアップ中" && needsMulligan && (
        <button onClick={onMulligan}>マリガン</button>
      )}
      {phase === "セットアップ中" && hasSeedInBattle && (
        <button onClick={onStartGame}>ゲーム開始</button>
      )}
      {(phase === "進行中" || phase === "セットアップ中") && (
        <button onClick={onReset}>リセット</button>
      )}
    </div>
  );
}
