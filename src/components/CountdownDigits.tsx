import { Fragment } from 'react';
import type { DisplayMode, NumberFormat } from '../types';
import {
  formatCountdownText,
  getCountdown,
  padValue,
  type Countdown,
  type Severity,
} from '../lib/time';

interface CountdownDigitsProps {
  countdown: Countdown;
  displayMode: DisplayMode;
  numberFormat: NumberFormat;
  size?: 'hero' | 'stage' | 'timer';
  tone?: Severity;
}

const SEVERITY_TONE: Record<Severity, string> = {
  normal: 'tone-normal',
  notice: 'tone-notice',
  warning: 'tone-warning',
  critical: 'tone-critical',
  ended: 'tone-ended',
};

export function CountdownDigits({
  countdown,
  displayMode,
  numberFormat,
  size = 'hero',
  tone = 'normal',
}: CountdownDigitsProps) {
  const toneClass = SEVERITY_TONE[tone];

  if (displayMode === 'compact') {
    const { days, hours, minutes, seconds } = countdown;
    return (
      <div className={`digits-compact digits-compact-${size} ${toneClass}`}>
        {days > 0 ? (
          <span className="compact-days">
            {days}
            <span className="compact-unit">天</span>
          </span>
        ) : null}
        <span>
          {padValue(days > 0 ? hours : countdown.totalHours, numberFormat)}:
          {padValue(minutes, numberFormat)}:{padValue(seconds, numberFormat)}
        </span>
      </div>
    );
  }

  const groups =
    displayMode === 'days'
      ? [
          { value: countdown.days, label: '天' },
          { value: countdown.hours, label: '时' },
          { value: countdown.minutes, label: '分' },
          { value: countdown.seconds, label: '秒' },
        ]
      : [
          { value: countdown.totalHours, label: '时' },
          { value: countdown.minutes, label: '分' },
          { value: countdown.seconds, label: '秒' },
        ];

  const spoken = `倒计时 ${countdown.days} 天 ${countdown.hours} 小时 ${countdown.minutes} 分 ${countdown.seconds} 秒`;

  return (
    <div
      className={`digits-row digits-row-${size} ${toneClass}`}
      role="timer"
      aria-label={spoken}
      data-zero={countdown.isZero ? 'true' : 'false'}
    >
      {groups.map((group, index) => (
        <Fragment key={group.label}>
          {index > 0 ? (
            <span className="digit-sep" aria-hidden="true">
              :
            </span>
          ) : null}
          <span className="digit-group">
            <span className="digit-value">{padValue(group.value, numberFormat)}</span>
            <span className="digit-label" aria-hidden="true">
              {group.label}
            </span>
          </span>
        </Fragment>
      ))}
    </div>
  );
}

export function compactCountdown(eventTarget: number, now: number): string {
  return formatCountdownText(getCountdown(eventTarget, now), 'padded');
}
