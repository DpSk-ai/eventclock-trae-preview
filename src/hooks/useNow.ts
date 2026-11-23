import { useEffect, useState } from 'react';

export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer: number | undefined;
    const sync = () => setNow(Date.now());
    const schedule = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = window.setInterval(sync, intervalMs);
    };
    const onWake = () => {
      sync();
      schedule();
    };
    sync();
    schedule();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('pageshow', onWake);
    return () => {
      if (timer !== undefined) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('pageshow', onWake);
    };
  }, [intervalMs]);

  return now;
}
