import { useState, useMemo } from 'react';
import { hypergeomAtLeast } from '../utils/hypergeom';
import { pct } from '../utils/format';
import { Card, InputGrid, InputField, SelectField, ProbValue, ProbBar, DataTable, PresetButtons, FormulaDisplay, ErrorBox } from './shared';

export function B3ForcedDraw() {
  const [nDeck, setNDeck] = useState(30);
  const [K, setK] = useState(3);
  const [drawMode, setDrawMode] = useState<string>('auto');
  const [sideRemaining, setSideRemaining] = useState(4);
  const [drawManual, setDrawManual] = useState(4);

  const nDraw = drawMode === 'auto' ? sideRemaining : drawManual;

  const error = useMemo(() => {
    if (nDeck < 1) return '山札枚数は1以上にしてください';
    if (K > nDeck) return '目的カード枚数が山札枚数を超えています';
    if (nDraw > nDeck) return 'ドロー枚数が山札枚数を超えています';
    if (nDraw < 1) return 'ドロー枚数は1以上にしてください';
    return null;
  }, [nDeck, K, nDraw]);

  const result = useMemo(() => {
    if (error) return null;
    const p = hypergeomAtLeast(nDeck, K, nDraw, 1);
    // サイド残り1〜6での確率一覧
    const sideTable = [1, 2, 3, 4, 5, 6].map(s => ({
      side: s,
      draw: s,
      prob: s <= nDeck ? hypergeomAtLeast(nDeck, K, s, 1) : 0,
    }));
    return { p, sideTable };
  }, [nDeck, K, nDraw, error]);

  const formulaLines = useMemo(() => {
    if (error || !result) return [];
    return [
      `【ドロー枚数の決定】`,
      drawMode === 'auto'
        ? `ナンジャモ: 残りサイド ${sideRemaining}枚 → ドロー ${nDraw}枚`
        : `手動指定: ドロー ${nDraw}枚`,
      ``,
      `【確率計算】`,
      `P(X ≥ 1) = hypergeomAtLeast(${nDeck}, ${K}, ${nDraw}, 1)`,
      `  = 1 - P(X=0)`,
      `  = 1 - C(${nDeck - K},${nDraw})/C(${nDeck},${nDraw})`,
      `  = ${pct(result.p)}%`,
      ``,
      `※手札シャッフル→山札に戻る効果のため、`,
      `  「山札 ${nDeck}枚中 ${K}枚の目的カードから ${nDraw}枚引く」で近似`,
    ];
  }, [nDeck, K, nDraw, drawMode, sideRemaining, result, error]);

  const presets: { label: string; values: Record<string, number | boolean | string> }[] = [
    { label: 'ナンジャモ（自動）', values: { drawMode: 'auto', sideRemaining: 4 } },
    { label: 'ジャッジマン（固定4枚）', values: { drawMode: 'manual', drawManual: 4 } },
  ];

  const applyPreset = (v: Record<string, number | boolean | string>) => {
    if (typeof v.drawMode === 'string') setDrawMode(v.drawMode);
    if (typeof v.sideRemaining === 'number') setSideRemaining(v.sideRemaining);
    if (typeof v.drawManual === 'number') setDrawManual(v.drawManual);
  };

  return (
    <Card id="b3" icon="🎴" title="B3: 強制ドロー後確率（ナンジャモ等）" description="手札シャッフル＆引き直し後に目的カードを引ける確率。サイド残り枚数に応じた計算。">
      <PresetButtons presets={presets} onSelect={applyPreset} />
      <InputGrid>
        <InputField label="山札の残り枚数" value={nDeck} onChange={setNDeck} min={1} />
        <InputField label="目的カードの山札内枚数 (K)" value={K} onChange={setK} min={0} max={nDeck} />
        <SelectField label="ドロー枚数の指定方法" value={drawMode} onChange={setDrawMode} options={[
          { value: 'auto', label: 'サイド枚数から自動' },
          { value: 'manual', label: '手動入力' },
        ]} />
        {drawMode === 'auto'
          ? <InputField label="残りサイド枚数" value={sideRemaining} onChange={setSideRemaining} min={1} max={6} />
          : <InputField label="ドロー枚数" value={drawManual} onChange={setDrawManual} min={1} max={nDeck} />
        }
      </InputGrid>

      {error && <ErrorBox message={error} />}

      {result && !error && (
        <>
          <ProbValue p={result.p} label={`目的カードを1枚以上引く確率（${nDraw}枚ドロー）`} />
          <ProbBar p={result.p} label={`P(X ≥ 1) [draw=${nDraw}]`} />

          <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>サイド残り枚数別（ナンジャモ参考）</h3>
          <DataTable
            headers={['残りサイド', 'ドロー枚数', '確率']}
            rows={result.sideTable.map(r => [`${r.side}枚`, `${r.draw}枚`, `${pct(r.prob)}%`])}
          />

          <FormulaDisplay lines={formulaLines} />
        </>
      )}
    </Card>
  );
}
