import { useReducer, useCallback } from "react";
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
import {
  createInitialGameState,
  type GameState,
  type CardInstance,
} from "./types/game-state";
import type { Card as CardType } from "./types/card";
import type { ZoneName } from "./types/zone";
import type { DragEndEvent } from "@dnd-kit/core";
import { ZONE_NAMES } from "./types/zone";
import { parseDeckList } from "./domain/deck-parser";
import { CardResolver } from "./data/card-resolver";
import { setupGame } from "./domain/game-setup";
import { needsMulligan, executeMulligan } from "./domain/mulligan";
import { startGame, endTurn } from "./domain/turn";
import { moveCard, setBenchMaxSize } from "./domain/zone-actions";
import {
  searchDeck,
  drawCards,
  returnToDeckTop,
  returnToDeckBottom,
  takeSideCard,
  takeSideRandom,
  shuffleDeck,
  returnHandToDeck,
} from "./domain/card-actions";
import { attachEnergy, attachTool } from "./domain/attachment";
import { moveCardWithCleanup } from "./domain/attachment-cleanup";
import { evolve, devolve } from "./domain/evolution";
import { placeStadium } from "./domain/stadium";
import { addDamage, setDamage } from "./domain/damage-counter";
import {
  promoteToBattle,
  needsBenchSelector,
} from "./domain/battle-bench-swap";
import { adjustOpponentSide } from "./domain/opponent-side";
import { resetGame } from "./domain/reset";
import { takeSnapshot, restoreSnapshot } from "./store/snapshot";
import {
  fetchDeckFromCode,
  type DeckCodeResult,
} from "./domain/deck-code-parser";
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

interface AppState {
  game: GameState;
  history: GameState[];
  modal: Modal;
  contextMenu: {
    x: number;
    y: number;
    instanceId: string;
    zone: ZoneName;
  } | null;
  warning: string | null;
  loading: boolean;
}

type Action =
  | { type: "SET_GAME"; game: GameState; pushHistory?: boolean }
  | { type: "IMPORT_DECK"; text: string }
  | { type: "IMPORT_DECK_CODE_RESULT"; result: DeckCodeResult }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SETUP" }
  | { type: "MULLIGAN" }
  | { type: "START_GAME" }
  | { type: "END_TURN" }
  | { type: "UNDO" }
  | { type: "RESET" }
  | { type: "SET_MODAL"; modal: Modal }
  | { type: "SET_CONTEXT_MENU"; menu: AppState["contextMenu"] }
  | { type: "CLEAR_WARNING" }
  | { type: "MOVE_CARD"; instanceId: string; from: ZoneName; to: ZoneName }
  | { type: "SEARCH_SELECT"; selectedIds: string[] }
  | { type: "DRAW_N"; n: number }
  | { type: "RETURN_TOP"; instanceId: string }
  | { type: "RETURN_BOTTOM"; instanceId: string }
  | { type: "TAKE_SIDE"; instanceId: string }
  | { type: "TAKE_SIDE_RANDOM" }
  | { type: "SHUFFLE_DECK" }
  | { type: "RETURN_HAND_TO_DECK"; position: "top" | "bottom" }
  | { type: "ATTACH_ENERGY"; energyId: string; pokemonId: string }
  | { type: "ATTACH_TOOL"; toolId: string; pokemonId: string }
  | { type: "EVOLVE"; evolutionId: string; targetId: string }
  | { type: "DEVOLVE"; instanceId: string }
  | { type: "DAMAGE"; instanceId: string; amount: number }
  | { type: "SET_DAMAGE"; instanceId: string; value: number }
  | { type: "PLACE_STADIUM"; instanceId: string }
  | { type: "PROMOTE_TO_BATTLE"; instanceId: string }
  | { type: "OPPONENT_SIDE"; delta: number }
  | { type: "BENCH_SIZE"; size: number }
  | {
      type: "MOVE_WITH_CLEANUP";
      instanceId: string;
      from: ZoneName;
      to: ZoneName;
    }
  | {
      type: "TRASH_RETURN";
      instanceId: string;
      to: "手札" | "山札上" | "山札下";
    };

