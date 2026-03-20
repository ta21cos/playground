import { useState, useMemo } from 'react';
import { hypergeomAtLeast } from '../utils/hypergeom';
import { pct } from '../utils/format';
import { Card, InputGrid, InputField, DataTable, FormulaDisplay, ErrorBox } from './shared';
import { css } from '../../styled-system/css';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export function B5DeckThinning() {
  const [K, setK] = useState(3);
  const [drawCount, setDrawCount] = useState(1);
  const [nMin, setNMin] = useState(10);
  const [nMax, setNMax] = useState(60);

  const error = useMemo(() => {
    if (K < 1) return '目的カード枚数は1以上にしてください';
    if (nMin < K) return '最小山札枚数は目的カード枚数以上にしてください';
    if (nMax <= nMin) return '最大値は最小値より大きくしてください';
    if (drawCount < 1) return 'ドロー枚数は1以上にしてください';
    return null;
  }, [K, drawCount, nMin, nMax]);

  const data = useMemo(() => {
    if (error) return [];
    const points: { n: number; p: number }[] = [];
    for (let n = nMin; n <= nMax; n++) {
      const draw = Math.min(drawCount, n);
      points.push({ n, p: hypergeomAtLeast(n, Math.min(K, n), draw, 1) });
    }
    return points;
  }, [K, drawCount, nMin, nMax, error]);

  // 注目点
  const highlights = useMemo(() => {
    return [10, 20, 30, 40, 50, 60]
      .filter(n => n >= nMin && n <= nMax)
      .map(n => {
        const draw = Math.min(drawCount, n);
        return { n, p: hypergeomAtLeast(n, Math.min(K, n), draw, 1) };
      });
  }, [K, drawCount, nMin, nMax]);

  const chartData = useMemo(() => ({
    labels: data.map(d => d.n.toString()),
    datasets: [{
      label: `P(X≥1) [K=${K}, draw=${drawCount}]`,
      data: data.map(d => d.p * 100),
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
    }],
  }), [data, K, drawCount]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: { display: true, text: '山札枚数', color: '#94a3b8' },
        ticks: { color: '#64748b' },
        grid: { color: 'rgba(30, 41, 59, 0.5)' },
        reverse: true,
      },
      y: {
        title: { display: true, text: '確率 (%)', color: '#94a3b8' },
        ticks: { color: '#64748b' },
        grid: { color: 'rgba(30, 41, 59, 0.5)' },
        min: 0,
        max: 100,
      },
    },
    plugins: {
      legend: { labels: { color: '#94a3b8' } },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) => `${(ctx.parsed.y ?? 0).toFixed(2)}%`,
        },
      },
    },
  }), []);

  const formulaLines = useMemo(() => {
    if (error) return [];
    const lines = [
      `【山札圧縮の確率変化】`,
      `各山札枚数 N (${nMin}〜${nMax}) について:`,
      `  P(N) = hypergeomAtLeast(N, ${K}, min(${drawCount}, N), 1)`,
      ``,
      `【注目点】`,
    ];
    for (const h of highlights) {
      lines.push(`  N=${h.n}: P = ${pct(h.p)}%`);
    }
    return lines;
  }, [K, drawCount, nMin, nMax, highlights, error]);

  const [showTable, setShowTable] = useState(false);

  return (
    <Card id="b5" icon="📉" title="B5: 山札圧縮の可視化" description="山札枚数の変化に応じた確率推移をグラフで表示。圧縮するほど確率が上がることを可視化。">
      <InputGrid>
        <InputField label="目的カードの枚数 (K)" value={K} onChange={setK} min={1} />
        <InputField label="ドロー枚数" value={drawCount} onChange={setDrawCount} min={1} />
        <InputField label="山札 最小値" value={nMin} onChange={setNMin} min={1} />
        <InputField label="山札 最大値" value={nMax} onChange={setNMax} min={nMin + 1} />
      </InputGrid>

      {error && <ErrorBox message={error} />}

      {!error && data.length > 0 && (
        <>
          <div style={{ height: 300, marginBottom: 16 }}>
            <Line data={chartData} options={chartOptions} />
          </div>

          <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '12px', mb: '16px', justifyContent: 'center' })}>
            {highlights.map(h => (
              <div key={h.n} className={css({
                bg: 'bg.primary', borderRadius: '8px', px: '16px', py: '8px', textAlign: 'center',
                border: '1px solid token(colors.border)',
              })}>
                <div className={css({ fontSize: '12px', color: 'text.muted' })}>山札{h.n}枚</div>
                <div className={css({ fontSize: '18px', fontWeight: 700, fontFamily: 'mono' })}
                  style={{ color: h.p >= 0.75 ? '#22c55e' : h.p >= 0.4 ? '#facc15' : '#ef4444' }}>
                  {pct(h.p)}%
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowTable(!showTable)}
            className={css({
              bg: 'transparent', border: '1px solid token(colors.border)',
              color: 'text.secondary', borderRadius: '6px', px: '12px', py: '6px',
              fontSize: '13px', cursor: 'pointer', mb: '8px',
              _hover: { borderColor: 'accent.blue', color: 'accent.blue' },
            })}
          >
            {showTable ? 'テーブルを閉じる' : 'テーブルを表示'}
          </button>

          {showTable && (
            <DataTable
              headers={['山札枚数', '確率']}
              rows={data.filter((_, i) => i % 5 === 0 || data.length <= 20).map(d => [`${d.n}枚`, `${pct(d.p)}%`])}
            />
          )}

          <FormulaDisplay lines={formulaLines} />
        </>
      )}
    </Card>
  );
}
