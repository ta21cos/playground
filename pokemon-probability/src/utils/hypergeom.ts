/**
 * 組み合わせ C(n, k) — BigInt使用で大きな数値も正確に計算
 */
export function C(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  if (k === 0 || k === n) return 1n;
  k = Math.min(k, n - k);
  let r = 1n;
  for (let i = 0; i < k; i++) {
    r = (r * BigInt(n - i)) / BigInt(i + 1);
  }
  return r;
}

const PRECISION = 10000000n; // 小数点以下7桁

/**
 * 超幾何分布 P(X = k) — デッキN枚、対象K枚、ドローn枚でちょうどk枚引く確率
 */
export function hypergeomExact(N: number, K: number, n: number, k: number): number {
  if (k < 0 || k > Math.min(K, n) || n - k > N - K) return 0;
  const num = C(K, k) * C(N - K, n - k);
  const den = C(N, n);
  if (den === 0n) return 0;
  return Number((num * PRECISION) / den) / Number(PRECISION);
}

/**
 * 超幾何分布 P(X >= k) — k枚以上引く確率
 */
export function hypergeomAtLeast(N: number, K: number, n: number, k: number): number {
  let p = 0;
  for (let i = k; i <= Math.min(K, n); i++) {
    p += hypergeomExact(N, K, n, i);
  }
  return Math.min(1, p);
}

/**
 * 超幾何分布 期待値 E[X] = n * K / N
 */
export function hypergeomExpected(N: number, K: number, n: number): number {
  if (N === 0) return 0;
  return (n * K) / N;
}

/**
 * 計算式の文字列表現を生成するユーティリティ
 */
export function formatC(n: number, k: number): string {
  return `C(${n},${k})`;
}

export function cValue(n: number, k: number): string {
  return C(n, k).toString();
}
