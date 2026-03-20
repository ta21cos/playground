import { useState, useMemo } from 'react';
import { hypergeomExact, hypergeomAtLeast, C } from '../utils/hypergeom';
import { pct } from '../utils/format';
import { Card, InputGrid, InputField, ProbValue, ProbBar, DataTable, FormulaDisplay, ErrorBox } from './shared';

export function A2PrizeCard() {
  const [N, setN] = useState(60);
  const [K, setK] = useState(4);
  const [side, setSide] = useState(6);

  const error = useMemo(() => {
    if (K > N) return '対象カード枚数がデッキ枚数を超えています';
    if (side > N) return 'サイド枚数が山札枚数を超えています';
    if (N < 1 || K < 1 || side < 1) return '数値を入力してください';
    return null;
  }, [N, K, side]);

  const result = useMemo(() => {
    if (error) return null;
    const breakdown = Array.from({ length: Math.min(K, side) + 1 }, (_, i) => hypergeomExact(N, K, side, i));
    const pAtLeast1 = hypergeomAtLeast(N, K, side, 1);
    return { breakdown, pAtLeast1 };
  }, [N, K, side, error]);

  // 早見表: K=1〜4
  const quickRef = useMemo(() => {
    if (error) return [];
    return [1, 2, 3, 4].map(kk => ({
      K: kk,
      p0: hypergeomExact(N, kk, side, 0),
      pAtLeast1: hypergeomAtLeast(N, kk, side, 1),
    }));
  }, [N, side, error]);

  const formulaLines = useMemo(() => {
    if (error || !result) return [];
    const lines: string[] = [];
    lines.push(`【サイド落ち確率】`);
    lines.push(`デッキ ${N}枚、対象 ${K}枚、サイド ${side}枚`);
    lines.push(``);
    for (let i = 0; i <= Math.min(K, side); i++) {
      lines.push(`P(サイドにちょうど${i}枚) = C(${K},${i})·C(${N - K},${side - i}) / C(${N},${side})`);
      lines.push(`  = ${C(K, i).toString()} × ${C(N - K, side - i).toString()} / ${C(N, side).toString()}`);
      lines.push(`  = ${pct(result.breakdown[i])}%`);
    }
    lines.push(``);
    lines.push(`P(1枚以上落ちる) = 1 - P(0枚) = 1 - ${pct(result.breakdown[0])}% = ${pct(result.pAtLeast1)}%`);
    return lines;
  }, [N, K, side, result, error]);

  return (
    <Card id="a2" icon="⚠️" title="A2: サイド落ち確率" description="サイド6枚に特定カードが落ちる確率を計算。">
      <InputGrid>
        <InputField label="デッキ枚数 (N)" value={N} onChange={setN} min={1} max={200} />
        <InputField label="対象カードの枚数 (K)" value={K} onChange={setK} min={1} max={N} />
        <InputField label="サイド枚数" value={side} onChange={setSide} min={1} max={N} />
      </InputGrid>

      {error && <ErrorBox message={error} />}

      {result && !error && (
        <>
          <ProbValue p={result.pAtLeast1} label="1枚以上サイドに落ちる確率" />
          <ProbBar p={result.pAtLeast1} label="P(1枚以上落ちる)" />

          <DataTable
            headers={['落ちる枚数', '確率']}
            rows={result.breakdown.map((p, i) => [`${i}枚`, `${pct(p)}%`])}
          />

          <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>採用枚数別早見表</h3>
          <DataTable
            headers={['採用枚数 K', '0枚落ち（安全）', '1枚以上落ちる']}
            rows={quickRef.map(r => [`${r.K}枚`, `${pct(r.p0)}%`, `${pct(r.pAtLeast1)}%`])}
          />

          <FormulaDisplay lines={formulaLines} />
        </>
      )}
    </Card>
  );
}
