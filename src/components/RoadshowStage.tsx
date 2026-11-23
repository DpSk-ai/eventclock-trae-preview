/**
 * 路演计时投影大屏
 * 独立全屏模式，显示选手/队伍名称、当前环节、剩余时间、超时提示
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Minimize2, Pause, Play, RotateCcw } from 'lucide-react';
import type { RoadshowState } from '../types';
import { formatClockDuration } from '../lib/time';
import {
  getRoadshowRemaining,
  isRoadshowOvertime,
  roadshowProgress,
} from '../lib/roadshow';
import { getBranding } from '../config/branding';
import { GridPattern, DataPulse } from './VisualEffects';

interface RoadshowStageProps {
  state: RoadshowState;
  now: number;
  teamName: string;
  onExit: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export function RoadshowStage({
  state,
  now,
  teamName,
  onExit,
  onPause,
  onResume,
  onReset,
}: RoadshowStageProps) {
  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimer = useRef<number | undefined>(undefined);
  const branding = getBranding();

  const reveal = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setChromeVisible(false), 3000);
  }, []);

  useEffect(() => {
    reveal();
    return () => {
      if (hideTimer.current !== undefined) window.clearTimeout(hideTimer.current);
    };
  }, [reveal]);

  useEffect(() => {
    const onPointer = () => reveal();
    document.addEventListener('pointermove', onPointer);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerdown', onPointer);
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onExit]);

  const remaining = getRoadshowRemaining(state, now);
  const overtime = isRoadshowOvertime(state, now);
  const progress = roadshowProgress(state, now);

  const display = overtime
    ? state.status === 'running' && remaining < 0
      ? `-${formatClockDuration(Math.abs(remaining))}`
      : '00:00'
    : formatClockDuration(remaining);

  const isPaused = state.status === 'paused';
  const isRunning = state.status === 'running';

  return (
    <div className="roadshow-stage">
      <GridPattern paused={false} />
      <DataPulse active={isRunning} position="top-right" paused={false} />

      <div className={`roadshow-stage-chrome ${!chromeVisible ? 'is-hidden' : ''}`}>
        <div className="roadshow-stage-head">
          <div className="roadshow-stage-identity">
            <div className="roadshow-stage-logo">TR</div>
            <div>
              <div className="roadshow-stage-brand">{branding.roadshow.sessionLabel}</div>
              <div className="roadshow-stage-brand-sub">{branding.eventTitle}</div>
            </div>
          </div>

          <button
            type="button"
            className="roadshow-stage-btn"
            onClick={onExit}
            aria-label="退出全屏"
          >
            <Minimize2 size={18} />
          </button>
        </div>
      </div>

      <div className="roadshow-stage-main">
        <div className="roadshow-stage-eyebrow">
          <span className="roadshow-stage-kind">{branding.organization}</span>
          <span className="roadshow-stage-sep">·</span>
          <span>{branding.eventSubtitle}</span>
        </div>

        <h1 className="roadshow-stage-title">{teamName || branding.roadshow.defaultTeamName}</h1>

        <div className="roadshow-stage-digits">
          <div className={`roadshow-digits ${overtime ? 'is-overtime' : ''}`}>
            {display}
          </div>
        </div>

        {overtime && isRunning ? (
          <div className="roadshow-stage-overtime-label">已超时</div>
        ) : null}

        {isPaused ? (
          <div className="roadshow-stage-paused-label">已暂停</div>
        ) : null}

        {!overtime && state.status !== 'idle' ? (
          <div className="roadshow-stage-progress">
            <div className="progress-track">
              <span
                className="progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className={`roadshow-stage-controls ${!chromeVisible ? 'is-hidden' : ''}`}>
          {isRunning ? (
            <button
              type="button"
              className="roadshow-control-btn"
              onClick={onPause}
              aria-label="暂停"
            >
              <Pause size={28} />
              <span>暂停</span>
            </button>
          ) : isPaused ? (
            <button
              type="button"
              className="roadshow-control-btn roadshow-control-btn-primary"
              onClick={onResume}
              aria-label="继续"
            >
              <Play size={28} />
              <span>继续</span>
            </button>
          ) : null}

          <button
            type="button"
            className="roadshow-control-btn"
            onClick={onReset}
            aria-label="重置"
          >
            <RotateCcw size={28} />
            <span>重置</span>
          </button>
        </div>
      </div>

      <style>{`
        .roadshow-stage {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: clamp(20px, 3vw, 60px);
          background:
            radial-gradient(1200px 800px at 50% -10%, rgba(108, 140, 255, 0.18), transparent 65%),
            radial-gradient(1000px 700px at 95% 110%, rgba(255, 255, 255, 0.05), transparent 60%),
            #04050a;
          color: #f2f5fb;
          animation: stage-in 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .roadshow-stage-chrome {
          position: relative;
          z-index: 2;
          transition: opacity 0.4s ease, transform 0.4s ease;
        }

        .roadshow-stage-chrome.is-hidden {
          opacity: 0;
          transform: translateY(-4px);
          pointer-events: none;
        }

        .roadshow-stage-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .roadshow-stage-identity {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .roadshow-stage-logo {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
        }

        .roadshow-stage-brand {
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.01em;
        }

        .roadshow-stage-brand-sub {
          margin-top: 1px;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(170, 182, 205, 0.65);
        }

        .roadshow-stage-btn {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(214, 222, 238, 0.8);
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        .roadshow-stage-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .roadshow-stage-main {
          position: relative;
          z-index: 2;
          display: flex;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: clamp(16px, 2.5vh, 36px);
          text-align: center;
        }

        .roadshow-stage-eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: clamp(11px, 1vw, 20px);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(170, 182, 205, 0.7);
        }

        .roadshow-stage-kind {
          letter-spacing: 0.14em;
        }

        .roadshow-stage-sep {
          opacity: 0.4;
        }

        .roadshow-stage-title {
          max-width: 24ch;
          margin: 0;
          font-size: clamp(24px, 3vw, 92px);
          font-weight: 400;
          line-height: 1.15;
          letter-spacing: -0.02em;
          color: #f4f7ff;
          text-wrap: balance;
        }

        .roadshow-stage-digits {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: clamp(8px, 2vh, 24px) 0;
        }

        .roadshow-digits {
          font-size: clamp(5rem, 28vmin, 48rem);
          font-weight: 180;
          line-height: 0.95;
          letter-spacing: -0.045em;
          font-variant-numeric: tabular-nums;
          color: #f4f7ff;
          text-shadow: 0 0 110px rgba(180, 200, 255, 0.2);
          transition: color 0.4s ease;
        }

        .roadshow-digits.is-overtime {
          color: #ff8a7d;
          text-shadow: 0 0 130px rgba(255, 138, 125, 0.35);
        }

        .roadshow-stage-overtime-label,
        .roadshow-stage-paused-label {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-top: -8px;
          padding: 10px 20px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          font-size: clamp(12px, 1.1vw, 24px);
          letter-spacing: 0.08em;
          background: rgba(255, 255, 255, 0.05);
        }

        .roadshow-stage-overtime-label {
          color: #ff8a7d;
          border-color: rgba(255, 138, 125, 0.35);
          background: rgba(255, 118, 105, 0.12);
        }

        .roadshow-stage-paused-label {
          color: #ffc46b;
          border-color: rgba(255, 196, 107, 0.3);
        }

        .roadshow-stage-progress {
          width: min(1000px, 60vw);
          margin-top: clamp(10px, 2vh, 24px);
        }

        .roadshow-stage-progress .progress-track {
          height: 3px;
          background: rgba(255, 255, 255, 0.14);
        }

        .roadshow-stage-progress .progress-fill {
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.6), #c9d9ff);
        }

        .roadshow-stage-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: clamp(14px, 3vh, 36px);
          transition: opacity 0.4s ease, transform 0.4s ease;
        }

        .roadshow-stage-controls.is-hidden {
          opacity: 0;
          transform: translateY(6px);
          pointer-events: none;
        }

        .roadshow-control-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-width: 140px;
          height: 56px;
          padding: 0 24px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          font-size: 15px;
          font-weight: 500;
          color: rgba(214, 222, 238, 0.9);
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        .roadshow-control-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }

        .roadshow-control-btn-primary {
          border-color: rgba(147, 173, 255, 0.4);
          background: rgba(147, 173, 255, 0.16);
          color: #c7d5ff;
        }

        .roadshow-control-btn-primary:hover {
          background: rgba(147, 173, 255, 0.24);
        }

        @media (max-width: 720px) {
          .roadshow-stage {
            padding: 18px;
          }

          .roadshow-stage-logo {
            width: 34px;
            height: 34px;
            font-size: 11px;
          }

          .roadshow-stage-brand {
            font-size: 13px;
          }

          .roadshow-stage-brand-sub {
            display: none;
          }

          .roadshow-digits {
            font-size: clamp(4rem, 22vmin, 10rem);
          }

          .roadshow-control-btn {
            min-width: 110px;
            height: 48px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
