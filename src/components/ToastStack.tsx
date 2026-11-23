import { AlertTriangle, Bell, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastItem } from '../hooks/useToasts';

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: Bell,
};

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[120] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            className={`toast toast-${toast.tone} pointer-events-auto`}
          >
            <span className="toast-icon">
              <Icon size={16} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="toast-title">{toast.title}</div>
              {toast.body ? <div className="toast-body">{toast.body}</div> : null}
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => onDismiss(toast.id)}
              aria-label="关闭通知"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
