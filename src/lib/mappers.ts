import type {
  AccountTransaction,
  Beneficiary,
  CreateTransferBody,
  Creator,
  CreatorsAnalytics,
  CreatorTransaction,
  DailyAccountAnalytics,
  SavingsAccount,
} from '../api/types';
import { isoDate, maskAccount } from './format';

/* ---------------- Creators ---------------- */

export type CreatorStatus = 'active' | 'pending_signature' | 'setup_required';

export function creatorName(c: Pick<Creator, 'displayName' | 'firstName' | 'lastName' | 'creatorName'>): string {
  return c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.creatorName || 'Unnamed creator';
}

/** A creator is active once the middleware has a DynamoDB mandate record (sub-balance) for them. */
export function creatorStatus(c: Creator): CreatorStatus {
  // the mandate record exists before signing, so PENDING must win over creatorId
  if ((c.status ?? '').toUpperCase() === 'PENDING') return 'pending_signature';
  if (c.creatorSubAccountId || c.creatorId) return 'active';
  return c.mandateSentDate ? 'pending_signature' : 'setup_required';
}

export function creatorStatusLabel(s: CreatorStatus): string {
  return s === 'active' ? 'Active' : s === 'pending_signature' ? 'Pending signature' : 'Setup required';
}

/** `commissionPercentage` is the agency share; the creator keeps the rest. */
export function creatorSplit(c: Pick<Creator, 'commissionPercentage'>) {
  const agency = clampPct(c.commissionPercentage ?? 0);
  return { agency, creator: 100 - agency };
}

function clampPct(n: number) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export interface CreatorTotals {
  users: number;
  income: number;
  agency: number;
  creator: number;
}

export function creatorTotals(list: Creator[]): CreatorTotals {
  const active = list.filter((c) => creatorStatus(c) === 'active');
  const income = sum(active.map((c) => c.totalAmountReceived));
  const agency = sum(active.map((c) => c.commissionEarned));
  return { users: list.length, income, agency, creator: income - agency };
}

/* ---------------- Months ---------------- */

export interface MonthBucket {
  key: string; // YYYY-MM
  label: string; // Apr
}

/** The last `count` calendar months ending with the month of `now`. */
export function lastMonths(count: number, now = new Date()): MonthBucket[] {
  const out: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
    });
  }
  return out;
}

export function monthRange(months: MonthBucket[], now = new Date()) {
  return { startDate: `${months[0].key}-01`, endDate: isoDate(now) };
}

/** Series for the Payout Breakdown chart from `/agencies/me/creators/analytics`. */
export function payoutSeriesFromAnalytics(data: CreatorsAnalytics, months: MonthBucket[]) {
  return {
    totals: months.map((m) => round(data[m.key]?.TOTAL ?? 0)),
    agency: months.map((m) => round(data[m.key]?.AGENCY ?? 0)),
    creatorVals: months.map((m) => round(data[m.key]?.CREATOR ?? 0)),
  };
}

/** SUBBAL amounts are always positive; direction comes from `transactionType`. */
export function isCredit(t: { transactionType?: string | null; amount: number }) {
  const type = (t.transactionType ?? '').toUpperCase();
  if (type === 'DEPOSIT' || type === 'CREDIT') return true;
  if (type === 'WITHDRAWAL' || type === 'DEBIT') return false;
  return t.amount >= 0;
}

/** Monthly incoming totals for one creator from their ledger. */
export function monthlyIncome(txs: CreatorTransaction[], months: MonthBucket[]): number[] {
  const byMonth = new Map<string, number>();
  for (const t of txs) {
    if (!isCredit(t)) continue;
    const key = (t.transactionDate ?? '').slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + Math.abs(t.amount));
  }
  return months.map((m) => round(byMonth.get(m.key) ?? 0));
}

/** Payout breakdown for a single creator: income split by their agency %. */
export function payoutSeriesForCreator(txs: CreatorTransaction[], months: MonthBucket[], agencyPct: number) {
  const totals = monthlyIncome(txs, months);
  const agency = totals.map((v) => Math.round((v * agencyPct) / 100));
  return { totals, agency, creatorVals: totals.map((v, i) => v - agency[i]) };
}

const BREAKDOWN_COLORS = ['#3d7fff', '#17c3b2', '#f5a524', '#8a96ac'];

