import { describe, it, expect, beforeEach } from "vitest";
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  createGameStore,
  type GameStore,
} from "../../../src/store/game-store";
import type { Card, PokemonCard, BasicEnergyCard } from "../../../src/types/card";

function makeCard(
  name: string,
  category: string,
  extra?: Partial<Card>,
): Card {
  const base = {
    card_id: name,
    name,
    image_url: "",
    regulation: "",
    card_number: "",
    rarity: "",
    canonical_id: name,
  };

  if (category === "ポケモン") {
    return {
      ...base,
      card_category: "ポケモン",
      stage: "たね",
      hp: 70,
      type: ["無"],
      abilities: [],
      moves: [],
      weakness: "",
      resistance: "",
      retreat_cost: 1,
      effect_text: "",
      rule_text: "",
      special_rule: "",
      ...extra,
    } as PokemonCard;
  }

  if (category === "基本エネルギー") {
    return {
      ...base,
      card_category: "基本エネルギー",
      type: "炎",
      ...extra,
    } as BasicEnergyCard;
  }

  return {
    ...base,
    card_category: category as Card["card_category"],
    effect_text: "",
    rule_text: "",
    ...extra,
  } as Card;
}

function makePokemon(name: string, stage: string = "たね"): Card {
  return makeCard(name, "ポケモン", { stage } as Partial<Card>);
}

function makeEnergy(name: string): Card {
  return makeCard(name, "基本エネルギー");
}

function makeTool(name: string): Card {
  return makeCard(name, "ポケモンのどうぐ");
}

function makeStadium(name: string): Card {
  return makeCard(name, "スタジアム");
}

function make60CardDeck(): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < 20; i++) {
    cards.push(makePokemon(`pokemon-${i}`));
  }
  for (let i = 0; i < 20; i++) {
    cards.push(makeEnergy(`energy-${i}`));
  }
  for (let i = 0; i < 10; i++) {
    cards.push(makeTool(`tool-${i}`));
  }
  for (let i = 0; i < 10; i++) {
    cards.push(makeCard(`item-${i}`, "グッズ"));
  }
  return cards;
}

function setupWith60Cards(store: StoreApi<GameStore>): void {
  const deckCards = make60CardDeck();
  let counter = 0;
  const instances: Record<string, import("../../../src/types/game-state").CardInstance> = {};
  const ids: string[] = [];

  for (const card of deckCards) {
    const id = `inst-${++counter}`;
    instances[id] = {
      instanceId: id,
      card,
      attachedEnergies: [],
      attachedTool: null,
      evolutionStack: [],
      damageCounters: 0,
    };
    ids.push(id);
  }

  store.setState({
    game: {
      ...store.getState().game,
      phase: "デッキ読込済",
      zones: {
        ...store.getState().game.zones,
        山札: ids,
      },
      cardInstances: instances,
      deckCards,
    },
    history: [],
    warning: null,
  });
}

function setupAndStartGame(store: StoreApi<GameStore>): void {
  setupWith60Cards(store);
  store.getState().setup();

  const state = store.getState();
  const handIds = state.game.zones.手札;
  let taneId = handIds.find((id) => {
    const inst = state.game.cardInstances[id];
    return (
      inst?.card.card_category === "ポケモン" &&
      "stage" in inst.card &&
      inst.card.stage === "たね"
    );
  });

  if (!taneId) {
    taneId = state.game.zones.山札.find((id) => {
      const inst = state.game.cardInstances[id];
      return (
        inst?.card.card_category === "ポケモン" &&
        "stage" in inst.card &&
        inst.card.stage === "たね"
      );
    });
    if (taneId) {
      store.getState().moveCard(taneId, "山札", "手札");
    }
  }

  if (taneId) {
    store.getState().moveCard(taneId, "手札", "バトル場");
  }

  store.getState().startGame();
}

let store: StoreApi<GameStore>;

beforeEach(() => {
  store = createStore(createGameStore);
});

describe("FR-12: ゾーン定義", () => {
  it("初期化で7つのゾーンが存在する", () => {
    const { game } = store.getState();
    const zoneNames = Object.keys(game.zones);
    expect(zoneNames).toHaveLength(7);
    expect(zoneNames).toContain("山札");
    expect(zoneNames).toContain("手札");
    expect(zoneNames).toContain("サイド");
    expect(zoneNames).toContain("バトル場");
    expect(zoneNames).toContain("ベンチ");
    expect(zoneNames).toContain("トラッシュ");
    expect(zoneNames).toContain("スタジアム");
  });

  it("ゾーン間でカードを移動できる", () => {
    setupWith60Cards(store);
    store.getState().setup();

    const handBefore = store.getState().game.zones.手札;
    expect(handBefore.length).toBeGreaterThan(0);

    const cardId = handBefore[0]!;
    store.getState().moveCard(cardId, "手札", "トラッシュ");

    const { game } = store.getState();
    expect(game.zones.手札).not.toContain(cardId);
    expect(game.zones.トラッシュ).toContain(cardId);
  });

  it("ベンチのデフォルト枠数は5", () => {
    const { game } = store.getState();
    expect(game.benchMaxSize).toBe(5);
  });
});