function withHistory(state: AppState, game: GameState): AppState {
  return {
    ...state,
    game,
    history: [...state.history, takeSnapshot(state.game)],
    warning: null,
  };
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_GAME":
      return action.pushHistory
        ? withHistory(state, action.game)
        : { ...state, game: action.game };

    case "IMPORT_DECK": {
      try {
        const deck = parseDeckList(action.text, resolver);
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
        return { ...state, game, history: [], warning: null, loading: false };
      } catch (e) {
        return { ...state, warning: (e as Error).message };
      }
    }

    case "IMPORT_DECK_CODE_RESULT": {
      const { result } = action;
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
      return { ...state, game, history: [], warning: null, loading: false };
    }

    case "SET_LOADING":
      return { ...state, loading: action.loading };

    case "SETUP":
      return withHistory(state, setupGame(state.game));

    case "MULLIGAN":
      return withHistory(state, executeMulligan(state.game));

    case "START_GAME":
      try {
        return withHistory(state, startGame(state.game));
      } catch (e) {
        return { ...state, warning: (e as Error).message };
      }

    case "END_TURN": {
      const result = endTurn(state.game);
      const { warning: w, ...gameWithoutWarning } = result;
      return { ...withHistory(state, gameWithoutWarning), warning: w ?? null };
    }

    case "UNDO": {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1]!;
      return {
        ...state,
        game: restoreSnapshot(prev),
        history: state.history.slice(0, -1),
      };
    }

    case "RESET":
      return {
        ...state,
        game: resetGame(state.game),
        history: [],
        modal: null,
        contextMenu: null,
      };

    case "SET_MODAL":
      return { ...state, modal: action.modal, contextMenu: null };

    case "SET_CONTEXT_MENU":
      return { ...state, contextMenu: action.menu };

    case "CLEAR_WARNING":
      return { ...state, warning: null };

    case "MOVE_CARD":
      return withHistory(
        state,
        moveCard(state.game, action.instanceId, action.from, action.to),
      );

    case "MOVE_WITH_CLEANUP":
      return withHistory(
        state,
        moveCardWithCleanup(
          state.game,
          action.instanceId,
          action.from,
          action.to,
        ),
      );

    case "SEARCH_SELECT":
      return {
        ...withHistory(state, searchDeck(state.game, action.selectedIds)),
        modal: null,
      };

    case "DRAW_N":
      try {
        const dr = drawCards(state.game, action.n);
        const { warning: dw, ...dg } = dr;
        return { ...withHistory(state, dg), warning: dw ?? null, modal: null };
      } catch (e) {
        return { ...state, warning: (e as Error).message, modal: null };
      }

    case "RETURN_TOP":
      return {
        ...withHistory(state, returnToDeckTop(state.game, action.instanceId)),
        contextMenu: null,
      };

    case "RETURN_BOTTOM":
      return {
        ...withHistory(
          state,
          returnToDeckBottom(state.game, action.instanceId),
        ),
        contextMenu: null,
      };

    case "TAKE_SIDE":
      return {
        ...withHistory(state, takeSideCard(state.game, action.instanceId)),
        modal: null,
      };

    case "TAKE_SIDE_RANDOM":
      return { ...withHistory(state, takeSideRandom(state.game)), modal: null };

    case "SHUFFLE_DECK":
      return withHistory(state, shuffleDeck(state.game));

    case "RETURN_HAND_TO_DECK":
      return {
        ...withHistory(state, returnHandToDeck(state.game, action.position)),
        contextMenu: null,
      };

    case "ATTACH_ENERGY":
      try {
        return withHistory(
          state,
          attachEnergy(state.game, action.energyId, action.pokemonId),
        );
      } catch {
        return state;
      }

    case "ATTACH_TOOL":
      try {
        return withHistory(
          state,
          attachTool(state.game, action.toolId, action.pokemonId),
        );
      } catch {
        return state;
      }

    case "EVOLVE":
      try {
        return withHistory(
          state,
          evolve(state.game, action.evolutionId, action.targetId),
        );
      } catch {
        return state;
      }

    case "DEVOLVE":
      try {
        return {
          ...withHistory(state, devolve(state.game, action.instanceId)),
          contextMenu: null,
        };
      } catch {
        return state;
      }

    case "DAMAGE":
      return {
        ...withHistory(
          state,
          addDamage(state.game, action.instanceId, action.amount),
        ),
        contextMenu: null,
      };

    case "SET_DAMAGE":
      return {
        ...withHistory(
          state,
          setDamage(state.game, action.instanceId, action.value),
        ),
        contextMenu: null,
      };

    case "PLACE_STADIUM":
      return withHistory(state, placeStadium(state.game, action.instanceId));

    case "PROMOTE_TO_BATTLE":
      return {
        ...withHistory(state, promoteToBattle(state.game, action.instanceId)),
        modal: null,
      };

    case "OPPONENT_SIDE":
      return { ...state, game: adjustOpponentSide(state.game, action.delta) };

    case "BENCH_SIZE":
      return { ...state, game: setBenchMaxSize(state.game, action.size) };

    case "TRASH_RETURN": {
      const g = state.game;
      const trash = g.zones.トラッシュ.filter((id) => id !== action.instanceId);
      let zones = { ...g.zones, トラッシュ: trash };
      if (action.to === "手札") {
        zones = { ...zones, 手札: [...zones.手札, action.instanceId] };
      } else if (action.to === "山札上") {
        zones = { ...zones, 山札: [action.instanceId, ...zones.山札] };
      } else {
        zones = { ...zones, 山札: [...zones.山札, action.instanceId] };
      }
      return { ...withHistory(state, { ...g, zones }), modal: null };
    }

    default:
      return state;
  }
}

