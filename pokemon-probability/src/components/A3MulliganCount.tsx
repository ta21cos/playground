import { useState, useMemo } from 'react';
import { hypergeomExact, C } from '../utils/hypergeom';
import { pct } from '../utils/format';
import { Card, InputGrid, InputField, ProbValue, ProbBar, DataTable, FormulaDisplay, ErrorBox } from './shared';

export function A3MulliganCount() {
  const [N, setN] = useState(60);
  const [K, setK] = useState(10);
  const [n, setN2] = useState(7);

  const error = useMemo(() => {
    if (K > N) return 'たねポケモン枚数がデッキ枚数を超えています';
    if (n > N) return 'ドロー枚数が山札枚数を超えています';
    if (N < 1 || K < 1 || n < 1) return '数値を入力してください';
    return null;
  }, [N, K, n]);

  const result = useMemo(() => {
    if (error) return null;
    const pMarigane = hypergeomExact(N, K, n, 0);
    const expected = pMarigane >= 1 ? Infinity : pMarigane / (1 - pMarigane);

    // マリガン回数別確率 (0〜10回)
    const countProbs = Array.from({ length: 11 }, (_, m) => ({
      count: m,
      prob: Math.pow(pMarigane, m) * (1 - pMarigane),
    }));

    return { pMarigane, expected, countProbs };
  }, [N, K, n, error]);

  // 早見表: たねポケモン 8〜14枚
  const quickRef = useMemo(() => {
    if (error) return [];
    return [8, 9, 10, 11, 12, 13, 14].map(kk => {
      const p = hypergeomExact(N, kk, n, 0);
      return { K: kk, pMari: p, expected: p >= 1 ? Infinity : p / (1 - p) };
    });
  }, [N, n, error]);

  const formulaLines = useMemo(() => {
    if (error || !result) return [];
    return [
      `【マリガン発生確率】`,
      `P(たね0枚) = C(${N - K},${n}) / C(${N},${n})`,
      `  = ${C(N - K, n).toString()} / ${C(N, n).toString()}`,
      `  = ${pct(result.pMarigane)}%`,
      ``,
      `【期待回数（幾何分布）】`,
      `E[マリガン回数] = P / (1 - P)`,
      `  = ${result.pMarigane.toFixed(6)} / ${(1 - result.pMarigane).toFixed(6)}`,
      `  = ${result.expected === Infinity ? '∞' : result.expected.toFixed(4)}回`,
      ``,
      `【各回数の確率】`,
      `P(ちょうどm回マリガン) = P^m × (1 - P)`,
    ];
  }, [N, K, n, result, error]);

  return (
    <Card id="a3" icon="🔁" title="A3: マリガン期待回数" description="たねポケモンの枚数からマリガン確率と期待回数を計算。">
      <InputGrid>
        <InputField label="デッキ枚数 (N)" value={N} onChange={setN} min={1} max={200} />
        <InputField label="たねポケモンの枚数 (K)" value={K} onChange={setK} min={1} max={N} />
        <InputField label="初手ドロー枚数 (n)" value={n} onChange={setN2} min={1} max={N} />
      </InputGrid>

      {error && <ErrorBox message={error} />}

      {result && !error && (
        <>
          <ProbValue p={result.pMarigane} label="マリガン発生確率（1回の試行）" />
          <ProbBar p={result.pMarigane} label="P(たね0枚)" />

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>期待マリガン回数: </span>
            <span style={{ color: '#38bdf8', fontSize: 24, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
              {result.expected === Infinity ? '∞' : result.expected.toFixed(3)}回
            </span>
          </div>

          <DataTable
            headers={['マリガン回数', '確率']}
            rows={result.countProbs.map(r => [`${r.count}回`, `${pct(r.prob)}%`])}
          />

          <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>たねポケモン枚数別早見表</h3>
          <DataTable
            headers={['たね枚数', 'マリガン確率', '期待回数']}
            rows={quickRef.map(r => [
              `${r.K}枚`,
              `${pct(r.pMari)}%`,
              r.expected === Infinity ? '∞' : `${r.expected.toFixed(3)}回`,
            ])}
          />

          <FormulaDisplay lines={formulaLines} />
        </>
      )}
    </Card>
  );
}