describe("FR-12a: ベンチ拡張", () => {
  it("5〜8の間で変更できる", () => {
    store.getState().setBenchSize(6);
    expect(store.getState().game.benchMaxSize).toBe(6);

    store.getState().setBenchSize(8);
    expect(store.getState().game.benchMaxSize).toBe(8);
  });

  it("5未満は拒否", () => {
    store.getState().setBenchSize(4);
    expect(store.getState().game.benchMaxSize).toBe(5);
  });

  it("9以上は拒否", () => {
    store.getState().setBenchSize(9);
    expect(store.getState().game.benchMaxSize).toBe(5);
  });

  it("ポケモン数超過時は縮小拒否", () => {
    setupAndStartGame(store);

    store.getState().setBenchSize(8);

    const state = store.getState();
    const handIds = state.game.zones.手札;
    const pokemonIds = handIds.filter((id) => {
      const inst = state.game.cardInstances[id];
      return inst?.card.card_category === "ポケモン";
    });

    for (let i = 0; i < Math.min(6, pokemonIds.length); i++) {
      store.getState().moveCard(pokemonIds[i]!, "手札", "ベンチ");
    }

    const benchCount = store.getState().game.zones.ベンチ.length;
    if (benchCount > 5) {
      store.getState().setBenchSize(5);
      expect(store.getState().game.benchMaxSize).toBe(8);
    }
  });
});

describe("FR-5: 初期配布", () => {
  it("セットアップで手札7枚、山札53枚、サイド0枚", () => {
    setupWith60Cards(store);
    store.getState().setup();

    const { game } = store.getState();
    expect(game.zones.手札).toHaveLength(7);
    expect(game.zones.山札).toHaveLength(53);
    expect(game.zones.サイド).toHaveLength(0);
  });

  it('ゲーム状態は "セットアップ中"', () => {
    setupWith60Cards(store);
    store.getState().setup();

    expect(store.getState().game.phase).toBe("セットアップ中");
  });
});

describe("FR-6: マリガン処理", () => {
  it("手札にたねがないとマリガン判定", () => {
    const energyDeck: Card[] = [];
    for (let i = 0; i < 60; i++) {
      energyDeck.push(makeEnergy(`energy-only-${i}`));
    }
    const text = energyDeck.map((c) => `${c.name} 1`).join("\n");
    store.getState().importDeck(text);
    store.getState().setup();

    expect(store.getState().game.zones.手札).toHaveLength(7);

    const hasTane = store.getState().game.zones.手札.some((id) => {
      const inst = store.getState().game.cardInstances[id];
      return (
        inst?.card.card_category === "ポケモン" &&
        "stage" in inst.card &&
        inst.card.stage === "たね"
      );
    });
    expect(hasTane).toBe(false);
  });

  it("マリガン実行で手札が入れ替わる", () => {
    setupWith60Cards(store);
    store.getState().setup();

    store.getState().mulligan();

    const handAfter = store.getState().game.zones.手札;
    expect(handAfter).toHaveLength(7);
    expect(store.getState().game.zones.山札).toHaveLength(53);
  });
});

describe("FR-7: ゲーム開始", () => {
  it("バトル場にたねポケモン配置 → サイド6枚、ターン1ドロー", () => {
    setupWith60Cards(store);
    store.getState().setup();

    const handIds = store.getState().game.zones.手札;
    const taneId = handIds.find((id) => {
      const inst = store.getState().game.cardInstances[id];
      return (
        inst?.card.card_category === "ポケモン" &&
        "stage" in inst.card &&
        inst.card.stage === "たね"
      );
    });
    expect(taneId).toBeDefined();

    store.getState().moveCard(taneId!, "手札", "バトル場");
    const handBeforeStart = store.getState().game.zones.手札.length;

    store.getState().startGame();

    const { game } = store.getState();
    expect(game.phase).toBe("進行中");
    expect(game.turnNumber).toBe(1);
    expect(game.zones.サイド).toHaveLength(6);
    expect(game.zones.手札).toHaveLength(handBeforeStart + 1);
  });

  it("バトル場空だと開始拒否", () => {
    setupWith60Cards(store);
    store.getState().setup();

    expect(() => store.getState().startGame()).toThrow();
  });
});

