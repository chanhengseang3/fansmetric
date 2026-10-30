import { describe, expect, it } from 'vitest';
import type { AccountTransaction, Creator, CreatorTransaction, SavingsAccount } from '../api/types';
import { fmt, fmtSigned, initials, maskAccount, pctChange } from './format';
import {
  balanceAt,
  buildTransferBody,
  creatorSplit,
  creatorStatus,
  creatorTotals,
  groupAccounts,
  incomeBreakdown,
  lastMonths,
  monthlyIncome,
  payoutSeriesForCreator,
  payoutSeriesFromAnalytics,
  sumAnalytics,
  toTxRow,
  type TransferFields,
} from './mappers';

const creator = (over: Partial<Creator> = {}): Creator => ({
  id: 1,
  displayName: 'David Wise',
  commissionPercentage: 0,
  commissionEarned: 0,
  balance: 0,
  totalAmountReceived: 0,
  totalPaidToCreator: 0,
  ...over,
});

describe('format', () => {
  it('formats money like the sample', () => {
    expect(fmt(1234.5)).toBe('$1,234.50');
    expect(fmt(null)).toBe('—');
    expect(fmtSigned(-192)).toBe('-$192.00');
    expect(fmtSigned(6400)).toBe('+$6,400.00');
  });
  it('builds initials and masks', () => {
    expect(initials('Amy Richards')).toBe('AR');
    expect(initials('Cher')).toBe('C');
    expect(maskAccount('00001317000')).toBe('•••• 1317000');
  });
  it('computes percent change', () => {
    expect(pctChange(110, 100)).toBe(10);
    expect(pctChange(75, 100)).toBe(-25);
    expect(pctChange(5, 0)).toBeNull();
  });
});

describe('creators', () => {
  it('treats commissionPercentage as the agency share', () => {
    expect(creatorSplit({ commissionPercentage: 20 })).toEqual({ agency: 20, creator: 80 });
    expect(creatorSplit({ commissionPercentage: 140 })).toEqual({ agency: 100, creator: 0 });
  });

  it('is active only with a DynamoDB sub-balance record', () => {
    expect(creatorStatus(creator({ creatorSubAccountId: '657' }))).toBe('active');
    expect(creatorStatus(creator())).toBe('setup_required');
  });

  it('is pending while SUBBAL status is PENDING, even with a sub-balance record', () => {
    expect(creatorStatus(creator({ creatorId: '518', creatorSubAccountId: '700', status: 'PENDING' }))).toBe('pending_signature');
  });

  it('totals only active creators but counts everyone', () => {
    const t = creatorTotals([
      creator({ creatorId: '1', totalAmountReceived: 2500, commissionEarned: 500 }),
      creator({ creatorId: '2', totalAmountReceived: 1000, commissionEarned: 100 }),
      creator({ totalAmountReceived: 999, commissionEarned: 999 }),
    ]);
    expect(t).toEqual({ users: 3, income: 3500, agency: 600, creator: 2900 });
  });
});

