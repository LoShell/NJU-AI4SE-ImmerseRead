import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Info, X, type LucideIcon } from "lucide-react";

/** Small additions use the exported Figma palette, sizes and interaction states. */
export function ReaderAction({ icon: Icon, label, children, tone = "subtle", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon; label: string; tone?: "subtle" | "primary" | "danger"; children?: ReactNode;
}) {
  return <button type="button" {...props} aria-label={label} title={props.title ?? label}
    className={`reader-action reader-action-${tone} ${children ? "reader-action-text" : "reader-action-icon"} ${props.className ?? ""}`}>
    {Icon && <Icon size={14} aria-hidden="true" />}{children}
  </button>;
}

export function ReaderHint({ children, icon: Icon = Info }: { children: ReactNode; icon?: LucideIcon }) {
  return <div className="reader-hint"><Icon size={13} aria-hidden="true" /><div>{children}</div></div>;
}

export function ReaderDialog({ title, children, onClose, busy = false, compact = false }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean; compact?: boolean;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== dialogRef.current) return;
      const nodes = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), [tabindex="0"]') ?? [])]
        .filter(element => element.getClientRects().length > 0);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.removeEventListener("keydown", trap); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <div className="reader-dialog-backdrop" onClick={() => { if (!busy) onClose(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy}
      className={`reader-dialog ${compact ? "reader-dialog-compact" : ""}`} onClick={event => event.stopPropagation()}>
      <header className="reader-dialog-header"><h2 id={titleId}>{title}</h2><ReaderAction icon={X} label="关闭弹窗" onClick={onClose} disabled={busy} /></header>
      {children}
    </section>
  </div>;
}
