import { getAccountsAnalytics, getAccountTransactions } from '../../api/endpoints';
import type { SavingsAccount } from '../../api/types';
import { useAsync } from '../../hooks/useAsync';
import { isoDate, pctChange } from '../../lib/format';
import { balanceAt, isCredit, sumAnalytics } from '../../lib/mappers';

export interface MonthStats {
  income: number;
  expense: number;
  net: number;
  lastMonthNet: number;
  netChangePct: number | null;
  balanceChangePct: number | null;
  incomingCount: number;
}

/** Month-to-date income/expense (agency accounts analytics) plus the number of incoming transactions. */
export function useMonthStats(accounts: SavingsAccount[] | undefined) {
  const ids = (accounts ?? []).map((a) => a.id).join(',');
  return useAsync<MonthStats | undefined>(async () => {
    if (!accounts) return undefined;
    const now = new Date();
    const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const lastMonthStart = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = isoDate(new Date(now.getFullYear(), now.getMonth(), 0));
    const today = isoDate(now);

    const [daily, txLists] = await Promise.all([
      getAccountsAnalytics(lastMonthStart, today, accounts.map((a) => a.id)),
      Promise.all(accounts.map((a) => getAccountTransactions(a.id, { startDate: monthStart, endDate: today, limit: 500 }))),
    ]);

    const current = sumAnalytics(daily, monthStart, today);
    const previous = sumAnalytics(daily, lastMonthStart, lastMonthEnd);
    const balanceNow = balanceAt(daily, today);
    const balanceThen = balanceAt(daily, lastMonthEnd);
    const net = current.income - current.expense;
    const lastMonthNet = previous.income - previous.expense;

    return {
      income: current.income,
      expense: current.expense,
      net,
      lastMonthNet,
      netChangePct: pctChange(net, lastMonthNet),
      balanceChangePct: balanceNow != null && balanceThen != null ? pctChange(balanceNow, balanceThen) : null,
      incomingCount: txLists.flatMap((l) => l.items).filter(isCredit).length,
    };
  }, [ids]);
}

export function deltaText(pct: number | null, suffix: string) {
  if (pct == null) return { cls: 'muted', text: `— ${suffix}` };
  return pct >= 0
    ? { cls: 'positive', text: `▲ ${Math.abs(pct)}% ${suffix}` }
    : { cls: 'negative', text: `▼ ${Math.abs(pct)}% ${suffix}` };
}
