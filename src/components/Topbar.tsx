import { useEffect, useRef, useState } from 'react';
import { logout } from '../api/client';
import { getNotifications } from '../api/endpoints';
import { useSession } from '../auth/useSession';
import { useAsync } from '../hooks/useAsync';
import { fmtDate, fmtSigned, initials } from '../lib/format';
import { useBanking } from '../pages/banking/BankingData';
import { Icon } from './icons';

// the middleware keeps no read state: we store when the feed was last opened and send it as `since`
const SEEN_KEY = 'fm.notificationsSeen';

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Closes the popup on any mousedown outside `ref`. */
function useClickAway(open: boolean, setOpen: (open: boolean) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, setOpen]);
  return ref;
}

export function Topbar({ onToggleTheme }: { onToggleTheme: () => void }) {
  const subbal = !!useSession();
  const { me, creators } = useBanking();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [seen, setSeen] = useState(readSeen);
  const menuRef = useClickAway(menuOpen, setMenuOpen);
  const bellRef = useClickAway(bellOpen, setBellOpen);
  // the feed is SUBBAL banking activity, so it needs the Banking sign-in
  const feed = useAsync(() => (subbal ? getNotifications(seen) : Promise.resolve(undefined)), [seen, subbal]);

  const user = me.data?.appUser;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || '';
  const count = creators.data?.total;
  const unread = feed.data?.unreadCount ?? 0;

  function toggleBell() {
    if (!bellOpen && unread) {
      const now = new Date().toISOString();
      try {
        localStorage.setItem(SEEN_KEY, now);
      } catch {
        // storage unavailable: unread state resets on reload
      }
      // refetch clears the badge; the items stay, `since` only changes unreadCount
      setSeen(now);
    }
    setBellOpen((o) => !o);
  }

  return (
    <header className="topbar">
      <div className="acct-pill">
        <Icon.Person />
        Select accounts {count != null && <span className="count">· {count} selected</span>}
      </div>
      {subbal && (
        <div className="user-menu-wrap" ref={bellRef}>
          <button className="icon-btn" onClick={toggleBell} aria-label="Notifications" aria-haspopup="menu">
            <Icon.Bell />
            {unread > 0 && <span className="badge-dot">{unread > 99 ? '99+' : unread}</span>}
          </button>
          {bellOpen && (
            <div className="user-menu notif-menu" role="menu">
              <div className="user-menu-head">
                <strong>Notifications</strong>
              </div>
              {feed.loading && !feed.data && <p className="muted-text notif-empty">Loading…</p>}
              {feed.error && <p className="form-error">{feed.error.message}</p>}
              {feed.data?.items.length === 0 && <p className="muted-text notif-empty">No recent activity</p>}
              {feed.data?.items.map((n) => (
                <div className="notif-item" key={n.id}>
                  <div>
                    <strong>{n.title}</strong>
                    <div className="creator-sub">{[n.body, fmtDate(n.createdAt)].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span className={n.type === 'PAYMENT_SENT' ? 'neg' : 'pos'}>
                    {fmtSigned(n.type === 'PAYMENT_SENT' ? -Math.abs(n.amount) : Math.abs(n.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
              <strong>{fullName || 'FansMetric'}</strong>
              {user?.email && <span className="muted-text">{user.email}</span>}
              {me.data?.agency && <span className="muted-text">{me.data.agency.displayName}</span>}
              {!subbal && <span className="muted-text">SUBBAL not connected · sign in from Banking</span>}
            </div>
            {subbal && (
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
