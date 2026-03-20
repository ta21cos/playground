import { useState, useMemo } from 'react';
import { hypergeomAtLeast, C } from '../utils/hypergeom';
import { pct } from '../utils/format';
import { Card, InputGrid, InputField, ProbValue, ProbBar, DataTable, PresetButtons, FormulaDisplay, ErrorBox } from './shared';

export function B6UncertainSearch() {
  const [N, setN] = useState(45);
  const [K, setK] = useState(3);
  const [peek, setPeek] = useState(3);
  const [take, setTake] = useState(1);
  const [need, setNeed] = useState(1);

  const error = useMemo(() => {
    if (peek > N) return 'めくる枚数が山札枚数を超えています';
    if (K > N) return '目的カード枚数が山札枚数を超えています';
    if (take > peek) return '取れる枚数がめくる枚数を超えています';
    if (need > take) return '欲しい枚数が取れる枚数を超えています';
    if (N < 1 || peek < 1 || take < 1 || need < 1) return '数値を入力してください';
    return null;
  }, [N, K, peek, take, need]);

  const result = useMemo(() => {
    if (error) return null;
    const p = hypergeomAtLeast(N, K, peek, need);
    return { p };
  }, [N, K, peek, need, error]);

  // めくり枚数別比較 (1〜8)
  const peekComparison = useMemo(() => {
    if (error) return [];
    return Array.from({ length: 8 }, (_, i) => {
      const pp = i + 1;
      if (pp > N) return null;
      return { peek: pp, prob: hypergeomAtLeast(N, K, pp, need) };
    }).filter(Boolean) as { peek: number; prob: number }[];
  }, [N, K, need, error]);

  // 目的カード枚数別比較 (K=1〜4)
  const kComparison = useMemo(() => {
    if (error) return [];
    return [1, 2, 3, 4].map(kk => ({
      K: kk,
      prob: kk <= N ? hypergeomAtLeast(N, kk, peek, need) : 0,
    }));
  }, [N, peek, need, error]);

  const formulaLines = useMemo(() => {
    if (error || !result) return [];
    return [
      `【不確定サーチ確率】`,
      `山札 ${N}枚から ${peek}枚めくって、${K}枚の目的カードが ${need}枚以上含まれる確率`,
      ``,
      `P(X ≥ ${need}) = hypergeomAtLeast(${N}, ${K}, ${peek}, ${need})`,
      need === 1 ? `  = 1 - P(X=0)` : `  = Σ P(X=i) for i=${need}..${Math.min(K, peek)}`,
      need === 1
        ? `  = 1 - C(${N - K},${peek}) / C(${N},${peek})`
        : '',
      need === 1
        ? `  = 1 - ${C(N - K, peek).toString()} / ${C(N, peek).toString()}`
        : '',
      `  = ${pct(result.p)}%`,
    ].filter(l => l !== '');
  }, [N, K, peek, need, result, error]);

  const presets = [
    { label: 'ドロンチ（ていさつしれい）', values: { peek: 2, take: 1, need: 1 } },
    { label: 'ポケギア3.0', values: { peek: 3, take: 1, need: 1 } },
    { label: 'シロナの覇気（めくり型）', values: { peek: 5, take: 1, need: 1 } },
  ];

  const applyPreset = (v: Record<string, number | boolean | string>) => {
    if (typeof v.peek === 'number') setPeek(v.peek);
    if (typeof v.take === 'number') setTake(v.take);
    if (typeof v.need === 'number') setNeed(v.need);
  };

  return (
    <Card id="b6" icon="🎰" title="B6: 不確定サーチ確率" description="山札上からN枚めくって目的カードがヒットする確率を計算。">
      <PresetButtons presets={presets} onSelect={applyPreset} />
      <InputGrid>
        <InputField label="現在の山札枚数 (N)" value={N} onChange={setN} min={1} />
        <InputField label="目的カードの山札内枚数 (K)" value={K} onChange={setK} min={0} max={N} />
        <InputField label="めくる枚数" value={peek} onChange={setPeek} min={1} max={N} />
        <InputField label="取れる枚数" value={take} onChange={setTake} min={1} max={peek} />
        <InputField label="欲しい枚数 (k枚以上)" value={need} onChange={setNeed} min={1} max={take} />
      </InputGrid>

      {error && <ErrorBox message={error} />}

      {result && !error && (
        <>
          <ProbValue p={result.p} label={`${need}枚以上ヒットする確率`} />
          <ProbBar p={result.p} label={`P(X ≥ ${need})`} />

          <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>めくり枚数別比較</h3>
          {peekComparison.map(r => (
            <ProbBar key={r.peek} p={r.prob} label={`めくり ${r.peek}枚`} />
          ))}

          <DataTable
            headers={['めくり枚数', '確率']}
            rows={peekComparison.map(r => [`${r.peek}枚`, `${pct(r.prob)}%`])}
          />

          <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8, marginTop: 16 }}>目的カード枚数別比較</h3>
          <DataTable
            headers={['目的カード (K)', '確率']}
            rows={kComparison.map(r => [`${r.K}枚`, `${pct(r.prob)}%`])}
          />

          <FormulaDisplay lines={formulaLines} />
        </>
      )}
    </Card>
  );
}
