import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { Card } from "../../../src/components/Card";
import { DraggableCard } from "../../../src/components/DraggableCard";
import { DroppableZone } from "../../../src/components/DroppableZone";
import { OpponentSideCounter } from "../../../src/components/OpponentSideCounter";
import { ActionBar } from "../../../src/components/ActionBar";
import type { CardInstance } from "../../../src/types/game-state";
import type {
  Card as CardType,
  PokemonCard,
  BasicEnergyCard,
} from "../../../src/types/card";

function pokemon(name: string, overrides?: Partial<PokemonCard>): PokemonCard {
  return {
    card_id: name,
    name,
    card_category: "ポケモン",
    image_url: "https://example.com/card.png",
    regulation: "",
    card_number: "",
    rarity: "",
    canonical_id: name,
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
    ...overrides,
  };
}

function energy(name: string): BasicEnergyCard {
  return {
    card_id: name,
    name,
    card_category: "基本エネルギー",
    image_url: "",
    regulation: "",
    card_number: "",
    rarity: "",
    canonical_id: name,
    type: "炎",
  };
}

function trainerCard(
  name: string,
  category: CardType["card_category"] = "グッズ",
): CardType {
  return {
    card_id: name,
    name,
    card_category: category,
    image_url: "",
    regulation: "",
    card_number: "",
    rarity: "",
    canonical_id: name,
    effect_text: "",
    rule_text: "",
  } as CardType;
}

function inst(
  id: string,
  card: CardType,
  overrides?: Partial<CardInstance>,
): CardInstance {
  return {
    instanceId: id,
    card,
    attachedEnergies: [],
    attachedTool: null,
    evolutionStack: [],
    damageCounters: 0,
    ...overrides,
  };
}

function Dnd({ children }: { children: React.ReactNode }) {
  return <DndContext>{children}</DndContext>;
}

function zoneHtml(container: HTMLElement): string {
  return container.querySelector("[data-zone]")!.outerHTML;
}

// ─────────────────────────────────────────────
// Card component snapshots
// ─────────────────────────────────────────────

