export const ZONE_NAMES = [
  "山札",
  "手札",
  "サイド",
  "バトル場",
  "ベンチ",
  "トラッシュ",
  "スタジアム",
] as const;

export type ZoneName = (typeof ZONE_NAMES)[number];

export interface Zone {
  name: ZoneName;
  cards: string[];
}
