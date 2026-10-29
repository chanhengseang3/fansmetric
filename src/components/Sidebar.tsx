import { Fragment, type ReactNode } from 'react';
import { Icon, LogoMark } from './icons';

export type PageId = 'analytics' | 'banking' | 'placeholder';

interface Props {
  activeKey: string | null;
  onNavigate: (page: PageId, label: string | null, key: string) => void;
}

export function Sidebar({ activeKey, onNavigate }: Props) {
  const link = (key: string, page: PageId, label: string | null, children: ReactNode, className = 'nav-link') => (
    <button className={className + (activeKey === key ? ' active' : '')} onClick={() => onNavigate(page, label, key)}>
      {children}
    </button>
  );
  const sub = (labels: string[]) => labels.map((l) => <Fragment key={l}>{link(l, 'placeholder', l, l)}</Fragment>);

  return (
    <aside className="sidebar">
      <div className="logo-row">
        <LogoMark />
        <span className="logo-word">FansMetric</span>
      </div>

      <nav className="nav-scroll">
        <details className="nav-group" open>
          <summary>
            <Icon.Analytics />
            Analytics
            <Icon.Chevron />
          </summary>
          <div className="nav-sub">
            {link('kpi', 'analytics', null, 'KPI Report')}
            {link('fans', 'analytics', null, 'Fans')}
          </div>
        </details>

        <details className="nav-group">
          <summary>
            <Icon.Chat />
            Chatting
            <Icon.Chevron />
          </summary>
          <div className="nav-sub">{sub(['Smart Messages', 'Chat Analytics', 'Message Log', 'Scripts'])}</div>
        </details>

        {link('Marketing', 'placeholder', 'Marketing', <><Icon.Megaphone />Marketing</>)}

        <details className="nav-group">
          <summary>
            <Icon.Bolt />
            Automations
            <Icon.Chevron />
          </summary>
          <div className="nav-sub">{sub(['Auto Lists', 'Auto Follow', 'Welcome Sequences'])}</div>
        </details>

        {link('Open OnlyFans', 'placeholder', 'Open OnlyFans', <><Icon.Monitor />Open OnlyFans</>)}

        <div className="nav-divider"></div>

        <div className="nav-banking-wrap">
          {link('banking', 'banking', null, <><Icon.Bank />Banking<span className="nav-new-badge">NEW</span></>)}
        </div>

        <div className="nav-divider"></div>

        {link('Accounts', 'placeholder', 'Accounts', <><Icon.Users />Accounts</>)}
        {link('Organization', 'placeholder', 'Organization', <><Icon.Org />Organization</>)}
        {link('Settings', 'placeholder', 'Settings', <><Icon.Settings />Settings</>)}
      </nav>

      <div className="sidebar-footer">
        {link('Help Center', 'placeholder', 'Help Center', <><Icon.Help />Help Center</>, 'nav-link help-link')}
      </div>
    </aside>
  );
}
