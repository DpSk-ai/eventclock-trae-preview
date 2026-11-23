import { useEffect, useState } from 'react';
import { Maximize2, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import type { RoadshowState } from '../types';
import {
  getRoadshowRemaining,
  isRoadshowOvertime,
  roadshowProgress,
  roadshowStatusLabel,
} from '../lib/roadshow';
import { formatClockDuration } from '../lib/time';

interface RoadshowTimerProps {
  state: RoadshowState;
  now: number;
  teamName: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onConfigure: (durationMs: number) => void;
  onTeamNameChange: (name: string) => void;
  onOpenStage: () => void;
}

export function RoadshowTimer({
  state,
  now,
  teamName,
  onStart,
  onPause,
  onResume,
  onReset,
  onConfigure,
  onTeamNameChange,
  onOpenStage,
}: RoadshowTimerProps) {
  const minutes = state.durationMs / 60000;
  const isPreset = minutes === 3 || minutes === 5;
  const [customValue, setCustomValue] = useState(isPreset ? '' : String(minutes));
  const [customError, setCustomError] = useState('');

  useEffect(() => {
    const currentMinutes = state.durationMs / 60000;
    if (currentMinutes !== 3 && currentMinutes !== 5) {
      setCustomValue(String(currentMinutes));
    }
  }, [state.durationMs]);

  const remaining = getRoadshowRemaining(state, now);
  const overtime = isRoadshowOvertime(state, now);
  const statusLabel = roadshowStatusLabel(state, now);
  const progress = roadshowProgress(state, now);
  const display = overtime
    ? state.status === 'running' && remaining < 0
      ? `-${formatClockDuration(Math.abs(remaining))}`
      : '00:00'
    : formatClockDuration(remaining);

  const applyCustom = () => {
    const parsed = Number(customValue);
    if (!customValue.trim() || !Number.isFinite(parsed)) {
      setCustomError('请输入自定义分钟数');
      return;
    }
    if (parsed < 0.5 || parsed > 240) {
      setCustomError('请输入 0.5–240 分钟之间的时长');
      return;
    }
    setCustomError('');
    onConfigure(Math.round(parsed * 60) * 1000);
  };

  return (
    <section className="panel roadshow" aria-labelledby="roadshow-heading">
      <div className="panel-head">
        <div>
          <h2 id="roadshow-heading" className="panel-title">
            路演计时
            <span className="isolation-badge">独立</span>
          </h2>
          <p className="panel-subtitle">与活动倒计时互不影响</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`timer-status timer-status-${overtime ? 'overtime' : state.status}`}>
            {statusLabel}
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={onOpenStage}
            aria-label="路演投影大屏"
            title="路演投影大屏"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div className="form-field" style={{ marginTop: '10px' }}>
        <label htmlFor="team-name" className="form-label">
          队伍/选手名称
        </label>
        <input
          type="text"
          id="team-name"
          className="text-input"
          value={teamName}
          onChange={(e) => onTeamNameChange(e.target.value)}
          placeholder="参赛队伍"
          maxLength={50}
        />
      </div>

      <div className="preset-row" role="group" aria-label="路演时长">
        <button
          type="button"
          className="preset-btn"
          aria-pressed={minutes === 3}
          onClick={() => onConfigure(3 * 60 * 1000)}
        >
          3 分钟
        </button>
        <button
          type="button"
          className="preset-btn"
          aria-pressed={minutes === 5}
          onClick={() => onConfigure(5 * 60 * 1000)}
        >
          5 分钟
        </button>
        <div className="preset-custom">
          <input
            type="number"
            min={0.5}
            max={240}
            step={0.5}
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyCustom();
              }
            }}
            aria-label="自定义路演时长（分钟）"
            aria-invalid={Boolean(customError)}
            placeholder="自定义"
            className="preset-input"
          />
          <button type="button" className="preset-apply" onClick={applyCustom}>
            设定
          </button>
        </div>
      </div>
      {customError ? (
        <p className="field-error" role="alert">
          {customError}
        </p>
      ) : null}

      <div className={`timer-display ${overtime ? 'is-overtime' : ''}`}>
        <span className="timer-digits" role="timer" aria-label={`路演剩余 ${display}`}>
          {display}
        </span>
        <span className="timer-caption">
          <Timer size={13} />
          总时长 {formatClockDuration(state.durationMs)}
        </span>
      </div>

      <div className="timer-progress">
        <div className="progress-track" aria-hidden="true">
          <span className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="timer-controls">
        {state.status === 'idle' ? (
          <button type="button" className="btn btn-primary flex-1" onClick={onStart}>
            <Play size={15} />
            开始计时
          </button>
        ) : null}
        {state.status === 'running' ? (
          <button type="button" className="btn btn-primary flex-1" onClick={onPause}>
            <Pause size={15} />
            暂停
          </button>
        ) : null}
        {state.status === 'paused' ? (
          <button type="button" className="btn btn-primary flex-1" onClick={onResume}>
            <Play size={15} />
            继续
          </button>
        ) : null}
        {state.status === 'finished' ? (
          <button type="button" className="btn btn-primary flex-1" onClick={onStart}>
            <Play size={15} />
            重新开始
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-outline"
          onClick={onReset}
          disabled={state.status === 'idle'}
        >
          <RotateCcw size={15} />
          重置
        </button>
      </div>

      {overtime ? (
        <p className="timer-overtime-note" role="status">
          路演时间已到，请控制现场节奏
        </p>
      ) : null}
    </section>
  );
}
