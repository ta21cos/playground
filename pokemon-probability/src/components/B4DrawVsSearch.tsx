import { useState, useMemo } from 'react';
import { hypergeomAtLeast } from '../utils/hypergeom';
import { pct } from '../utils/format';
import { Card, InputGrid, InputField, ProbValue, ProbBar, DataTable, PresetButtons, FormulaDisplay, ErrorBox } from './shared';
import { css } from '../../styled-system/css';

export function B4DrawVsSearch() {
  const [N, setN] = useState(40);
  const [K, setK] = useState(2);
  const [drawCount, setDrawCount] = useState(7);
  const [searchCount, setSearchCount] = useState(1);

  const error = useMemo(() => {
    if (N < 1) return '山札枚数は1以上にしてください';
    if (K > N) return '目的カード枚数が山札枚数を超えています';
    if (drawCount > N) return 'ドロー枚数が山札枚数を超えています';
    if (drawCount < 1) return 'ドロー枚数は1以上にしてください';
    if (searchCount < 1) return 'サーチ取得枚数は1以上にしてください';
    return null;
  }, [N, K, drawCount, searchCount]);

  const result = useMemo(() => {
    if (error) return null;
    const pDraw = hypergeomAtLeast(N, K, drawCount, 1);
    const pSearch = K >= searchCount ? 1.0 : 0.0;
    const advantage = pDraw >= pSearch ? '大量ドロー有利' : '確定サーチ有利';

    // 山札残り枚数別比較（グラフ用データ）
    const comparisonData = Array.from({ length: Math.max(1, N) }, (_, i) => {
      const deckSize = i + drawCount; // drawCount 以上の山札
      if (deckSize > 60 || deckSize < drawCount) return null;
      return {
        n: deckSize,
        pDraw: hypergeomAtLeast(deckSize, Math.min(K, deckSize), Math.min(drawCount, deckSize), 1),
        pSearch: Math.min(K, deckSize) >= searchCount ? 1.0 : 0.0,
      };
    }).filter(Boolean) as { n: number; pDraw: number; pSearch: number }[];

    return { pDraw, pSearch, advantage, comparisonData };
  }, [N, K, drawCount, searchCount, error]);

  const formulaLines = useMemo(() => {
    if (error || !result) return [];
    return [
      `【大量ドロー】`,
      `P_draw = hypergeomAtLeast(${N}, ${K}, ${drawCount}, 1)`,
      `  = 1 - P(X=0)`,
      `  = ${pct(result.pDraw)}%`,
      ``,
      `【確定サーチ】`,
      `山札に K=${K}枚 あり、search_count=${searchCount}枚 取得`,
      `P_search = K ≥ search_count ? 100% : 0%`,
      `  = ${K} ≥ ${searchCount} → ${pct(result.pSearch)}%`,
      ``,
      `【判定】`,
      `${result.advantage}`,
      `  差: ${pct(Math.abs(result.pDraw - result.pSearch))}%`,
    ];
  }, [N, K, drawCount, searchCount, result, error]);

  const presets = [
    { label: '博士の研究 vs ネストボール', values: { drawCount: 7, searchCount: 1 } },
    { label: '博士の研究 vs ペパー', values: { drawCount: 7, searchCount: 2 } },
  ];

  const applyPreset = (v: Record<string, number | boolean | string>) => {
    if (typeof v.drawCount === 'number') setDrawCount(v.drawCount);
    if (typeof v.searchCount === 'number') setSearchCount(v.searchCount);
  };

  return (
    <Card id="b4" icon="⚖️" title="B4: 大量ドロー vs 確定サーチ 比較" description="大量ドローと確定サーチ、どちらが目的カードに触れやすいかを比較。">
      <PresetButtons presets={presets} onSelect={applyPreset} />
      <InputGrid>
        <InputField label="山札残り枚数 (N)" value={N} onChange={setN} min={1} />
        <InputField label="目的カードの残り枚数 (K)" value={K} onChange={setK} min={0} max={N} />
        <InputField label="大量ドロー枚数" value={drawCount} onChange={setDrawCount} min={1} max={N} />
        <InputField label="確定サーチ取得枚数" value={searchCount} onChange={setSearchCount} min={1} />
      </InputGrid>

      {error && <ErrorBox message={error} />}

      {result && !error && (
        <>
          <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', mb: '16px' })}>
            <div>
              <ProbValue p={result.pDraw} label={`大量ドロー（${drawCount}枚）`} />
              <ProbBar p={result.pDraw} />
            </div>
            <div>
              <ProbValue p={result.pSearch} label={`確定サーチ（${searchCount}枚取得）`} />
              <ProbBar p={result.pSearch} />
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span className={css({
              px: '16px', py: '6px', borderRadius: '20px', fontSize: '14px', fontWeight: 700,
              bg: result.advantage === '確定サーチ有利' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(250, 204, 21, 0.15)',
              color: result.advantage === '確定サーチ有利' ? 'prob.high' : 'accent.yellow',
            })}>
              {result.advantage}
            </span>
          </div>

          <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>山札枚数別比較</h3>
          <DataTable
            headers={['山札枚数', '大量ドロー確率', '確定サーチ確率', '判定']}
            rows={result.comparisonData.filter((_, i) => i % 5 === 0).map(r => [
              `${r.n}枚`,
              `${pct(r.pDraw)}%`,
              `${pct(r.pSearch)}%`,
              r.pDraw >= r.pSearch ? 'ドロー有利' : 'サーチ有利',
            ])}
          />

          <FormulaDisplay lines={formulaLines} />
        </>
      )}
    </Card>
  );
}
