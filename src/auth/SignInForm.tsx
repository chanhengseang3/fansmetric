import { useState, type FormEvent } from 'react';
import { login } from '../api/client';
import { LogoMark } from '../components/icons';

/** SUBBAL sign-in form; the Banking page opens it in a modal from its "Connect to SUBBAL" button. */
export function SignInForm({ onSignedIn }: { onSignedIn?: () => void }) {
  const [username, setUsername] = useState(import.meta.env.VITE_DEFAULT_USERNAME ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
      onSignedIn?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <div className="logo-row" style={{ padding: '0 0 6px' }}>
        <LogoMark />
        <span className="logo-word">FansMetric</span>
      </div>
      <h2>
        Sign in{' '}
        <span className="badge-subbal">
          <span className="dot-mark"></span>Powered by SUBBAL
        </span>
      </h2>
      <p className="muted-text">Banking runs on SUBBAL. Sign in with your SUBBAL agency credentials to continue.</p>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="username">Username</label>
          <input id="username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus={!!username}
          />
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <button className="action-btn primary full" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
