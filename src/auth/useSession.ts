import { useEffect, useState } from 'react';
import { getSession, onSessionChange } from '../api/client';

export function useSession() {
  const [session, setSession] = useState(getSession);
  useEffect(() => {
    const off = onSessionChange(setSession);
    return () => {
      off();
    };
  }, []);
  return session;
}
