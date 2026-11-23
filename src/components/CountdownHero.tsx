import { CalendarClock, CheckCircle2, Maximize2, Pencil, Plus } from 'lucide-react';
import type { EventItem, Settings } from '../types';
import { EVENT_KIND_META } from '../types';
import {
  formatEventDate,
  formatEventTimeRange,
  formatReminderLabel,
  getCountdown,
  getPhase,
  getProgress,
  getSeverity,
  timeZoneLabel,
} from '../lib/time';
import { CountdownDigits } from './CountdownDigits';
import { getBranding } from '../config/branding';
import { CodeParticles, GridPattern } from './VisualEffects';

interface CountdownHeroProps {
  event: EventItem | null;
  now: number;
  settings: Settings;
  onEdit: () => void;
  onOpenStage: () => void;
  onCreate: () => void;
}

const PHASE_LABEL = {
  upcoming: '未开始',
  live: '进行中',
  ended: '已结束',
} as const;

export function CountdownHero({
  event,
  now,
  settings,
  onEdit,
  onOpenStage,
  onCreate,
}: CountdownHeroProps) {
  const branding = getBranding();
  const animationsPaused = !settings.animations;

  if (!event) {
    return (
      <section className="panel hero hero-empty relative overflow-hidden" aria-label="活动倒计时">
        <GridPattern paused={animationsPaused} />
        <span className="empty-icon">
          <CalendarClock size={26} strokeWidth={1.4} />
        </span>
        <h2 className="text-[19px] font-medium tracking-tight text-ink">还没有活动</h2>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
          创建第一个活动，设置开始、结束与倒计时目标时间，EventClock 会保持精确到秒，并在刷新或休眠后自动校准。
        </p>
        <button type="button" className="btn btn-primary mt-6" onClick={onCreate}>
          <Plus size={16} />
          新建活动
        </button>
      </section>
    );
  }

  const countdown = getCountdown(event.targetAt, now);
  const phase = getPhase(event.startAt, event.targetAt, now);
  const severity = getSeverity(countdown.remainingMs);
  const progress = getProgress(event.startAt, event.targetAt, now);
  const kind = EVENT_KIND_META[event.kind];
  const nextReminder = [...event.reminders]
    .sort((a, b) => a - b)
    .find((seconds) => seconds * 1000 > countdown.remainingMs);
  const progressPercent = Math.round(progress * 100);
  const phaseTone =
    phase === 'ended'
      ? 'status-ended'
      : phase === 'upcoming'
        ? 'status-upcoming'
        : severity === 'critical'
          ? 'status-critical'
          : 'status-live';

  return (
    <section className="panel hero relative overflow-hidden" aria-labelledby="hero-title">
      <CodeParticles
        count={branding.visual.particleCount}
        intensity={branding.visual.animationIntensity}
        paused={animationsPaused}
      />
      <GridPattern paused={animationsPaused} />

      <div className="hero-head relative z-10">
        <div className="min-w-0">
          <div className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            {branding.eventTitle} · {kind.label}
          </div>
          <h1 id="hero-title" className="hero-title">
            {event.name}
          </h1>
          <p className="hero-meta">
            {formatEventTimeRange(event.startAt, event.endAt, settings.timeZone)}
            <span className="meta-divider" aria-hidden="true">
              ·
            </span>
            {timeZoneLabel(settings.timeZone)}
          </p>
          <div className="mt-2 text-[11px] font-medium tracking-wider uppercase text-[var(--ec-faint)] opacity-75">
            {branding.eventSubtitle} · {branding.organization}
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--ec-line)] bg-[var(--ec-surface)] px-3 py-1.5 text-[11.5px] font-medium">
            <span className="text-[var(--ec-muted)]">正在倒计时：</span>
            <span className="text-[var(--ec-ink)]">距离目标时间 {formatEventDate(event.targetAt, settings.timeZone)}</span>
          </div>
        </div>
        <div className="hero-badges">
          <span className={`phase-pill ${phaseTone}`}>
            <span className="phase-dot" aria-hidden="true" />
            {PHASE_LABEL[phase]}
          </span>
        </div>
      </div>

      <div className={`hero-digits relative z-10 ${phase === 'ended' ? 'is-ended' : ''}`}>
        <CountdownDigits
          countdown={countdown}
          displayMode={settings.displayMode}
          numberFormat={settings.numberFormat}
          size="hero"
          tone={severity}
        />
      </div>

      {phase === 'ended' ? (
        <p className="ended-note relative z-10" role="status">
          <CheckCircle2 size={16} strokeWidth={1.8} />
          活动已结束 · 倒计时已归零
        </p>
      ) : (
        <div className="hero-progress relative z-10">
          <div
            className="progress-track"
            role="progressbar"
            aria-label="活动进行进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <span className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-meta">
            <span>已进行 {progressPercent}%</span>
            <span>
              {nextReminder !== undefined
                ? `下一提醒 · 剩余 ${formatReminderLabel(nextReminder)}`
                : '提醒已全部触发'}
            </span>
          </div>
        </div>
      )}

      <div className="hero-foot relative z-10">
        <div className="hero-times">
          <span>
            开始 <b>{formatEventDate(event.startAt, settings.timeZone)}</b>
          </span>
          <span>
            目标 <b>{formatEventDate(event.targetAt, settings.timeZone)}</b>
          </span>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn btn-outline" onClick={onEdit}>
            <Pencil size={15} />
            编辑
          </button>
          <button type="button" className="btn btn-primary" onClick={onOpenStage}>
            <Maximize2 size={15} />
            大屏
          </button>
        </div>
      </div>
    </section>
  );
}
