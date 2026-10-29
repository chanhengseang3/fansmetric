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
  legalForm?: string;
  avatarUrl?: string | null;
  status?: string;
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

export interface AccountsResponse {
  getSavingsAccounts: SavingsAccount[];
}

export interface AccountTransaction {
  id: string;
  runningBalance: number;
  amount: number;
  typeOf: 'CREDIT' | 'DEBIT' | string;
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

export interface AccountTransactionsResponse {
  getAccountsHistory: {
    total: number;
    limit: number;
    offset: number;
    select: AccountTransaction[];
  };
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
  /** set when a mandate was sent but not yet signed (demo data only; the API has no such field) */
  mandateSentDate?: string;
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
  paymentRail?: { name?: string } | null;
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

export interface PaymentOption {
  id: number;
  paymentRail: string;
  enabled: boolean;
  identifier?: string;
}

export interface TransferAddress {
  line1?: string;
  line2?: string;
  city?: string;
  stateCode?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface CreateTransferBody {
  paymentRail: 'INTERNAL' | 'ACH';
  amount: number;
  currency: 'USD';
  reference: string;
  originator: { accountId: string };
  recipient:
    | { recipientId: string }
    | { accountId: string }
    | { accountNumber: string; name?: string }
    | {
        name: string;
        accountNumber: string;
        recipientType: 'INDIVIDUAL' | 'BUSINESS';
        accountType: 'CHECKING' | 'SAVINGS';
        bankInformation: { routingNumber: string };
        address?: TransferAddress;
      };
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
