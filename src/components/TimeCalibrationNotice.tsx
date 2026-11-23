/**
 * 时间校准提示组件
 * 提醒用户设备时间可能不准，需要手动校准
 * 由于纯静态前端无法主动纠正系统时钟，只能提供校验提示
 */

import { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

const TIME_CHECK_URLS = [
  'https://worldtimeapi.org/api/timezone/Asia/Shanghai',
];

export function TimeCalibrationNotice() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('time-calibration-dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [timeDrift, setTimeDrift] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    // 只在组件首次加载时检查一次
    let mounted = true;
    setChecking(true);

    fetch(TIME_CHECK_URLS[0], { signal: AbortSignal.timeout(5000) })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const serverTime = new Date(data.datetime).getTime();
        const localTime = Date.now();
        const drift = Math.abs(serverTime - localTime);

        // 如果偏差超过5秒，显示提示
        if (drift > 5000) {
          setTimeDrift(drift);
        }
      })
      .catch(() => {
        // 网络错误或请求超时，不显示提示
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, [dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('time-calibration-dismissed', 'true');
    } catch {
      // 忽略存储失败
    }
  };

  if (dismissed || checking || timeDrift === null) {
    return null;
  }

  const driftSeconds = Math.round(timeDrift / 1000);

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 w-full max-w-[520px] -translate-x-1/2 px-4"
      role="alert"
      aria-live="polite"
    >
      <div className="relative flex items-start gap-3 rounded-2xl border border-[var(--ec-line-strong)] bg-[var(--ec-modal)] p-4 shadow-[0_24px_60px_-26px_rgba(0,0,0,0.6)] backdrop-blur-sm">
        <div className="flex-shrink-0 rounded-lg bg-[var(--ec-warn)]/12 p-2 text-[var(--ec-warn)]">
          <AlertCircle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-medium text-[var(--ec-ink)]">
            设备时间可能不准确
          </h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--ec-muted)]">
            检测到本地时间与网络时间相差约 <strong>{driftSeconds} 秒</strong>。
            为确保倒计时准确，请在设置中校准系统时间，或确保所有现场设备使用同一时间源。
          </p>
          <p className="mt-2 text-[10.5px] text-[var(--ec-faint)]">
            注意：本应用为纯静态前端，无法自动纠正设备时钟。跨设备统一计时需依赖设备自身的时间同步。
          </p>
        </div>
        <button
          type="button"
          className="flex-shrink-0 rounded-lg p-1.5 text-[var(--ec-faint)] transition-colors hover:bg-[var(--ec-surface)] hover:text-[var(--ec-ink)]"
          onClick={handleDismiss}
          aria-label="关闭提示"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
