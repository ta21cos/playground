export type EnergyType = "草" | "炎" | "水" | "雷" | "超" | "闘" | "悪" | "鋼" | "無";

export type CardCategory =
  | "ポケモン"
  | "グッズ"
  | "ポケモンのどうぐ"
  | "サポート"
  | "スタジアム"
  | "特殊エネルギー"
  | "基本エネルギー";

export type Stage = "たね" | "1進化" | "2進化";

export interface Move {
  name: string;
  energy_cost: EnergyType[];
  damage: string;
  description: string;
}

export interface Ability {
  name: string;
  description: string;
}

interface BaseCard {
  card_id: string;
  name: string;
  card_category: CardCategory;
  image_url: string;
  regulation: string;
  card_number: string;
  rarity: string;
  canonical_id: string;
}

export interface PokemonCard extends BaseCard {
  card_category: "ポケモン";
  stage: Stage;
  hp: number;
  type: EnergyType[];
  abilities: Ability[];
  moves: Move[];
  weakness: string;
  resistance: string;
  retreat_cost: number;
  effect_text: string;
  rule_text: string;
  special_rule: string;
}

export interface ItemCard extends BaseCard {
  card_category: "グッズ";
  effect_text: string;
  rule_text: string;
}

export interface ToolCard extends BaseCard {
  card_category: "ポケモンのどうぐ";
  effect_text: string;
  rule_text: string;
  special_rule: string;
}

export interface SupporterCard extends BaseCard {
  card_category: "サポート";
  effect_text: string;
  rule_text: string;
}

export interface StadiumCard extends BaseCard {
  card_category: "スタジアム";
  effect_text: string;
  rule_text: string;
}

export interface SpecialEnergyCard extends BaseCard {
  card_category: "特殊エネルギー";
  effect_text: string;
  rule_text: string;
}

export interface BasicEnergyCard extends BaseCard {
  card_category: "基本エネルギー";
  type: EnergyType;
}

export type TrainerCard = ItemCard | ToolCard | SupporterCard | StadiumCard;

export type Card =
  | PokemonCard
  | ItemCard
  | ToolCard
  | SupporterCard
  | StadiumCard
  | SpecialEnergyCard
  | BasicEnergyCard;
