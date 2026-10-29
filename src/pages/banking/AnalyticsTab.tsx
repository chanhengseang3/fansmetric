import { useMemo, useState } from 'react';
import { getCreatorsAnalytics, getCreatorTransactions } from '../../api/endpoints';
import { BarChart, MonthsRow } from '../../components/charts';
import { Icon } from '../../components/icons';
import { useAsync } from '../../hooks/useAsync';
import { fmt, fmtDate } from '../../lib/format';
import {
  creatorName,
  creatorSplit,
  creatorStatus,
  creatorStatusLabel,
  creatorTotals,
  lastMonths,
  monthRange,
  payoutSeriesForCreator,
  payoutSeriesFromAnalytics,
} from '../../lib/mappers';
import { useBanking } from './BankingData';
import { deltaText, useMonthStats } from './useMonthStats';

export function AnalyticsTab() {
  const { accounts, creators } = useBanking();
  const list = creators.data?.items ?? [];
  const activeList = list.filter((c) => creatorStatus(c) === 'active');
  const [summaryId, setSummaryId] = useState('all');
  const [payoutId, setPayoutId] = useState('all');
  const stats = useMonthStats(accounts.data);

  const months = useMemo(() => lastMonths(6), []);
  const payoutCreator = activeList.find((c) => String(c.id) === payoutId);
  const payout = useAsync(async () => {
    const { startDate, endDate } = monthRange(months);
    if (payoutCreator) {
      const txs = await getCreatorTransactions(payoutCreator.id, { dateFrom: startDate, dateTo: endDate });
      return payoutSeriesForCreator(txs.items, months, creatorSplit(payoutCreator).agency);
    }
    return payoutSeriesFromAnalytics(await getCreatorsAnalytics(startDate, endDate), months);
  }, [payoutCreator?.id, months]);

  // all-time summary, optionally for one creator
  const selected = list.find((c) => String(c.id) === summaryId);
  let summary: { usersLabel: string; users: string; usersSub: string; income: string; creator: string; agency: string; sub: string };
  if (!selected) {
    const t = creatorTotals(list);
    summary = {
      usersLabel: 'Total users',
      users: creators.data ? String(creators.data.total) : '—',
      usersSub: 'All creators',
      income: fmt(t.income),
      creator: fmt(t.creator),
      agency: fmt(t.agency),
      sub: 'All time',
    };
  } else if (creatorStatus(selected) === 'active') {
    summary = {
      usersLabel: 'Activated on',
      users: fmtDate(selected.submittedOn),
      usersSub: creatorName(selected),
      income: fmt(selected.totalAmountReceived),
      creator: fmt(selected.totalAmountReceived - selected.commissionEarned),
      agency: fmt(selected.commissionEarned),
      sub: 'All time',
    };
  } else {
    summary = {
      usersLabel: 'Status',
      users: creatorStatusLabel(creatorStatus(selected)),
      usersSub: creatorName(selected),
      income: fmt(null),
      creator: fmt(null),
      agency: fmt(null),
      sub: 'No SUBBAL data yet',
    };
  }

  const netDelta = deltaText(stats.data?.netChangePct ?? null, 'from last month');

  return (
    <>
      <div className="card">
        <div className="card-head">
          <h3>All-time performance</h3>
          <select className="creator-filter-select" value={summaryId} onChange={(e) => setSummaryId(e.target.value)}>
            <option value="all">All creators</option>
            {list.map((c) => (
              <option key={c.id} value={c.id}>{creatorName(c)}</option>
            ))}
          </select>
        </div>
        <div className="metric-grid">
          <Metric icon={<Icon.MetricUsers />} color="purple" label={summary.usersLabel} value={creators.loading ? '…' : summary.users} sub={summary.usersSub} />
          <Metric icon={<Icon.MetricDollar />} color="green" label="Total income" value={summary.income} sub={summary.sub} />
          <Metric icon={<Icon.MetricUser />} color="blue" label="Total creator commissions" value={summary.creator} sub={summary.sub} />
          <Metric icon={<Icon.Bank />} color="orange" label="Total agency commission" value={summary.agency} sub={summary.sub} />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Payout Breakdown</h3>
          <select className="creator-filter-select" value={payoutId} onChange={(e) => setPayoutId(e.target.value)}>
            <option value="all">All creators</option>
            {activeList.map((c) => (
              <option key={c.id} value={c.id}>{creatorName(c)}</option>
            ))}
          </select>
        </div>
        {payout.error ? (
          <p className="form-error">{payout.error.message}</p>
        ) : (
          <BarChart
            categories={months.map((m) => m.label)}
            series={[
              { name: 'Total payout', color: '#5d6883', values: payout.data?.totals ?? months.map(() => 0) },
              { name: 'Agency earned', color: '#3d7fff', values: payout.data?.agency ?? months.map(() => 0) },
              { name: 'Creator earned', color: '#17c3b2', values: payout.data?.creatorVals ?? months.map(() => 0) },
            ]}
          />
        )}
        <MonthsRow labels={months.map((m) => m.label)} />
        <div className="chart-legend">
          <span><i style={{ background: '#5d6883' }}></i>Total payout</span>
          <span><i style={{ background: '#3d7fff' }}></i>Agency earned</span>
          <span><i style={{ background: '#17c3b2' }}></i>Creator earned</span>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Net revenue</span>
          <span className="stat-value">{stats.loading ? '…' : fmt(stats.data?.net)}</span>
          <span className={'stat-delta ' + netDelta.cls}>{netDelta.text}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Incoming transactions</span>
          <span className="stat-value">{stats.loading ? '…' : stats.data?.incomingCount ?? '—'}</span>
          <span className="stat-delta muted">This month</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Income (credit)</span>
          <span className="stat-value">{stats.loading ? '…' : fmt(stats.data?.income)}</span>
          <span className="stat-delta muted">This month</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Expense (debit)</span>
          <span className="stat-value">{stats.loading ? '…' : fmt(stats.data?.expense)}</span>
          <span className="stat-delta muted">This month</span>
        </div>
      </div>
    </>
  );
}

function Metric({ icon, color, label, value, sub }: { icon: React.ReactNode; color: string; label: string; value: string; sub: string }) {
  const valueClass = { green: ' green-text', blue: ' blue-text', orange: ' orange-text' }[color] ?? '';
  return (
    <div className="metric-card">
      <span className={'metric-icon ' + color}>{icon}</span>
      <div className="metric-body">
        <span className="metric-label">{label}</span>
        <span className={'metric-value' + valueClass}>{value}</span>
        <span className="metric-sub">{sub}</span>
      </div>
    </div>
  );
}