describe("FR-8: ターン開始ドロー", () => {
  it("ターン終了で1枚ドロー", () => {
    setupAndStartGame(store);

    const handBefore = store.getState().game.zones.手札.length;
    const deckBefore = store.getState().game.zones.山札.length;

    store.getState().endTurn();

    expect(store.getState().game.zones.手札).toHaveLength(handBefore + 1);
    expect(store.getState().game.zones.山札).toHaveLength(deckBefore - 1);
  });

  it("山札0枚で警告", () => {
    setupAndStartGame(store);

    const deckSize = store.getState().game.zones.山札.length;
    store.getState().drawCards(deckSize);

    expect(store.getState().game.zones.山札).toHaveLength(0);

    store.getState().endTurn();
    expect(store.getState().warning).toBeTruthy();
  });
});

describe("FR-9: ターン数表示", () => {
  it("開始時ターン1", () => {
    setupAndStartGame(store);
    expect(store.getState().game.turnNumber).toBe(1);
  });

  it("終了ごとにインクリメント", () => {
    setupAndStartGame(store);
    store.getState().endTurn();
    expect(store.getState().game.turnNumber).toBe(2);

    store.getState().endTurn();
    expect(store.getState().game.turnNumber).toBe(3);
  });
});

describe("FR-14: N枚ドロー", () => {
  it("指定枚数ドロー", () => {
    setupAndStartGame(store);
    const handBefore = store.getState().game.zones.手札.length;
    store.getState().drawCards(3);
    expect(store.getState().game.zones.手札).toHaveLength(handBefore + 3);
  });

  it("山札より多い場合は残り全部", () => {
    setupAndStartGame(store);
    const deckSize = store.getState().game.zones.山札.length;
    store.getState().drawCards(deckSize + 10);

    expect(store.getState().game.zones.山札).toHaveLength(0);
    expect(store.getState().warning).toBeTruthy();
  });

  it("0以下は拒否", () => {
    setupAndStartGame(store);
    expect(() => store.getState().drawCards(0)).toThrow();
    expect(() => store.getState().drawCards(-1)).toThrow();
  });
});

describe("FR-15: 手札を山札に戻す", () => {
  it("山札の上に戻す", () => {
    setupAndStartGame(store);

    const cardId = store.getState().game.zones.手札[0]!;
    store.getState().returnToDeckTop(cardId);

    const { game } = store.getState();
    expect(game.zones.手札).not.toContain(cardId);
    expect(game.zones.山札[0]).toBe(cardId);
  });

  it("山札の下に戻す", () => {
    setupAndStartGame(store);

    const cardId = store.getState().game.zones.手札[0]!;
    store.getState().returnToDeckBottom(cardId);

    const { game } = store.getState();
    expect(game.zones.手札).not.toContain(cardId);
    expect(game.zones.山札[game.zones.山札.length - 1]).toBe(cardId);
  });
});

describe("FR-17: エネルギー付与", () => {
  it("手札エネルギー → バトル場ポケモン", () => {
    setupAndStartGame(store);

    const state = store.getState();
    const battlePokemonId = state.game.zones.バトル場[0]!;
    const energyId = state.game.zones.手札.find((id) => {
      const inst = state.game.cardInstances[id];
      return inst?.card.card_category === "基本エネルギー";
    });

    if (energyId) {
      store.getState().attachEnergy(energyId, battlePokemonId);

      const updated = store.getState();
      expect(updated.game.zones.手札).not.toContain(energyId);
      expect(
        updated.game.cardInstances[battlePokemonId]!.attachedEnergies,
      ).toContain(energyId);
    }
  });

  it("複数付与可能", () => {
    setupAndStartGame(store);

    const state = store.getState();
    const battlePokemonId = state.game.zones.バトル場[0]!;
    const energyIds = state.game.zones.手札.filter((id) => {
      const inst = state.game.cardInstances[id];
      return inst?.card.card_category === "基本エネルギー";
    });

    if (energyIds.length >= 2) {
      store.getState().attachEnergy(energyIds[0]!, battlePokemonId);
      store.getState().attachEnergy(energyIds[1]!, battlePokemonId);

      const updated = store.getState();
      const pokemon = updated.game.cardInstances[battlePokemonId]!;
      expect(pokemon.attachedEnergies).toContain(energyIds[0]);
      expect(pokemon.attachedEnergies).toContain(energyIds[1]);
    }
  });

  it("ベンチにも付与可能", () => {
    setupAndStartGame(store);

    const state = store.getState();
    const pokemonInHand = state.game.zones.手札.filter((id) => {
      const inst = state.game.cardInstances[id];
      return (
        inst?.card.card_category === "ポケモン" &&
        "stage" in inst.card &&
        inst.card.stage === "たね"
      );
    });

    if (pokemonInHand.length > 0) {
      store.getState().moveCard(pokemonInHand[0]!, "手札", "ベンチ");

      const benchPokemonId = pokemonInHand[0]!;
      const energyId = store.getState().game.zones.手札.find((id) => {
        const inst = store.getState().game.cardInstances[id];
        return inst?.card.card_category === "基本エネルギー";
      });

      if (energyId) {
        store.getState().attachEnergy(energyId, benchPokemonId);
        const updated = store.getState();
        expect(
          updated.game.cardInstances[benchPokemonId]!.attachedEnergies,
        ).toContain(energyId);
      }
    }
  });

  it("ポケモン以外は拒否", () => {
    setupAndStartGame(store);

    const state = store.getState();
    const itemId = state.game.zones.手札.find((id) => {
      const inst = state.game.cardInstances[id];
      return inst?.card.card_category === "グッズ";
    });
    const energyId = state.game.zones.手札.find((id) => {
      const inst = state.game.cardInstances[id];
      return inst?.card.card_category === "基本エネルギー";
    });

    if (itemId && energyId) {
      expect(() =>
        store.getState().attachEnergy(energyId, itemId),
      ).toThrow();
    }
  });
});

