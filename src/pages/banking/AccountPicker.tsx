import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { fmt } from '../../lib/format';
import type { PickerItem } from '../../lib/mappers';

interface Props {
  open: boolean;
  title: string;
  items: PickerItem[];
  loading?: boolean;
  error?: string;
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
}

export function AccountPicker({ open, title, items, loading, error, onSelect, onClose }: Props) {
  const [filter, setFilter] = useState('');
  const q = filter.trim().toLowerCase();
  const list = items.filter((a) => a.name.toLowerCase().includes(q));

  return (
    <Modal open={open} onClose={onClose} variant="slide">
      <h2>{title}</h2>
      <input className="search-input picker-search" placeholder="Search by name" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="picker-list">
        {loading && <p className="muted-text">Loading…</p>}
        {error && <p className="form-error">{error}</p>}
        {!loading && !error && list.length === 0 && <p className="muted-text">No matches found.</p>}
        {list.map((a) => (
          <button key={a.id} type="button" className="picker-card" onClick={() => onSelect(a)}>
            <div className="pc-name">{a.name}</div>
            <div className="pc-meta">{a.meta}</div>
            <div className="pc-foot">
              {a.balance != null ? (
                <>
                  <span className="pc-balance">{fmt(a.balance)}</span>
                  <span className="status-pill active">Activated</span>
                </>
              ) : (
                <span className="muted-text">Saved recipient</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
