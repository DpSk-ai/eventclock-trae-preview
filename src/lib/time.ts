import { TIME_ZONE_OPTIONS } from '../types';

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface Countdown {
  remainingMs: number;
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalHours: number;
  isZero: boolean;
}

export function getCountdown(targetAt: number, now: number): Countdown {
  const safeTarget = Number.isFinite(targetAt) ? targetAt : now;
  const delta = safeTarget - now;
  const remainingMs = delta > 0 ? delta : 0;
  const totalSeconds = remainingMs > 0 ? Math.ceil(remainingMs / SECOND) : 0;
  return {
    remainingMs,
    totalSeconds,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalHours: Math.floor(totalSeconds / 3600),
    isZero: remainingMs <= 0,
  };
}

export function getPhase(startAt: number, targetAt: number, now: number): 'upcoming' | 'live' | 'ended' {
  if (now >= targetAt) return 'ended';
  if (now < startAt) return 'upcoming';
  return 'live';
}

export type Severity = 'normal' | 'notice' | 'warning' | 'critical' | 'ended';

export function getSeverity(remainingMs: number): Severity {
  if (remainingMs <= 0) return 'ended';
  if (remainingMs <= 60 * SECOND) return 'critical';
  if (remainingMs <= 5 * MINUTE) return 'warning';
  if (remainingMs <= 10 * MINUTE) return 'notice';
  return 'normal';
}

export function getProgress(startAt: number, targetAt: number, now: number): number {
  if (!Number.isFinite(startAt) || !Number.isFinite(targetAt) || targetAt <= startAt) {
    return now >= targetAt ? 1 : 0;
  }
  return clamp((now - startAt) / (targetAt - startAt), 0, 1);
}

export function padValue(value: number, format: 'padded' | 'plain'): string {
  return format === 'padded' ? pad2(value) : String(value);
}

export function formatClockDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / SECOND));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatCountdownText(
  countdown: Countdown,
  format: 'padded' | 'plain',
): string {
  if (countdown.isZero) return '00:00:00';
  return `${padValue(countdown.totalHours, format)}:${padValue(countdown.minutes, format)}:${padValue(
    countdown.seconds,
    format,
  )}`;
}

export function formatReminderLabel(seconds: number): string {
  if (seconds === 0) return '截止时刻';
  if (seconds % 60 === 0) return `${seconds / 60} 分钟`;
  return `${seconds} 秒`;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
}

function resolveTimeZone(timeZone: string): string | undefined {
  return timeZone === 'system' ? undefined : timeZone;
}

export function isValidTimeZone(timeZone: string): boolean {
  if (timeZone === 'system') return true;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function getZonedParts(epoch: number, timeZone: string): ZonedParts {
  let formatter: Intl.DateTimeFormat;
  const options: Intl.DateTimeFormatOptions = {
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  };
  try {
    formatter = new Intl.DateTimeFormat('zh-CN', { ...options, timeZone: resolveTimeZone(timeZone) });
  } catch {
    formatter = new Intl.DateTimeFormat('zh-CN', options);
  }
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(epoch))) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: map.weekday ?? '',
  };
}

function getTimeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - utcMs;
}

export function zonedDateTimeToEpoch(value: string, timeZone: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? '0');
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }
  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== month - 1 ||
    calendarCheck.getUTCDate() !== day
  ) {
    return null;
  }
  if (timeZone === 'system') {
    return new Date(year, month - 1, day, hour, minute, second, 0).getTime();
  }
  const wallClock = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = getTimeZoneOffsetMs(wallClock, timeZone);
  let epoch = wallClock - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(epoch, timeZone);
  if (secondOffset !== firstOffset) {
    epoch = wallClock - secondOffset;
  }
  return epoch;
}

export function epochToInputValue(epoch: number, timeZone: string): string {
  const parts = getZonedParts(epoch, timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function formatEventDate(epoch: number, timeZone: string): string {
  const parts = getZonedParts(epoch, timeZone);
  return `${parts.month}月${parts.day}日 ${parts.weekday} ${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

export function formatEventTimeRange(startAt: number, endAt: number, timeZone: string): string {
  const start = getZonedParts(startAt, timeZone);
  const end = getZonedParts(endAt, timeZone);
  const sameDay =
    start.year === end.year && start.month === end.month && start.day === end.day;
  if (sameDay) {
    return `${formatEventDate(startAt, timeZone)} – ${pad2(end.hour)}:${pad2(end.minute)}`;
  }
  return `${formatEventDate(startAt, timeZone)} – ${formatEventDate(endAt, timeZone)}`;
}

export function formatStageClock(epoch: number, timeZone: string): string {
  const parts = getZonedParts(epoch, timeZone);
  return `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
}

export function timeZoneLabel(timeZone: string): string {
  const found = TIME_ZONE_OPTIONS.find((zone) => zone.value === timeZone);
  return found ? found.label : timeZone;
}
