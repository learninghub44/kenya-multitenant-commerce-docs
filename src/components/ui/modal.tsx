"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

const ModalContext = createContext<(() => void) | null>(null);

/** Forms rendered inside a Modal can call this after a successful save. Outside a modal it does nothing. */
export function useModalClose(): () => void {
  return useContext(ModalContext) ?? (() => {});
}

type ModalButtonProps = {
  label: string;
  title: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "link";
  size?: "sm" | "md" | "lg";
  /** Opens automatically when the page URL hash equals this value (for links like /products#add-product). */
  openOnHash?: string;
  icon?: string;
};

/**
 * Trigger button + native <dialog>. Escape and backdrop click close it, focus is trapped by the browser,
 * and on phones it renders as a bottom sheet (see .modal in globals.css).
 */
export function ModalButton({ label, title, children, variant = "secondary", size = "md", openOnHash, icon }: ModalButtonProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = useCallback(() => { if (ref.current && !ref.current.open) ref.current.showModal(); }, []);
  const close = useCallback(() => ref.current?.close(), []);

  useEffect(() => {
    if (!openOnHash) return;
    const check = () => { if (window.location.hash === `#${openOnHash}`) open(); };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [openOnHash, open]);

  return (
    <>
      <button type="button" className={`modal-trigger modal-trigger-${variant}`} onClick={open}>
        {icon ? <span aria-hidden="true">{icon}</span> : null}{label}
      </button>
      <dialog
        ref={ref}
        className={`modal modal-${size}`}
        aria-labelledby={titleId}
        onClick={event => { if (event.target === ref.current) close(); }}
        onClose={() => { if (openOnHash && window.location.hash === `#${openOnHash}`) history.replaceState(null, "", window.location.pathname + window.location.search); }}
      >
        <div className="modal-panel">
          <header className="modal-header">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="modal-close" aria-label="Close" onClick={close}>×</button>
          </header>
          <div className="modal-body">
            <ModalContext.Provider value={close}>{children}</ModalContext.Provider>
          </div>
        </div>
      </dialog>
    </>
  );
}
