import { useState, type ReactNode } from 'react';
import { SignInForm } from '../../auth/SignInForm';
import { useSession } from '../../auth/useSession';
import { Icon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
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

function BankingHeader({ dot, status }: { dot: string; status: string }) {
  return (
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
        <span className={'dot ' + dot}></span>
        {status}
      </div>
    </div>
  );
}

/** Banking needs its own SUBBAL sign-in, separate from the FansMetric login. */
export function BankingPage() {
  const session = useSession();
  const toast = useToast();
  const [connecting, setConnecting] = useState(false);
  if (session) return <BankingTabs />;
  return (
    <section className="page active">
      <BankingHeader dot="dot-amber" status="Not connected" />
      <div className="banking-signin">
        <div className="card login-card">
          <h2>Connect your SUBBAL account</h2>
          <p className="muted-text">Banking runs on SUBBAL. Connect your SUBBAL agency account to manage balances, creators and payouts.</p>
          <button className="action-btn primary full" onClick={() => setConnecting(true)}>
            Connect to SUBBAL
          </button>
        </div>
      </div>
      <Modal open={connecting} onClose={() => setConnecting(false)}>
        <SignInForm onSignedIn={() => toast('Signed in to SUBBAL')} />
      </Modal>
    </section>
  );
}

function BankingTabs() {
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

  const panel = (id: BankingTab, node: ReactNode) =>
    visited.has(id) && (
      <div className={'banking-tab' + (tab === id ? ' active' : '')} key={id}>
        {node}
      </div>
    );

  return (
    <section className="page active">
      <BankingHeader dot={connection.dot} status={connection.text} />

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
