import { useState } from 'react';
import { isDemo } from '../../api/endpoints';
import type { Creator } from '../../api/types';
import { fmt, fmtDate, initials } from '../../lib/format';
import { creatorName, creatorSplit, creatorStatus } from '../../lib/mappers';
import { useBanking } from './BankingData';
import { CreatorDetailModal } from './CreatorDetailModal';

export function CreatorsTab({ onSetUp }: { onSetUp: (c: Creator) => void }) {
  const { creators } = useBanking();
  const [filter, setFilter] = useState('');
  const [detail, setDetail] = useState<Creator | null>(null);

  const all = creators.data?.items ?? [];
  const q = filter.trim().toLowerCase();
  const list = all.filter((c) => creatorName(c).toLowerCase().includes(q));

  return (
    <div className="card">
      <div className="card-head">
        <h3>
          Creator sub-balances <span className="muted-text">{creators.data ? `(${creators.data.total} total)` : ''}</span>
        </h3>
        <input className="search-input" placeholder="Search creators…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <table className="creators-table">
        <thead>
          <tr>
            <th>Creator</th><th>Status</th><th>Total income</th><th>Split (agency/creator)</th><th>Agency earned</th><th>Last deposit</th><th></th>
          </tr>
        </thead>
        <tbody>
          {creators.loading && <tr><td colSpan={7} className="muted-text empty-cell">Loading creators…</td></tr>}
          {creators.error && <tr><td colSpan={7} className="muted-text empty-cell">{creators.error.message}</td></tr>}
          {creators.data && list.length === 0 && (
            <tr><td colSpan={7} className="muted-text empty-cell">{all.length ? 'No creators match your search' : 'No creators yet'}</td></tr>
          )}
          {list.map((c) => {
            const name = creatorName(c);
            const status = creatorStatus(c);
            if (status === 'active') {
              const split = creatorSplit(c);
              return (
                <tr key={c.id}>
                  <td>
                    <div className="creator-cell">
                      <span className="avatar">{initials(name)}</span>
                      <div>
                        <div className="creator-name">{name}</div>
                        <div className="creator-sub">Activated {fmtDate(c.submittedOn)}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="status-pill active">● Active</span></td>
                  <td>{fmt(c.totalAmountReceived)}</td>
                  <td>{split.agency}% / {split.creator}%</td>
                  <td>{fmt(c.commissionEarned)}</td>
                  <td>{fmtDate(c.lastPaymentDate)}</td>
                  <td><button className="table-btn" onClick={() => setDetail(c)}>View</button></td>
                </tr>
              );
            }
            if (status === 'pending_signature') {
              return (
                <tr key={c.id} className="row-muted">
                  <td>
                    <div className="creator-cell">
                      <span className="avatar avatar-empty">{initials(name)}</span>
                      <div>
                        <div className="creator-name">{name}</div>
                        <div className="creator-sub">{c.creatorEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="status-pill pending">● Pending signature</span></td>
                  <td className="muted-text" colSpan={3}>Mandate sent {fmtDate(c.mandateSentDate)} — awaiting creator e-signature</td>
                  <td>—</td>
                  <td><button className="table-btn" onClick={() => setDetail(c)}>View</button></td>
                </tr>
              );
            }
            return (
              <tr key={c.id} className="row-muted">
                <td>
                  <div className="creator-cell">
                    <span className="avatar avatar-empty">{initials(name)}</span>
                    <div>
                      <div className="creator-name">{name}</div>
                      <div className="creator-sub">{c.creatorEmail ?? `Client #${c.id}`}</div>
                    </div>
                  </div>
                </td>
                <td><span className="status-pill setup">● Setup required</span></td>
                <td className="muted-text" colSpan={3}>No SUBBAL creator sub-balance yet</td>
                <td>—</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {/* live data can't tell "pending signature" apart from "setup required" in the list; the detail can */}
                    {!isDemo() && <button className="table-btn" onClick={() => setDetail(c)}>View</button>}
                    <button className="table-btn primary" onClick={() => onSetUp(c)}>Set up</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <CreatorDetailModal creator={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