describe("FR-29: どうぐ付与", () => {
  it("どうぐ → ポケモン", () => {
    setupAndStartGame(store);

    const state = store.getState();
    const battlePokemonId = state.game.zones.バトル場[0]!;
    const toolId = state.game.zones.手札.find((id) => {
      const inst = state.game.cardInstances[id];
      return inst?.card.card_category === "ポケモンのどうぐ";
    });

    if (toolId) {
      store.getState().attachTool(toolId, battlePokemonId);

      const updated = store.getState();
      expect(updated.game.zones.手札).not.toContain(toolId);
      expect(
        updated.game.cardInstances[battlePokemonId]!.attachedTool,
      ).toBe(toolId);
    }
  });

  it("2枚目は拒否", () => {
    setupAndStartGame(store);

    const state = store.getState();
    const battlePokemonId = state.game.zones.バトル場[0]!;
    const toolIds = state.game.zones.手札.filter((id) => {
      const inst = state.game.cardInstances[id];
      return inst?.card.card_category === "ポケモンのどうぐ";
    });

    if (toolIds.length >= 2) {
      store.getState().attachTool(toolIds[0]!, battlePokemonId);
      expect(() =>
        store.getState().attachTool(toolIds[1]!, battlePokemonId),
      ).toThrow();
    }
  });

  it("ベンチにも付与可能", () => {
    setupAndStartGame(store);

    const state = store.getState();
    const pokemonInHand = state.game.zones.手札.filter((id) => {
      const inst = state.game.cardInstances[id];
      return (
        inst?.card.card_category === "ポケモン" &&
        "stage" in inst.card &&
        inst.card.stage === "たね"
      );
    });

    if (pokemonInHand.length > 0) {
      store.getState().moveCard(pokemonInHand[0]!, "手札", "ベンチ");

      const toolId = store.getState().game.zones.手札.find((id) => {
        const inst = store.getState().game.cardInstances[id];
        return inst?.card.card_category === "ポケモンのどうぐ";
      });

      if (toolId) {
        store.getState().attachTool(toolId, pokemonInHand[0]!);
        expect(
          store.getState().game.cardInstances[pokemonInHand[0]!]!.attachedTool,
        ).toBe(toolId);
      }
    }
  });
});

