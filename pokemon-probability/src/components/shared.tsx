import { css } from '../../styled-system/css';
import { pct, probColor } from '../utils/format';
import type { ReactNode } from 'react';

/* ─── Card Section ─── */
export function Card({ id, icon, title, description, children }: {
  id: string; icon: string; title: string; description: string; children: ReactNode;
}) {
  return (
    <section id={id} className={css({
      bg: 'bg.card', borderRadius: '16px', p: '32px', mb: '24px',
      border: '1px solid token(colors.border)',
      scrollMarginTop: '60px',
    })}>
      <h2 className={css({ fontSize: '22px', fontWeight: 700, mb: '4px', color: 'text.primary' })}>
        {icon} {title}
      </h2>
      <p className={css({ fontSize: '14px', color: 'text.secondary', mb: '24px' })}>
        {description}
      </p>
      {children}
    </section>
  );
}

/* ─── Input Field ─── */
export function InputField({ label, value, onChange, min, max, step, error }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; error?: string;
}) {
  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: '4px' })}>
      <label className={css({ fontSize: '13px', color: 'text.secondary', fontWeight: 500 })}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={e => onChange(Number(e.target.value))}
        className={css({
          bg: 'bg.primary', color: 'text.primary', border: '1px solid token(colors.border)',
          borderRadius: '8px', px: '12px', py: '8px', fontSize: '16px',
          fontFamily: 'mono', outline: 'none', width: '100%',
          _focus: { borderColor: 'accent.blue' },
        })}
        style={error ? { borderColor: '#ef4444' } : undefined}
      />
      {error && <span className={css({ fontSize: '12px', color: 'error' })}>{error}</span>}
    </div>
  );
}

/* ─── Select Field ─── */
export function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: '4px' })}>
      <label className={css({ fontSize: '13px', color: 'text.secondary', fontWeight: 500 })}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={css({
          bg: 'bg.primary', color: 'text.primary', border: '1px solid token(colors.border)',
          borderRadius: '8px', px: '12px', py: '8px', fontSize: '16px', outline: 'none',
          _focus: { borderColor: 'accent.blue' },
        })}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ─── Checkbox ─── */
export function Checkbox({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className={css({
      display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
      fontSize: '14px', color: 'text.secondary',
    })}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className={css({ width: '18px', height: '18px', accentColor: 'token(colors.accent.blue)' })}
      />
      {label}
    </label>
  );
}

/* ─── Input Grid ─── */
export function InputGrid({ children }: { children: ReactNode }) {
  return (
    <div className={css({
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '12px', mb: '20px',
    })}>
      {children}
    </div>
  );
}

/* ─── Probability Value Display ─── */
const colorMap = { high: '#22c55e', mid: '#facc15', low: '#ef4444' } as const;

export function ProbValue({ p, label }: { p: number; label?: string }) {
  const c = probColor(p);
  return (
    <div className={css({ textAlign: 'center', mb: '12px' })}>
      {label && <div className={css({ fontSize: '13px', color: 'text.secondary', mb: '4px' })}>{label}</div>}
      <div className={css({ fontSize: '36px', fontWeight: 700, fontFamily: 'mono' })} style={{ color: colorMap[c] }}>
        {pct(p)}%
      </div>
    </div>
  );
}

/* ─── Probability Bar ─── */
export function ProbBar({ p, label }: { p: number; label?: string }) {
  const c = probColor(p);
  return (
    <div className={css({ mb: '8px' })}>
      {label && (
        <div className={css({ display: 'flex', justifyContent: 'space-between', fontSize: '13px', mb: '4px' })}>
          <span className={css({ color: 'text.secondary' })}>{label}</span>
          <span className={css({ fontFamily: 'mono' })} style={{ color: colorMap[c] }}>{pct(p)}%</span>
        </div>
      )}
      <div className={css({ bg: 'bg.primary', borderRadius: '4px', height: '8px', overflow: 'hidden' })}>
        <div style={{ width: `${Math.min(100, p * 100)}%`, backgroundColor: colorMap[c], height: '100%', borderRadius: '4px', transition: 'width 0.2s' }} />
      </div>
    </div>
  );
}

/* ─── Data Table ─── */
export function DataTable({ headers, rows }: {
  headers: string[];
  rows: (string | number | ReactNode)[][];
}) {
  return (
    <div className={css({ overflowX: 'auto', mb: '16px' })}>
      <table className={css({
        width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'mono',
        '& th': { color: 'text.secondary', fontWeight: 500, px: '8px', py: '6px', textAlign: 'right', borderBottom: '1px solid token(colors.border)' },
        '& td': { px: '8px', py: '6px', textAlign: 'right', borderBottom: '1px solid token(colors.border)', color: 'text.primary' },
        '& th:first-child, & td:first-child': { textAlign: 'left' },
      })}>
        <thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/* ─── Preset Buttons ─── */
export function PresetButtons({ presets, onSelect }: {
  presets: { label: string; values: Record<string, number | boolean | string> }[];
  onSelect: (values: Record<string, number | boolean | string>) => void;
}) {
  return (
    <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '8px', mb: '16px' })}>
      <span className={css({ fontSize: '13px', color: 'text.muted', alignSelf: 'center' })}>プリセット:</span>
      {presets.map(p => (
        <button
          key={p.label}
          onClick={() => onSelect(p.values)}
          className={css({
            bg: 'rgba(56, 189, 248, 0.1)', color: 'accent.blue', border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '6px', px: '10px', py: '4px', fontSize: '12px', cursor: 'pointer',
            transition: 'all 0.15s',
            _hover: { bg: 'rgba(56, 189, 248, 0.2)' },
          })}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Formula Display ─── */
export function FormulaDisplay({ lines }: { lines: string[] }) {
  return (
    <details className={css({ mb: '16px' })}>
      <summary className={css({
        fontSize: '13px', color: 'text.muted', cursor: 'pointer',
        _hover: { color: 'accent.blue' },
      })}>
        計算式を表示
      </summary>
      <pre className={css({
        bg: 'bg.primary', borderRadius: '8px', p: '16px', mt: '8px',
        fontSize: '12px', fontFamily: 'mono', color: 'text.secondary',
        overflowX: 'auto', lineHeight: '1.8', whiteSpace: 'pre-wrap',
        border: '1px solid token(colors.border)',
      })}>
        {lines.join('\n')}
      </pre>
    </details>
  );
}

/* ─── Error Display ─── */
export function ErrorBox({ message }: { message: string }) {
  return (
    <div className={css({
      bg: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '8px', px: '16px', py: '10px', fontSize: '14px', color: 'error', mb: '12px',
    })}>
      {message}
    </div>
  );
}
