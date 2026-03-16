import { describe, it, expect } from "vitest";
import { viewSide, takeSideCard, takeSideRandom } from "../../../src/domain/card-actions";
import { createDeckWith60Cards, resetInstanceCounter, createPokemonCard, createCardInstance } from "../../helpers/deck-factory";
import { setupGame } from "../../../src/domain/game-setup";
import { startGame } from "../../../src/domain/turn";

function makeGameInProgress() {
  resetInstanceCounter();
  const { state } = createDeckWith60Cards(10);
  const setup = setupGame(state);
  const seed = setup.zones.手札.find((id) => {
    const inst = setup.cardInstances[id];
    return inst?.card.card_category === "ポケモン" && "stage" in inst.card && inst.card.stage === "たね";
  });
  if (seed) {
    setup.zones.手札 = setup.zones.手札.filter((id) => id !== seed);
    setup.zones.バトル場 = [seed];
  } else {
    const p = createPokemonCard();
    const inst = createCardInstance(p);
    setup.cardInstances[inst.instanceId] = inst;
    setup.zones.バトル場 = [inst.instanceId];
  }
  return startGame(setup);
}

describe("FR-16: サイド確認・取得", () => {
  it("サイドのカードを確認できる", () => {
    const game = makeGameInProgress();
    const sideCards = viewSide(game);
    expect(sideCards).toHaveLength(6);
  });

  it("サイドからカードを選んで手札に加える", () => {
    const game = makeGameInProgress();
    const target = game.zones.サイド[0]!;
    const result = takeSideCard(game, target);
    expect(result.zones.手札).toContain(target);
    expect(result.zones.サイド).toHaveLength(5);
  });

  it("サイドからランダムに1枚を手札に加える", () => {
    const game = makeGameInProgress();
    const result = takeSideRandom(game);
    expect(result.zones.サイド).toHaveLength(5);
    expect(result.zones.手札.length).toBe(game.zones.手札.length + 1);
  });
});

describe("@edge-case FR-16: サイド取得のエッジケース", () => {
  it("サイドが 0 枚のときにランダム取得を実行しても状態が変化しない", () => {
    const game = makeGameInProgress();
    game.zones.サイド = [];
    const handBefore = game.zones.手札.length;

    const result = takeSideRandom(game);
    expect(result.zones.サイド).toHaveLength(0);
    expect(result.zones.手札).toHaveLength(handBefore);
  });
});
