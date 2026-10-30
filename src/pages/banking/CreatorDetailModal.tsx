import { useState } from 'react';
import { getCreatorDetail, getCreatorTransactions } from '../../api/endpoints';
import type { Creator, CreatorDetail, CreatorTransaction } from '../../api/types';
import { MonthsRow, SplitDonut, TrendChart } from '../../components/charts';
import { Modal } from '../../components/Modal';
import { useAsync } from '../../hooks/useAsync';
import { fmt, fmtDate, fmtSigned, initials, pctChange } from '../../lib/format';
import { creatorName, creatorSplit, creatorStatus, humanize, incomeBreakdown, lastMonths, monthlyIncome } from '../../lib/mappers';

export function CreatorDetailModal({ creator, onClose }: { creator: Creator | null; onClose: () => void }) {
  return (
    <Modal open={!!creator} onClose={onClose} variant="wide">
      {creator && <CreatorDetailBody creator={creator} />}
    </Modal>
  );
}

function CreatorDetailBody({ creator }: { creator: Creator }) {
  const active = creatorStatus(creator) === 'active';
  const data = useAsync(
    () =>
      Promise.all([
        getCreatorDetail(creator.id),
        active ? getCreatorTransactions(creator.id) : Promise.resolve(null),
      ]),
    [creator.id, active],
  );

  if (data.loading) return <p className="muted-text">Loading {creatorName(creator)}…</p>;
  if (data.error) return <p className="form-error">{data.error.message}</p>;
  const [detail, txs] = data.data!;

  if (!active) return <PendingCreator creator={creator} detail={detail} />;
  return <ActiveCreator creator={creator} detail={detail} txs={txs?.items ?? []} txTotal={txs?.total ?? 0} />;
}

function Profile({ name, sub, empty }: { name: string; sub: string; empty?: boolean }) {
  return (
    <div className="creator-profile" style={{ marginBottom: 6 }}>
      <span className={'avatar large' + (empty ? ' avatar-empty' : '')}>{initials(name)}</span>
      <div>
        <h3 style={{ margin: 0 }}>{name}</h3>
        <p className="muted-text" style={{ margin: '2px 0 0' }}>{sub}</p>
      </div>
    </div>
  );
}

