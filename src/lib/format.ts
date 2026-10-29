/** Port of the sample's `fmt`: `$1,234.50`, or `—` for missing values. */
export function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Signed money, e.g. `+$6,400.00` / `-$192.00`. */
export function fmtSigned(n: number): string {
  return (n < 0 ? '-' : '+') + fmt(Math.abs(n));
}

/** `Sep 16, 2026` */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  // date-only strings are calendar dates; don't let the timezone shift them
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** `YYYY-MM-DD` in local time. */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

/** `•••• 1317000` */
export function maskAccount(accountNumber: string | null | undefined): string {
  if (!accountNumber) return '';
  return '•••• ' + accountNumber.slice(-7);
}

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}
