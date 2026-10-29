import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** `wide` = creator detail (900px); `slide` = right-hand slide-over */
  variant?: 'default' | 'wide' | 'slide';
}

export function Modal({ open, onClose, children, variant = 'default' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const slide = variant === 'slide';
  return (
    <div
      className={'modal-overlay' + (slide ? ' slide-overlay' : '') + (open ? ' open' : '')}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={slide ? 'slide-panel' : 'modal-panel' + (variant === 'wide' ? ' modal-wide' : '')} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {open && children}
      </div>
    </div>
  );
}
