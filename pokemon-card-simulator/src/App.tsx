import { useState, useCallback } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { DndProvider } from "./components/DndProvider";
import { DroppableZone } from "./components/DroppableZone";
import { DraggableCard } from "./components/DraggableCard";
import { ActionBar } from "./components/ActionBar";
import { DeckImport } from "./components/DeckImport";
import { OpponentSideCounter } from "./components/OpponentSideCounter";
import { SearchModal } from "./components/SearchModal";
import { BenchSelector } from "./components/BenchSelector";
import { ContextMenu } from "./components/ContextMenu";
import { Card } from "./components/Card";
import type { ZoneName } from "./types/zone";
import { ZONE_NAMES } from "./types/zone";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Card as CardType } from "./types/card";
import type { CardInstance } from "./types/game-state";
import { createInitialGameState } from "./types/game-state";
import { needsMulligan } from "./domain/mulligan";
import { needsBenchSelector } from "./domain/battle-bench-swap";
import { parseDeckList } from "./domain/deck-parser";
import { CardResolver } from "./data/card-resolver";
import { fetchDeckFromCode } from "./domain/deck-code-parser";
import { createGameStore, type GameStore } from "./store/game-store";
import cardsData from "./data/cards.json";
import "./styles/index.css";

const resolver = new CardResolver(cardsData as CardType[]);

type Modal =
  | null
  | "search"
  | "benchSelect"
  | "sideView"
  | "trashView"
  | "drawInput"
  | "deckMenu";

interface ContextMenuState {
  x: number;
  y: number;
  instanceId: string;
  zone: ZoneName;
}

const store = createStore<GameStore>(createGameStore);

