import { useCallback, useEffect, useState } from 'react';
import { useSession } from './auth/useSession';
import { Sidebar, type PageId } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BankingPage } from './pages/banking/BankingPage';
import { BankingDataProvider } from './pages/banking/BankingData';
import { PlaceholderPage } from './pages/PlaceholderPage';

const THEME_KEY = 'fm.theme';

function useTheme() {
  const [light, setLight] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'light';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.body.classList.toggle('light', light);
    try {
      localStorage.setItem(THEME_KEY, light ? 'light' : 'dark');
    } catch {
      // storage unavailable
    }
  }, [light]);
  return () => setLight((l) => !l);
}

export function App() {
  const session = useSession();
  const toggleTheme = useTheme();
  const [page, setPage] = useState<{ id: PageId; label: string | null; key: string | null }>({
    id: 'analytics',
    label: null,
    key: null,
  });

  const navigate = useCallback((id: PageId, label: string | null, key: string | null) => {
    setPage({ id, label, key });
    window.scrollTo(0, 0);
  }, []);
  const openBanking = useCallback(() => navigate('banking', null, 'banking'), [navigate]);

  return (
    // remount the SUBBAL data layer on sign-in / sign-out
    <BankingDataProvider key={session ? 'subbal' : 'signed-out'}>
      <div className="app">
        <Sidebar activeKey={page.key} onNavigate={navigate} />
        <div className="main">
          <Topbar onToggleTheme={toggleTheme} />
          <div className="content">
            {page.id === 'analytics' && <AnalyticsPage onOpenBanking={openBanking} />}
            {page.id === 'banking' && <BankingPage />}
            {page.id === 'placeholder' && <PlaceholderPage title={page.label ?? 'Section'} onOpenBanking={openBanking} />}
          </div>
        </div>
      </div>
    </BankingDataProvider>
  );
}
