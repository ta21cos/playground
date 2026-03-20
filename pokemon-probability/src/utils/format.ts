/** 確率を % 表示用に変換 (小数点以下2桁) */
export function pct(p: number): string {
  return (p * 100).toFixed(2);
}

/** 確率に応じた色クラスを返す: high ≥ 75%, mid 40-74%, low < 40% */
export function probColor(p: number): 'high' | 'mid' | 'low' {
  if (p >= 0.75) return 'high';
  if (p >= 0.40) return 'mid';
  return 'low';
}
