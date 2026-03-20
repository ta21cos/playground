import { useState, useMemo } from 'react';
import { hypergeomAtLeast } from '../utils/hypergeom';
import { pct } from '../utils/format';
import { Card, InputGrid, InputField, ProbValue, ProbBar, PresetButtons, FormulaDisplay, ErrorBox } from './shared';
import { css } from '../../styled-system/css';

export function B1Conditional() {
  const [N, setN] = useState(45);
  const [K, setK] = useState(3);
  const [peek, setPeek] = useState(2);
  const [miss, setMiss] = useState(1);
  const [drawNext, setDrawNext] = useState(1);

  const error = useMemo(() => {
    if (N < 2) return '山札枚数は2以上にしてください';
    if (K > N) return '目的カード枚数が山札枚数を超えています';
    if (peek > N) return 'めくった枚数が山札枚数を超えています';
    if (miss > peek) return '底に戻す枚数がめくった枚数を超えています';
    if (drawNext > N - peek) return '次に引く枚数が残り山札枚数を超えています';
    if (peek < 1 || miss < 1 || drawNext < 1) return '数値を入力してください';
    return null;
  }, [N, K, peek, miss, drawNext]);

  const result = useMemo(() => {
    if (error) return null;
    const pShuffle = hypergeomAtLeast(N, K, drawNext, 1);
    const pInformed = hypergeomAtLeast(N - miss, K, drawNext, 1);
    const delta = pInformed - pShuffle;
    return { pShuffle, pInformed, delta };
  }, [N, K, peek, miss, drawNext, error]);

  const formulaLines = useMemo(() => {
    if (error || !result) return [];
    return [
      `【シャッフル後（情報なし）】`,
      `P_shuffle = hypergeomAtLeast(${N}, ${K}, ${drawNext}, 1)`,
      `  = ${K}/${N}`,
      `  = ${pct(result.pShuffle)}%`,
      ``,
      `【シャッフルなし（底に外れ${miss}枚確定）】`,
      `有効山札 = ${N} - ${miss} = ${N - miss}枚（底の外れ確定カードを除外）`,
      `目的カード = ${K}枚（底に落ちたのは外れなのでそのまま）`,
      `P_informed = hypergeomAtLeast(${N - miss}, ${K}, ${drawNext}, 1)`,
      `  = ${K}/${N - miss}`,
      `  = ${pct(result.pInformed)}%`,
      ``,
      `【差分】`,
      `delta = ${pct(result.pInformed)}% - ${pct(result.pShuffle)}% = ${result.delta >= 0 ? '+' : ''}${pct(result.delta)}%`,
    ];
  }, [N, K, miss, drawNext, result, error]);

  const presets = [
    { label: 'ドロンチ（ていさつしれい）', values: { peek: 2, miss: 1 } },
    { label: 'ポケギア3.0（外れ2枚戻し）', values: { peek: 3, miss: 2 } },
  ];

  const applyPreset = (v: Record<string, number | boolean | string>) => {
    if (typeof v.peek === 'number') setPeek(v.peek);
    if (typeof v.miss === 'number') setMiss(v.miss);
  };

  return (
    <Card id="b1" icon="🦎" title="B1: ドロンチ型 条件付き確率" description="山札上をめくって底に戻した後、次のドローの確率をシャッフルあり/なしで比較。">
      <PresetButtons presets={presets} onSelect={applyPreset} />
      <InputGrid>
        <InputField label="現在の山札枚数 (N)" value={N} onChange={setN} min={2} />
        <InputField label="目的カード残り枚数 (K)" value={K} onChange={setK} min={0} max={N} />
        <InputField label="めくった枚数" value={peek} onChange={setPeek} min={1} max={N} />
        <InputField label="底に戻した枚数（外れ確定）" value={miss} onChange={setMiss} min={1} max={peek} />
        <InputField label="次に引く枚数" value={drawNext} onChange={setDrawNext} min={1} max={Math.max(1, N - peek)} />
      </InputGrid>

      {error && <ErrorBox message={error} />}

      {result && !error && (
        <>
          <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', mb: '16px' })}>
            <div>
              <ProbValue p={result.pShuffle} label="シャッフルあり" />
              <ProbBar p={result.pShuffle} />
            </div>
            <div>
              <ProbValue p={result.pInformed} label="シャッフルなし（情報あり）" />
              <ProbBar p={result.pInformed} />
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>確率差: </span>
            <span style={{ color: '#38bdf8', fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
              {result.delta >= 0 ? '+' : ''}{pct(result.delta)}%
            </span>
          </div>

          <div className={css({
            bg: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', p: '12px',
            fontSize: '13px', color: 'text.secondary', mb: '16px',
            border: '1px solid rgba(56, 189, 248, 0.2)',
          })}>
            ⚠️ 差分はほとんどの場合 0.1〜0.5% 程度と小さいです。「シャッフルすべきか」の判断は確率差より、シャッフルコスト（博士でトラッシュするカードの価値）で決まるケースが多いです。
          </div>

          <FormulaDisplay lines={formulaLines} />
        </>
      )}
    </Card>
  );
}