describe("FR-34: 進化", () => {
  it("進化ポケモン → たねポケモン", () => {
    setupAndStartGame(store);

    const state = store.getState();
    const battlePokemonId = state.game.zones.バトル場[0]!;

    const evoCard = makePokemon("evo-pokemon", "1進化");
    const evoInstance = {
      instanceId: "evo-inst-1",
      card: evoCard,
      attachedEnergies: [] as string[],
      attachedTool: null,
      evolutionStack: [] as string[],
      damageCounters: 0,
    };

    store.setState((s) => ({
      game: {
        ...s.game,
        zones: {
          ...s.game.zones,
          手札: [...s.game.zones.手札, "evo-inst-1"],
        },
        cardInstances: {
          ...s.game.cardInstances,
          "evo-inst-1": evoInstance,
        },
      },
    }));

    store.getState().evolve("evo-inst-1", battlePokemonId);

    const updated = store.getState();
    expect(updated.game.zones.バトル場).toContain("evo-inst-1");
    expect(updated.game.zones.バトル場).not.toContain(battlePokemonId);
    expect(
      updated.game.cardInstances["evo-inst-1"]!.evolutionStack,
    ).toContain(battlePokemonId);
  });

  it("エネルギー・どうぐ・ダメカン引き継ぎ", () => {
    setupAndStartGame(store);

    const state = store.getState();
    const battlePokemonId = state.game.zones.バトル場[0]!;

    const energyId = state.game.zones.手札.find((id) => {
      const inst = state.game.cardInstances[id];
      return inst?.card.card_category === "基本エネルギー";
    });
    if (energyId) {
      store.getState().attachEnergy(energyId, battlePokemonId);
    }

    const toolId = store.getState().game.zones.手札.find((id) => {
      const inst = store.getState().game.cardInstances[id];
      return inst?.card.card_category === "ポケモンのどうぐ";
    });
    if (toolId) {
      store.getState().attachTool(toolId, battlePokemonId);
    }

    store.getState().addDamage(battlePokemonId, 30);

    const evoCard = makePokemon("evo-inherit", "1進化");
    store.setState((s) => ({
      game: {
        ...s.game,
        zones: {
          ...s.game.zones,
          手札: [...s.game.zones.手札, "evo-inherit-1"],
        },
        cardInstances: {
          ...s.game.cardInstances,
          "evo-inherit-1": {
            instanceId: "evo-inherit-1",
            card: evoCard,
            attachedEnergies: [],
            attachedTool: null,
            evolutionStack: [],
            damageCounters: 0,
          },
        },
      },
    }));

    store.getState().evolve("evo-inherit-1", battlePokemonId);

    const evoInstance =
      store.getState().game.cardInstances["evo-inherit-1"]!;
    if (energyId) {
      expect(evoInstance.attachedEnergies).toContain(energyId);
    }
    if (toolId) {
      expect(evoInstance.attachedTool).toBe(toolId);
    }
    expect(evoInstance.damageCounters).toBe(30);
  });

  it("2段階進化", () => {
    setupAndStartGame(store);

    const battlePokemonId = store.getState().game.zones.バトル場[0]!;

    const evo1Card = makePokemon("stage1-poke", "1進化");
    store.setState((s) => ({
      game: {
        ...s.game,
        zones: {
          ...s.game.zones,
          手札: [...s.game.zones.手札, "stage1-inst"],
        },
        cardInstances: {
          ...s.game.cardInstances,
          "stage1-inst": {
            instanceId: "stage1-inst",
            card: evo1Card,
            attachedEnergies: [],
            attachedTool: null,
            evolutionStack: [],
            damageCounters: 0,
          },
        },
      },
    }));

    store.getState().evolve("stage1-inst", battlePokemonId);

    const evo2Card = makePokemon("stage2-poke", "2進化");
    store.setState((s) => ({
      game: {
        ...s.game,
        zones: {
          ...s.game.zones,
          手札: [...s.game.zones.手札, "stage2-inst"],
        },
        cardInstances: {
          ...s.game.cardInstances,
          "stage2-inst": {
            instanceId: "stage2-inst",
            card: evo2Card,
            attachedEnergies: [],
            attachedTool: null,
            evolutionStack: [],
            damageCounters: 0,
          },
        },
      },
    }));

    store.getState().evolve("stage2-inst", "stage1-inst");

    const updated = store.getState();
    expect(updated.game.zones.バトル場).toContain("stage2-inst");
    const stage2Instance = updated.game.cardInstances["stage2-inst"]!;
    expect(stage2Instance.evolutionStack).toContain(battlePokemonId);
    expect(stage2Instance.evolutionStack).toContain("stage1-inst");
  });

  it("ベンチでも進化可能", () => {
    setupAndStartGame(store);

    const state = store.getState();
    const pokemonInHand = state.game.zones.手札.find((id) => {
      const inst = state.game.cardInstances[id];
      return (
        inst?.card.card_category === "ポケモン" &&
        "stage" in inst.card &&
        inst.card.stage === "たね"
      );
    });

    if (pokemonInHand) {
      store.getState().moveCard(pokemonInHand, "手札", "ベンチ");

      const evoCard = makePokemon("bench-evo", "1進化");
      store.setState((s) => ({
        game: {
          ...s.game,
          zones: {
            ...s.game.zones,
            手札: [...s.game.zones.手札, "bench-evo-inst"],
          },
          cardInstances: {
            ...s.game.cardInstances,
            "bench-evo-inst": {
              instanceId: "bench-evo-inst",
              card: evoCard,
              attachedEnergies: [],
              attachedTool: null,
              evolutionStack: [],
              damageCounters: 0,
            },
          },
        },
      }));

      store.getState().evolve("bench-evo-inst", pokemonInHand);

      const updated = store.getState();
      expect(updated.game.zones.ベンチ).toContain("bench-evo-inst");
      expect(updated.game.zones.ベンチ).not.toContain(pokemonInHand);
    }
  });
});

