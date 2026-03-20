import { css } from '../styled-system/css';
import { Navbar } from './components/Navbar';
import { A1InitialHand } from './components/A1InitialHand';
import { A2PrizeCard } from './components/A2PrizeCard';
import { A3MulliganCount } from './components/A3MulliganCount';
import { A4ReverseLookup } from './components/A4ReverseLookup';
import { B1Conditional } from './components/B1Conditional';
import { B3ForcedDraw } from './components/B3ForcedDraw';
import { B4DrawVsSearch } from './components/B4DrawVsSearch';
import { B5DeckThinning } from './components/B5DeckThinning';
import { B6UncertainSearch } from './components/B6UncertainSearch';

function App() {
  return (
    <>
      <Navbar />
      <main className={css({
        maxWidth: '800px', mx: 'auto', px: '16px', pt: '64px', pb: '48px',
      })}>
        <header className={css({ textAlign: 'center', mb: '40px' })}>
          <h1 className={css({ fontSize: '32px', fontWeight: 700, color: 'accent.yellow', mb: '8px' })}>
            ⚡ ポケカ確率ツール
          </h1>
          <p className={css({ fontSize: '14px', color: 'text.secondary' })}>
            Pokemon TCG Probability Tool — 超幾何分布ベースの確率計算ツール群
          </p>
        </header>

        <h2 className={css({ fontSize: '16px', color: 'accent.yellow', fontWeight: 700, mb: '16px', letterSpacing: '0.05em' })}>
          Category A — デッキ構築判断系
        </h2>
        <A1InitialHand />
        <A2PrizeCard />
        <A3MulliganCount />
        <A4ReverseLookup />

        <h2 className={css({ fontSize: '16px', color: 'accent.blue', fontWeight: 700, mb: '16px', mt: '32px', letterSpacing: '0.05em' })}>
          Category B — プレイング判断系
        </h2>
        <B1Conditional />
        <B3ForcedDraw />
        <B4DrawVsSearch />
        <B5DeckThinning />
        <B6UncertainSearch />
      </main>
    </>
  );
}

export default App;
