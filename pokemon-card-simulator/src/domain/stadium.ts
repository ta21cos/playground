import type { GameState } from "../types/game-state";

export function placeStadium(
  state: GameState,
  instanceId: string,
  fromZone: "手札" = "手札",
): GameState {
  const instance = state.cardInstances[instanceId];
  if (instance && instance.card.card_category !== "スタジアム") {
    throw new Error("スタジアムゾーンにはスタジアムカードのみ配置できます");
  }

  const zones = { ...state.zones };
  zones[fromZone] = zones[fromZone].filter((id) => id !== instanceId);

  const existingStadium = zones.スタジアム;
  if (existingStadium.length > 0) {
    zones.トラッシュ = [...zones.トラッシュ, ...existingStadium];
  }
  zones.スタジアム = [instanceId];

  return { ...state, zones };
}