describe("FR-35: 退化", () => {
  it("退化で進化前に戻る", () => {
    setupAndStartGame(store);

    const battlePokemonId = store.getState().game.zones.バトル場[0]!;

    const evoCard = makePokemon("devolve-test", "1進化");
    store.setState((s) => ({
      game: {
        ...s.game,
        zones: {
          ...s.game.zones,
          手札: [...s.game.zones.手札, "devolve-inst"],
        },
        cardInstances: {
          ...s.game.cardInstances,
          "devolve-inst": {
            instanceId: "devolve-inst",
            card: evoCard,
            attachedEnergies: [],
            attachedTool: null,
            evolutionStack: [],
            damageCounters: 0,
          },
        },
      },
    }));

    store.getState().evolve("devolve-inst", battlePokemonId);
    expect(store.getState().game.zones.バトル場).toContain("devolve-inst");

    store.getState().devolve("devolve-inst");

    const updated = store.getState();
    expect(updated.game.zones.バトル場).toContain(battlePokemonId);
    expect(updated.game.zones.バトル場).not.toContain("devolve-inst");
  });

  it("進化カードが手札へ", () => {
    setupAndStartGame(store);

    const battlePokemonId = store.getState().game.zones.バトル場[0]!;

    const evoCard = makePokemon("devolve-hand", "1進化");
    store.setState((s) => ({
      game: {
        ...s.game,
        zones: {
          ...s.game.zones,
          手札: [...s.game.zones.手札, "devolve-hand-inst"],
        },
        cardInstances: {
          ...s.game.cardInstances,
          "devolve-hand-inst": {
            instanceId: "devolve-hand-inst",
            card: evoCard,
            attachedEnergies: [],
            attachedTool: null,
            evolutionStack: [],
            damageCounters: 0,
          },
        },
      },
    }));

    store.getState().evolve("devolve-hand-inst", battlePokemonId);
    store.getState().devolve("devolve-hand-inst");

    expect(store.getState().game.zones.手札).toContain("devolve-hand-inst");
  });
});

describe("FR-36: バトル場/ベンチ入替", () => {
  it("バトル場→ベンチ移動", () => {
    setupAndStartGame(store);

    const battlePokemonId = store.getState().game.zones.バトル場[0]!;
    store.getState().moveCard(battlePokemonId, "バトル場", "ベンチ");

    expect(store.getState().game.zones.ベンチ).toContain(battlePokemonId);
    expect(store.getState().game.zones.バトル場).not.toContain(battlePokemonId);
  });

  it("バトル場空でベンチ選択", () => {
    setupAndStartGame(store);

    const pokemonInHand = store.getState().game.zones.手札.find((id) => {
      const inst = store.getState().game.cardInstances[id];
      return (
        inst?.card.card_category === "ポケモン" &&
        "stage" in inst.card &&
        inst.card.stage === "たね"
      );
    });

    if (pokemonInHand) {
      store.getState().moveCard(pokemonInHand, "手札", "ベンチ");

      const battlePokemonId = store.getState().game.zones.バトル場[0]!;
      store.getState().moveCard(battlePokemonId, "バトル場", "トラッシュ");

      store.getState().promoteToBattle(pokemonInHand);

      expect(store.getState().game.zones.バトル場).toContain(pokemonInHand);
      expect(store.getState().game.zones.ベンチ).not.toContain(pokemonInHand);
    }
  });
});

describe("FR-30: 付与カード自動トラッシュ", () => {
  it("ポケモン移動時にエネルギー・どうぐ・進化元をトラッシュ", () => {
    setupAndStartGame(store);

    const battlePokemonId = store.getState().game.zones.バトル場[0]!;

    const energyId = store.getState().game.zones.手札.find((id) => {
      const inst = store.getState().game.cardInstances[id];
      return inst?.card.card_category === "基本エネルギー";
    });
    if (energyId) {
      store.getState().attachEnergy(energyId, battlePokemonId);
    }

    const toolId = store.getState().game.zones.手札.find((id) => {
      const inst = store.getState().game.cardInstances[id];
      return inst?.card.card_category === "ポケモンのどうぐ";
    });
    if (toolId) {
      store.getState().attachTool(toolId, battlePokemonId);
    }

    store.getState().moveWithCleanup(battlePokemonId, "バトル場", "トラッシュ");

    const updated = store.getState();
    expect(updated.game.zones.トラッシュ).toContain(battlePokemonId);
    if (energyId) {
      expect(updated.game.zones.トラッシュ).toContain(energyId);
    }
    if (toolId) {
      expect(updated.game.zones.トラッシュ).toContain(toolId);
    }

    const cleanedPokemon = updated.game.cardInstances[battlePokemonId]!;
    expect(cleanedPokemon.attachedEnergies).toHaveLength(0);
    expect(cleanedPokemon.attachedTool).toBeNull();
  });
});

