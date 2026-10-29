import { useState } from 'react';
import { downloadCreatorReport, downloadStatement } from '../../api/endpoints';
import { useToast } from '../../components/Toast';
import { isoDate } from '../../lib/format';
import { accountName, creatorName, creatorStatus } from '../../lib/mappers';
import { useBanking } from './BankingData';

function defaultRange() {
  const now = new Date();
  return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDate(now) };
}

export function StatementsTab() {
  const toast = useToast();
  const { accounts, creators } = useBanking();
  const activeCreators = (creators.data?.items ?? []).filter((c) => creatorStatus(c) === 'active');
  const accountList = accounts.data ?? [];

  const [stmt, setStmt] = useState({ account: '', ...defaultRange() });
  const [report, setReport] = useState({ creator: '', ...defaultRange() });
  const [busy, setBusy] = useState<string | null>(null);

  const stmtAccount = stmt.account || (accountList[0] ? `acct-${accountList[0].accountNumber}` : '');

  async function run(key: string, job: () => Promise<void>, ok: string) {
    setBusy(key);
    try {
      await job();
      toast(ok);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(null);
    }
  }

  function downloadStmt(kind: 'CSV' | 'PDF') {
    const { from, to } = stmt;
    if (from > to) return toast('“Date from” must be before “Date to”');
    if (stmtAccount.startsWith('creator-')) {
      const id = Number(stmtAccount.slice('creator-'.length));
      return run(kind, () => downloadCreatorReport(id, from, to, kind === 'CSV' ? 'csv' : 'pdf', 'transactionsReport'), `${kind} downloaded`);
    }
    if (stmtAccount === 'all') {
      return run(
        kind,
        async () => {
          for (const a of accountList) await downloadStatement(a.accountNumber, from, to, kind);
        },
        `${accountList.length} ${kind} statements downloaded`,
      );
    }
    const accountNumber = stmtAccount.slice('acct-'.length);
    if (!accountNumber) return toast('Select an account');
    return run(kind, () => downloadStatement(accountNumber, from, to, kind), `${kind} downloaded`);
  }

  function downloadEarnings() {
    if (!report.creator) return toast('Select a creator');
    if (report.from > report.to) return toast('“Date from” must be before “Date to”');
    return run('earnings', () => downloadCreatorReport(Number(report.creator), report.from, report.to, 'pdf', 'earningsReport'), 'PDF downloaded');
  }

  return (
    <>
      <div className="card">
        <h3>Download a statement</h3>
        <div className="form-row">
          <div className="form-field">
            <label>Account</label>
            <select value={stmtAccount} onChange={(e) => setStmt((s) => ({ ...s, account: e.target.value }))}>
              <optgroup label="Business accounts">
                {accountList.length > 1 && <option value="all">All accounts</option>}
                {accountList.map((a) => (
                  <option key={a.id} value={`acct-${a.accountNumber}`}>{accountName(a)}</option>
                ))}
              </optgroup>
              {activeCreators.length > 0 && (
                <optgroup label="Creators">
                  {activeCreators.map((c) => (
                    <option key={c.id} value={`creator-${c.id}`}>{creatorName(c)}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div className="form-field">
            <label>Date from</label>
            <input type="date" value={stmt.from} onChange={(e) => setStmt((s) => ({ ...s, from: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Date to</label>
            <input type="date" value={stmt.to} onChange={(e) => setStmt((s) => ({ ...s, to: e.target.value }))} />
          </div>
        </div>
        <div className="btn-row">
          <button className="action-btn" onClick={() => downloadStmt('CSV')} disabled={!!busy}>{busy === 'CSV' ? 'Preparing…' : 'Download CSV'}</button>
          <button className="action-btn primary" onClick={() => downloadStmt('PDF')} disabled={!!busy}>{busy === 'PDF' ? 'Preparing…' : 'Download PDF'}</button>
        </div>
      </div>

      <div className="card">
        <h3>Download a creator earnings report</h3>
        <div className="form-row">
          <div className="form-field">
            <label>Account</label>
            <select value={report.creator} onChange={(e) => setReport((r) => ({ ...r, creator: e.target.value }))}>
              <option value="" disabled>Select a creator</option>
              {activeCreators.map((c) => (
                <option key={c.id} value={c.id}>{creatorName(c)}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Date from</label>
            <input type="date" value={report.from} onChange={(e) => setReport((r) => ({ ...r, from: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Date to</label>
            <input type="date" value={report.to} onChange={(e) => setReport((r) => ({ ...r, to: e.target.value }))} />
          </div>
        </div>
        <div className="btn-row">
          <button className="action-btn primary" onClick={downloadEarnings} disabled={!!busy}>{busy === 'earnings' ? 'Preparing…' : 'Download PDF'}</button>
        </div>
      </div>
    </>
  );
}