function App() {
  const game = useStore(store, (s) => s.game);
  const warning = useStore(store, (s) => s.warning);

  const actions = store.getState();

  const [modal, setModal] = useState<Modal>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [loading, setLoading] = useState(false);

  const clearWarning = useCallback(() => {
    store.setState({ warning: null });
  }, []);

  const openModal = useCallback((m: Modal) => {
    setModal(m);
    setContextMenu(null);
  }, []);

  const handleImportCode = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const result = await fetchDeckFromCode(code);
      const game = createInitialGameState();
      game.phase = "デッキ読込済";
      game.deckCards = [];
      let codeCounter = 0;
      for (const entry of result.entries) {
        const resolvedCards = resolver.findByName(entry.name);
        const card: CardType =
          resolvedCards.length > 0
            ? resolvedCards[0]!
            : ({
                card_id: entry.cardId,
                name: entry.name,
                card_category: "グッズ",
                image_url: entry.imageUrl,
                regulation: "",
                card_number: "",
                rarity: "",
                canonical_id: entry.cardId,
                effect_text: "",
                rule_text: "",
              } as CardType);
        for (let i = 0; i < entry.count; i++) {
          const id = `inst-${++codeCounter}`;
          const instance: CardInstance = {
            instanceId: id,
            card: { ...card, image_url: entry.imageUrl || card.image_url },
            attachedEnergies: [],
            attachedTool: null,
            evolutionStack: [],
            damageCounters: 0,
          };
          game.cardInstances[id] = instance;
          game.zones.山札.push(id);
          game.deckCards.push(instance.card);
        }
      }
      store.setState({ game, history: [], warning: null });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const instanceId = active.id as string;
      const targetId = over.id as string;
      const inst = game.cardInstances[instanceId];
      if (!inst) return;

      const fromZone = (Object.keys(game.zones) as ZoneName[]).find((z) =>
        game.zones[z].includes(instanceId),
      );
      if (!fromZone) return;

      if (targetId.startsWith("card:")) {
        const targetCardId = targetId.replace("card:", "");
        const targetInst = game.cardInstances[targetCardId];
        if (!targetInst) return;

        if (
          (inst.card.card_category === "基本エネルギー" ||
            inst.card.card_category === "特殊エネルギー") &&
          targetInst.card.card_category === "ポケモン"
        ) {
          actions.attachEnergy(instanceId, targetCardId);
          return;
        }

        if (
          inst.card.card_category === "ポケモンのどうぐ" &&
          targetInst.card.card_category === "ポケモン"
        ) {
          actions.attachTool(instanceId, targetCardId);
          return;
        }

        if (
          inst.card.card_category === "ポケモン" &&
          targetInst.card.card_category === "ポケモン" &&
          "stage" in inst.card &&
          inst.card.stage !== "たね"
        ) {
          actions.evolve(instanceId, targetCardId);
          return;
        }

        const targetZone = (Object.keys(game.zones) as ZoneName[]).find((z) =>
          game.zones[z].includes(targetCardId),
        );
        if (targetZone && targetZone !== fromZone) {
          if (inst.card.card_category === "ポケモン") {
            actions.moveWithCleanup(instanceId, fromZone, targetZone);
          } else {
            actions.moveCard(instanceId, fromZone, targetZone);
          }
        }
        return;
      }

      if (ZONE_NAMES.includes(targetId as ZoneName)) {
        const toZone = targetId as ZoneName;
        const isFieldZone = toZone === "バトル場" || toZone === "ベンチ";
        const isEnergy =
          inst.card.card_category === "基本エネルギー" ||
          inst.card.card_category === "特殊エネルギー";
        const isTool = inst.card.card_category === "ポケモンのどうぐ";

        if (isFieldZone && (isEnergy || isTool)) {
          const pokemonIds = game.zones[toZone].filter(
            (id) => game.cardInstances[id]?.card.card_category === "ポケモン",
          );
          const targetPokemonId = pokemonIds[0];
          if (targetPokemonId) {
            if (isEnergy) {
              actions.attachEnergy(instanceId, targetPokemonId);
            } else {
              actions.attachTool(instanceId, targetPokemonId);
            }
            return;
          }
        }

        if (inst.card.card_category === "ポケモン") {
          actions.moveWithCleanup(instanceId, fromZone, toZone);
        } else {
          actions.moveCard(instanceId, fromZone, toZone);
        }
      }
    },
    [game, actions],
  );

  const hasSeedInBattle = game.zones.バトル場.some((id) => {
    const inst = game.cardInstances[id];
    return (
      inst?.card.card_category === "ポケモン" &&
      "stage" in inst.card &&
      inst.card.stage === "たね"
    );
  });

  const showBenchSelector = needsBenchSelector(game);

  function renderCards(zone: ZoneName) {
    const isFieldZone = zone === "バトル場" || zone === "ベンチ";
    return game.zones[zone].map((id) => {
      const inst = game.cardInstances[id];
      if (!inst) return null;
      const attachedIds = [
        ...inst.attachedEnergies,
        ...(inst.attachedTool ? [inst.attachedTool] : []),
      ];
      const attachedInstances = attachedIds
        .map((aid) => game.cardInstances[aid])
        .filter(Boolean) as CardInstance[];
      return (
        <DraggableCard
          key={id}
          instance={inst}
          acceptDrop={isFieldZone && inst.card.card_category === "ポケモン"}
          attachedInstances={
            attachedInstances.length > 0 ? attachedInstances : undefined
          }
          onClick={(pos) =>
            setContextMenu({ x: pos.x, y: pos.y, instanceId: id, zone })
          }
        />
      );
    });
  }

  function contextMenuItems() {
    if (!contextMenu) return [];
    const items: Array<{ label: string; action: () => void }> = [];

    if (contextMenu.instanceId === "__deck__") {
      items.push({
        label: "サーチ",
        action: () => openModal("search"),
      });
      items.push({
        label: "N枚ドロー",
        action: () => openModal("drawInput"),
      });
      items.push({
        label: "シャッフル",
        action: () => actions.shuffleDeck(),
      });
      return items;
    }

    const inst = game.cardInstances[contextMenu.instanceId];
    if (!inst) return [];

    if (contextMenu.zone === "手札") {
      items.push({
        label: "山札の上に戻す",
        action: () => {
          actions.returnToDeckTop(contextMenu.instanceId);
          setContextMenu(null);
        },
      });
      items.push({
        label: "山札の下に戻す",
        action: () => {
          actions.returnToDeckBottom(contextMenu.instanceId);
          setContextMenu(null);
        },
      });
      items.push({
        label: "手札をすべて山札の上に戻す",
        action: () => {
          actions.returnHandToDeck("top");
          setContextMenu(null);
        },
      });
      items.push({
        label: "手札をすべて山札の下に戻す",
        action: () => {
          actions.returnHandToDeck("bottom");
          setContextMenu(null);
        },
      });

      const isEnergy =
        inst.card.card_category === "基本エネルギー" ||
        inst.card.card_category === "特殊エネルギー";
      const isTool = inst.card.card_category === "ポケモンのどうぐ";
      if (isEnergy || isTool) {
        const fieldPokemon = [...game.zones.バトル場, ...game.zones.ベンチ]
          .map((id) => ({ id, inst: game.cardInstances[id] }))
          .filter((p) => p.inst?.card.card_category === "ポケモン");
        for (const pokemon of fieldPokemon) {
          if (isEnergy) {
            items.push({
              label: `${pokemon.inst!.card.name} にエネルギー付与`,
              action: () => {
                actions.attachEnergy(contextMenu.instanceId, pokemon.id);
                setContextMenu(null);
              },
            });
          } else if (!pokemon.inst!.attachedTool) {
            items.push({
              label: `${pokemon.inst!.card.name} にどうぐ付与`,
              action: () => {
                actions.attachTool(contextMenu.instanceId, pokemon.id);
                setContextMenu(null);
              },
            });
          }
        }
      }
    }

    if (
      (contextMenu.zone === "バトル場" || contextMenu.zone === "ベンチ") &&
      inst.card.card_category === "ポケモン"
    ) {
      items.push({
        label: "ダメカン +10",
        action: () => {
          actions.addDamage(contextMenu.instanceId, 10);
          setContextMenu(null);
        },
      });
      items.push({
        label: "ダメカン -10",
        action: () => {
          actions.addDamage(contextMenu.instanceId, -10);
          setContextMenu(null);
        },
      });
      items.push({
        label: "ダメカン値入力",
        action: () => {
          const val = prompt("ダメカン値を入力");
          if (val !== null) {
            actions.setDamage(contextMenu.instanceId, parseInt(val, 10) || 0);
            setContextMenu(null);
          }
        },
      });
      if (inst.evolutionStack.length > 0) {
        items.push({
          label: "退化",
          action: () => {
            actions.devolve(contextMenu.instanceId);
            setContextMenu(null);
          },
        });
      }
    }

    items.push({
      label: "トラッシュへ",
      action: () => {
        actions.moveWithCleanup(
          contextMenu.instanceId,
          contextMenu.zone,
          "トラッシュ",
        );
        setContextMenu(null);
      },
    });

    return items;
  }

  function handleTrashReturn(
    instanceId: string,
    to: "手札" | "山札上" | "山札下",
  ) {
    const g = game;
    const trash = g.zones.トラッシュ.filter((id) => id !== instanceId);
    let zones = { ...g.zones, トラッシュ: trash };
    if (to === "手札") {
      zones = { ...zones, 手札: [...zones.手札, instanceId] };
    } else if (to === "山札上") {
      zones = { ...zones, 山札: [instanceId, ...zones.山札] };
    } else {
      zones = { ...zones, 山札: [...zones.山札, instanceId] };
    }
    store.setState((s) => ({
      game: { ...s.game, zones },
      history: [...s.history, s.game],
    }));
    setModal(null);
  }

  if (game.phase === "デッキ未読込") {
    return (
      <div className="app">
        <h1 style={{ textAlign: "center", padding: "16px" }}>
          ポケモンカード一人回し
        </h1>
        {warning && (
          <div
            className="warning"
            style={{ color: "#e74c3c", textAlign: "center", padding: "8px" }}
          >
            {warning}
          </div>
        )}
        <DeckImport
          onImportText={(text) => {
            try {
              const deck = parseDeckList(text, resolver);
              const game = createInitialGameState();
              game.phase = "デッキ読込済";
              game.deckCards = [];
              let counter = 0;
              for (const entry of deck.entries) {
                for (let i = 0; i < entry.count; i++) {
                  const id = `inst-${++counter}`;
                  const instance: CardInstance = {
                    instanceId: id,
                    card: entry.card,
                    attachedEnergies: [],
                    attachedTool: null,
                    evolutionStack: [],
                    damageCounters: 0,
                  };
                  game.cardInstances[id] = instance;
                  game.zones.山札.push(id);
                  game.deckCards.push(entry.card);
                }
              }
              store.setState({ game, history: [], warning: null });
            } catch (e) {
              store.setState({ warning: (e as Error).message });
            }
          }}
          onImportCode={handleImportCode}
          loading={loading}
          error={warning}
        />
      </div>
    );
  }

  if (game.phase === "デッキ読込済") {
    return (
      <div className="app">
        <h1 style={{ textAlign: "center", padding: "16px" }}>
          ポケモンカード一人回し
        </h1>
        <div style={{ textAlign: "center", padding: "16px" }}>
          <p>デッキ読込完了: {game.deckCards.length}枚</p>
          <button
            style={{
              margin: "8px",
              padding: "12px 24px",
              background: "#3498db",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
            }}
            onClick={() => actions.setup()}
          >
            通常セットアップ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <DndProvider onDragEnd={handleDragEnd}>
        {warning && (
          <div
            className="warning"
            style={{
              color: "#e74c3c",
              textAlign: "center",
              padding: "8px",
              cursor: "pointer",
            }}
            onClick={clearWarning}
          >
            {warning}
          </div>
        )}

        <OpponentSideCounter
          count={game.opponentSideCount}
          onIncrement={() => actions.adjustOpponentSide(1)}
          onDecrement={() => actions.adjustOpponentSide(-1)}
        />

        <div className="game-board">
          <div className="area-side">
            <DroppableZone
              zoneName="サイド"
              cardCount={game.zones.サイド.length}
              onZoneClick={() => openModal("sideView")}
            >
              <div className="side-stack">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className={
                      i < game.zones.サイド.length
                        ? "side-placeholder side-placeholder-filled"
                        : "side-placeholder"
                    }
                  />
                ))}
              </div>
            </DroppableZone>
          </div>

          <div className="area-field">
            <div className="field-top">
              <DroppableZone
                zoneName="バトル場"
                cardCount={game.zones.バトル場.length}
              >
                {game.zones.バトル場.length === 0 && (
                  <div className="card-placeholder" />
                )}
                {renderCards("バトル場")}
              </DroppableZone>
              <DroppableZone
                zoneName="スタジアム"
                cardCount={game.zones.スタジアム.length}
              >
                {game.zones.スタジアム.length === 0 && (
                  <div className="card-placeholder" />
                )}
                {renderCards("スタジアム")}
              </DroppableZone>
            </div>
            <div className="field-bench">
              <DroppableZone
                zoneName="ベンチ"
                cardCount={game.zones.ベンチ.length}
              >
                {renderCards("ベンチ")}
                {Array.from(
                  {
                    length: Math.max(
                      0,
                      game.benchMaxSize - game.zones.ベンチ.length,
                    ),
                  },
                  (_, i) => (
                    <div key={`bench-ph-${i}`} className="card-placeholder" />
                  ),
                )}
              </DroppableZone>
              <div className="bench-controls">
                <button
                  className="bench-btn"
                  onClick={() => actions.setBenchSize(game.benchMaxSize + 1)}
                >
                  +
                </button>
                <span className="bench-size">{game.benchMaxSize}</span>
                <button
                  className="bench-btn"
                  onClick={() => actions.setBenchSize(game.benchMaxSize - 1)}
                >
                  -
                </button>
              </div>
            </div>
          </div>

          <div className="area-deck-trash">
            <DroppableZone
              zoneName="山札"
              cardCount={game.zones.山札.length}
              onZoneClick={(e) => {
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  instanceId: "__deck__",
                  zone: "山札",
                });
              }}
            >
              <div className="deck-stack">
                <span className="deck-count">{game.zones.山札.length}</span>
              </div>
            </DroppableZone>
            {game.phase === "進行中" && (
              <button
                className="draw-1-btn"
                onClick={() => actions.drawCards(1)}
                disabled={game.zones.山札.length === 0}
              >
                1枚ドロー
              </button>
            )}
            <DroppableZone
              zoneName="トラッシュ"
              cardCount={game.zones.トラッシュ.length}
              onZoneClick={() => openModal("trashView")}
            >
              <div className="trash-stack">
                <span className="trash-count">
                  {game.zones.トラッシュ.length}
                </span>
              </div>
            </DroppableZone>
          </div>

          <div className="area-hand">
            <DroppableZone zoneName="手札" cardCount={game.zones.手札.length}>
              {renderCards("手札")}
            </DroppableZone>
          </div>
        </div>

        <ActionBar
          phase={game.phase}
          turnNumber={game.turnNumber}
          hasSeedInBattle={hasSeedInBattle}
          needsMulligan={game.phase === "セットアップ中" && needsMulligan(game)}
          onEndTurn={() => actions.endTurn()}
          onUndo={() => actions.undo()}
          onHistory={() => {}}
          onMulligan={() => actions.mulligan()}
          onStartGame={() => actions.startGame()}
          onReset={() => {
            actions.reset();
            setModal(null);
            setContextMenu(null);
          }}
        />
      </DndProvider>

      {contextMenu && (
        <ContextMenu
          items={contextMenuItems()}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {modal === "drawInput" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>N枚ドロー</h3>
            <p style={{ fontSize: "14px", opacity: 0.7, margin: "8px 0" }}>
              山札残り: {game.zones.山札.length}枚
            </p>
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "12px",
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  className="draw-n-btn"
                  disabled={game.zones.山札.length === 0}
                  onClick={() => {
                    actions.drawCards(n);
                    setModal(null);
                  }}
                >
                  {n}枚
                </button>
              ))}
            </div>
            <div style={{ marginTop: "12px" }}>
              <input
                type="number"
                min="1"
                max={game.zones.山札.length}
                placeholder="枚数を入力"
                className="draw-n-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = parseInt(
                      (e.target as HTMLInputElement).value,
                      10,
                    );
                    if (val > 0) {
                      actions.drawCards(val);
                      setModal(null);
                    }
                  }
                }}
              />
            </div>
            <button
              style={{ marginTop: "12px" }}
              onClick={() => setModal(null)}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {modal === "search" && (
        <SearchModal
          cards={game.zones.山札
            .map((id) => game.cardInstances[id]!)
            .filter(Boolean)}
          onSelect={(ids) => {
            actions.searchSelect(ids);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "sideView" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>サイド ({game.zones.サイド.length}枚)</h3>
            <div className="search-cards">
              {game.zones.サイド.map((id) => {
                const inst = game.cardInstances[id];
                if (!inst) return null;
                return (
                  <div
                    key={id}
                    className="search-card"
                    onClick={() => {
                      actions.takeSide(id);
                      setModal(null);
                    }}
                  >
                    <Card card={inst.card} />
                  </div>
                );
              })}
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  actions.takeSideRandom();
                  setModal(null);
                }}
              >
                ランダムに1枚取得
              </button>
              <button onClick={() => setModal(null)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {modal === "trashView" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>トラッシュ ({game.zones.トラッシュ.length}枚)</h3>
            <div className="search-cards">
              {game.zones.トラッシュ.map((id) => {
                const inst = game.cardInstances[id];
                if (!inst) return null;
                return (
                  <div key={id} className="search-card">
                    <Card card={inst.card} />
                    <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                      <button
                        style={{ fontSize: 8, padding: "2px 4px" }}
                        onClick={() => handleTrashReturn(id, "手札")}
                      >
                        手札
                      </button>
                      <button
                        style={{ fontSize: 8, padding: "2px 4px" }}
                        onClick={() => handleTrashReturn(id, "山札上")}
                      >
                        上
                      </button>
                      <button
                        style={{ fontSize: 8, padding: "2px 4px" }}
                        onClick={() => handleTrashReturn(id, "山札下")}
                      >
                        下
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setModal(null)}>閉じる</button>
          </div>
        </div>
      )}

      {showBenchSelector && (
        <BenchSelector
          benchPokemon={game.zones.ベンチ
            .map((id) => game.cardInstances[id]!)
            .filter(Boolean)}
          onSelect={(id) => {
            actions.promoteToBattle(id);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
