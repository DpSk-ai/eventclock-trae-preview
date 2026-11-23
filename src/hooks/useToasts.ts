import { useCallback, useEffect, useRef, useState } from 'react';
import { newId } from '../lib/ids';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  tone: ToastTone;
}

export type ToastInput = {
  title: string;
  body?: string;
  tone?: ToastTone;
};

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((input: ToastInput) => {
    const id = newId('toast');
    setToasts((prev) => [...prev.slice(-3), { ...input, id, tone: input.tone ?? 'info' }]);
    const timer = window.setTimeout(() => {
      timers.current.delete(id);
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 6000);
    timers.current.set(id, timer);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  return { toasts, push, dismiss };
}
