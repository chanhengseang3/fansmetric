import { describe, expect, it } from 'vitest';
import { isoDate, pctChange } from '../lib/format';
import { balanceAt, creatorSplit, creatorStatus, isCredit, sum, sumAnalytics } from '../lib/mappers';
import { demoAccounts, demoAccountsAnalytics, demoAccountTransactions, demoCreatorDetail, demoCreators } from './demo';

describe('demo data reproduces the sample page', () => {
  it('has the sample balances and creator statuses', () => {
    expect(sum(demoAccounts.map((a) => a.accountBalance))).toBeCloseTo(59653.67, 2);
    const statuses = demoCreators.map(creatorStatus);
    expect(statuses.filter((s) => s === 'active')).toHaveLength(10);
    expect(statuses.filter((s) => s === 'pending_signature')).toHaveLength(2);
    expect(statuses.filter((s) => s === 'setup_required')).toHaveLength(2);
  });

  it('inverts the sample creator % into the API agency %', () => {
    const amy = demoCreators.find((c) => c.displayName === 'Amy Richards')!;
    expect(creatorSplit(amy)).toEqual({ agency: 60, creator: 40 });
    expect(demoCreatorDetail(amy.id).mandate?.splitPercentage).toBe(60);
  });

  it('yields the sample month stats', () => {
    const now = new Date();
    const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const lastStart = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastEnd = isoDate(new Date(now.getFullYear(), now.getMonth(), 0));
    const today = isoDate(now);
    const rows = demoAccountsAnalytics(lastStart, today);

    expect(sumAnalytics(rows, monthStart, today)).toMatchObject({ income: 63352, expense: 9381.71 });
    expect(pctChange(balanceAt(rows, today)!, balanceAt(rows, lastEnd)!)).toBe(-24.6);

    const incoming = demoAccounts
      .flatMap((a) => demoAccountTransactions(a.id, { startDate: monthStart, limit: 500 }).select)
      .filter(isCredit);
    expect(incoming).toHaveLength(26);
  });
});