describe("FR-31: 付与カード個別取り外し", () => {
  it("エネルギー個別トラッシュ", () => {
    setupAndStartGame(store);

    const battlePokemonId = store.getState().game.zones.バトル場[0]!;
    const energyId = store.getState().game.zones.手札.find((id) => {
      const inst = store.getState().game.cardInstances[id];
      return inst?.card.card_category === "基本エネルギー";
    });

    if (energyId) {
      store.getState().attachEnergy(energyId, battlePokemonId);
      store.getState().moveCard(energyId, "バトル場", "トラッシュ");

      expect(store.getState().game.zones.トラッシュ).toContain(energyId);
    }
  });

  it("どうぐ個別トラッシュ", () => {
    setupAndStartGame(store);

    const battlePokemonId = store.getState().game.zones.バトル場[0]!;
    const toolId = store.getState().game.zones.手札.find((id) => {
      const inst = store.getState().game.cardInstances[id];
      return inst?.card.card_category === "ポケモンのどうぐ";
    });

    if (toolId) {
      store.getState().attachTool(toolId, battlePokemonId);
      store.getState().moveCard(toolId, "バトル場", "トラッシュ");

      expect(store.getState().game.zones.トラッシュ).toContain(toolId);
    }
  });
});

describe("FR-25: ダメカン管理", () => {
  it("+10/-10", () => {
    setupAndStartGame(store);

    const battlePokemonId = store.getState().game.zones.バトル場[0]!;

    store.getState().addDamage(battlePokemonId, 10);
    expect(
      store.getState().game.cardInstances[battlePokemonId]!.damageCounters,
    ).toBe(10);

    store.getState().addDamage(battlePokemonId, -10);
    expect(
      store.getState().game.cardInstances[battlePokemonId]!.damageCounters,
    ).toBe(0);
  });

  it("任意値設定", () => {
    setupAndStartGame(store);

    const battlePokemonId = store.getState().game.zones.バトル場[0]!;

    store.getState().setDamage(battlePokemonId, 50);
    expect(
      store.getState().game.cardInstances[battlePokemonId]!.damageCounters,
    ).toBe(50);
  });

  it("0未満にならない", () => {
    setupAndStartGame(store);

    const battlePokemonId = store.getState().game.zones.バトル場[0]!;

    store.getState().addDamage(battlePokemonId, -100);
    expect(
      store.getState().game.cardInstances[battlePokemonId]!.damageCounters,
    ).toBe(0);

    store.getState().setDamage(battlePokemonId, -50);
    expect(
      store.getState().game.cardInstances[battlePokemonId]!.damageCounters,
    ).toBe(0);
  });
});

describe("FR-37: スタジアム上書き", () => {
  it("新スタジアム配置で旧スタジアムがトラッシュ", () => {
    setupAndStartGame(store);

    const stadium1 = makeStadium("stadium-1");
    const stadium2 = makeStadium("stadium-2");

    store.setState((s) => ({
      game: {
        ...s.game,
        zones: {
          ...s.game.zones,
          手札: [...s.game.zones.手札, "stadium-inst-1", "stadium-inst-2"],
        },
        cardInstances: {
          ...s.game.cardInstances,
          "stadium-inst-1": {
            instanceId: "stadium-inst-1",
            card: stadium1,
            attachedEnergies: [],
            attachedTool: null,
            evolutionStack: [],
            damageCounters: 0,
          },
          "stadium-inst-2": {
            instanceId: "stadium-inst-2",
            card: stadium2,
            attachedEnergies: [],
            attachedTool: null,
            evolutionStack: [],
            damageCounters: 0,
          },
        },
      },
    }));

    store.getState().placeStadium("stadium-inst-1");
    expect(store.getState().game.zones.スタジアム).toContain("stadium-inst-1");

    store.getState().placeStadium("stadium-inst-2");
    expect(store.getState().game.zones.スタジアム).toContain("stadium-inst-2");
    expect(store.getState().game.zones.スタジアム).not.toContain(
      "stadium-inst-1",
    );
    expect(store.getState().game.zones.トラッシュ).toContain("stadium-inst-1");
  });
});

describe("FR-32: 相手サイドカウンター", () => {
  it("初期値6", () => {
    expect(store.getState().game.opponentSideCount).toBe(6);
  });

  it("増減", () => {
    store.getState().adjustOpponentSide(-1);
    expect(store.getState().game.opponentSideCount).toBe(5);

    store.getState().adjustOpponentSide(-1);
    expect(store.getState().game.opponentSideCount).toBe(4);

    store.getState().adjustOpponentSide(1);
    expect(store.getState().game.opponentSideCount).toBe(5);
  });

  it("0〜6の範囲制限", () => {
    for (let i = 0; i < 10; i++) {
      store.getState().adjustOpponentSide(-1);
    }
    expect(store.getState().game.opponentSideCount).toBe(0);

    for (let i = 0; i < 10; i++) {
      store.getState().adjustOpponentSide(1);
    }
    expect(store.getState().game.opponentSideCount).toBe(6);
  });
});