/** "Income by type": share of incoming amount per subject (up to 4 rows; beyond that, top 3 + Other). */
export function incomeBreakdown(txs: CreatorTransaction[]) {
  const bySubject = new Map<string, number>();
  for (const t of txs) {
    if (!isCredit(t)) continue;
    const label = t.subject || t.transactionSubType || t.type || 'Other';
    bySubject.set(label, (bySubject.get(label) ?? 0) + Math.abs(t.amount));
  }
  const total = sum([...bySubject.values()]);
  if (!total) return [];
  const sorted = [...bySubject.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.length <= 4 ? sorted : sorted.slice(0, 3);
  if (sorted.length > 4) top.push(['Other', sum(sorted.slice(3).map(([, v]) => v))]);
  return top.map(([label, v], i) => ({
    label,
    pct: Math.round((v / total) * 1000) / 10,
    color: BREAKDOWN_COLORS[i],
  }));
}

/* ---------------- Accounts ---------------- */

export function accountName(a: SavingsAccount): string {
  return a.nickName || a.savingsProductName || `Account ${a.accountNumber}`;
}

export function accountMeta(a: SavingsAccount): string {
  return [a.savingsProductName, maskAccount(a.accountNumber)].filter(Boolean).join(' · ');
}

export function isActiveAccount(a: SavingsAccount): boolean {
  return !a.status || /active/i.test(a.status);
}

export function accountStatusLabel(a: SavingsAccount): string {
  if (isActiveAccount(a)) return 'Activated';
  const s = (a.status ?? '').toLowerCase().replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Split into the sample's "Operational" vs "Department" sections by product name. */
export function groupAccounts(accounts: SavingsAccount[]) {
  const operational = accounts.filter((a) => /operat/i.test(a.savingsProductName ?? ''));
  const rest = accounts.filter((a) => !operational.includes(a));
  // when nothing is labelled operational, treat the first account as the main one
  if (!operational.length && rest.length) return { operational: rest.slice(0, 1), department: rest.slice(1) };
  return { operational, department: rest };
}

export interface TxRow {
  id: string;
  title: string;
  sub: string;
  account: string;
  amount: number; // signed
  date: string;
}

export function toTxRow(t: AccountTransaction, accountLabel?: string): TxRow {
  const credit = isCredit(t);
  const pd = t.paymentDetail;
  const title =
    pd?.reference ||
    (credit ? pd?.debtor?.name : pd?.creditor?.name) ||
    humanize(t.transactionType) ||
    'Transaction';
  const kind = pd?.paymentType?.name || humanize(t.transactionSubType) || humanize(t.type) || '';
  return {
    id: t.id,
    title,
    sub: kind,
    account: t.account?.nickName || accountLabel || t.account?.accountNumber || '',
    amount: credit ? Math.abs(t.amount) : -Math.abs(t.amount),
    date: t.createdAt || t.valueDate || '',
  };
}

export function humanize(s: string | null | undefined): string {
  if (!s) return '';
  const lower = s.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export interface PeriodTotals {
  income: number;
  expense: number;
  incomingDays: number;
}

export function sumAnalytics(rows: DailyAccountAnalytics[], fromDate: string, toDate: string): PeriodTotals {
  const inRange = rows.filter((r) => r.date >= fromDate && r.date <= toDate);
  return {
    income: round(sum(inRange.map((r) => r.income))),
    expense: round(sum(inRange.map((r) => Math.abs(r.expense)))),
    incomingDays: inRange.filter((r) => r.income > 0).length,
  };
}

/** Running balance at the end of the latest day on or before `date`. */
export function balanceAt(rows: DailyAccountAnalytics[], date: string): number | null {
  const prior = rows.filter((r) => r.date <= date);
  return prior.length ? prior[prior.length - 1].runningBalance : null;
}

/* ---------------- Transfers ---------------- */

export type TransferType = 'internal' | 'fund' | 'external';
export type TransferSubtype = 'between' | 'crb' | 'ach';

export interface PickerItem {
  id: string;
  name: string;
  meta: string;
  balance: number | null;
}

export interface TransferFields {
  debitAccount?: PickerItem;
  internalRecipient?: PickerItem;
  fundRecipient?: PickerItem;
  recipientContact?: PickerItem;
  achAccountNumber?: string;
  achRouting?: string;
  achAccountType?: 'Individual' | 'Business';
  achBusinessName?: string;
  achFirstName?: string;
  achLastName?: string;
  achBankAccountType?: 'CHECKING' | 'SAVINGS';
  recipientName?: string;
  addressLine1?: string;
  companyUnit?: string;
  country?: string;
  state?: string;
  zip?: string;
  city?: string;
  crbClientName?: string;
  crbAccountNumber?: string;
  amount?: string;
  reference?: string;
}

export const US_STATES: Record<string, string> = {
  California: 'CA',
  'New York': 'NY',
  Florida: 'FL',
  Texas: 'TX',
};

export function accountToPickerItem(a: SavingsAccount): PickerItem {
  return { id: String(a.id), name: accountName(a), meta: accountMeta(a), balance: a.accountBalance ?? null };
}

export function beneficiaryName(b: Beneficiary): string {
  return b.nickName || b.businessName || [b.firstName, b.lastName].filter(Boolean).join(' ') || `Recipient ${b.id}`;
}

export function beneficiaryToPickerItem(b: Beneficiary): PickerItem {
  const acct = b.accountDetails?.accountNumber;
  const meta = [b.paymentRail?.name, humanize(b.accountDetails?.accountType), acct ? '•••' + acct.slice(-4) : '']
    .filter(Boolean)
    .join(' · ');
  return { id: b.id, name: beneficiaryName(b), meta, balance: null };
}

/** Fields auto-filled when a saved recipient is picked (mirrors the sample's selectAccountFromPicker). */
export function fieldsFromBeneficiary(b: Beneficiary): Partial<TransferFields> {
  const business = (b.recipientType ?? '').toUpperCase() === 'BUSINESS';
  const stateLabel = b.address?.stateOrProvince?.label ?? '';
  return {
    achAccountNumber: b.accountDetails?.accountNumber ?? '',
    achRouting: b.accountDetails?.bankInformation?.routingNumber ?? '',
    achAccountType: business ? 'Business' : 'Individual',
    achFirstName: b.firstName ?? '',
    achLastName: b.lastName ?? '',
    achBusinessName: b.businessName ?? '',
    achBankAccountType: (b.accountDetails?.accountType ?? '').toUpperCase() === 'SAVINGS' ? 'SAVINGS' : 'CHECKING',
    recipientName: beneficiaryName(b),
    addressLine1: b.address?.addressLine1 ?? '',
    companyUnit: b.address?.addressLine2 ?? '',
    country: 'United States',
    state: stateLabel,
    zip: b.address?.postalCode ?? '',
    city: b.address?.city ?? '',
  };
}

export type BuildResult = { ok: true; body: CreateTransferBody } | { ok: false; error: string };

/** Validate the wizard state and build the `POST /transfers` body. */
export function buildTransferBody(
  type: TransferType | null,
  subtype: TransferSubtype | null,
  f: TransferFields,
): BuildResult {
  if (type === 'fund') return { ok: false, error: 'Funding employee accounts is not available yet.' };
  if (!f.debitAccount) return { ok: false, error: 'Select the account to debit.' };
  const amount = Number(f.amount);
  if (!f.amount || !Number.isFinite(amount) || amount < 0.01) return { ok: false, error: 'Enter an amount of at least $0.01.' };
  const reference = (f.reference ?? '').trim();
  if (!reference) return { ok: false, error: 'Enter a reference.' };

  const base = {
    amount: Math.round(amount * 100) / 100,
    currency: 'USD' as const,
    reference,
    originator: { accountId: f.debitAccount.id },
  };

  if (type === 'internal' && subtype === 'between') {
    if (!f.internalRecipient) return { ok: false, error: 'Select the recipient account.' };
    if (f.internalRecipient.id === f.debitAccount.id) return { ok: false, error: 'Choose two different accounts.' };
    return { ok: true, body: { ...base, paymentRail: 'INTERNAL', recipient: { accountId: f.internalRecipient.id } } };
  }

  if (type === 'internal' && subtype === 'crb') {
    const accountNumber = (f.crbAccountNumber ?? '').trim();
    if (!accountNumber) return { ok: false, error: 'Enter the recipient account number.' };
    return {
      ok: true,
      body: {
        ...base,
        paymentRail: 'INTERNAL',
        recipient: { accountNumber, ...(f.crbClientName ? { name: f.crbClientName.trim() } : {}) },
      },
    };
  }

  if (type === 'external' && subtype === 'ach') {
    base.reference = reference.toUpperCase();
    if (!/^[A-Z0-9 ]{1,80}$/.test(base.reference)) {
      return { ok: false, error: 'ACH reference must be up to 80 letters and digits.' };
    }
    if (f.recipientContact) {
      return { ok: true, body: { ...base, paymentRail: 'ACH', recipient: { recipientId: f.recipientContact.id } } };
    }
    const accountNumber = (f.achAccountNumber ?? '').trim();
    const routingNumber = (f.achRouting ?? '').trim();
    if (!accountNumber) return { ok: false, error: 'Enter the recipient account number.' };
    if (!/^\d{9}$/.test(routingNumber)) return { ok: false, error: 'ACH routing number must be 9 digits.' };
    const business = f.achAccountType === 'Business';
    const name = (
      f.recipientName ||
      (business ? f.achBusinessName : [f.achFirstName, f.achLastName].filter(Boolean).join(' ')) ||
      ''
    ).trim();
    if (!name) return { ok: false, error: 'Enter the recipient name.' };
    const address = {
      line1: f.addressLine1 || undefined,
      line2: f.companyUnit || undefined,
      city: f.city || undefined,
      stateCode: f.state ? US_STATES[f.state] ?? f.state : undefined,
      postalCode: f.zip || undefined,
      countryCode: 'US',
    };
    return {
      ok: true,
      body: {
        ...base,
        paymentRail: 'ACH',
        recipient: {
          name,
          accountNumber,
          recipientType: business ? 'BUSINESS' : 'INDIVIDUAL',
          accountType: f.achBankAccountType ?? 'CHECKING',
          bankInformation: { routingNumber },
          ...(address.line1 ? { address } : {}),
        },
      },
    };
  }

  return { ok: false, error: 'Select a transfer type.' };
}

/* ---------------- utils ---------------- */

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + (Number(b) || 0), 0);
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