describe('months & analytics', () => {
  const now = new Date(2026, 9, 28); // Oct 28, 2026
  const months = lastMonths(6, now);

  it('lists the last six calendar months', () => {
    expect(months.map((m) => m.key)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(months[0].label).toBe('May');
  });

  it('maps creators analytics onto the months, zero-filling gaps', () => {
    const s = payoutSeriesFromAnalytics({ '2026-10': { TOTAL: 100, AGENCY: 20, CREATOR: 80 } }, months);
    expect(s.totals).toEqual([0, 0, 0, 0, 0, 100]);
    expect(s.agency[5]).toBe(20);
    expect(s.creatorVals[5]).toBe(80);
  });

  const txs: CreatorTransaction[] = [
    { transactionId: 'a', transactionDate: '2026-10-14T11:20:00Z', amount: 250, transactionType: 'CREDIT', subject: 'Subscriptions' },
    { transactionId: 'b', transactionDate: '2026-10-02T11:20:00Z', amount: 50, transactionType: 'CREDIT', subject: 'Tips' },
    { transactionId: 'c', transactionDate: '2026-10-03T11:20:00Z', amount: -40, transactionType: 'DEBIT', subject: 'Payout' },
    { transactionId: 'd', transactionDate: '2026-09-03T11:20:00Z', amount: 100, transactionType: 'CREDIT', subject: 'Subscriptions' },
  ];

  it('sums incoming creator payments per month, ignoring debits', () => {
    expect(monthlyIncome(txs, months)).toEqual([0, 0, 0, 0, 100, 300]);
  });

  it('reads direction from DEPOSIT/WITHDRAWAL, since SUBBAL amounts are always positive', () => {
    const live: CreatorTransaction[] = [
      { transactionId: 'x', transactionDate: '2026-10-11', amount: 7270, transactionType: 'DEPOSIT', subject: 'Received from OF' },
      { transactionId: 'y', transactionDate: '2026-10-11', amount: 3635, transactionType: 'WITHDRAWAL', subject: 'Creator Earnings' },
    ];
    expect(monthlyIncome(live, months)[5]).toBe(7270);
  });

  it('splits a single creator payout by their agency %', () => {
    const s = payoutSeriesForCreator(txs, months, 20);
    expect(s.totals[5]).toBe(300);
    expect(s.agency[5]).toBe(60);
    expect(s.creatorVals[5]).toBe(240);
  });

  it('breaks income down by subject', () => {
    expect(incomeBreakdown(txs)).toEqual([
      { label: 'Subscriptions', pct: 87.5, color: '#3d7fff' },
      { label: 'Tips', pct: 12.5, color: '#17c3b2' },
    ]);
    expect(incomeBreakdown([])).toEqual([]);
    const many = ['A', 'B', 'C', 'D', 'E'].map((subject, i) => ({ transactionId: subject, transactionDate: '2026-10-01', amount: 50 - i * 10, transactionType: 'CREDIT', subject }));
    expect(incomeBreakdown(many).map((b) => b.label)).toEqual(['A', 'B', 'C', 'Other']);
    expect(incomeBreakdown(many.slice(0, 4)).map((b) => b.label)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('sums daily account analytics in a range and reads balances', () => {
    const rows = [
      { date: '2026-09-30', accountId: 1, income: 10, expense: 5, runningBalance: 100 },
      { date: '2026-10-01', accountId: 1, income: 20, expense: -3, runningBalance: 117 },
      { date: '2026-10-02', accountId: 1, income: 0, expense: 0, runningBalance: 117 },
    ];
    expect(sumAnalytics(rows, '2026-10-01', '2026-10-31')).toEqual({ income: 20, expense: 3, incomingDays: 1 });
    expect(balanceAt(rows, '2026-09-30')).toBe(100);
    expect(balanceAt(rows, '2026-08-01')).toBeNull();
  });
});

describe('accounts & transactions', () => {
  const acct = (over: Partial<SavingsAccount>): SavingsAccount => ({
    id: 1,
    accountNumber: '0001',
    accountSubType: 'PRIMARY_ACCOUNT',
    accountBalance: 0,
    availableBalance: 0,
    parentAccountId: null,
    ...over,
  });

  it('groups operational vs department accounts', () => {
    const a = acct({ id: 1, savingsProductName: 'Operational Account' });
    const b = acct({ id: 2, savingsProductName: 'Corporate Checking' });
    expect(groupAccounts([b, a])).toEqual({ operational: [a], department: [b] });
    // nothing labelled operational: first account is the main one
    expect(groupAccounts([b])).toEqual({ operational: [b], department: [] });
  });

  it('builds signed transaction rows', () => {
    const t: AccountTransaction = {
      id: '9',
      runningBalance: 0,
      amount: 192,
      typeOf: 'DEBIT',
      createdAt: '2026-09-16T10:00:00Z',
      transactionType: 'WITHDRAWAL',
      paymentDetail: { reference: null, paymentType: { name: 'ACH' } },
    };
    expect(toTxRow(t, 'US Creators Income')).toMatchObject({ title: 'Withdrawal', sub: 'ACH', account: 'US Creators Income', amount: -192 });
    expect(toTxRow({ ...t, transactionType: 'DEPOSIT', paymentDetail: { reference: 'Incoming ACH from OF' } }).amount).toBe(192);
  });

  it('signs staging rows (numeric typeOf, positive amount) by transactionType', () => {
    const t: AccountTransaction = { id: '599', runningBalance: 0, amount: 7500, typeOf: 2, createdAt: '2026-10-28', transactionType: 'WITHDRAWAL' };
    expect(toTxRow(t).amount).toBe(-7500);
    expect(toTxRow({ ...t, typeOf: 1, transactionType: 'DEPOSIT' }).amount).toBe(7500);
  });
});

describe('buildTransferBody', () => {
  const debit = { id: '5702', name: 'Main', meta: '', balance: 10 };
  const base: TransferFields = { debitAccount: debit, amount: '25.555', reference: 'Oct payout' };

  it('builds an internal transfer between own accounts', () => {
    const r = buildTransferBody('internal', 'between', { ...base, internalRecipient: { id: '92', name: 'Ops', meta: '', balance: 0 } });
    expect(r).toEqual({
      ok: true,
      body: { paymentRail: 'INTERNAL', amount: 25.56, currency: 'USD', reference: 'Oct payout', originator: { accountId: '5702' }, recipient: { accountId: '92' } },
    });
  });

  it('rejects sending to the same account', () => {
    expect(buildTransferBody('internal', 'between', { ...base, internalRecipient: debit })).toMatchObject({ ok: false });
  });

  it('builds a transfer to another SUBBAL client by account number', () => {
    const r = buildTransferBody('internal', 'crb', { ...base, crbAccountNumber: ' 000123 ', crbClientName: 'Acme' });
    expect(r.ok && r.body.recipient).toEqual({ accountNumber: '000123', name: 'Acme' });
  });

  it('uses a saved beneficiary by id for ACH and uppercases the reference', () => {
    const r = buildTransferBody('external', 'ach', { ...base, recipientContact: { id: '5021', name: 'Jordan', meta: '', balance: null } });
    expect(r.ok && r.body).toMatchObject({ paymentRail: 'ACH', reference: 'OCT PAYOUT', recipient: { recipientId: '5021' } });
  });

  it('builds an inline ACH recipient with address', () => {
    const r = buildTransferBody('external', 'ach', {
      ...base,
      achAccountNumber: '1234567890',
      achRouting: '021000021',
      achAccountType: 'Business',
      achBusinessName: 'Jordan Media LLC',
      achBankAccountType: 'SAVINGS',
      addressLine1: '1180 Avenue of the Americas',
      state: 'New York',
      zip: '10036',
      city: 'New York',
    });
    expect(r.ok && r.body.recipient).toEqual({
      name: 'Jordan Media LLC',
      accountNumber: '1234567890',
      recipientType: 'BUSINESS',
      accountType: 'SAVINGS',
      bankInformation: { routingNumber: '021000021' },
      address: { line1: '1180 Avenue of the Americas', line2: undefined, city: 'New York', stateCode: 'NY', postalCode: '10036', countryCode: 'US' },
    });
  });

  it.each([
    [{ ...base, achAccountNumber: '1', achRouting: '123', achFirstName: 'A' }, /routing/],
    [{ ...base, reference: 'bad-ref!', recipientContact: debit }, /reference/],
    [{ ...base, amount: '0' }, /amount/],
    [{ ...base, debitAccount: undefined }, /debit/],
  ])('validates ACH input %#', (fields, msg) => {
    const r = buildTransferBody('external', 'ach', fields as TransferFields);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(msg);
  });

  it('does not submit the fund-employee flow', () => {
    expect(buildTransferBody('fund', null, base)).toMatchObject({ ok: false });
  });
});
