import { useState, useMemo } from 'react';
import { hypergeomExact, hypergeomAtLeast, C } from '../utils/hypergeom';
import { pct } from '../utils/format';
import { Card, InputGrid, InputField, Checkbox, ProbValue, ProbBar, DataTable, PresetButtons, FormulaDisplay, ErrorBox } from './shared';

export function A1InitialHand() {
  const [N, setN] = useState(60);
  const [K, setK] = useState(4);
  const [n, setN2] = useState(7);
  const [k, setK2] = useState(1);
  const [marigane, setMarigane] = useState(false);
  const [seedCount, setSeedCount] = useState(10);

  const error = useMemo(() => {
    if (K > N) return '対象カード枚数がデッキ枚数を超えています';
    if (n > N) return 'ドロー枚数が山札枚数を超えています';
    if (k > Math.min(K, n)) return '必要枚数が可能な最大数を超えています';
    if (N < 1 || K < 1 || n < 1 || k < 1) return '数値を入力してください';
    if (marigane && seedCount > N) return 'たねポケモン枚数がデッキ枚数を超えています';
    return null;
  }, [N, K, n, k, marigane, seedCount]);

  const result = useMemo(() => {
    if (error) return null;

    // 基本計算
    const pMain = hypergeomAtLeast(N, K, n, k);
    const breakdown = Array.from({ length: Math.min(K, n) + 1 }, (_, i) => hypergeomExact(N, K, n, i));

    // マリガン補正
    let pCorrected: number | null = null;
    if (marigane) {
      // 先攻近似: たね1枚確定で残り N-1 枚から n-1 枚引く
      pCorrected = hypergeomAtLeast(N - 1, K, n - 1, k);
    }

    return { pMain, breakdown, pCorrected };
  }, [N, K, n, k, marigane, seedCount, error]);

  const formulaLines = useMemo(() => {
    if (error || !result) return [];
    const lines: string[] = [];
    lines.push(`【基本計算】`);
    lines.push(`P(X ≥ ${k}) = 1 - Σ P(X=i) for i=0..${k - 1}`);
    if (k === 1) {
      lines.push(`  = 1 - P(X=0)`);
      lines.push(`  = 1 - C(${N - K},${n}) / C(${N},${n})`);
      lines.push(`  = 1 - ${C(N - K, n).toString()} / ${C(N, n).toString()}`);
      lines.push(`  = 1 - ${pct(result.breakdown[0])}%`);
      lines.push(`  = ${pct(result.pMain)}%`);
    } else {
      for (let i = 0; i < k; i++) {
        lines.push(`  P(X=${i}) = C(${K},${i})·C(${N - K},${n - i}) / C(${N},${n})`);
        lines.push(`           = ${C(K, i).toString()} × ${C(N - K, n - i).toString()} / ${C(N, n).toString()}`);
        lines.push(`           = ${pct(result.breakdown[i])}%`);
      }
      lines.push(`  P(X ≥ ${k}) = ${pct(result.pMain)}%`);
    }
    if (marigane && result.pCorrected !== null) {
      lines.push(``);
      lines.push(`【マリガン補正（先攻近似）】`);
      lines.push(`  たね1枚確定 → 残り${N - 1}枚から${n - 1}枚引く`);
      lines.push(`  P = hypergeomAtLeast(${N - 1}, ${K}, ${n - 1}, ${k})`);
      lines.push(`    = ${pct(result.pCorrected)}%`);
    }
    return lines;
  }, [N, K, n, k, marigane, result, error]);

  const presets = [
    { label: '標準（先攻）', values: { N: 60, K: 4, n: 6, k: 1 } },
    { label: '標準（後攻）', values: { N: 60, K: 4, n: 7, k: 1 } },
    { label: '博士の研究', values: { N: 60, K: 4, n: 7, k: 1 } },
    { label: 'VIPパス4枚', values: { N: 60, K: 4, n: 7, k: 1 } },
  ];

  const applyPreset = (v: Record<string, number | boolean | string>) => {
    if (typeof v.N === 'number') setN(v.N);
    if (typeof v.K === 'number') setK(v.K);
    if (typeof v.n === 'number') setN2(v.n);
    if (typeof v.k === 'number') setK2(v.k);
  };

  return (
    <Card id="a1" icon="🃏" title="A1: 初手確率（マリガン補正あり）" description="初手でk枚以上引ける確率を超幾何分布で計算。マリガン補正もオプションで提供。">
      <PresetButtons presets={presets} onSelect={applyPreset} />
      <InputGrid>
        <InputField label="デッキ枚数 (N)" value={N} onChange={setN} min={1} max={200} />
        <InputField label="対象カードの枚数 (K)" value={K} onChange={setK} min={1} max={N} />
        <InputField label="初手ドロー枚数 (n)" value={n} onChange={setN2} min={1} max={N} />
        <InputField label="最低何枚欲しい (k)" value={k} onChange={setK2} min={1} max={Math.min(K, n)} />
      </InputGrid>
      <Checkbox label="マリガン補正を使う" checked={marigane} onChange={setMarigane} />
      {marigane && (
        <div style={{ marginTop: 8, maxWidth: 200 }}>
          <InputField label="たねポケモン枚数" value={seedCount} onChange={setSeedCount} min={1} max={N} />
        </div>
      )}

      {error && <ErrorBox message={error} />}

      {result && !error && (
        <>
          <ProbValue p={result.pMain} label={`${k}枚以上引く確率`} />
          <ProbBar p={result.pMain} label={`P(X ≥ ${k})`} />

          {marigane && result.pCorrected !== null && (
            <>
              <ProbValue p={result.pCorrected} label="マリガン補正後（先攻近似）" />
              <ProbBar p={result.pCorrected} label="補正後" />
            </>
          )}

          <DataTable
            headers={['枚数', '確率 P(X=i)', '累積 P(X≤i)', '逆累積 P(X≥i)']}
            rows={result.breakdown.map((p, i) => {
              const cumulative = result.breakdown.slice(0, i + 1).reduce((a, b) => a + b, 0);
              const reverseCum = result.breakdown.slice(i).reduce((a, b) => a + b, 0);
              return [`${i}枚`, `${pct(p)}%`, `${pct(cumulative)}%`, `${pct(reverseCum)}%`];
            })}
          />

          <FormulaDisplay lines={formulaLines} />
        </>
      )}
    </Card>
  );
}
