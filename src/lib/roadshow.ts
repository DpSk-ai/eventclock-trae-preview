import type { RoadshowState } from '../types';
import { MINUTE } from './time';

export const ROADSHOW_PRESETS_SECONDS = [180, 300] as const;
export const MIN_ROADSHOW_MS = 10_000;
export const MAX_ROADSHOW_MS = 4 * 60 * MINUTE;

export function createRoadshow(durationMs = 3 * MINUTE): RoadshowState {
  return {
    durationMs,
    status: 'idle',
    endsAt: null,
    remainingMs: durationMs,
    label: '路演计时',
    teamName: '',
  };
}

export function startRoadshow(state: RoadshowState, now: number, durationMs?: number): RoadshowState {
  const duration = durationMs ?? state.durationMs;
  return {
    ...state,
    durationMs: duration,
    status: 'running',
    endsAt: now + duration,
    remainingMs: duration,
  };
}

export function pauseRoadshow(state: RoadshowState, now: number): RoadshowState {
  if (state.status !== 'running') return state;
  const remainingMs = Math.max(0, (state.endsAt ?? now) - now);
  return {
    ...state,
    status: remainingMs > 0 ? 'paused' : 'finished',
    endsAt: null,
    remainingMs,
  };
}

export function resumeRoadshow(state: RoadshowState, now: number): RoadshowState {
  if (state.status !== 'paused') return state;
  if (state.remainingMs <= 0) return { ...state, status: 'finished' };
  return {
    ...state,
    status: 'running',
    endsAt: now + state.remainingMs,
  };
}

export function resetRoadshow(state: RoadshowState): RoadshowState {
  return {
    ...state,
    status: 'idle',
    endsAt: null,
    remainingMs: state.durationMs,
  };
}

export function configureRoadshow(state: RoadshowState, durationMs: number): RoadshowState {
  return {
    ...state,
    durationMs,
    status: 'idle',
    endsAt: null,
    remainingMs: durationMs,
  };
}

export function finishRoadshow(state: RoadshowState): RoadshowState {
  if (state.status !== 'running') return state;
  return { ...state, status: 'finished', endsAt: null, remainingMs: 0 };
}

export function getRoadshowRemaining(state: RoadshowState, now: number): number {
  switch (state.status) {
    case 'running':
      return (state.endsAt ?? now) - now;
    case 'paused':
      return state.remainingMs;
    case 'finished':
      return 0;
    case 'idle':
    default:
      return state.durationMs;
  }
}

export function isRoadshowOvertime(state: RoadshowState, now: number): boolean {
  return state.status === 'finished' || (state.status === 'running' && getRoadshowRemaining(state, now) <= 0);
}

export function roadshowProgress(state: RoadshowState, now: number): number {
  const remaining = getRoadshowRemaining(state, now);
  if (state.durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, remaining / state.durationMs));
}

export function roadshowStatusLabel(state: RoadshowState, now: number): string {
  if (isRoadshowOvertime(state, now)) return '超时';
  switch (state.status) {
    case 'running':
      return '进行中';
    case 'paused':
      return '已暂停';
    case 'finished':
      return '超时';
    case 'idle':
    default:
      return '就绪';
  }
}
