import { createContext, useContext, type ReactNode } from 'react';
import { getSession } from '../../api/client';
import { getAccounts, getCreators, getMe } from '../../api/endpoints';
import type { AgenciesResponse, Creator, Paged, SavingsAccount } from '../../api/types';
import { useAsync, type AsyncState } from '../../hooks/useAsync';

interface BankingData {
  me: AsyncState<AgenciesResponse>;
  accounts: AsyncState<SavingsAccount[]>;
  creators: AsyncState<Paged<Creator>>;
}

const Ctx = createContext<BankingData | null>(null);

// resolves to no data, which AsyncState.data already allows
const signedOut = () => Promise.resolve(undefined as never);

/**
 * Data shared across the shell and several Banking tabs, loaded once per SUBBAL session.
 * Signed out, it stays empty; App remounts it when the session changes.
 */
export function BankingDataProvider({ children }: { children: ReactNode }) {
  const live = !!getSession();
  const me = useAsync(live ? getMe : signedOut, []);
  const accounts = useAsync(live ? getAccounts : signedOut, []);
  const creators = useAsync(live ? getCreators : signedOut, []);
  return <Ctx.Provider value={{ me, accounts, creators }}>{children}</Ctx.Provider>;
}

export function useBanking(): BankingData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBanking must be used inside BankingDataProvider');
  return v;
}
