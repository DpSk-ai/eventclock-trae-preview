import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutPanelTop,
  Minimize2,
} from 'lucide-react';
import type { EventItem, Settings } from '../types';
import { EVENT_KIND_META } from '../types';
import {
  formatEventTimeRange,
  formatStageClock,
  getCountdown,
  getPhase,
  getProgress,
  getSeverity,
  timeZoneLabel,
} from '../lib/time';
import { CountdownDigits } from './CountdownDigits';
import { getBranding } from '../config/branding';
import { GridPattern, DataPulse } from './VisualEffects';

interface PresentationStageProps {
  event: EventItem | null;
  now: number;
  settings: Settings;
  totalEvents: number;
  eventIndex: number;
  onExit: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCycleDisplayMode: () => void;
}

const PHASE_LABEL = {
  upcoming: '未开始',
  live: '进行中',
  ended: '已结束',
} as const;

export function PresentationStage({
  event,
  now,
  settings,
  totalEvents,
  eventIndex,
  onExit,
  onPrev,
  onNext,
  onCycleDisplayMode,
}: PresentationStageProps) {
  const [immersive, setImmersive] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const branding = getBranding();
  const animationsPaused = !settings.animations;

  const reveal = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current);
    if (immersive) {
      hideTimer.current = window.setTimeout(() => setChromeVisible(false), 2600);
    }
  }, [immersive]);

  useEffect(() => {
    reveal();
    return () => {
      if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current);
    };
  }, [reveal]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const onPointer = () => reveal();
    element.addEventListener('pointermove', onPointer);
    element.addEventListener('pointerdown', onPointer);
    return () => {
      element.removeEventListener('pointermove', onPointer);
      element.removeEventListener('pointerdown', onPointer);
    };
  }, [reveal]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      const target = keyboardEvent.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (keyboardEvent.key === 'i' || keyboardEvent.key === 'I') {
        setImmersive((value) => !value);
      }
      if (keyboardEvent.key === 'ArrowLeft') onPrev();
      if (keyboardEvent.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onNext, onPrev]);

  const countdown = event ? getCountdown(event.targetAt, now) : null;
  const phase = event ? getPhase(event.startAt, event.targetAt, now) : 'ended';
  const severity = countdown ? getSeverity(countdown.remainingMs) : 'ended';
  const progress = event ? getProgress(event.startAt, event.targetAt, now) : 0;
  const chromeClass = chromeVisible ? 'is-visible' : 'is-hidden';

  return (
    <div
      ref={rootRef}
      className="stage"
      data-immersive={immersive ? 'true' : 'false'}
      role="dialog"
      aria-modal="true"
      aria-label="大屏演示"
    >
      <div className="stage-atmosphere" aria-hidden="true" />
      <GridPattern paused={animationsPaused} />
      <DataPulse active={phase === 'live'} position="top-right" paused={animationsPaused} />

      <div className={`stage-chrome stage-head ${chromeClass}`}>
        <div className="stage-identity">
          <span className="stage-logo" aria-hidden="true">
            TR
          </span>
          <div>
            <div className="stage-brand">{branding.eventTitle}</div>
            <div className="stage-brand-sub">{branding.eventSubtitle}</div>
          </div>
        </div>
        <div className="stage-toolbar">
          <span className="stage-index">
            {event ? `${eventIndex + 1} / ${totalEvents}` : '0 / 0'}
          </span>
          <button
            type="button"
            className="stage-btn"
            onClick={onPrev}
            disabled={totalEvents < 2}
            aria-label="上一个活动"
            title="上一个活动（←）"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="stage-btn"
            onClick={onNext}
            disabled={totalEvents < 2}
            aria-label="下一个活动"
            title="下一个活动（→）"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="stage-btn"
            onClick={onCycleDisplayMode}
            aria-label="切换倒计时显示模式"
            title="切换显示模式"
          >
            <LayoutPanelTop size={17} />
          </button>
          <button
            type="button"
            className={`stage-btn ${immersive ? 'is-active' : ''}`}
            onClick={() => setImmersive((value) => !value)}
            aria-pressed={immersive}
            aria-label={immersive ? '退出沉浸模式' : '进入沉浸模式'}
            title="沉浸模式（I）"
          >
            {immersive ? <Eye size={17} /> : <EyeOff size={17} />}
          </button>
          <button
            type="button"
            className="stage-btn"
            onClick={onExit}
            aria-label="退出大屏"
            title="退出大屏（Esc）"
          >
            <Minimize2 size={17} />
          </button>
        </div>
      </div>

      {event && countdown ? (
        <main className="stage-main">
          <div className="stage-eyebrow">
            <span>{branding.organization}</span>
            <span className="stage-sep">·</span>
            <span className={`stage-phase stage-phase-${phase}`}>
              <span className="phase-dot" aria-hidden="true" />
              {PHASE_LABEL[phase]}
            </span>
            <span className="stage-sep">·</span>
            <span className="stage-kind">{EVENT_KIND_META[event.kind].label}</span>
          </div>
          <h1 className="stage-title">{event.name}</h1>
          <div className="stage-digits">
            <CountdownDigits
              countdown={countdown}
              displayMode={settings.displayMode}
              numberFormat={settings.numberFormat}
              size="stage"
              tone={severity}
            />
          </div>
          <div className="stage-sub">
            <span>{formatEventTimeRange(event.startAt, event.endAt, settings.timeZone)}</span>
            <span className="stage-dot" aria-hidden="true" />
            <span>{timeZoneLabel(settings.timeZone)}</span>
          </div>

          {phase === 'ended' ? (
            <div className="stage-ended" role="status">
              <CheckCircle2 size={20} strokeWidth={1.7} />
              活动已结束
            </div>
          ) : (
            <div className="stage-progress">
              <div
                className="progress-track"
                role="progressbar"
                aria-label="活动进行进度"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <span className="progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="stage-progress-meta">
                <span>已进行 {Math.round(progress * 100)}%</span>
                <span>倒计时归零后自动停止</span>
              </div>
            </div>
          )}
        </main>
      ) : (
        <main className="stage-main">
          <h1 className="stage-title">暂无活动</h1>
          <p className="stage-sub">{branding.eventTitle} · 返回主界面创建活动后再进入大屏</p>
        </main>
      )}

      <div className={`stage-chrome stage-foot ${chromeClass}`}>
        <span className="stage-clock">{formatStageClock(now, settings.timeZone)}</span>
        <span className="stage-hints">
          <kbd>I</kbd> 沉浸
          <span className="stage-hint-sep" />
          <kbd>←</kbd>
          <kbd>→</kbd> 切换
          <span className="stage-hint-sep" />
          <kbd>Esc</kbd> 退出
        </span>
      </div>

      {immersive && !chromeVisible ? (
        <button type="button" className="stage-reveal" onClick={reveal}>
          显示控件
        </button>
      ) : null}
    </div>
  );
}
