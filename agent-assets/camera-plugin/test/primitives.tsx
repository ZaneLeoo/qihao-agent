// Presentation doubles keep camera lifecycle tests independent of the DSH checkout.
// The real DSH primitives are checked separately in the running browser.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useEffect } from 'react';
export function Button({ variant: _variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return <button {...props} />;
}
export function Tooltip({ children }: { children: ReactNode }) { return children; }
export function Modal({ open, onClose, title, closeLabel, footer, children }: {
  open: boolean; onClose: () => void; title: string; closeLabel: string; footer: ReactNode; children: ReactNode;
}) {
  useEffect(() => {
    if (!open) { return; }
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { onClose(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open, onClose]);
  return open ? <div role="dialog" aria-label={title}>
    <button aria-label={closeLabel} onClick={onClose} />{children}{footer}
  </div> : null;
}
