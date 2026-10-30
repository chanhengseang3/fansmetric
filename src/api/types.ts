// Response shapes as actually returned by the Subbal Middleware services
// (several differ from the Swagger DTOs; see subbal-middleware src/*/ *.service.ts).

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface AppUser {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface Agency {
  id: number;
  displayName: string;
  legalForm?: number | string;
  avatarUrl?: string | null;
  status?: number | string;
}

export interface AgenciesResponse {
  appUser: AppUser | null;
  agency: Agency | null;
}

export interface SavingsAccount {
  id: number;
  accountNumber: string;
  accountSubType: string;
  accountBalance: number;
  availableBalance: number;
  parentAccountId: number | null;
  savingsProductName?: string;
  nickName?: string | null;
  currency?: { code: string };
  client?: { id: number; displayName?: string };
  status?: string;
  submittedOn?: string;
}

/** List endpoints return `{ items, total }`, some with extra paging fields. */
export interface List<T> {
  items: T[];
  total: number;
}

export interface AccountTransaction {
  id: string;
  runningBalance: number;
  amount: number;
  typeOf: number | string; // numeric code on staging; direction is transactionType
  createdAt: string;
  valueDate?: string;
  account?: { id: string; accountNumber: string; nickName?: string | null };
  paymentDetail?: {
    reference?: string | null;
    paymentType?: { name?: string | null } | null;
    creditor?: { name?: string | null } | null;
    debtor?: { name?: string | null } | null;
  } | null;
  transactionSubType?: string | null;
  transactionType?: string | null;
  type?: string | null;
}

export interface AccountTransactions extends List<AccountTransaction> {
  limit: number;
  offset: number;
}

export interface DailyAccountAnalytics {
  date: string;
  accountId: number;
  income: number;
  expense: number;
  runningBalance: number;
}

/** keyed by YYYY-MM */
export type CreatorsAnalytics = Record<string, { AGENCY: number; CREATOR: number; TOTAL: number }>;

export interface Creator {
  id: number;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string | null;
  status?: string;
  submittedOn?: string;
  accounts?: { id: number; accountNo: string; availableBalance: number; parentAccountId?: number | null }[];
  // DynamoDB mandate record (present once the creator has a sub-balance)
  creatorId?: string;
  creatorName?: string;
  creatorEmail?: string;
  creatorSubAccountId?: string;
  creatorAccountNo?: string;
  lastPaymentDate?: string;
  /** agency share, 0-100 */
  commissionPercentage: number;
  commissionEarned: number;
  balance: number;
  totalAmountReceived: number;
  totalPaidToCreator: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  current_page: number;
  total_pages: number;
}

export interface Mandate {
  id: string;
  recipientType?: string;
  paymentRail?: { id: string; name: string } | string | null;
  splitPercentage?: number | null;
  feeType?: string | null;
  emailAddress?: string | null;
  accountDetails?: {
    accountNumber?: string | null;
    accountType?: string | null;
    bankInformation?: { routingNumber?: string | null } | null;
  } | null;
}

export interface MandateMedia {
  id: string;
  name?: string;
  filename?: string;
  createdAt?: string;
}

export interface CreatorDetail {
  id: number;
  emailAddress?: string | null;
  firstName?: string;
  lastName?: string;
  status?: string;
  submittedOn?: string;
  accounts?: { id: number; accountNo: string; accountSubType?: string; availableBalance?: number }[];
  mandate: Mandate | null;
  mandateMedia: MandateMedia | null;
}

export interface CreatorTransaction {
  transactionId: string;
  transactionDate: string;
  amount: number;
  currency?: string;
  type?: string;
  transactionType?: string;
  transactionSubType?: string;
  subject?: string;
}

export interface Beneficiary {
  id: string;
  nickName?: string | null;
  businessName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  recipientType?: string | null;
  /** rail name, e.g. ACH */
  paymentRail?: string | null;
  accountDetails?: {
    accountNumber?: string | null;
    accountType?: string | null;
    bankInformation?: { routingNumber?: string | null } | null;
  } | null;
  address?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    stateOrProvince?: { label?: string; identifier?: string } | null;
    country?: { label?: string; identifier?: string } | null;
  } | null;
}

export interface TransferQuote {
  paymentRail: string;
  amount: number;
  currency: string;
  fee: number;
  totalDebit: number;
  estimatedArrival: { minBusinessDays: number; maxBusinessDays: number } | null;
}

interface TransferBase {
  accountId: string;
  amount: number;
  reference?: string;
}

export interface AchTransferBody extends TransferBase {
  recipient: {
    name: string;
    accountNumber: string;
    routingNumber: string;
    accountType: 'CHECKING' | 'SAVINGS';
    recipientType: 'INDIVIDUAL' | 'BUSINESS';
  };
}

export interface InternalTransferBody extends TransferBase {
  recipient: { accountId: string } | { accountNumber: string };
}

export interface FundEmployeesBody {
  reference?: string;
  allocations: { subAccountId: number; amount: number }[];
}

/** API path (under /api/v1) and body for one of the transfer endpoints. */
export type TransferRequest =
  | { path: 'transfers/ach'; body: AchTransferBody }
  | { path: 'transfers/internal'; body: InternalTransferBody }
  | { path: `transfers/beneficiary/${string}`; body: TransferBase }
  | { path: `accounts/${string}/employee-accounts/fund`; body: FundEmployeesBody };

export interface EmployeeAccount {
  id: number;
  accountNo: string;
  nickName?: string | null;
  status?: string;
  availableBalance?: number;
  card?: { id: number; network?: string; status?: string } | null;
  user?: { id: number; firstname?: string; lastname?: string; email?: string } | null;
}

export interface AccountProduct {
  id: number;
  name: string;
  shortName?: string;
  description?: string | null;
  currency?: { code: string };
}

export interface Notification {
  id: string;
  type: 'PAYMENT_RECEIVED' | 'PAYMENT_SENT';
  title: string;
  body: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface NotificationsResponse {
  items: Notification[];
  unreadCount: number;
}

export interface CreateMandateBody {
  paymentRail: 'ACH';
  splitPercentage: number;
  feeType?: 'STANDARD_SPLIT' | 'AGENCY_FULL_SPLIT';
  primaryAccountId: number;
  accountDetails: {
    accountNumber: string;
    accountType: 'CHECKING' | 'SAVINGS';
    bankInformation: { routingNumber: string };
  };
}