describe("FR-20: Undo", () => {
  it("1ステップ巻き戻し", () => {
    setupAndStartGame(store);

    const battlePokemonId = store.getState().game.zones.バトル場[0]!;
    const damageBefore =
      store.getState().game.cardInstances[battlePokemonId]!.damageCounters;

    store.getState().addDamage(battlePokemonId, 30);
    expect(
      store.getState().game.cardInstances[battlePokemonId]!.damageCounters,
    ).toBe(damageBefore + 30);

    store.getState().undo();
    expect(
      store.getState().game.cardInstances[battlePokemonId]!.damageCounters,
    ).toBe(damageBefore);
  });

  it("複数回Undo", () => {
    setupAndStartGame(store);

    const battlePokemonId = store.getState().game.zones.バトル場[0]!;

    store.getState().addDamage(battlePokemonId, 10);
    store.getState().addDamage(battlePokemonId, 20);

    expect(
      store.getState().game.cardInstances[battlePokemonId]!.damageCounters,
    ).toBe(30);

    store.getState().undo();
    expect(
      store.getState().game.cardInstances[battlePokemonId]!.damageCounters,
    ).toBe(10);

    store.getState().undo();
    expect(
      store.getState().game.cardInstances[battlePokemonId]!.damageCounters,
    ).toBe(0);
  });

  it("空履歴は何もしない", () => {
    const stateBefore = store.getState().game;
    store.getState().undo();
    expect(store.getState().game).toEqual(stateBefore);
  });
});

describe("FR-22: リセット", () => {
  it("デッキ読込済に戻る", () => {
    setupAndStartGame(store);
    expect(store.getState().game.phase).toBe("進行中");

    store.getState().reset();
    expect(store.getState().game.phase).toBe("デッキ読込済");
  });

  it("操作履歴クリア", () => {
    setupAndStartGame(store);
    store.getState().addDamage(
      store.getState().game.zones.バトル場[0]!,
      10,
    );

    store.getState().reset();
    expect(store.getState().history).toHaveLength(0);
  });
});

describe("FR-16: サイド確認・取得", () => {
  it("サイドからカード選択して手札へ", () => {
    setupAndStartGame(store);

    const sideCards = store.getState().game.zones.サイド;
    expect(sideCards.length).toBeGreaterThan(0);

    const sideCardId = sideCards[0]!;
    store.getState().takeSide(sideCardId);

    const updated = store.getState();
    expect(updated.game.zones.サイド).not.toContain(sideCardId);
    expect(updated.game.zones.手札).toContain(sideCardId);
  });

  it("ランダム1枚取得", () => {
    setupAndStartGame(store);

    const sideBefore = store.getState().game.zones.サイド.length;
    const handBefore = store.getState().game.zones.手札.length;

    store.getState().takeSideRandom();

    expect(store.getState().game.zones.サイド).toHaveLength(sideBefore - 1);
    expect(store.getState().game.zones.手札).toHaveLength(handBefore + 1);
  });
});

describe("FR-13: 山札サーチ", () => {
  it("山札からカード選択して手札へ、残りシャッフル", () => {
    setupAndStartGame(store);

    const deckCards = store.getState().game.zones.山札;
    expect(deckCards.length).toBeGreaterThan(0);

    const selectedId = deckCards[0]!;
    const deckSizeBefore = deckCards.length;

    store.getState().searchSelect([selectedId]);

    const updated = store.getState();
    expect(updated.game.zones.手札).toContain(selectedId);
    expect(updated.game.zones.山札).not.toContain(selectedId);
    expect(updated.game.zones.山札).toHaveLength(deckSizeBefore - 1);
  });
});

describe("手札を山札に全戻し", () => {
  it("山札の上に全戻し", () => {
    setupAndStartGame(store);
    const handCards = [...store.getState().game.zones.手札];
    expect(handCards.length).toBeGreaterThan(0);

    store.getState().returnHandToDeck("top");

    const updated = store.getState();
    expect(updated.game.zones.手札).toHaveLength(0);
    for (const id of handCards) {
      expect(updated.game.zones.山札).toContain(id);
    }
  });

  it("山札の下に全戻し", () => {
    setupAndStartGame(store);
    const handCards = [...store.getState().game.zones.手札];

    store.getState().returnHandToDeck("bottom");

    const updated = store.getState();
    expect(updated.game.zones.手札).toHaveLength(0);
    for (const id of handCards) {
      expect(updated.game.zones.山札).toContain(id);
    }
  });
});

describe("山札シャッフル", () => {
  it("シャッフル後も枚数は変わらない", () => {
    setupAndStartGame(store);
    const deckBefore = store.getState().game.zones.山札.length;

    store.getState().shuffleDeck();

    expect(store.getState().game.zones.山札).toHaveLength(deckBefore);
  });
});
