import { getAccountTransactions } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { useAsync } from '../../hooks/useAsync';
import { fmt, fmtDate, fmtSigned } from '../../lib/format';
import { accountName, creatorStatus, sum, toTxRow } from '../../lib/mappers';
import { useBanking } from './BankingData';
import type { BankingTab } from './BankingPage';
import { deltaText, useMonthStats } from './useMonthStats';

const RECENT_COUNT = 5;

export function OverviewTab({ onGoTo, onAddCreator }: { onGoTo: (t: BankingTab) => void; onAddCreator: () => void }) {
  const toast = useToast();
  const { me, accounts, creators } = useBanking();
  const stats = useMonthStats(accounts.data);

  const accountIds = (accounts.data ?? []).map((a) => a.id).join(',');
  const recent = useAsync(async () => {
    if (!accounts.data) return undefined;
    const lists = await Promise.all(
      accounts.data.map(async (a) => {
        const h = await getAccountTransactions(a.id, { limit: RECENT_COUNT });
        return h.select.map((t) => toTxRow(t, accountName(a)));
      }),
    );
    return lists
      .flat()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, RECENT_COUNT);
  }, [accountIds]);

  const totalBalance = accounts.data ? sum(accounts.data.map((a) => a.accountBalance)) : null;
  const balanceDelta = deltaText(stats.data?.balanceChangePct ?? null, 'from last month');
  const creatorList = creators.data?.items ?? [];
  const activeCount = creatorList.filter((c) => creatorStatus(c) === 'active').length;
  const mainAccount = accounts.data?.[0];
  const agencyName = me.data?.agency?.displayName ?? '';

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total balance</span>
          <span className="stat-value">{accounts.loading ? '…' : fmt(totalBalance)}</span>
          <span className={'stat-delta ' + balanceDelta.cls}>{stats.loading ? '…' : balanceDelta.text}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Income this month</span>
          <span className="stat-value">{stats.loading ? '…' : fmt(stats.data?.income)}</span>
          <span className="stat-delta positive">{stats.data ? `${stats.data.incomingCount} incoming transactions` : ' '}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Expense this month</span>
          <span className="stat-value">{stats.loading ? '…' : fmt(stats.data?.expense)}</span>
          <span className="stat-delta muted">Fees, payouts &amp; transfers</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Creator mandates</span>
          <span className="stat-value">{creators.loading ? '…' : `${activeCount} / ${creatorList.length}`}</span>
          <span className="stat-delta muted">active / total</span>
        </div>
      </div>
      {(stats.error || accounts.error) && <p className="form-error">{(stats.error ?? accounts.error)?.message}</p>}

      <div className="grid-2col">
        <div className="card">
          <div className="card-head">
            <h3>Recent transactions</h3>
            <button className="link" onClick={() => onGoTo('statements')}>View all →</button>
          </div>
          <table className="tx-table">
            <thead><tr><th>Transaction</th><th>Account</th><th>Amount</th></tr></thead>
            <tbody>
              {recent.loading && <tr><td colSpan={3} className="muted-text empty-cell">Loading transactions…</td></tr>}
              {recent.error && <tr><td colSpan={3} className="muted-text empty-cell">{recent.error.message}</td></tr>}
              {recent.data?.length === 0 && <tr><td colSpan={3} className="muted-text empty-cell">No transactions yet</td></tr>}
              {recent.data?.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.title}
                    <div className="creator-sub">{[fmtDate(r.date), r.sub].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td>{r.account}</td>
                  <td className={r.amount < 0 ? 'neg' : 'pos'}>{fmtSigned(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="side-col">
          <div className="card">
            <h3>Quick actions</h3>
            <button className="action-btn primary" onClick={onAddCreator}>+ Add a creator account &amp; revenue split</button>
            <button className="action-btn" onClick={() => toast('Beneficiary management — coming soon')}>Manage beneficiaries</button>
            <button className="action-btn" onClick={() => onGoTo('statements')}>Download statement</button>
          </div>
          <div className="card">
            <h3>Business card</h3>
            <p className="muted-text" style={{ margin: '0 0 6px' }}>Issued via SUBBAL for agency spend</p>
            <div className="card-visual">
              <div className="mini-card"></div>
              <span>
                {agencyName} {mainAccount ? `•••• ${mainAccount.accountNumber.slice(-4)}` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