describe("Card: fallback 表示", () => {
  it("たねポケモン", () => {
    const card = pokemon("ピカチュウ", { image_url: "" });
    const { container } = render(<Card card={card} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("基本エネルギー", () => {
    const { container } = render(<Card card={energy("基本炎エネルギー")} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("グッズ", () => {
    const { container } = render(<Card card={trainerCard("ネストボール")} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("スタジアム", () => {
    const { container } = render(
      <Card card={trainerCard("頂への雪道", "スタジアム")} />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("ポケモンのどうぐ", () => {
    const { container } = render(
      <Card card={trainerCard("学習装置", "ポケモンのどうぐ")} />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("ダメカン付きポケモン", () => {
    const card = pokemon("ピカチュウ", { image_url: "" });
    const { container } = render(<Card card={card} damageCounters={30} />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});

describe("Card: 画像表示", () => {
  it("画像のみ（バッジなし）", () => {
    const { container } = render(<Card card={pokemon("ピカチュウ")} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("ダメカン 30", () => {
    const { container } = render(
      <Card card={pokemon("ピカチュウ")} damageCounters={30} />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("ダメカン 0 は非表示", () => {
    const { container } = render(
      <Card card={pokemon("ピカチュウ")} damageCounters={0} />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});

// ─────────────────────────────────────────────
// DraggableCard snapshots（data 属性の検証）
// ─────────────────────────────────────────────

describe("DraggableCard: data 属性 + Card 描画", () => {
  it("たねポケモン", () => {
    const i = inst("inst-1", pokemon("ピカチュウ"));
    const { container } = render(
      <Dnd>
        <DraggableCard instance={i} acceptDrop />
      </Dnd>,
    );
    const el = container.querySelector("[data-card-id]")!;
    expect(el.getAttribute("data-card-id")).toBe("inst-1");
    expect(el.getAttribute("data-card-name")).toBe("ピカチュウ");
    expect(el.getAttribute("data-card-category")).toBe("ポケモン");
    expect(el.outerHTML).toMatchSnapshot();
  });

  it("エネルギー付きポケモン", () => {
    const e1 = inst("e-1", energy("基本炎エネルギー"));
    const e2 = inst("e-2", energy("基本炎エネルギー"));
    const i = inst("inst-1", pokemon("ピカチュウ"), {
      attachedEnergies: ["e-1", "e-2"],
    });
    const { container } = render(
      <Dnd>
        <DraggableCard instance={i} acceptDrop attachedInstances={[e1, e2]} />
      </Dnd>,
    );
    expect(
      container.querySelector("[data-card-id]")!.outerHTML,
    ).toMatchSnapshot();
  });

  it("どうぐ付きポケモン", () => {
    const t = inst("tool-1", trainerCard("学習装置", "ポケモンのどうぐ"));
    const i = inst("inst-1", pokemon("ピカチュウ"), {
      attachedTool: "tool-1",
    });
    const { container } = render(
      <Dnd>
        <DraggableCard instance={i} acceptDrop attachedInstances={[t]} />
      </Dnd>,
    );
    expect(
      container.querySelector("[data-card-id]")!.outerHTML,
    ).toMatchSnapshot();
  });

  it("ダメカン付きポケモン", () => {
    const i = inst("inst-1", pokemon("ピカチュウ"), { damageCounters: 40 });
    const { container } = render(
      <Dnd>
        <DraggableCard instance={i} acceptDrop />
      </Dnd>,
    );
    expect(
      container.querySelector("[data-card-id]")!.outerHTML,
    ).toMatchSnapshot();
  });

  it("進化済みポケモン（evolutionStack あり）", () => {
    const e1 = inst("e-1", energy("基本炎エネルギー"));
    const i = inst(
      "evo-1",
      pokemon("ライチュウ", { stage: "1進化" as PokemonCard["stage"] }),
      {
        attachedEnergies: ["e-1"],
        evolutionStack: ["inst-base"],
        damageCounters: 20,
      },
    );
    const { container } = render(
      <Dnd>
        <DraggableCard instance={i} acceptDrop attachedInstances={[e1]} />
      </Dnd>,
    );
    expect(
      container.querySelector("[data-card-id]")!.outerHTML,
    ).toMatchSnapshot();
  });

  it("全部盛りポケモン", () => {
    const e1 = inst("e-1", energy("基本炎エネルギー"));
    const e2 = inst("e-2", energy("基本炎エネルギー"));
    const e3 = inst("e-3", energy("基本炎エネルギー"));
    const t = inst("tool-1", trainerCard("学習装置", "ポケモンのどうぐ"));
    const i = inst("inst-1", pokemon("ピカチュウ"), {
      attachedEnergies: ["e-1", "e-2", "e-3"],
      attachedTool: "tool-1",
      damageCounters: 60,
      evolutionStack: ["base-1"],
    });
    const { container } = render(
      <Dnd>
        <DraggableCard
          instance={i}
          acceptDrop
          attachedInstances={[e1, e2, e3, t]}
        />
      </Dnd>,
    );
    expect(
      container.querySelector("[data-card-id]")!.outerHTML,
    ).toMatchSnapshot();
  });

  it("エネルギーカード（acceptDrop なし）", () => {
    const i = inst("e-1", energy("基本炎エネルギー"));
    const { container } = render(
      <Dnd>
        <DraggableCard instance={i} />
      </Dnd>,
    );
    expect(
      container.querySelector("[data-card-id]")!.outerHTML,
    ).toMatchSnapshot();
  });
});

// ─────────────────────────────────────────────
// Zone rendering snapshots
// ─────────────────────────────────────────────

describe("Zone: バトル場", () => {
  it("ポケモン 1 匹", () => {
    const i = inst("inst-1", pokemon("ピカチュウ"));
    const { container } = render(
      <Dnd>
        <DroppableZone zoneName="バトル場" cardCount={1}>
          <DraggableCard instance={i} acceptDrop />
        </DroppableZone>
      </Dnd>,
    );
    expect(zoneHtml(container)).toMatchSnapshot();
  });

  it("空（placeholder）", () => {
    const { container } = render(
      <Dnd>
        <DroppableZone zoneName="バトル場" cardCount={0}>
          <div className="card-placeholder" />
        </DroppableZone>
      </Dnd>,
    );
    expect(zoneHtml(container)).toMatchSnapshot();
  });

  it("エネルギー + どうぐ + ダメカン付きポケモン", () => {
    const e1 = inst("e-1", energy("基本炎エネルギー"));
    const e2 = inst("e-2", energy("基本炎エネルギー"));
    const t = inst("tool-1", trainerCard("学習装置", "ポケモンのどうぐ"));
    const i = inst("inst-1", pokemon("ピカチュウ"), {
      attachedEnergies: ["e-1", "e-2"],
      attachedTool: "tool-1",
      damageCounters: 30,
    });
    const { container } = render(
      <Dnd>
        <DroppableZone zoneName="バトル場" cardCount={1}>
          <DraggableCard
            instance={i}
            acceptDrop
            attachedInstances={[e1, e2, t]}
          />
        </DroppableZone>
      </Dnd>,
    );
    expect(zoneHtml(container)).toMatchSnapshot();
  });
});

describe("Zone: ベンチ", () => {
  it("ポケモン 1 匹 + 空き枠 4 つ", () => {
    const i = inst("inst-1", pokemon("コダック"));
    const { container } = render(
      <Dnd>
        <DroppableZone zoneName="ベンチ" cardCount={1}>
          <DraggableCard instance={i} acceptDrop />
          {Array.from({ length: 4 }, (_, k) => (
            <div key={k} className="card-placeholder" />
          ))}
        </DroppableZone>
      </Dnd>,
    );
    expect(zoneHtml(container)).toMatchSnapshot();
  });

  it("ポケモン 3 匹 + 空き枠 2 つ", () => {
    const cards = [
      inst("inst-1", pokemon("コダック")),
      inst("inst-2", pokemon("ゼニガメ")),
      inst("inst-3", pokemon("フシギダネ")),
    ];
    const { container } = render(
      <Dnd>
        <DroppableZone zoneName="ベンチ" cardCount={3}>
          {cards.map((i) => (
            <DraggableCard key={i.instanceId} instance={i} acceptDrop />
          ))}
          {Array.from({ length: 2 }, (_, k) => (
            <div key={k} className="card-placeholder" />
          ))}
        </DroppableZone>
      </Dnd>,
    );
    expect(zoneHtml(container)).toMatchSnapshot();
  });

  it("ベンチ満席（5 匹）", () => {
    const cards = Array.from({ length: 5 }, (_, k) =>
      inst(`inst-${k}`, pokemon(`pokemon-${k}`)),
    );
    const { container } = render(
      <Dnd>
        <DroppableZone zoneName="ベンチ" cardCount={5}>
          {cards.map((i) => (
            <DraggableCard key={i.instanceId} instance={i} acceptDrop />
          ))}
        </DroppableZone>
      </Dnd>,
    );
    expect(zoneHtml(container)).toMatchSnapshot();
  });
});

describe("Zone: 手札", () => {
  it("混合カード 5 枚", () => {
    const cards = [
      inst("inst-1", pokemon("ピカチュウ")),
      inst("inst-2", energy("基本炎エネルギー")),
      inst("inst-3", trainerCard("ネストボール")),
      inst("inst-4", pokemon("コダック")),
      inst("inst-5", trainerCard("学習装置", "ポケモンのどうぐ")),
    ];
    const { container } = render(
      <Dnd>
        <DroppableZone zoneName="手札" cardCount={5}>
          {cards.map((i) => (
            <DraggableCard key={i.instanceId} instance={i} />
          ))}
        </DroppableZone>
      </Dnd>,
    );
    expect(zoneHtml(container)).toMatchSnapshot();
  });

  it("空", () => {
    const { container } = render(
      <Dnd>
        <DroppableZone zoneName="手札" cardCount={0}>
          {null}
        </DroppableZone>
      </Dnd>,
    );
    expect(zoneHtml(container)).toMatchSnapshot();
  });
});

describe("Zone: スタジアム", () => {
  it("スタジアム 1 枚", () => {
    const i = inst("stad-1", trainerCard("頂への雪道", "スタジアム"));
    const { container } = render(
      <Dnd>
        <DroppableZone zoneName="スタジアム" cardCount={1}>
          <DraggableCard instance={i} />
        </DroppableZone>
      </Dnd>,
    );
    expect(zoneHtml(container)).toMatchSnapshot();
  });

  it("空（placeholder）", () => {
    const { container } = render(
      <Dnd>
        <DroppableZone zoneName="スタジアム" cardCount={0}>
          <div className="card-placeholder" />
        </DroppableZone>
      </Dnd>,
    );
    expect(zoneHtml(container)).toMatchSnapshot();
  });
});

describe("Zone: トラッシュ / 山札（カウント表示）", () => {
  it("山札 40 枚", () => {
    const { container } = render(
      <Dnd>
        <DroppableZone zoneName="山札" cardCount={40}>
          <div className="deck-stack">
            <span className="deck-count">40</span>
          </div>
        </DroppableZone>
      </Dnd>,
    );
    expect(zoneHtml(container)).toMatchSnapshot();
  });

  it("トラッシュ 3 枚", () => {
    const { container } = render(
      <Dnd>
        <DroppableZone zoneName="トラッシュ" cardCount={3}>
          <div className="trash-stack">
            <span className="trash-count">3</span>
          </div>
        </DroppableZone>
      </Dnd>,
    );
    expect(zoneHtml(container)).toMatchSnapshot();
  });
});

// ─────────────────────────────────────────────
// UI コンポーネント snapshots
// ─────────────────────────────────────────────

describe("OpponentSideCounter", () => {
  it("初期値 6", () => {
    const { container } = render(
      <OpponentSideCounter
        count={6}
        onIncrement={() => {}}
        onDecrement={() => {}}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("残り 0（- ボタン disabled）", () => {
    const { container } = render(
      <OpponentSideCounter
        count={0}
        onIncrement={() => {}}
        onDecrement={() => {}}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});

describe("ActionBar", () => {
  const noop = () => {};

  it("セットアップ中（マリガンボタンあり）", () => {
    const { container } = render(
      <ActionBar
        phase="セットアップ中"
        turnNumber={0}
        hasSeedInBattle={false}
        needsMulligan={true}
        onEndTurn={noop}
        onUndo={noop}
        onHistory={noop}
        onMulligan={noop}
        onStartGame={noop}
        onReset={noop}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("セットアップ中（ゲーム開始ボタンあり）", () => {
    const { container } = render(
      <ActionBar
        phase="セットアップ中"
        turnNumber={0}
        hasSeedInBattle={true}
        needsMulligan={false}
        onEndTurn={noop}
        onUndo={noop}
        onHistory={noop}
        onMulligan={noop}
        onStartGame={noop}
        onReset={noop}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("進行中（ターン 3）", () => {
    const { container } = render(
      <ActionBar
        phase="進行中"
        turnNumber={3}
        hasSeedInBattle={true}
        needsMulligan={false}
        onEndTurn={noop}
        onUndo={noop}
        onHistory={noop}
        onMulligan={noop}
        onStartGame={noop}
        onReset={noop}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});
