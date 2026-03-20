import { useState, useMemo } from 'react';
import { hypergeomAtLeast, hypergeomExact } from '../utils/hypergeom';
import { pct } from '../utils/format';
import { Card, InputGrid, InputField, SelectField, ProbBar, DataTable, FormulaDisplay, ErrorBox } from './shared';

export function A4ReverseLookup() {
  const [N, setN] = useState(60);
  const [n, setN2] = useState(7);
  const [targetProb, setTargetProb] = useState(50);
  const [mode, setMode] = useState<string>('draw');

  const error = useMemo(() => {
    if (n > N) return 'ドロー枚数が山札枚数を超えています';
    if (N < 1 || n < 1) return '数値を入力してください';
    if (targetProb <= 0 || targetProb >= 100) return '目標確率は0〜100の間で入力してください';
    return null;
  }, [N, n, targetProb]);

  const result = useMemo(() => {
    if (error) return null;
    const target = targetProb / 100;
    const rows: { K: number; prob: number; meets: boolean }[] = [];
    let recommended: number | null = null;

    for (let K = 1; K <= Math.min(N, 4); K++) {
      const prob = mode === 'draw'
        ? hypergeomAtLeast(N, K, n, 1)
        : hypergeomExact(N, K, 6, 0);
      const meets = prob >= target;
      if (meets && recommended === null) recommended = K;
      rows.push({ K, prob, meets });
    }

    return { rows, recommended };
  }, [N, n, targetProb, mode, error]);

  const formulaLines = useMemo(() => {
    if (error || !result) return [];
    const lines: string[] = [];
    lines.push(`【計算モード: ${mode === 'draw' ? '初手で引く' : 'サイドに落ちない'}】`);
    lines.push(`目標確率: ${targetProb}%`);
    lines.push(``);
    for (const row of result.rows) {
      if (mode === 'draw') {
        lines.push(`K=${row.K}: P(X≥1) = hypergeomAtLeast(${N}, ${row.K}, ${n}, 1) = ${pct(row.prob)}% ${row.meets ? '✓' : '✗'}`);
      } else {
        lines.push(`K=${row.K}: P(サイド0枚) = hypergeomExact(${N}, ${row.K}, 6, 0) = ${pct(row.prob)}% ${row.meets ? '✓' : '✗'}`);
      }
    }
    if (result.recommended) {
      lines.push(``);
      lines.push(`→ 推奨採用枚数: ${result.recommended}枚`);
    }
    return lines;
  }, [N, n, targetProb, mode, result, error]);

  return (
    <Card id="a4" icon="🔎" title="A4: 採用枚数の逆引き" description="目標確率から必要な採用枚数を逆算。">
      <InputGrid>
        <InputField label="デッキ枚数 (N)" value={N} onChange={setN} min={1} max={200} />
        <InputField label="ドロー枚数 (n)" value={n} onChange={setN2} min={1} max={N} />
        <InputField label="目標確率 (%)" value={targetProb} onChange={setTargetProb} min={1} max={99} />
        <SelectField label="計算モード" value={mode} onChange={setMode} options={[
          { value: 'draw', label: '初手で引く' },
          { value: 'side', label: 'サイドに落ちない' },
        ]} />
      </InputGrid>

      {error && <ErrorBox message={error} />}

      {result && !error && (
        <>
          {result.recommended ? (
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>推奨採用枚数</div>
              <div style={{ color: '#22c55e', fontSize: 36, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                {result.recommended}枚
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>
                目標 {targetProb}% を達成する最小枚数
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#ef4444', marginBottom: 16 }}>
              4枚以内では目標確率 {targetProb}% を達成できません
            </div>
          )}

          {result.rows.map(row => (
            <ProbBar key={row.K} p={row.prob} label={`K=${row.K}枚: ${pct(row.prob)}%`} />
          ))}

          <DataTable
            headers={['採用枚数', '確率', '判定']}
            rows={result.rows.map(r => [
              `${r.K}枚`,
              `${pct(r.prob)}%`,
              r.meets ? '✓ 達成' : '✗ 未達',
            ])}
          />

          <FormulaDisplay lines={formulaLines} />
        </>
      )}
    </Card>
  );
}
