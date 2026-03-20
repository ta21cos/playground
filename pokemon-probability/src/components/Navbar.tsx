import { css } from '../../styled-system/css';

const tools = [
  { id: 'a1', label: 'A1 初手確率' },
  { id: 'a2', label: 'A2 サイド落ち' },
  { id: 'a3', label: 'A3 マリガン' },
  { id: 'a4', label: 'A4 逆引き' },
  { id: 'b1', label: 'B1 条件付き' },
  { id: 'b3', label: 'B3 強制ドロー' },
  { id: 'b4', label: 'B4 ドロー比較' },
  { id: 'b5', label: 'B5 圧縮可視化' },
  { id: 'b6', label: 'B6 不確定サーチ' },
];

export function Navbar() {
  return (
    <nav className={css({
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      bg: 'rgba(11, 17, 32, 0.9)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid token(colors.border)',
      display: 'flex', alignItems: 'center', gap: '2px',
      px: '16px', py: '8px', overflowX: 'auto',
      '& a': {
        color: 'text.secondary', textDecoration: 'none',
        fontSize: '13px', fontWeight: 500,
        px: '10px', py: '6px', borderRadius: '6px',
        whiteSpace: 'nowrap', transition: 'all 0.15s',
        _hover: { color: 'accent.yellow', bg: 'rgba(250, 204, 21, 0.1)' },
      },
    })}>
      <span className={css({ color: 'accent.yellow', fontWeight: 700, fontSize: '14px', mr: '8px', whiteSpace: 'nowrap' })}>
        ⚡ ポケカ確率
      </span>
      {tools.map(t => (
        <a key={t.id} href={`#${t.id}`}>{t.label}</a>
      ))}
    </nav>
  );
}
