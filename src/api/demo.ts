// Sample data from docs/samples/FansMetric.html, reshaped into Subbal Middleware response
// shapes. Served by endpoints.ts whenever nobody is signed in, so the app looks like the sample.
import type {
  AccountTransaction,
  AgenciesResponse,
  Beneficiary,
  Creator,
  CreatorDetail,
  CreatorsAnalytics,
  CreatorTransaction,
  DailyAccountAnalytics,
  PaymentOption,
  SavingsAccount,
} from './types';

interface SampleCreator {
  id: number;
  name: string;
  email: string;
  accountNumber?: string;
  activated?: string; // ISO date
  totalIncome?: number;
  /** creator share %, as in the sample */
  commission?: number;
  agencyEarned?: number;
  lastDeposit?: string; // ISO date
  mandateSentDate?: string;
}

const SAMPLE_CREATORS: SampleCreator[] = [
  { id: 1, name: 'Amy Richards', email: 'sincere-hawkers.5q@icloud.com', accountNumber: '6164020827364890', activated: '2026-07-27', totalIncome: 49483, commission: 40, agencyEarned: 28799.11, lastDeposit: '2026-09-16' },
  { id: 2, name: 'Anna Livingstone', email: 'anna.livingstone@example.com', accountNumber: '6164020485275764', activated: '2026-09-15', totalIncome: 4200, commission: 50, agencyEarned: 1974, lastDeposit: '2026-09-16' },
  { id: 3, name: 'Chris Smith', email: 'chris.smith@example.com', accountNumber: '6164020012345678', activated: '2026-07-27', totalIncome: 13847.03, commission: 50, agencyEarned: 6508.11, lastDeposit: '2026-09-01' },
  { id: 4, name: 'Cindy Murphy', email: 'cindy.murphy@example.com', accountNumber: '6164020237589170', activated: '2026-08-17', totalIncome: 7500, commission: 60, agencyEarned: 2910, lastDeposit: '2026-08-17' },
  { id: 5, name: 'Ella Valley', email: 'ella.valley@example.com', accountNumber: '6164020592837444', activated: '2026-09-02', totalIncome: 1000, commission: 50, agencyEarned: 470, lastDeposit: '2026-09-02' },
  { id: 6, name: 'Ellie Hardy', email: 'ellie.hardy@example.com', accountNumber: '6164008173337748', activated: '2026-04-23', totalIncome: 17400, commission: 80, agencyEarned: 3375.6, lastDeposit: '2026-09-10' },
  { id: 7, name: 'Hannah Taylor', email: 'hannah.taylor@example.com', accountNumber: '6164020592837410', activated: '2026-09-02', totalIncome: 1000, commission: 50, agencyEarned: 470, lastDeposit: '2026-09-02' },
  { id: 8, name: 'Louis Fox', email: 'louis.fox@example.com', accountNumber: '6164005749795096', activated: '2026-04-08', totalIncome: 26276, commission: 80, agencyEarned: 5097.54, lastDeposit: '2026-09-01' },
  { id: 9, name: 'Lucy Evans', email: 'lucy.evans@example.com', accountNumber: '6164020500000000', activated: '2026-07-24', totalIncome: 1100, commission: 50, agencyEarned: 517, lastDeposit: '2026-07-24' },
  { id: 10, name: 'Nancy Taylor', email: 'nancy.taylor@example.com', accountNumber: '6164020210001232', activated: '2026-07-24', totalIncome: 6716, commission: 60, agencyEarned: 2484.92, lastDeposit: '2026-07-28' },
  { id: 11, name: 'Maddie Cole', email: 'maddie.cole@example.com' },
  { id: 12, name: 'Jordan Blake', email: 'jordan.blake@example.com' },
  { id: 13, name: 'Jake Sullivan', email: 'jake.sullivan@example.com', commission: 50, mandateSentDate: '2026-09-15' },
  { id: 14, name: 'Priya Patel', email: 'priya.patel@example.com', commission: 60, mandateSentDate: '2026-09-17' },
];

const ROUTING = '021214891';

