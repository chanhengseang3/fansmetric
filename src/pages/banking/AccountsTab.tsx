import { useState, type FormEvent } from 'react';
import { getAccountProducts, openAccount } from '../../api/endpoints';
import type { SavingsAccount } from '../../api/types';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useAsync } from '../../hooks/useAsync';
import { fmt } from '../../lib/format';
import { accountMeta, accountName, accountStatusLabel, groupAccounts, isActiveAccount } from '../../lib/mappers';
import { useBanking } from './BankingData';

export function AccountsTab() {
  const toast = useToast();
  const { accounts } = useBanking();
  const [adding, setAdding] = useState(false);

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
      <button className="action-btn" style={{ maxWidth: 220, marginTop: 6 }} onClick={() => setAdding(true)}>
        + Add account
      </button>
      <Modal open={adding} onClose={() => setAdding(false)}>
        <AddAccountForm
          onDone={(id) => {
            setAdding(false);
            accounts.reload();
            toast(`Account #${id} opened`);
          }}
        />
      </Modal>
    </>
  );
}

function AddAccountForm({ onDone }: { onDone: (id: number) => void }) {
  const products = useAsync(getAccountProducts, []);
  const [productId, setProductId] = useState('');
  const [nickName, setNickName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!productId) return setError('Select an account type.');
    setBusy(true);
    setError('');
    try {
      const res = await openAccount({ productId: Number(productId), nickName: nickName.trim() || undefined });
      onDone(res.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the account');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Add account</h2>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="acc-product">Account type*</label>
          <select id="acc-product" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!products.data}>
            <option value="">{products.loading ? 'Loading…' : 'Select account type'}</option>
            {products.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.currency ? ` (${p.currency.code})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="acc-nick">Nickname</label>
          <input id="acc-nick" maxLength={50} value={nickName} onChange={(e) => setNickName(e.target.value)} />
        </div>
      </div>
      {products.data?.length === 0 && <p className="muted-text">No account types are available to open.</p>}
      {(error || products.error) && <div className="form-error">{error || products.error?.message}</div>}
      <button className="action-btn primary full" type="submit" disabled={busy || !products.data?.length}>
        {busy ? 'Opening…' : 'Open account'}
      </button>
    </form>
  );
}
