import type { BasicEnergyCard, EnergyType } from "../types/card";

const ENERGY_TYPES = ["草", "炎", "水", "雷", "超", "闘", "悪", "鋼"] as const;

const ENERGY_NAMES: Record<(typeof ENERGY_TYPES)[number], string> = {
  草: "基本草エネルギー",
  炎: "基本炎エネルギー",
  水: "基本水エネルギー",
  雷: "基本雷エネルギー",
  超: "基本超エネルギー",
  闘: "基本闘エネルギー",
  悪: "基本悪エネルギー",
  鋼: "基本鋼エネルギー",
};

export const BASIC_ENERGIES: BasicEnergyCard[] = ENERGY_TYPES.map((type) => ({
  card_id: `basic-energy-${type}`,
  name: ENERGY_NAMES[type],
  card_category: "基本エネルギー" as const,
  image_url: "",
  regulation: "",
  card_number: "",
  rarity: "",
  canonical_id: `basic-energy-${type}`,
  type: type as EnergyType,
}));

export function findBasicEnergy(name: string): BasicEnergyCard | undefined {
  return BASIC_ENERGIES.find((e) => e.name === name);
}