const initialAppState: AppState = {
  game: createInitialGameState(),
  history: [],
  modal: null,
  contextMenu: null,
  warning: null,
  loading: false,
};

function App() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const { game, modal, contextMenu, warning } = state;

  const handleImportCode = useCallback(
    async (code: string) => {
      dispatch({ type: "SET_LOADING", loading: true });
      try {
        const result = await fetchDeckFromCode(code);
        dispatch({ type: "IMPORT_DECK_CODE_RESULT", result });
      } catch (e) {
        dispatch({ type: "SET_LOADING", loading: false });
        dispatch({ type: "SET_GAME", game: { ...state.game } });
        alert((e as Error).message);
      }
    },
    [state.game],
  );

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
          dispatch({
            type: "ATTACH_ENERGY",
            energyId: instanceId,
            pokemonId: targetCardId,
          });
          return;
        }

        if (
          inst.card.card_category === "ポケモンのどうぐ" &&
          targetInst.card.card_category === "ポケモン"
        ) {
          dispatch({
            type: "ATTACH_TOOL",
            toolId: instanceId,
            pokemonId: targetCardId,
          });
          return;
        }

        if (
          inst.card.card_category === "ポケモン" &&
          targetInst.card.card_category === "ポケモン" &&
          "stage" in inst.card &&
          inst.card.stage !== "たね"
        ) {
          dispatch({
            type: "EVOLVE",
            evolutionId: instanceId,
            targetId: targetCardId,
          });
          return;
        }

        const targetZone = (Object.keys(game.zones) as ZoneName[]).find((z) =>
          game.zones[z].includes(targetCardId),
        );
        if (targetZone && targetZone !== fromZone) {
          if (inst.card.card_category === "ポケモン") {
            dispatch({
              type: "MOVE_WITH_CLEANUP",
              instanceId,
              from: fromZone,
              to: targetZone,
            });
          } else {
            dispatch({
              type: "MOVE_CARD",
              instanceId,
              from: fromZone,
              to: targetZone,
            });
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
              dispatch({
                type: "ATTACH_ENERGY",
                energyId: instanceId,
                pokemonId: targetPokemonId,
              });
            } else {
              dispatch({
                type: "ATTACH_TOOL",
                toolId: instanceId,
                pokemonId: targetPokemonId,
              });
            }
            return;
          }
        }

        if (inst.card.card_category === "ポケモン") {
          dispatch({
            type: "MOVE_WITH_CLEANUP",
            instanceId,
            from: fromZone,
            to: toZone,
          });
        } else {
          dispatch({
            type: "MOVE_CARD",
            instanceId,
            from: fromZone,
            to: toZone,
          });
        }
      }
    },
    [game],
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
      return (
        <DraggableCard
          key={id}
          instance={inst}
          acceptDrop={isFieldZone && inst.card.card_category === "ポケモン"}
          onClick={(pos) =>
            dispatch({
              type: "SET_CONTEXT_MENU",
              menu: { x: pos.x, y: pos.y, instanceId: id, zone },
            })
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
        action: () => dispatch({ type: "SET_MODAL", modal: "search" }),
      });
      items.push({
        label: "N枚ドロー",
        action: () => dispatch({ type: "SET_MODAL", modal: "drawInput" }),
      });
      items.push({
        label: "シャッフル",
        action: () => dispatch({ type: "SHUFFLE_DECK" }),
      });
      return items;
    }

    const inst = game.cardInstances[contextMenu.instanceId];
    if (!inst) return [];

    if (contextMenu.zone === "手札") {
      items.push({
        label: "山札の上に戻す",
        action: () =>
          dispatch({ type: "RETURN_TOP", instanceId: contextMenu.instanceId }),
      });
      items.push({
        label: "山札の下に戻す",
        action: () =>
          dispatch({
            type: "RETURN_BOTTOM",
            instanceId: contextMenu.instanceId,
          }),
      });
      items.push({
        label: "手札をすべて山札の上に戻す",
        action: () =>
          dispatch({ type: "RETURN_HAND_TO_DECK", position: "top" }),
      });
      items.push({
        label: "手札をすべて山札の下に戻す",
        action: () =>
          dispatch({ type: "RETURN_HAND_TO_DECK", position: "bottom" }),
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
              action: () =>
                dispatch({
                  type: "ATTACH_ENERGY",
                  energyId: contextMenu.instanceId,
                  pokemonId: pokemon.id,
                }),
            });
          } else if (!pokemon.inst!.attachedTool) {
            items.push({
              label: `${pokemon.inst!.card.name} にどうぐ付与`,
              action: () =>
                dispatch({
                  type: "ATTACH_TOOL",
                  toolId: contextMenu.instanceId,
                  pokemonId: pokemon.id,
                }),
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
        action: () =>
          dispatch({
            type: "DAMAGE",
            instanceId: contextMenu.instanceId,
            amount: 10,
          }),
      });
      items.push({
        label: "ダメカン -10",
        action: () =>
          dispatch({
            type: "DAMAGE",
            instanceId: contextMenu.instanceId,
            amount: -10,
          }),
      });
      items.push({
        label: "ダメカン値入力",
        action: () => {
          const val = prompt("ダメカン値を入力");
          if (val !== null)
            dispatch({
              type: "SET_DAMAGE",
              instanceId: contextMenu.instanceId,
              value: parseInt(val, 10) || 0,
            });
        },
      });
      if (inst.evolutionStack.length > 0) {
        items.push({
          label: "退化",
          action: () =>
            dispatch({ type: "DEVOLVE", instanceId: contextMenu.instanceId }),
        });
      }
    }

    items.push({
      label: "トラッシュへ",
      action: () => {
        dispatch({
          type: "MOVE_WITH_CLEANUP",
          instanceId: contextMenu.instanceId,
          from: contextMenu.zone,
          to: "トラッシュ",
        });
        dispatch({ type: "SET_CONTEXT_MENU", menu: null });
      },
    });

    return items;
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
          onImportText={(text) => dispatch({ type: "IMPORT_DECK", text })}
          onImportCode={handleImportCode}
          loading={state.loading}
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
            onClick={() => dispatch({ type: "SETUP" })}
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
            onClick={() => dispatch({ type: "CLEAR_WARNING" })}
          >
            {warning}
          </div>
        )}

        <OpponentSideCounter
          count={game.opponentSideCount}
          onIncrement={() => dispatch({ type: "OPPONENT_SIDE", delta: 1 })}
          onDecrement={() => dispatch({ type: "OPPONENT_SIDE", delta: -1 })}
        />

        <div className="game-board">
          <div className="area-side">
            <DroppableZone
              zoneName="サイド"
              cardCount={game.zones.サイド.length}
              onZoneClick={() =>
                dispatch({ type: "SET_MODAL", modal: "sideView" })
              }
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
                  onClick={() =>
                    dispatch({
                      type: "BENCH_SIZE",
                      size: game.benchMaxSize + 1,
                    })
                  }
                >
                  +
                </button>
                <span className="bench-size">{game.benchMaxSize}</span>
                <button
                  className="bench-btn"
                  onClick={() =>
                    dispatch({
                      type: "BENCH_SIZE",
                      size: game.benchMaxSize - 1,
                    })
                  }
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
                dispatch({
                  type: "SET_CONTEXT_MENU",
                  menu: {
                    x: e.clientX,
                    y: e.clientY,
                    instanceId: "__deck__",
                    zone: "山札",
                  },
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
                onClick={() => dispatch({ type: "DRAW_N", n: 1 })}
                disabled={game.zones.山札.length === 0}
              >
                1枚ドロー
              </button>
            )}
            <DroppableZone
              zoneName="トラッシュ"
              cardCount={game.zones.トラッシュ.length}
              onZoneClick={() =>
                dispatch({ type: "SET_MODAL", modal: "trashView" })
              }
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
          onEndTurn={() => dispatch({ type: "END_TURN" })}
          onUndo={() => dispatch({ type: "UNDO" })}
          onHistory={() => {}}
          onMulligan={() => dispatch({ type: "MULLIGAN" })}
          onStartGame={() => dispatch({ type: "START_GAME" })}
          onReset={() => dispatch({ type: "RESET" })}
        />
      </DndProvider>

      {contextMenu && (
        <ContextMenu
          items={contextMenuItems()}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => dispatch({ type: "SET_CONTEXT_MENU", menu: null })}
        />
      )}

      {modal === "deckMenu" && (
        <div
          className="modal-overlay"
          onClick={() => dispatch({ type: "SET_MODAL", modal: null })}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>山札 ({game.zones.山札.length}枚)</h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginTop: "12px",
              }}
            >
              <button
                className="deck-menu-btn"
                onClick={() => dispatch({ type: "SET_MODAL", modal: "search" })}
              >
                サーチ
              </button>
              <button
                className="deck-menu-btn"
                onClick={() =>
                  dispatch({ type: "SET_MODAL", modal: "drawInput" })
                }
              >
                N枚ドロー
              </button>
              <button
                className="deck-menu-btn"
                onClick={() => {
                  dispatch({ type: "SHUFFLE_DECK" });
                  dispatch({ type: "SET_MODAL", modal: null });
                }}
              >
                シャッフル
              </button>
            </div>
            <button
              style={{ marginTop: "12px" }}
              onClick={() => dispatch({ type: "SET_MODAL", modal: null })}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {modal === "drawInput" && (
        <div
          className="modal-overlay"
          onClick={() => dispatch({ type: "SET_MODAL", modal: null })}
        >
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
                  onClick={() => dispatch({ type: "DRAW_N", n })}
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
                    if (val > 0) dispatch({ type: "DRAW_N", n: val });
                  }
                }}
              />
            </div>
            <button
              style={{ marginTop: "12px" }}
              onClick={() => dispatch({ type: "SET_MODAL", modal: null })}
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
          onSelect={(ids) =>
            dispatch({ type: "SEARCH_SELECT", selectedIds: ids })
          }
          onClose={() => dispatch({ type: "SET_MODAL", modal: null })}
        />
      )}

      {modal === "sideView" && (
        <div
          className="modal-overlay"
          onClick={() => dispatch({ type: "SET_MODAL", modal: null })}
        >
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
                    onClick={() =>
                      dispatch({ type: "TAKE_SIDE", instanceId: id })
                    }
                  >
                    <Card card={inst.card} />
                  </div>
                );
              })}
            </div>
            <div className="modal-actions">
              <button onClick={() => dispatch({ type: "TAKE_SIDE_RANDOM" })}>
                ランダムに1枚取得
              </button>
              <button
                onClick={() => dispatch({ type: "SET_MODAL", modal: null })}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "trashView" && (
        <div
          className="modal-overlay"
          onClick={() => dispatch({ type: "SET_MODAL", modal: null })}
        >
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
                        onClick={() =>
                          dispatch({
                            type: "TRASH_RETURN",
                            instanceId: id,
                            to: "手札",
                          })
                        }
                      >
                        手札
                      </button>
                      <button
                        style={{ fontSize: 8, padding: "2px 4px" }}
                        onClick={() =>
                          dispatch({
                            type: "TRASH_RETURN",
                            instanceId: id,
                            to: "山札上",
                          })
                        }
                      >
                        上
                      </button>
                      <button
                        style={{ fontSize: 8, padding: "2px 4px" }}
                        onClick={() =>
                          dispatch({
                            type: "TRASH_RETURN",
                            instanceId: id,
                            to: "山札下",
                          })
                        }
                      >
                        下
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => dispatch({ type: "SET_MODAL", modal: null })}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {showBenchSelector && (
        <BenchSelector
          benchPokemon={game.zones.ベンチ
            .map((id) => game.cardInstances[id]!)
            .filter(Boolean)}
          onSelect={(id) =>
            dispatch({ type: "PROMOTE_TO_BATTLE", instanceId: id })
          }
        />
      )}
    </div>
  );
}

export default App;
