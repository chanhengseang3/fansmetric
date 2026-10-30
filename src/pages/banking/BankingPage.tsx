import { useState } from 'react';
import { Icon } from '../../components/icons';
import { AccountsTab } from './AccountsTab';
import { AnalyticsTab } from './AnalyticsTab';
import { useBanking } from './BankingData';
import { CreatorsTab } from './CreatorsTab';
import { OnboardingModal, type OnboardingTarget } from './OnboardingModal';
import { OverviewTab } from './OverviewTab';
import { StatementsTab } from './StatementsTab';
import { TransfersTab } from './TransfersTab';

export type BankingTab = 'overview' | 'transfers' | 'creators' | 'accounts' | 'analytics' | 'statements';

const TABS: { id: BankingTab; label: string; lock?: boolean }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'transfers', label: 'Transfers', lock: true },
  { id: 'creators', label: 'Creators & splits' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'statements', label: 'Statements' },
];

export function BankingPage() {
  const { me } = useBanking();
  const [tab, setTab] = useState<BankingTab>('overview');
  // tabs mount on first visit and stay mounted (keeps wizard state, avoids refetching)
  const [visited, setVisited] = useState<Set<BankingTab>>(() => new Set(['overview']));
  const [bannerOpen, setBannerOpen] = useState(true);
  const [onboarding, setOnboarding] = useState<OnboardingTarget | null>(null);

  const go = (t: BankingTab) => {
    setTab(t);
    setVisited((v) => (v.has(t) ? v : new Set(v).add(t)));
  };

  const agencyName = me.data?.agency?.displayName;
  const connection = me.error
    ? { dot: 'dot-red', text: 'Not connected' }
    : me.loading
      ? { dot: 'dot-amber', text: 'Connecting…' }
      : { dot: 'dot-green', text: `Connected · ${agencyName ?? 'No agency'}` };

  const panel = (id: BankingTab, node: React.ReactNode) =>
    visited.has(id) && (
      <div className={'banking-tab' + (tab === id ? ' active' : '')} key={id}>
        {node}
      </div>
    );

  return (
    <section className="page active">
      <div className="page-header">
        <div>
          <h1>
            Banking{' '}
            <span className="badge-subbal">
              <span className="dot-mark"></span>Powered by SUBBAL
            </span>
          </h1>
          <p className="page-sub">Create creator sub-balances, automate revenue splits, and manage payouts — without leaving FansMetric.</p>
        </div>
        <div className="conn-status">
          <span className={'dot ' + connection.dot}></span>
          {connection.text}
        </div>
      </div>

      {bannerOpen && (
        <div className="concept-banner">
          <span>🧩 Live SUBBAL data — balances, creators, splits and payouts below come straight from your SUBBAL agency account.</span>
          <button onClick={() => setBannerOpen(false)} aria-label="Dismiss">✕</button>
        </div>
      )}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={'tab-btn' + (tab === t.id ? ' active' : '')} onClick={() => go(t.id)}>
            {t.label} {t.lock && <Icon.Lock />}
          </button>
        ))}
      </div>

      {panel('overview', <OverviewTab onGoTo={go} onAddCreator={() => setOnboarding({ kind: 'new' })} />)}
      {panel('transfers', <TransfersTab />)}
      {panel('creators', <CreatorsTab onSetUp={(c) => setOnboarding({ kind: 'existing', creator: c })} />)}
      {panel('accounts', <AccountsTab />)}
      {panel('analytics', <AnalyticsTab />)}
      {panel('statements', <StatementsTab />)}

      <OnboardingModal target={onboarding} onClose={() => setOnboarding(null)} />
    </section>
  );
}
