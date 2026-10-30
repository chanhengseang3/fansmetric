import { apiDownload, apiGet, apiPost } from './client';
import type {
  AccountProduct,
  AccountTransactions,
  AgenciesResponse,
  Beneficiary,
  CreateMandateBody,
  Creator,
  CreatorDetail,
  CreatorsAnalytics,
  CreatorTransaction,
  EmployeeAccount,
  List,
  NotificationsResponse,
  Paged,
  SavingsAccount,
  TransferQuote,
  TransferRequest,
} from './types';

export const getMe = () => apiGet<AgenciesResponse>('agencies');

export const getAccounts = async () =>
  (await apiGet<List<SavingsAccount>>('accounts')).items.filter((a) => a.status !== 'CLOSED');

export const getAccountTransactions = (accountId: number, q: { limit?: number; startDate?: string; endDate?: string } = {}) =>
  apiGet<AccountTransactions>(`accounts/${accountId}/transactions`, q);

export const getAccountProducts = async () => (await apiGet<List<AccountProduct>>('accounts/products')).items;

export const openAccount = (body: { productId: number; nickName?: string }) => apiPost<{ id: number }>('accounts', body);

export const getEmployeeAccounts = async (accountId: string) =>
  (await apiGet<List<EmployeeAccount>>(`accounts/${accountId}/employee-accounts`, { limit: 200 })).items;

export const getCreatorsAnalytics = (startDate: string, endDate: string, accountIds: number[]) =>
  apiGet<CreatorsAnalytics>('agencies/me/creators/analytics', { startDate, endDate, accountIds: accountIds.join(',') });

export const getCreators = () => apiGet<Paged<Creator>>('creators', { page: 1, limit: 200 });

export const getCreatorDetail = (id: number) => apiGet<CreatorDetail>(`creators/${id}`);

export const getCreatorTransactions = (id: number, q: { dateFrom?: string; dateTo?: string } = {}) =>
  apiGet<Paged<CreatorTransaction>>(`creators/${id}/transactions`, { page: 1, limit: 200, ...q });

export const createCreator = (body: { firstname: string; lastname: string; emailAddress: string }) =>
  apiPost<{ client: { id: number } }>('creators', body);

export const createMandate = (creatorId: number, body: CreateMandateBody) =>
  apiPost<{ resourceId: string }>(`creators/${creatorId}/mandates`, body);

export const getBeneficiaries = async (agencyId: number) =>
  (await apiGet<List<Beneficiary>>(`agencies/${agencyId}/beneficiaries`)).items;

/** Rails the client can use; disabled ones are left out by the middleware. */
export const getTransferOptions = async (clientId: number) =>
  (await apiGet<List<string>>('transfers/options', { clientId })).items;

export const getTransferQuote = (accountId: string, paymentRail: string, amount: number) =>
  apiGet<TransferQuote>('transfers/quote', { accountId, paymentRail, amount, currency: 'USD' });

export const sendTransfer = (r: TransferRequest) => apiPost<{ createPayment?: { id: string } }>(r.path, r.body);

export const uploadTransferAttachment = (transferId: string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return apiPost<{ resourceId?: number }>(`transfers/${transferId}/attachments`, form);
};

export const getNotifications = (since?: string) => apiGet<NotificationsResponse>('notifications', { since });

export const downloadStatement = (accountNumber: string, startDate: string, endDate: string, outputType: 'PDF' | 'CSV') =>
  apiDownload('accounts/statement', { accountNumber, startDate, endDate, outputType }, `statement-${accountNumber}.${outputType.toLowerCase()}`);

export const downloadCreatorReport = (
  creatorId: number,
  dateFrom: string,
  dateTo: string,
  format: 'pdf' | 'csv',
  reportType: 'earningsReport' | 'transactionsReport',
) => apiDownload(`creators/${creatorId}/report`, { dateFrom, dateTo, format, reportType }, `creator-${creatorId}-${reportType}.${format}`);
