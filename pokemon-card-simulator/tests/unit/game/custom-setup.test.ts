import { describe, it, expect, beforeEach } from "vitest";
import { customSetup } from "../../../src/domain/custom-setup";
import { createDeckWith60Cards, resetInstanceCounter } from "../../helpers/deck-factory";

describe("FR-33: カスタムセットアップ", () => {
  beforeEach(() => resetInstanceCounter());

  it("デッキ一覧から手札・バトル場・ベンチを選んでゲームを開始する", () => {
    const { state, cards } = createDeckWith60Cards(10);
    const hand = cards.slice(0, 5);
    const battle = cards[5]!;
    const bench = cards.slice(6, 8);

    const result = customSetup(state, { hand, battleField: battle, bench });
    expect(result.phase).toBe("進行中");
    expect(result.zones.サイド).toHaveLength(6);
    expect(result.zones.手札).toHaveLength(6); // 5 + 1 draw
    expect(result.zones.バトル場).toHaveLength(1);
    expect(result.zones.ベンチ).toHaveLength(2);
    expect(result.turnNumber).toBe(1);
  });

  it("残りカードがサイド6枚と山札に自動振り分けされる", () => {
    const { state, cards } = createDeckWith60Cards(10);
    const hand = cards.slice(0, 10);

    const result = customSetup(state, { hand, battleField: null, bench: [] });
    expect(result.zones.サイド).toHaveLength(6);
    const totalRemaining = result.zones.山札.length + result.zones.サイド.length;
    expect(totalRemaining).toBe(50 - 1); // -1 for draw
  });

  it("バトル場にたねポケモンがなくてもフリーセットアップでは開始できる", () => {
    const { state, cards } = createDeckWith60Cards(0);
    const result = customSetup(state, {
      hand: [],
      battleField: cards[0]!,
      bench: [],
    });
    expect(result.phase).toBe("進行中");
  });

  it("何も配置せずに開始すると全カードがサイド+山札になる", () => {
    const { state } = createDeckWith60Cards(10);
    const result = customSetup(state, { hand: [], battleField: null, bench: [] });
    expect(result.zones.サイド).toHaveLength(6);
    expect(result.zones.山札).toHaveLength(53); // 60 - 6 side - 1 draw
    expect(result.zones.手札).toHaveLength(1); // draw only
  });

  it("相手サイドカウンターの初期値を設定できる", () => {
    const { state } = createDeckWith60Cards(10);
    const result = customSetup(state, {
      hand: [],
      battleField: null,
      bench: [],
      opponentSideCount: 3,
    });
    expect(result.opponentSideCount).toBe(3);
  });
});

describe("@edge-case FR-33: カスタムセットアップのエッジケース", () => {
  beforeEach(() => resetInstanceCounter());

  it("手札に 55 枚配置するとサイド 6 枚分不足のため拒否される", () => {
    const { state, cards } = createDeckWith60Cards(60);
    const hand = cards.slice(0, 55);
    expect(() =>
      customSetup(state, { hand, battleField: null, bench: [] }),
    ).toThrow("サイド6枚分のカードが不足しています");
  });

  it("ベンチの最大枠数を超えて配置しようとすると拒否される", () => {
    const { state, cards } = createDeckWith60Cards(10);
    const bench = cards.slice(0, 6);
    expect(() =>
      customSetup(state, { hand: [], battleField: null, bench }, 5),
    ).toThrow("ベンチの最大枠数");
  });

  it("opponentSideCount に -1 を設定すると拒否される", () => {
    const { state } = createDeckWith60Cards(10);
    expect(() =>
      customSetup(state, {
        hand: [],
        battleField: null,
        bench: [],
        opponentSideCount: -1,
      }),
    ).toThrow("相手サイドカウンター");
  });

  it("opponentSideCount に 7 を設定すると拒否される", () => {
    const { state } = createDeckWith60Cards(10);
    expect(() =>
      customSetup(state, {
        hand: [],
        battleField: null,
        bench: [],
        opponentSideCount: 7,
      }),
    ).toThrow("相手サイドカウンター");
  });

  it("山札が 0 枚になった場合のターン 1 ドローはスキップされる", () => {
    const { state, cards } = createDeckWith60Cards(54);
    const hand = cards.slice(0, 54);
    const result = customSetup(state, { hand, battleField: null, bench: [] });
    expect(result.zones.サイド).toHaveLength(6);
    expect(result.zones.山札).toHaveLength(0);
    expect(result.zones.手札).toHaveLength(54);
  });
});