function splitName(name: string) {
  const [firstName, ...rest] = name.split(' ');
  return { firstName, lastName: rest.join(' ') };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const demoMe: AgenciesResponse = {
  appUser: { id: 0, username: 'demo', firstName: 'Paul', lastName: 'Owen', email: 'demo@fansmetric.example' },
  agency: { id: 0, displayName: 'Agency Demo 1' },
};

export const demoAccounts: SavingsAccount[] = [
  ['main', 'Agency Demo 1 — Main Business Account', 'Operational Account', '00001317000', 9000],
  ['marketing', 'Agency Demo 1 — Marketing', 'Operational Account', '00006130777', 0],
  ['adspend', 'Agency Demo 1 — Ad spend', 'Corporate Checking', '00008755818', 0],
  ['uscreators', 'Agency Demo 1 — US Creators Income', 'Corporate Checking', '00008253202', 50653.67],
].map(([, nickName, product, accountNumber, balance], i) => ({
  id: 9001 + i,
  accountNumber: accountNumber as string,
  accountSubType: 'PRIMARY_ACCOUNT',
  accountBalance: balance as number,
  availableBalance: balance as number,
  parentAccountId: null,
  savingsProductName: product as string,
  nickName: nickName as string,
  status: 'ACTIVE',
}));

const CREATORS_INCOME_ACCOUNT = demoAccounts[3];

export const demoCreators: Creator[] = SAMPLE_CREATORS.map((c) => {
  const active = c.totalIncome != null;
  const agencyPct = 100 - (c.commission ?? 50);
  return {
    id: c.id,
    ...splitName(c.name),
    displayName: c.name,
    status: 'ACTIVE',
    submittedOn: c.activated,
    creatorEmail: c.email,
    mandateSentDate: c.mandateSentDate,
    ...(active
      ? {
          creatorId: String(c.id),
          creatorSubAccountId: String(7000 + c.id),
          creatorAccountNo: c.accountNumber,
          lastPaymentDate: c.lastDeposit,
        }
      : {}),
    commissionPercentage: active ? agencyPct : 0,
    commissionEarned: c.agencyEarned ?? 0,
    balance: 0,
    totalAmountReceived: c.totalIncome ?? 0,
    totalPaidToCreator: active ? round2(((c.totalIncome ?? 0) * (c.commission ?? 0)) / 100) : 0,
  };
});

export function demoCreatorDetail(id: number): CreatorDetail {
  const c = SAMPLE_CREATORS.find((x) => x.id === id);
  if (!c) throw new Error('Creator not found');
  const hasMandate = c.totalIncome != null || c.mandateSentDate != null;
  return {
    id: c.id,
    ...splitName(c.name),
    emailAddress: c.email,
    mandate: hasMandate
      ? {
          id: `m-${c.id}`,
          recipientType: 'CONTRACTUAL_SPLIT',
          splitPercentage: 100 - (c.commission ?? 50),
          accountDetails: { accountNumber: c.accountNumber ?? null, bankInformation: { routingNumber: ROUTING } },
        }
      : null,
    mandateMedia: hasMandate
      ? { id: `f-${c.id}`, filename: `Three Way Mandate - ${c.name}.pdf`, createdAt: c.activated ?? c.mandateSentDate }
      : null,
  };
}

/* Deterministic per-creator history, like the sample's seededRand-based charts. */
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function monthStart(offset: number, now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() - offset, 1);
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const INCOME_TYPES = ['Recurring subscription', 'Tips', 'Message unlocks', 'Other / PPV'];

export function demoCreatorTransactions(id: number): CreatorTransaction[] {
  const c = SAMPLE_CREATORS.find((x) => x.id === id);
  if (!c?.totalIncome) return [];
  const rand = seededRand(id * 7919 + 13);
  const weights = INCOME_TYPES.map(() => 0.4 + rand());
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const monthly = [5, 4, 3, 2, 1, 0].map((m, i) => ({ m, w: (0.55 + rand() * 0.85) * (0.65 + (i / 5) * 0.7) }));
  const monthlySum = monthly.reduce((a, b) => a + b.w, 0);
  const out: CreatorTransaction[] = [];
  for (const { m, w } of monthly) {
    const monthTotal = (c.totalIncome * w) / monthlySum;
    const start = monthStart(m);
    INCOME_TYPES.forEach((subject, i) => {
      out.push({
        transactionId: `${id}-${m}-${i}`,
        transactionDate: `${iso(new Date(start.getFullYear(), start.getMonth(), 3 + i * 5))}T10:00:00Z`,
        amount: round2((monthTotal * weights[i]) / weightSum),
        transactionType: 'CREDIT',
        transactionSubType: 'CREATOR',
        subject,
      });
    });
    out.push({
      transactionId: `${id}-${m}-payout`,
      transactionDate: `${iso(new Date(start.getFullYear(), start.getMonth(), 25))}T10:00:00Z`,
      amount: -round2((monthTotal * (c.commission ?? 0)) / 100),
      transactionType: 'DEBIT',
      transactionSubType: 'CREATOR',
      subject: `ACH payment to ${c.name}`,
    });
  }
  return out.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
}

export function demoCreatorsAnalytics(): CreatorsAnalytics {
  const out: CreatorsAnalytics = {};
  for (const c of demoCreators) {
    for (const t of demoCreatorTransactions(c.id)) {
      if (t.amount <= 0) continue;
      const key = t.transactionDate.slice(0, 7);
      const agency = (t.amount * c.commissionPercentage) / 100;
      const row = (out[key] ??= { AGENCY: 0, CREATOR: 0, TOTAL: 0 });
      row.TOTAL += t.amount;
      row.AGENCY += agency;
      row.CREATOR += t.amount - agency;
    }
  }
  return out;
}

/* Account activity: this month's figures match the sample's stat cards. */
const MONTH_INCOME = 63352;
const MONTH_EXPENSE = 9381.71;
const INCOMING_COUNT = 26;
const TOTAL_BALANCE = demoAccounts.reduce((a, b) => a + b.accountBalance, 0);
const LAST_MONTH_BALANCE = round2(TOTAL_BALANCE / (1 - 0.246));

export function demoAccountsAnalytics(startDate: string, endDate: string): DailyAccountAnalytics[] {
  const rows: DailyAccountAnalytics[] = [];
  const thisMonth = iso(monthStart(0));
  const lastMonth = iso(monthStart(1));
  for (let d = new Date(`${startDate}T00:00:00`); iso(d) <= endDate; d.setDate(d.getDate() + 1)) {
    const date = iso(d);
    const inCurrent = date >= thisMonth;
    let income = 0;
    let expense = 0;
    if (date === thisMonth) {
      income = MONTH_INCOME;
      expense = MONTH_EXPENSE;
    } else if (!inCurrent && date === lastMonth) {
      income = 71250;
      expense = 12480.4;
    }
    rows.push({
      date,
      accountId: CREATORS_INCOME_ACCOUNT.id,
      income,
      expense,
      runningBalance: inCurrent ? TOTAL_BALANCE : LAST_MONTH_BALANCE,
    });
  }
  return rows;
}

function accountTx(id: string, daysAgo: number, title: string, kind: string, amount: number): AccountTransaction {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const a = CREATORS_INCOME_ACCOUNT;
  return {
    id,
    runningBalance: 0,
    amount: Math.abs(amount),
    typeOf: amount < 0 ? 2 : 1,
    transactionType: amount < 0 ? 'WITHDRAWAL' : 'DEPOSIT',
    createdAt: d.toISOString(),
    paymentDetail: { reference: title, paymentType: { name: kind } },
    account: { id: String(a.id), accountNumber: a.accountNumber, nickName: 'US Creators Income' },
  };
}

const RECENT: AccountTransaction[] = [
  accountTx('d1', 0, 'ACH IN fee transaction', 'Pay charge', -192),
  accountTx('d2', 0, '🔒 Pending transaction', 'Transfer authorization', -2483.2),
  accountTx('d3', 1, 'Incoming ACH from OF', 'External transfer', 6400),
  accountTx('d4', 1, 'ACH IN fee transaction', 'Pay charge', -126),
  accountTx('d5', 2, '🔒 Pending transaction', 'Transfer authorization', -2100),
];

export function demoAccountTransactions(accountId: number, q: { limit?: number; startDate?: string }) {
  let select: AccountTransaction[] = [];
  if (accountId === CREATORS_INCOME_ACCOUNT.id) {
    select = q.startDate
      ? Array.from({ length: INCOMING_COUNT }, (_, i) => accountTx(`in${i}`, 0, 'Incoming ACH from OF', 'External transfer', 2436.62))
      : RECENT;
  }
  select = select.slice(0, q.limit ?? 20);
  return { total: select.length, limit: q.limit ?? 20, offset: 0, select };
}

export const demoBeneficiaries: Beneficiary[] = [
  {
    id: 'r1',
    nickName: 'Jordan Media LLC',
    businessName: 'Jordan Media LLC',
    firstName: 'Alex',
    lastName: 'Jordan',
    recipientType: 'BUSINESS',
    paymentRail: { name: 'Chase Business Checking' },
    accountDetails: { accountNumber: '0219871234', accountType: 'CHECKING', bankInformation: { routingNumber: '021000021' } },
    address: { addressLine1: '1180 Avenue of the Americas', addressLine2: 'Suite 400', city: 'New York', postalCode: '10036', stateOrProvince: { label: 'New York' } },
  },
  {
    id: 'r2',
    nickName: 'Bright Star Talent',
    businessName: 'Bright Star Talent',
    firstName: 'Morgan',
    lastName: 'Blake',
    recipientType: 'BUSINESS',
    paymentRail: { name: 'Bank of America' },
    accountDetails: { accountNumber: '0356785678', accountType: 'CHECKING', bankInformation: { routingNumber: '026009593' } },
    address: { addressLine1: '8500 Sunset Blvd', addressLine2: 'Floor 12', city: 'West Hollywood', postalCode: '90069', stateOrProvince: { label: 'California' } },
  },
];

export const demoPaymentOptions: PaymentOption[] = [
  { id: 1, paymentRail: 'INTERNAL', enabled: true },
  { id: 2, paymentRail: 'ACH', enabled: true },
];
