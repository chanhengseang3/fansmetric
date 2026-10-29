// Inline SVG icons copied from the sample markup.

export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="url(#g)" />
      <path d="M9 22V10.5C9 9.67 9.67 9 10.5 9H21.5C21.5 12 19.5 13 16.5 13H13V16H19C19 18.5 17.5 19.5 14.5 19.5H13V22H9Z" fill="white" />
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#3d7fff" />
          <stop offset="1" stopColor="#17c3b2" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 } as const;

export const Icon = {
  Analytics: () => (
    <svg className="icon" viewBox="0 0 24 24" {...stroke}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 3 3 5-7" />
    </svg>
  ),
  Chat: () => (
    <svg className="icon" viewBox="0 0 24 24" {...stroke}>
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  ),
  Bolt: () => (
    <svg className="icon" viewBox="0 0 24 24" {...stroke}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  ),
  Chevron: () => (
    <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  Megaphone: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M3 11l18-5v12L3 14v-3z" />
      <path d="M7 14v5a2 2 0 002 2h1v-6" />
    </svg>
  ),
  Monitor: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  Bank: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M3 21h18M4 21V9l8-5 8 5v12M9 21v-6h6v6" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a5 5 0 015-5h4a5 5 0 015 5v2" />
      <path d="M17 8a3 3 0 010 6" />
    </svg>
  ),
  Org: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="7" width="7" height="14" />
      <rect x="14" y="3" width="7" height="18" />
      <path d="M6 11h1M6 15h1M17 7h1M17 11h1M17 15h1" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  Help: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 2-3 4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  Person: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  Lock: () => (
    <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19M12 2.5c2.5 2.6 3.8 6 3.8 9.5s-1.3 6.9-3.8 9.5c-2.5-2.6-3.8-6-3.8-9.5s1.3-6.9 3.8-9.5z" />
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  UpDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 14.5l5-5 5 5M7 9.5l5 5 5-5" />
    </svg>
  ),
  Arrow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  MetricUsers: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5S15.5 16.5 15.5 20" />
      <circle cx="17" cy="8.5" r="2.6" />
      <path d="M15 14.5c2.7.3 4.5 2 4.5 5.5" />
    </svg>
  ),
  MetricDollar: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6.5v11M15 9.2c0-1.3-1.3-2.2-3-2.2s-3 .9-3 2.2c0 1.3 1.3 1.8 3 2.2s3 .9 3 2.2c0 1.3-1.3 2.2-3 2.2s-3-.9-3-2.2" />
    </svg>
  ),
  MetricUser: () => (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </svg>
  ),
  SectionChevron: ({ open }: { open: boolean }) => (
    <svg className={'chev-icon' + (open ? ' open' : '')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
};
