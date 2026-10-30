import { apiDownload, apiGet, apiPost, ApiError, getSession } from './client';
import * as demo from './demo';
import type {
  AccountsResponse,
  AccountTransactionsResponse,
  AgenciesResponse,
  Beneficiary,
  CreateMandateBody,
  CreateTransferBody,
  Creator,
  CreatorDetail,
  CreatorsAnalytics,
  CreatorTransaction,
  DailyAccountAnalytics,
  Paged,
  PaymentOption,
} from './types';

/** No SUBBAL session: serve the sample data so the app still looks like the concept. */
export const isDemo = () => !getSession();

const later = <T,>(value: T, ms = 150) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const paged = <T,>(items: T[]): Paged<T> => ({ items, total: items.length, current_page: 1, total_pages: 1 });

export const getMe = () => (isDemo() ? later(demo.demoMe) : apiGet<AgenciesResponse>('agencies'));

export const getAccounts = async () =>
  isDemo()
    ? later(demo.demoAccounts)
    : ((await apiGet<AccountsResponse>('accounts')).getSavingsAccounts ?? []).filter((a) => a.status !== 'CLOSED');

export const getAccountTransactions = async (accountId: number, q: { limit?: number; startDate?: string; endDate?: string } = {}) =>
  isDemo()
    ? later(demo.demoAccountTransactions(accountId, q))
    : (await apiGet<AccountTransactionsResponse>(`accounts/${accountId}/transactions`, q)).getAccountsHistory;

// The middleware returns nothing unless accountIds is sent explicitly.
export const getAccountsAnalytics = (startDate: string, endDate: string, accountIds: number[]) =>
  isDemo()
    ? later(demo.demoAccountsAnalytics(startDate, endDate))
    : apiGet<DailyAccountAnalytics[]>('agencies/me/accounts/analytics', { startDate, endDate, accountIds: accountIds.join(',') });

export const getCreatorsAnalytics = (startDate: string, endDate: string, accountIds: number[]) =>
  isDemo()
    ? later(demo.demoCreatorsAnalytics())
    : apiGet<CreatorsAnalytics>('agencies/me/creators/analytics', { startDate, endDate, accountIds: accountIds.join(',') });

export const getCreators = () => (isDemo() ? later(paged(demo.demoCreators)) : apiGet<Paged<Creator>>('creators', { page: 1, limit: 200 }));

export const getCreatorDetail = (id: number) => (isDemo() ? later(demo.demoCreatorDetail(id)) : apiGet<CreatorDetail>(`creators/${id}`));

export const getCreatorTransactions = (id: number, q: { dateFrom?: string; dateTo?: string } = {}) =>
  isDemo()
    ? later(paged(demo.demoCreatorTransactions(id)))
    : apiGet<Paged<CreatorTransaction>>(`creators/${id}/transactions`, { page: 1, limit: 200, ...q });

export const createCreator = (body: { firstname: string; lastname: string; emailAddress: string }) =>
  isDemo() ? later({ client: { id: -1 } }, 500) : apiPost<{ client: { id: number } }>('creators', body);

export const createMandate = (creatorId: number, body: CreateMandateBody) =>
  isDemo() ? later({ id: 'demo' }, 500) : apiPost<{ id: string }>(`creators/${creatorId}/mandates`, body);

export const getBeneficiaries = (agencyId: number) =>
  isDemo() ? later(demo.demoBeneficiaries) : apiGet<Beneficiary[]>(`agencies/${agencyId}/beneficiaries`);

export const getTransferOptions = async (clientId: number) =>
  isDemo()
    ? later(demo.demoPaymentOptions)
    : ((await apiGet<{ paymentOptions: PaymentOption[] }>('transfers/options', { clientId })).paymentOptions ?? []);

export const createTransfer = (body: CreateTransferBody) =>
  isDemo() ? later({ createPayment: { id: 'demo' } }, 500) : apiPost<{ createPayment: { id: string } }>('transfers', body);

const demoDownload = () => Promise.reject(new ApiError(401, 'Sign in to SUBBAL to download statements'));

export const downloadStatement = (accountNumber: string, startDate: string, endDate: string, outputType: 'PDF' | 'CSV') =>
  isDemo()
    ? demoDownload()
    : apiDownload('accounts/statement', { accountNumber, startDate, endDate, outputType }, `statement-${accountNumber}.${outputType.toLowerCase()}`);

export const downloadCreatorReport = (
  creatorId: number,
  dateFrom: string,
  dateTo: string,
  format: 'pdf' | 'csv',
  reportType: 'earningsReport' | 'transactionsReport',
) =>
  isDemo()
    ? demoDownload()
    : apiDownload(`creators/${creatorId}/report`, { dateFrom, dateTo, format, reportType }, `creator-${creatorId}-${reportType}.${format}`);