function ActiveCreator({ creator, detail, txs, txTotal }: { creator: Creator; detail: CreatorDetail; txs: CreatorTransaction[]; txTotal: number }) {
  const [tab, setTab] = useState<'overview' | 'analytics'>('overview');
  const name = creatorName(creator);
  const split = creatorSplit(creator);
  const routing = detail.mandate?.accountDetails?.bankInformation?.routingNumber;
  const subAccount = creator.creatorAccountNo ?? detail.accounts?.find((a) => a.accountSubType === 'SUB_ACCOUNT')?.accountNo;

  const months = lastMonths(6);
  const values = monthlyIncome(txs, months);
  const lastVal = values[values.length - 1];
  const growth = pctChange(lastVal, values[values.length - 2]);
  const breakdown = incomeBreakdown(txs);

  return (
    <>
      <Profile name={name} sub={`Activated ${fmtDate(creator.submittedOn)} · Last deposit ${fmtDate(creator.lastPaymentDate)}`} />
      <div className="cd-tabs">
        <button className={'cd-tab-btn' + (tab === 'overview' ? ' active' : '')} onClick={() => setTab('overview')}>Overview</button>
        <button className={'cd-tab-btn' + (tab === 'analytics' ? ' active' : '')} onClick={() => setTab('analytics')}>Analytics</button>
      </div>

      <div className={'cd-tab-content' + (tab === 'overview' ? ' active' : '')}>
        <div className="creator-detail-grid">
          <div className="card">
            <h3>Sub-balance summary</h3>
            <div className="kv-row"><span>Total funds in</span><strong>{fmt(creator.totalAmountReceived)}</strong></div>
            <div className="kv-row"><span>Total transactions</span><strong>{txTotal}</strong></div>
            <div className="split-earn-row">
              <div><span className="muted-text">Earnt by agency</span><strong>{fmt(creator.commissionEarned)}</strong></div>
              <div><span className="muted-text">Earnt by creator</span><strong>{fmt(creator.totalPaidToCreator)}</strong></div>
            </div>
          </div>
          <div className="card">
            <h3>Sub-balance details</h3>
            <div className="field-box"><span className="muted-text">Contact</span><div>{detail.emailAddress ?? creator.creatorEmail ?? '—'}</div></div>
            <div className="field-row">
              <div className="field-box"><span className="muted-text">Account number</span><div>{subAccount ?? '—'}</div></div>
              <div className="field-box"><span className="muted-text">ACH routing number</span><div>{routing ?? '—'}</div></div>
            </div>
          </div>
          <div className="card">
            <h3>Mandate agreement</h3>
            <SplitDonut business={split.agency} />
            <div className="file-row">
              <span>📄 {detail.mandateMedia?.filename ?? detail.mandateMedia?.name ?? 'No mandate document on file'}</span>
              <span className="muted-text">{fmtDate(detail.mandateMedia?.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="card">
          <h3>Transaction history</h3>
          <table className="tx-table">
            <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
            <tbody>
              {txs.length === 0 && <tr><td colSpan={4} className="muted-text empty-cell">No transactions yet</td></tr>}
              {txs.map((t) => {
                const credit = (t.transactionType ?? '').toUpperCase() !== 'DEBIT' && t.amount >= 0;
                const signed = credit ? Math.abs(t.amount) : -Math.abs(t.amount);
                return (
                  <tr key={t.transactionId}>
                    <td>{fmtDate(t.transactionDate)}</td>
                    <td>{t.subject || humanize(t.transactionSubType) || '—'}</td>
                    <td><span className="chip">{humanize(t.transactionType) || (credit ? 'Credit' : 'Debit')}</span></td>
                    <td className={signed < 0 ? 'neg' : 'pos'}>{fmtSigned(signed)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={'cd-tab-content' + (tab === 'analytics' ? ' active' : '')}>
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-label">Total income (all time)</span>
            <span className="stat-value">{fmt(creator.totalAmountReceived)}</span>
            <span className="stat-delta muted">Since {fmtDate(creator.submittedOn)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">This month</span>
            <span className="stat-value">{fmt(lastVal)}</span>
            {growth == null ? (
              <span className="stat-delta muted">No data last month</span>
            ) : (
              <span className={'stat-delta ' + (growth >= 0 ? 'positive' : 'negative')}>
                {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}% vs last month
              </span>
            )}
          </div>
          <div className="stat-card">
            <span className="stat-label">Agency commission earned</span>
            <span className="stat-value">{fmt(creator.commissionEarned)}</span>
            <span className="stat-delta muted">{split.agency}% share</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Creator share</span>
            <span className="stat-value">{fmt(creator.totalPaidToCreator)}</span>
            <span className="stat-delta muted">{split.creator}% share</span>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Earnings trend — last 6 months</h3></div>
          <TrendChart values={values} color="#3d7fff" uid={creator.id} />
          <MonthsRow labels={months.map((m) => m.label)} />
        </div>
        <div className="card">
          <h3>Income by type</h3>
          {breakdown.length === 0 && <p className="muted-text">No incoming payments yet</p>}
          {breakdown.map((b) => (
            <div className="breakdown-row" key={b.label}>
              <span className="breakdown-label">{b.label}</span>
              <div className="breakdown-bar-track">
                <div className="breakdown-bar-fill" style={{ width: `${b.pct}%`, background: b.color }}></div>
              </div>
              <span className="breakdown-pct">{b.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PendingCreator({ creator, detail }: { creator: Creator; detail: CreatorDetail }) {
  const name = creatorName(creator);
  const mandate = detail.mandate;
  const agencyPct = Math.round(mandate?.splitPercentage ?? 0);

  if (!mandate) {
    return (
      <>
        <Profile name={name} sub={detail.emailAddress ?? 'No SUBBAL sub-balance yet'} empty />
        <div className="pending-banner">
          ⚙️ {name} doesn't have a revenue-split mandate yet. Use “Set up” in the creators table to define the split and send the mandate.
        </div>
      </>
    );
  }

  return (
    <>
      <Profile name={name} sub={`Mandate sent ${fmtDate(detail.mandateMedia?.createdAt)} · Awaiting signature`} empty />
      <div className="pending-banner">
        ⏳ Sub-balance account details will appear here automatically once {name} signs the revenue-split mandate.
      </div>
      <div className="creator-detail-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <h3>Mandate agreement</h3>
          <SplitDonut business={agencyPct} />
          <div className="file-row">
            <span>📄 {detail.mandateMedia?.filename ?? `Three Way Mandate - ${name}.pdf`}</span>
            <span className="status-pill pending">Awaiting signature</span>
          </div>
        </div>
        <div className="card">
          <h3>Sub-balance details</h3>
          <div className="locked-box">
            <span className="lock-emoji">🔒</span>
            <div>
              <strong>Locked until signed</strong>
              <p className="muted-text" style={{ margin: '4px 0 0' }}>
                Contact info, account number and ACH routing number will sync from SUBBAL the moment {name} signs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
