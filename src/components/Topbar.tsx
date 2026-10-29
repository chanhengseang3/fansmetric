import { useEffect, useRef, useState } from 'react';
import { logout } from '../api/client';
import { isDemo } from '../api/endpoints';
import { initials } from '../lib/format';
import { useBanking } from '../pages/banking/BankingData';
import { Icon } from './icons';
import { useToast } from './Toast';

export function Topbar({ onToggleTheme, onSignIn }: { onToggleTheme: () => void; onSignIn: () => void }) {
  const toast = useToast();
  const { me, creators } = useBanking();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const user = me.data?.appUser;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || '';
  const count = creators.data?.total;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <header className="topbar">
      <div className="acct-pill">
        <Icon.Person />
        Select accounts {count != null && <span className="count">· {count} selected</span>}
      </div>
      <button className="icon-btn" onClick={() => toast('Notifications — demo only')} aria-label="Notifications">
        <Icon.Bell />
        <span className="badge-dot">2</span>
      </button>
      <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme" aria-label="Toggle theme">
        <Icon.Moon />
      </button>
      <div className="user-menu-wrap" ref={menuRef}>
        <button className="avatar-user" onClick={() => setMenuOpen((o) => !o)} title={fullName} aria-haspopup="menu">
          {fullName ? initials(fullName) : '··'}
        </button>
        {menuOpen && (
          <div className="user-menu" role="menu">
            <div className="user-menu-head">
              <strong>{fullName || 'Signed in'}</strong>
              {isDemo() && <span className="muted-text">Viewing sample data</span>}
              {user?.email && <span className="muted-text">{user.email}</span>}
              {me.data?.agency && <span className="muted-text">{me.data.agency.displayName}</span>}
            </div>
            {isDemo() ? (
              <button
                className="user-menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSignIn();
                }}
              >
                <Icon.Bank />
                Sign in to SUBBAL
              </button>
            ) : (
              <button className="user-menu-item" role="menuitem" onClick={() => logout()}>
                <Icon.Logout />
                Sign out of SUBBAL
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
