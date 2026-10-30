import { getAccountTransactions } from '../../api/endpoints';
import type { SavingsAccount } from '../../api/types';
import { useAsync } from '../../hooks/useAsync';
import { isoDate, pctChange } from '../../lib/format';
import { sum, sumLedger } from '../../lib/mappers';

export interface MonthStats {
  income: number;
  expense: number;
  net: number;
  lastMonthNet: number;
  netChangePct: number | null;
  balanceChangePct: number | null;
  incomingCount: number;
}

// shortcut: one page per account; months with more rows than this are undercounted, page through `offset` if that happens
const LEDGER_LIMIT = 500;

/**
 * This and last month's income/expense, read from each account's Core ledger.
 * Not from /agencies/me/accounts/analytics: its DynamoDB totals disagree with Core (MS-196).
 */
export function useMonthStats(accounts: SavingsAccount[] | undefined) {
  const ids = (accounts ?? []).map((a) => a.id).join(',');
  return useAsync<MonthStats | undefined>(async () => {
    if (!accounts) return undefined;
    const now = new Date();
    const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const lastMonthStart = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = isoDate(new Date(now.getFullYear(), now.getMonth(), 0));
    const today = isoDate(now);

    const ledgers = await Promise.all(
      accounts.map((a) => getAccountTransactions(a.id, { startDate: lastMonthStart, endDate: today, limit: LEDGER_LIMIT })),
    );
    const txs = ledgers.flatMap((l) => l.items);

    const current = sumLedger(txs, monthStart, today);
    const previous = sumLedger(txs, lastMonthStart, lastMonthEnd);
    const net = current.income - current.expense;
    const lastMonthNet = previous.income - previous.expense;
    // balance at the end of last month = today's balance minus this month's movement
    const balanceNow = sum(accounts.map((a) => a.accountBalance));
    const balanceThen = balanceNow - net;

    return {
      income: current.income,
      expense: current.expense,
      net,
      lastMonthNet,
      netChangePct: pctChange(net, lastMonthNet),
      balanceChangePct: pctChange(balanceNow, balanceThen),
      incomingCount: current.incomingCount,
    };
  }, [ids]);
}

export function deltaText(pct: number | null, suffix: string) {
  if (pct == null) return { cls: 'muted', text: `— ${suffix}` };
  return pct >= 0
    ? { cls: 'positive', text: `▲ ${Math.abs(pct)}% ${suffix}` }
    : { cls: 'negative', text: `▼ ${Math.abs(pct)}% ${suffix}` };
}
