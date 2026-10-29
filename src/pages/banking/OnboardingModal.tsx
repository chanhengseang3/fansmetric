import { useEffect, useState } from 'react';
import { createCreator, createMandate, isDemo } from '../../api/endpoints';
import type { Creator } from '../../api/types';
import { SplitDonut } from '../../components/charts';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { accountName, creatorName } from '../../lib/mappers';
import { useBanking } from './BankingData';

export type OnboardingTarget = { kind: 'new' } | { kind: 'existing'; creator: Creator };

interface Form {
  firstname: string;
  lastname: string;
  email: string;
  agencyPct: number;
  primaryAccountId: string;
  accountNumber: string;
  routingNumber: string;
  accountType: 'CHECKING' | 'SAVINGS';
}

const EMPTY: Form = {
  firstname: '',
  lastname: '',
  email: '',
  agencyPct: 50,
  primaryAccountId: '',
  accountNumber: '',
  routingNumber: '',
  accountType: 'CHECKING',
};

export function OnboardingModal({ target, onClose }: { target: OnboardingTarget | null; onClose: () => void }) {
  return (
    <Modal open={!!target} onClose={onClose}>
      {target && <Wizard target={target} onClose={onClose} />}
    </Modal>
  );
}

function Wizard({ target, onClose }: { target: OnboardingTarget; onClose: () => void }) {
  const toast = useToast();
  const { accounts, creators } = useBanking();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const accountList = accounts.data ?? [];
  useEffect(() => {
    if (!form.primaryAccountId && accountList[0]) set('primaryAccountId', String(accountList[0].id));
  }, [accountList, form.primaryAccountId]);

  const isNew = target.kind === 'new';
  const name = isNew ? [form.firstname, form.lastname].filter(Boolean).join(' ') || 'a creator' : creatorName(target.creator);
  const email = isNew ? form.email : target.creator.creatorEmail;
  const creatorPct = 100 - form.agencyPct;

  function next() {
    setError('');
    if (step === 1 && isNew) {
      if (!form.firstname.trim() || !form.lastname.trim()) return setError('Enter the creator’s first and last name.');
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Enter a valid email address.');
    }
    if (step === 2) {
      if (!form.primaryAccountId) return setError('Select the agency account for this sub-balance.');
      if (!form.accountNumber.trim()) return setError('Enter the creator’s payout account number.');
      if (!/^\d{9}$/.test(form.routingNumber.trim())) return setError('ACH routing number must be 9 digits.');
    }
    setStep((s) => Math.min(4, s + 1));
  }

  async function send() {
    setError('');
    setBusy(true);
    try {
      let creatorId: number;
      if (target.kind === 'existing') {
        creatorId = target.creator.id;
      } else {
        const created = await createCreator({
          firstname: form.firstname.trim(),
          lastname: form.lastname.trim(),
          emailAddress: form.email.trim(),
        });
        creatorId = created.client.id;
      }
      await createMandate(creatorId, {
        paymentRail: 'ACH',
        splitPercentage: form.agencyPct,
        feeType: 'STANDARD_SPLIT',
        primaryAccountId: Number(form.primaryAccountId),
        accountDetails: {
          accountNumber: form.accountNumber.trim(),
          accountType: form.accountType,
          bankInformation: { routingNumber: form.routingNumber.trim() },
        },
      });
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the mandate');
    } finally {
      setBusy(false);
    }
  }

  function finish() {
    creators.reload();
    onClose();
    toast(isDemo() ? `Mandate flow completed — sample data, nothing was sent` : `Mandate sent to ${name}`);
  }

  return (
    <>
      <div className="stepper">
        {[1, 2, 3, 4].map((s) => (
          <span key={s} className={'step-dot ' + (step > s ? 'done' : step === s ? 'current' : '')}></span>
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="onb-icon">🏦</div>
          <h2>Add a creator account &amp; revenue split</h2>
          <p className="muted-text">
            You're about to start the SUBBAL banking setup for <strong>{name}</strong>. The agency's SUBBAL relationship is already active — this
            creates {name}'s dedicated sub-balance and revenue-split mandate.
          </p>
          {isNew && (
            <>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-field">
                  <label>First name*</label>
                  <input value={form.firstname} onChange={(e) => set('firstname', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Last name*</label>
                  <input value={form.lastname} onChange={(e) => set('lastname', e.target.value)} />
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-field">
                  <label>Email*</label>
                  <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
                </div>
              </div>
            </>
          )}
          <ul className="onb-list">
            <li>Define the revenue split between agency and creator</li>
            <li>Generate a co-branded mandate agreement</li>
            <li>Send it to the creator for e-signature</li>
          </ul>
          {error && <div className="form-error">{error}</div>}
          <button className="action-btn primary full" onClick={next}>Get started →</button>
        </>
      )}

      {step === 2 && (
        <>
          <h2>Define the revenue split</h2>
          <p className="muted-text">Set the percentage split between the agency and {name}. This determines how each OnlyFans payout is divided.</p>
          <div className="split-editor">
            <SplitDonut business={form.agencyPct} emphasize />
            <input type="range" min={0} max={100} value={form.agencyPct} onChange={(e) => set('agencyPct', Number(e.target.value))} />
          </div>
          <div className="form-divider-title">Creator payout account</div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-field">
              <label>Account number*</label>
              <input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} />
            </div>
            <div className="form-field">
              <label>ACH routing number*</label>
              <input value={form.routingNumber} inputMode="numeric" maxLength={9} onChange={(e) => set('routingNumber', e.target.value)} />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-field">
              <label>Bank account type*</label>
              <select value={form.accountType} onChange={(e) => set('accountType', e.target.value as Form['accountType'])}>
                <option value="CHECKING">CHECKING</option>
                <option value="SAVINGS">SAVINGS</option>
              </select>
            </div>
            <div className="form-field">
              <label>Agency account*</label>
              <select value={form.primaryAccountId} onChange={(e) => set('primaryAccountId', e.target.value)}>
                {accountList.map((a) => (
                  <option key={a.id} value={a.id}>{accountName(a)}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="btn-row">
            <button className="action-btn" onClick={() => setStep(1)}>Back</button>
            <button className="action-btn primary" onClick={next}>Continue →</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2>Review &amp; send mandate</h2>
          <p className="muted-text">A co-branded mandate is generated so {name} immediately recognizes the request as coming from their agency, via FansMetric.</p>
          <div className="mandate-preview">
            <div className="mandate-badges">
              <span className="badge-fm">FansMetric</span>
              <span className="plus">+</span>
              <span className="badge-subbal-solo">SUBBAL</span>
            </div>
            <div className="mandate-doc">
              <div className="mandate-doc-line"></div>
              <div className="mandate-doc-line short"></div>
              <div className="mandate-doc-split">Business {form.agencyPct}% · Creator {creatorPct}%</div>
              <div className="mandate-doc-line"></div>
              <div className="mandate-doc-line short"></div>
            </div>
            <p className="muted-text small" style={{ marginTop: 10 }}>
              {email ? (
                <>Will be sent to <strong>{email}</strong> for e-signature.</>
              ) : (
                <>Will be sent to the creator's email on file for e-signature.</>
              )}
            </p>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="btn-row">
            <button className="action-btn" onClick={() => setStep(2)} disabled={busy}>Back</button>
            <button className="action-btn primary" onClick={send} disabled={busy}>
              {busy ? 'Sending…' : 'Send for signature →'}
            </button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div className="onb-icon success">✓</div>
          <h2>Mandate sent</h2>
          <p className="muted-text">
            {name} will receive a co-branded email to review and sign the revenue-split mandate. Once signed, their SUBBAL sub-balance and payout
            details will appear directly on their FansMetric profile automatically.
          </p>
          <button className="action-btn primary full" onClick={finish}>Done</button>
        </>
      )}
    </>
  );
}
