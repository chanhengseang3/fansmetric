import { useState, type ReactNode } from 'react';
import {
  getBeneficiaries,
  getEmployeeAccounts,
  getTransferOptions,
  getTransferQuote,
  sendTransfer,
  uploadTransferAttachment,
} from '../../api/endpoints';
import { Icon } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { useAsync } from '../../hooks/useAsync';
import { fmt } from '../../lib/format';
import {
  accountToPickerItem,
  achRecipientName,
  beneficiaryToPickerItem,
  buildTransferBody,
  fieldsFromBeneficiary,
  type PickerItem,
  type TransferFields,
  type TransferSubtype,
  type TransferType,
} from '../../lib/mappers';
import { AccountPicker } from './AccountPicker';
import { useBanking } from './BankingData';

const STEP_LABELS = ['Transfer Type', 'Select Transfer', 'Transfer Details', 'Confirm Details'];
const TYPE_LABEL: Record<TransferType, string> = {
  internal: 'Internal Transfer',
  fund: 'Fund employee account(s)',
  external: 'External Transfer',
};
const SUBTYPE_LABEL: Record<TransferSubtype, string> = {
  between: 'Transfer between your accounts',
  crb: 'Transfer to another client of SUBBAL',
  ach: 'ACH Transfer',
};
const ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
// shortcut: the middleware takes 10 MB, but Vercel Functions (our proxy) cap request bodies at 4.5 MB
const ATTACHMENT_MAX_BYTES = 4.5 * 1024 * 1024;

type PickerTarget = 'debitAccount' | 'internalRecipient' | 'recipientContact';

interface State {
  step: number;
  type: TransferType | null;
  subtype: TransferSubtype | null;
  fields: TransferFields;
  collapsed: Record<string, boolean>;
  attachment: File | null;
}

const INITIAL: State = { step: 1, type: null, subtype: null, fields: {}, collapsed: {}, attachment: null };

