import type { SavingsAccount } from '../../api/types';
import { useToast } from '../../components/Toast';
import { fmt } from '../../lib/format';
import { accountMeta, accountName, accountStatusLabel, groupAccounts, isActiveAccount } from '../../lib/mappers';
import { useBanking } from './BankingData';

export function AccountsTab() {
  const toast = useToast();
  const { accounts } = useBanking();

  if (accounts.loading) return <p className="muted-text">Loading accounts…</p>;
  if (accounts.error) return <p className="form-error">{accounts.error.message}</p>;

  const { operational, department } = groupAccounts(accounts.data ?? []);
  const card = (a: SavingsAccount) => (
    <div className="acc-card" key={a.id}>
      <div className="acc-name">{accountName(a)}</div>
      <div className="acc-meta">{accountMeta(a)}</div>
      <div className="acc-balance">{fmt(a.accountBalance)}</div>
      <div className="acc-foot">
        <span className={'status-pill ' + (isActiveAccount(a) ? 'active' : 'pending')}>{accountStatusLabel(a)}</span>
        <button className="link" onClick={() => toast(`Available balance ${fmt(a.availableBalance)} · Account ${a.accountNumber}`)}>
          View details
        </button>
      </div>
    </div>
  );

  return (
    <>
      <h4 className="section-title">Operational accounts</h4>
      <div className="accounts-grid">
        {operational.length ? operational.map(card) : <p className="muted-text">No operational accounts</p>}
      </div>
      {department.length > 0 && (
        <>
          <h4 className="section-title">Department accounts</h4>
          <div className="accounts-grid">{department.map(card)}</div>
        </>
      )}
      <button className="action-btn" style={{ maxWidth: 220, marginTop: 6 }} onClick={() => toast('Add account — coming soon')}>
        + Add account
      </button>
    </>
  );
}