export function TransfersTab() {
  const toast = useToast();
  const { me, accounts } = useBanking();
  const agencyId = me.data?.agency?.id;
  const [s, setS] = useState<State>(INITIAL);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const f = s.fields;

  const options = useAsync(() => (agencyId != null ? getTransferOptions(agencyId) : Promise.resolve(null)), [agencyId]);
  const recipients = useAsync(
    async () =>
      picker === 'recipientContact' && agencyId != null
        ? // the ACH flow only offers beneficiaries saved on the ACH rail
          (await getBeneficiaries(agencyId)).filter(
            (b) => (b.recipientType ?? '').toUpperCase() !== 'CONTRACTUAL_SPLIT' && (!b.paymentRail || b.paymentRail === 'ACH'),
          )
        : null,
    [picker === 'recipientContact', agencyId],
  );
  const employees = useAsync(
    () => (s.type === 'fund' && f.debitAccount ? getEmployeeAccounts(f.debitAccount.id) : Promise.resolve(null)),
    [s.type, f.debitAccount?.id],
  );
  const quoteRail = s.subtype === 'ach' ? 'ACH' : s.type === 'internal' ? 'INTERNAL' : null;
  const quote = useAsync(
    () =>
      s.step === 4 && quoteRail && f.debitAccount
        ? getTransferQuote(f.debitAccount.id, quoteRail, Number(f.amount))
        : Promise.resolve(null),
    [s.step],
  );

  // until the options load (or if they fail) every rail is offered; the transfer endpoint has the final say.
  // Staging returns Core labels ("Ach Outgoing Credit", "Internal Credit"), so match on the prefix.
  const railEnabled = (rail: string) => !options.data || options.data.some((o) => o.toUpperCase().startsWith(rail));

  const setField = <K extends keyof TransferFields>(k: K, v: TransferFields[K]) => setS((p) => ({ ...p, fields: { ...p.fields, [k]: v } }));
  const goStep = (step: number) => {
    setError('');
    setS((p) => ({ ...p, step }));
  };

  const selectType = (type: TransferType) => {
    setError('');
    // funding has no second choice to make
    setS({ ...INITIAL, type, step: type === 'fund' ? 3 : 2 });
  };
  const selectSubtype = (subtype: TransferSubtype) => setS((p) => ({ ...p, subtype, step: 3 }));
  const back = () => {
    setError('');
    setS((p) => (p.step === 4 ? { ...p, step: 3 } : p.step === 3 && p.type !== 'fund' ? { ...p, step: 2 } : { ...INITIAL }));
  };

  const review = () => {
    const result = buildTransferBody(s.type, s.subtype, f);
    if (!result.ok) return setError(result.error);
    goStep(4);
  };

  function pickAttachment(file: File | undefined) {
    if (!file) return;
    if (!ATTACHMENT_TYPES.includes(file.type)) return toast('Attach a PDF, PNG or JPEG file');
    if (file.size > ATTACHMENT_MAX_BYTES) return toast('Attachments can be up to 4.5 MB');
    setS((p) => ({ ...p, attachment: file }));
  }

  async function submit() {
    const result = buildTransferBody(s.type, s.subtype, f);
    if (!result.ok) return setError(result.error);
    setBusy(true);
    setError('');
    try {
      const res = await sendTransfer(result.request);
      const id = res.createPayment?.id;
      if (s.type === 'fund') {
        toast('Employee accounts funded');
      } else if (s.attachment && id) {
        try {
          await uploadTransferAttachment(id, s.attachment);
          toast(`Transfer submitted · #${id} · attachment added`);
        } catch (e) {
          toast(`Transfer #${id} was sent, but the attachment failed: ${e instanceof Error ? e.message : 'upload error'}`);
        }
      } else {
        toast(`Transfer submitted · #${id ?? ''}`);
      }
      setS(INITIAL);
      accounts.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transfer failed');
    } finally {
      setBusy(false);
    }
  }

  function onPick(item: PickerItem) {
    if (!picker) return;
    if (picker === 'recipientContact') {
      const b = recipients.data?.find((r) => r.id === item.id);
      setS((p) => ({
        ...p,
        fields: { ...p.fields, recipientContact: item, ...(b ? fieldsFromBeneficiary(b) : {}) },
        collapsed: { ...p.collapsed, achRecipientDetails: true },
      }));
    } else {
      setS((p) => ({ ...p, fields: { ...p.fields, [picker]: item, ...(picker === 'debitAccount' ? { fundAmounts: {} } : {}) } }));
    }
    setPicker(null);
  }

  const accountBtn = (key: PickerTarget, placeholder: string) => (
    <button type="button" className={'select-account-btn' + (f[key] ? ' filled' : '')} onClick={() => setPicker(key)}>
      <span>{f[key]?.name ?? placeholder}</span>
      <Icon.Arrow />
    </button>
  );

  const input = (key: keyof TransferFields, label: string, type = 'text') => (
    <div className="form-field">
      <label>{label}</label>
      <input type={type} value={(f[key] as string | undefined) ?? ''} onChange={(e) => setField(key, e.target.value as never)} />
    </div>
  );

  const section = (key: string, title: string, summary: string, content: ReactNode) => {
    const collapsed = !!s.collapsed[key];
    return (
      <>
        <button type="button" className="section-toggle" onClick={() => setS((p) => ({ ...p, collapsed: { ...p.collapsed, [key]: !collapsed } }))}>
          <span>
            {title} <span className="section-check">{summary}</span>
          </span>
          <Icon.SectionChevron open={!collapsed} />
        </button>
        {!collapsed && content}
      </>
    );
  };

  const amountRef = (amountFirst: boolean) => (
    <div className="transfer-highlight">
      <div className="form-divider-title" style={{ marginTop: 0 }}>Transfer details</div>
      <div className="form-row">
        {amountFirst ? (
          <>{input('amount', 'Amount (USD)*', 'number')}{input('reference', 'Reference*')}</>
        ) : (
          <>{input('reference', 'Reference*')}{input('amount', 'Amount (USD)*', 'number')}</>
        )}
      </div>
    </div>
  );

  const reviewButtons = (
    <>
      {error && <div className="form-error">{error}</div>}
      <div className="wizard-btn-row">
        <button className="action-btn" onClick={back}>Cancel</button>
        <button className="action-btn primary" onClick={review}>Review transfer</button>
      </div>
    </>
  );

  let body: ReactNode = null;
  if (s.step === 1) {
    body = (
      <>
        <h3 style={{ margin: '0 0 16px' }}>Select transfer type</h3>
        <div className="type-card-list">
          <button type="button" className="type-card" onClick={() => selectType('internal')} disabled={!railEnabled('INTERNAL')}>
            <div className="tc-title">Internal Transfer</div>
            <div className="tc-desc">Transfer money to internal bank accounts.</div>
          </button>
          <button type="button" className="type-card" onClick={() => selectType('fund')}>
            <div className="tc-title">Fund employee account(s)</div>
            <div className="tc-desc">Allocate the funds to department employees' cards.</div>
          </button>
          <button type="button" className="type-card" onClick={() => selectType('external')} disabled={!railEnabled('ACH')}>
            <div className="tc-title">External Transfer</div>
            <div className="tc-desc">Transfer money to external bank accounts.</div>
          </button>
        </div>
      </>
    );
  } else if (s.step === 2) {
    body = (
      <>
        <h3 style={{ margin: '0 0 16px' }}>Select transfer type</h3>
        <div className="type-card-list">
          {s.type === 'internal' ? (
            <>
              <button type="button" className="type-card" onClick={() => selectSubtype('between')}>
                <div className="tc-title">Transfer between your accounts</div>
                <div className="tc-desc">Move money between your accounts, within your organisation.</div>
              </button>
              <button type="button" className="type-card" onClick={() => selectSubtype('crb')}>
                <div className="tc-title">Transfer to another client of SUBBAL</div>
                <div className="tc-desc">Transfer money to another client of SUBBAL.</div>
              </button>
            </>
          ) : (
            <button type="button" className="type-card" onClick={() => selectSubtype('ach')}>
              <div className="tc-title">ACH Transfer</div>
              <div className="tc-desc">Usually the money will be available within 1–2 business days.</div>
            </button>
          )}
        </div>
        <div className="wizard-btn-row"><button className="action-btn" onClick={back}>Back</button></div>
      </>
    );
  } else if (s.step === 3 && s.type === 'fund') {
    body = (
      <>
        <h3 style={{ margin: '0 0 16px' }}>Fund employee account(s)</h3>
        <div className="form-divider-title">Debit money from account</div>
        {accountBtn('debitAccount', 'Select account')}
        {f.debitAccount && (
          <>
            <div className="form-divider-title">Employee cards</div>
            {employees.loading && <p className="muted-text">Loading employee accounts…</p>}
            {employees.error && <p className="form-error">{employees.error.message}</p>}
            {employees.data?.length === 0 && <p className="muted-text">No employee cards are funded from this account.</p>}
            {employees.data?.map((e) => {
              const name = [e.user?.firstname, e.user?.lastname].filter(Boolean).join(' ') || e.nickName || `Account ${e.accountNo}`;
              const meta = [e.card?.network, `•••${e.accountNo.slice(-4)}`, `Balance ${fmt(e.availableBalance)}`].filter(Boolean).join(' · ');
              return (
                <div className="form-row" key={e.id}>
                  <div className="form-field">
                    <label>{name}</label>
                    <div className="form-help">{meta}</div>
                  </div>
                  <div className="form-field">
                    <label>Amount (USD)</label>
                    <input
                      type="number"
                      value={f.fundAmounts?.[e.id] ?? ''}
                      onChange={(ev) => setField('fundAmounts', { ...f.fundAmounts, [e.id]: ev.target.value })}
                    />
                  </div>
                </div>
              );
            })}
            <div className="form-row">{input('reference', 'Reference*')}</div>
          </>
        )}
        {reviewButtons}
      </>
    );
  } else if (s.step === 3 && s.subtype === 'ach') {
    const picked = !!f.recipientContact;
    const accountDetails = (
      <>
        <div className="form-row">{input('achAccountNumber', 'Account number*')}</div>
        <div className="form-row">{input('achRouting', 'ACH Routing number*')}</div>
        <div className="form-row">
          <div className="form-field">
            <label>Account type*</label>
            <select value={f.achAccountType ?? 'Individual'} onChange={(e) => setField('achAccountType', e.target.value as TransferFields['achAccountType'])}>
              <option value="Individual">Individual</option>
              <option value="Business">Business</option>
            </select>
          </div>
        </div>
        {f.achAccountType === 'Business' ? (
          <div className="form-row">{input('achBusinessName', 'Business Name*')}</div>
        ) : (
          <div className="form-row">{input('achFirstName', 'First Name*')}{input('achLastName', 'Last Name*')}</div>
        )}
        <div className="form-row">
          <div className="form-field">
            <label>Bank Account type*</label>
            <select value={f.achBankAccountType ?? 'CHECKING'} onChange={(e) => setField('achBankAccountType', e.target.value as TransferFields['achBankAccountType'])}>
              <option value="CHECKING">CHECKING</option>
              <option value="SAVINGS">SAVINGS</option>
            </select>
          </div>
        </div>
      </>
    );
    body = (
      <>
        <h3 style={{ margin: '0 0 4px' }}>ACH Transfer</h3>
        <div className="form-divider-title">Debit money from account</div>
        <div className="form-help">Account from which the transfer amount will be debited</div>
        {accountBtn('debitAccount', 'Select account')}
        <div className="form-divider-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Recipient account
          <span style={{ display: 'flex', gap: 6 }}>
            {picked && (
              <button
                className="table-btn"
                onClick={() => setS((p) => ({ ...p, fields: { debitAccount: p.fields.debitAccount, amount: p.fields.amount, reference: p.fields.reference }, collapsed: {} }))}
              >
                Clear
              </button>
            )}
            <button className="table-btn" onClick={() => setPicker('recipientContact')}>👤 Select Recipient</button>
          </span>
        </div>
        {picked ? (
          section('achRecipientDetails', 'Account details', `✓ ${f.recipientContact!.name}`, accountDetails)
        ) : (
          <>
            <div className="form-help">Enter recipient account number details, or pick a saved recipient above</div>
            {accountDetails}
          </>
        )}
        <div className="form-divider-title">Transfer document (optional)</div>
        <div className="attach-file-row">
          <span>{s.attachment ? `📄 ${s.attachment.name}` : 'Include additional documents to your transfer'}</span>
          {s.attachment ? (
            <button className="link" onClick={() => setS((p) => ({ ...p, attachment: null }))}>Remove</button>
          ) : (
            <label className="link" style={{ cursor: 'pointer' }}>
              Add Attach File
              <input type="file" accept={ATTACHMENT_TYPES.join(',')} hidden onChange={(e) => pickAttachment(e.target.files?.[0])} />
            </label>
          )}
        </div>
        {amountRef(false)}
        {reviewButtons}
      </>
    );
  } else if (s.step === 3 && s.subtype === 'between') {
    body = (
      <>
        <h3 style={{ margin: '0 0 16px' }}>Transfer between your accounts</h3>
        <div className="form-divider-title">Debit money from account</div>
        {accountBtn('debitAccount', 'Select account')}
        <div className="form-divider-title">Recipient account</div>
        {accountBtn('internalRecipient', 'Select account')}
        {amountRef(true)}
        {reviewButtons}
      </>
    );
  } else if (s.step === 3 && s.subtype === 'crb') {
    body = (
      <>
        <h3 style={{ margin: '0 0 16px' }}>Transfer to another client of SUBBAL</h3>
        <div className="form-divider-title">Debit money from account</div>
        {accountBtn('debitAccount', 'Select account')}
        <div className="form-divider-title">Recipient details</div>
        <div className="form-row">{input('crbAccountNumber', 'Recipient account number*')}</div>
        {amountRef(true)}
        {reviewButtons}
      </>
    );
  } else if (s.step === 4) {
    const rows: [string, string][] = [];
    if (s.type) rows.push(['Transfer type', TYPE_LABEL[s.type]]);
    if (s.subtype) rows.push(['Method', SUBTYPE_LABEL[s.subtype]]);
    if (f.debitAccount) rows.push(['From account', f.debitAccount.name]);
    if (f.internalRecipient) rows.push(['To account', f.internalRecipient.name]);
    if (f.recipientContact) rows.push(['Recipient', f.recipientContact.name]);
    if (s.subtype === 'ach' && !f.recipientContact) rows.push(['Recipient name', achRecipientName(f)]);
    if (f.crbAccountNumber) rows.push(['Recipient account', f.crbAccountNumber]);
    if (s.type === 'fund') {
      for (const e of employees.data ?? []) {
        const v = f.fundAmounts?.[e.id];
        if (v) rows.push([[e.user?.firstname, e.user?.lastname].filter(Boolean).join(' ') || e.nickName || e.accountNo, fmt(Number(v))]);
      }
    }
    if (f.amount && s.type !== 'fund') rows.push(['Amount', fmt(parseFloat(f.amount) || 0)]);
    if (quote.data) {
      const q = quote.data;
      rows.push(['Fee', fmt(q.fee)], ['Total debit', fmt(q.totalDebit)]);
      if (q.estimatedArrival) {
        const { minBusinessDays: lo, maxBusinessDays: hi } = q.estimatedArrival;
        rows.push(['Estimated arrival', hi === 0 ? 'Same day' : `${lo === hi ? hi : `${lo}–${hi}`} business day${hi === 1 ? '' : 's'}`]);
      }
    }
    if (s.attachment) rows.push(['Attachment', s.attachment.name]);
    if (f.reference) rows.push(['Reference', f.reference]);
    body = (
      <>
        <h3 style={{ margin: '0 0 16px' }}>Confirm details</h3>
        <div className="confirm-summary">
          {rows.map(([k, v], i) => (
            <div className="confirm-row" key={i}><span>{k}</span><span>{v}</span></div>
          ))}
          {quote.loading && quoteRail && <div className="confirm-row"><span>Fee</span><span>…</span></div>}
        </div>
        <p className="muted-text" style={{ maxWidth: 640 }}>
          {quote.error
            ? `Fees could not be loaded (${quote.error.message}). Review the details above before sending.`
            : 'Review the details above before sending. This sends a real payment instruction to SUBBAL.'}
        </p>
        {error && <div className="form-error">{error}</div>}
        <div className="wizard-btn-row">
          <button className="action-btn" onClick={back} disabled={busy}>Back</button>
          <button className="action-btn primary" onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Confirm & send'}</button>
        </div>
      </>
    );
  }

  const pct = ((s.step - 1) / 3) * 100;
  const pickerIsRecipients = picker === 'recipientContact';
  const accountItems = (accounts.data ?? []).map(accountToPickerItem);

  return (
    <>
      <div className="concept-banner">
        <span>🔒 Transfers are sent with your SUBBAL session. Some payments may require additional approval in SUBBAL.</span>
      </div>
      <div className="card">
        <div className="transfer-stepper">
          <div className="transfer-stepper-track">
            <div className="transfer-stepper-fill" style={{ width: `${pct}%` }}></div>
            <div className="transfer-stepper-dot" style={{ left: `${pct}%` }}></div>
          </div>
          <div className="transfer-stepper-labels">
            {STEP_LABELS.map((label, i) => (
              <span key={label} className={i + 1 < s.step ? 'done' : i + 1 === s.step ? 'current' : ''}>{label}</span>
            ))}
          </div>
        </div>
        <div className="transfer-step-inner">{body}</div>
      </div>
      <AccountPicker
        key={picker ?? 'closed'}
        open={!!picker}
        title={pickerIsRecipients ? 'Select recipient' : 'Select account'}
        items={pickerIsRecipients ? (recipients.data ?? []).map(beneficiaryToPickerItem) : accountItems}
        loading={pickerIsRecipients ? recipients.loading : accounts.loading}
        error={(pickerIsRecipients ? recipients.error : accounts.error)?.message}
        onSelect={onPick}
        onClose={() => setPicker(null)}
      />
    </>
  );
}
