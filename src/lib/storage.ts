import {
  EVENT_KINDS,
  type EventItem,
  type PersistedState,
  type RoadshowState,
  type Settings,
} from '../types';
import { isValidTimeZone, MINUTE } from './time';

export const STORAGE_KEY = 'eventclock.v2.state';
export const BACKUP_PREFIX = 'eventclock.v2.corrupt.';
export const STORAGE_VERSION = 2;
export const EXPORT_APP_ID = 'eventclock-v2';

export function createDefaultSettings(): Settings {
  return {
    theme: 'dark',
    displayMode: 'days',
    numberFormat: 'padded',
    timeZone: 'Asia/Shanghai',
    animations: true,
    sound: true,
    remindersEnabled: true,
  };
}

export function createDefaultEvent(now = Date.now()): EventItem {
  const startAt = Date.UTC(2026, 10, 28, 6, 10);
  const endAt = Date.UTC(2026, 10, 28, 9, 10);
  return {
    id: 'evt-trae-campus-2026',
    name: '四川大学 TRAE on Campus AI Coding Hackathon',
    kind: 'hackathon',
    startAt,
    endAt,
    targetAt: endAt,
    reminders: [600, 300, 60, 10, 0],
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultRoadshow(): RoadshowState {
  const durationMs = 3 * MINUTE;
  return {
    durationMs,
    status: 'idle',
    endsAt: null,
    remainingMs: durationMs,
    label: '路演计时',
    teamName: '',
  };
}

export function createDefaultState(now = Date.now()): PersistedState {
  const event = createDefaultEvent(now);
  return {
    version: STORAGE_VERSION,
    events: [event],
    activeEventId: event.id,
    settings: createDefaultSettings(),
    roadshow: createDefaultRoadshow(),
  };
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function sanitizeReminders(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<number>();
  for (const value of raw) {
    const numeric = asFiniteNumber(value);
    if (numeric === null) continue;
    const seconds = Math.round(numeric);
    if (seconds < 0 || seconds > 86400) continue;
    unique.add(seconds);
  }
  return [...unique].sort((a, b) => b - a).slice(0, 8);
}

export function sanitizeEvent(raw: unknown): EventItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : null;
  const name = typeof source.name === 'string' ? source.name.trim().slice(0, 60) : '';
  const startAt = asFiniteNumber(source.startAt);
  const endAt = asFiniteNumber(source.endAt);
  if (!id || !name || startAt === null || endAt === null) return null;
  if (endAt <= startAt) return null;
  const targetRaw = asFiniteNumber(source.targetAt);
  const targetAt = targetRaw !== null && targetRaw > startAt ? targetRaw : endAt;
  const kind = EVENT_KINDS.includes(source.kind as EventItem['kind'])
    ? (source.kind as EventItem['kind'])
    : 'other';
  const createdAt = asFiniteNumber(source.createdAt) ?? Date.now();
  const updatedAt = asFiniteNumber(source.updatedAt) ?? createdAt;
  return {
    id,
    name,
    kind,
    startAt,
    endAt,
    targetAt,
    reminders: sanitizeReminders(source.reminders),
    createdAt,
    updatedAt,
  };
}

export function sanitizeSettings(raw: unknown): Settings {
  const defaults = createDefaultSettings();
  if (!raw || typeof raw !== 'object') return defaults;
  const source = raw as Record<string, unknown>;
  const theme = source.theme === 'light' || source.theme === 'dark' ? source.theme : defaults.theme;
  const displayMode =
    source.displayMode === 'days' || source.displayMode === 'hours' || source.displayMode === 'compact'
      ? source.displayMode
      : defaults.displayMode;
  const numberFormat =
    source.numberFormat === 'padded' || source.numberFormat === 'plain'
      ? source.numberFormat
      : defaults.numberFormat;
  const timeZone =
    typeof source.timeZone === 'string' && isValidTimeZone(source.timeZone)
      ? source.timeZone
      : defaults.timeZone;
  const animations = typeof source.animations === 'boolean' ? source.animations : defaults.animations;
  const sound = typeof source.sound === 'boolean' ? source.sound : defaults.sound;
  const remindersEnabled =
    typeof source.remindersEnabled === 'boolean' ? source.remindersEnabled : defaults.remindersEnabled;
  return {
    theme,
    displayMode,
    numberFormat,
    timeZone,
    animations,
    sound,
    remindersEnabled,
  };
}

export function sanitizeRoadshow(raw: unknown): RoadshowState {
  const defaults = createDefaultRoadshow();
  if (!raw || typeof raw !== 'object') return defaults;
  const source = raw as Record<string, unknown>;
  const durationRaw = asFiniteNumber(source.durationMs);
  const durationMs =
    durationRaw !== null && durationRaw >= 10_000 && durationRaw <= 4 * 60 * MINUTE
      ? durationRaw
      : defaults.durationMs;
  const status =
    source.status === 'running' ||
    source.status === 'paused' ||
    source.status === 'idle' ||
    source.status === 'finished'
      ? source.status
      : defaults.status;
  const label = typeof source.label === 'string' && source.label.trim()
    ? source.label.trim().slice(0, 40)
    : defaults.label;
  const teamName = typeof source.teamName === 'string'
    ? source.teamName.slice(0, 50)
    : '';
  const endsAt = asFiniteNumber(source.endsAt);
  const remainingRaw = asFiniteNumber(source.remainingMs);
  const remainingMs = Math.min(
    durationMs,
    Math.max(0, remainingRaw ?? durationMs),
  );
  if (status === 'running') {
    return {
      durationMs,
      status: endsAt !== null ? 'running' : 'paused',
      endsAt: endsAt !== null ? endsAt : null,
      remainingMs,
      label,
      teamName,
    };
  }
  return { durationMs, status, endsAt: null, remainingMs, label, teamName };
}

export interface LoadResult {
  state: PersistedState;
  recovered: boolean;
  reason?: string;
  raw?: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePersisted(
  raw: string | null,
  now = Date.now(),
  readError?: unknown,
): LoadResult {
  const defaults = createDefaultState(now);
  if (raw === null || raw === undefined) {
    return { state: defaults, recovered: false };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      state: defaults,
      recovered: true,
      reason: '本地数据无法解析，已恢复为默认内容',
      raw,
    };
  }
  if (!isPlainObject(parsed)) {
    return {
      state: defaults,
      recovered: true,
      reason: '本地数据结构异常，已恢复为默认内容',
      raw,
    };
  }
  const version = asFiniteNumber(parsed.version);
  if (version === null || version > STORAGE_VERSION || version < 1) {
    return {
      state: defaults,
      recovered: true,
      reason: '本地数据版本不受支持，已恢复为默认内容',
      raw,
    };
  }
  if (!Array.isArray(parsed.events)) {
    return {
      state: defaults,
      recovered: true,
      reason: '活动数据缺失，已恢复为默认内容',
      raw,
    };
  }

  const seen = new Set<string>();
  const sanitized: EventItem[] = [];
  for (const item of parsed.events) {
    const event = sanitizeEvent(item);
    if (event && !seen.has(event.id)) {
      seen.add(event.id);
      sanitized.push(event);
    }
  }
  const droppedCount = parsed.events.length - sanitized.length;
  let recovered = droppedCount > 0;
  let reason: string | undefined = recovered
    ? `已忽略 ${droppedCount} 条损坏的活动数据`
    : undefined;
  let events = sanitized;
  if (events.length === 0 && parsed.events.length > 0) {
    events = defaults.events;
    recovered = true;
    reason = '没有可用的活动数据，已恢复默认活动';
  }
  const settings = sanitizeSettings(parsed.settings);
  const roadshow = sanitizeRoadshow(parsed.roadshow);
  const activeEventId =
    typeof parsed.activeEventId === 'string' &&
    events.some((event) => event.id === parsed.activeEventId)
      ? parsed.activeEventId
      : (events[0]?.id ?? null);

  if (readError) {
    recovered = true;
    reason = '读取本地数据失败，已使用默认内容';
  }

  return {
    state: {
      version: STORAGE_VERSION,
      events,
      activeEventId,
      settings,
      roadshow,
    },
    recovered,
    reason,
    raw: recovered ? raw : undefined,
  };
}

export function loadState(storage?: Storage, now = Date.now()): LoadResult {
  let target: Storage | undefined = storage;
  if (!target) {
    try {
      target = window.localStorage;
    } catch {
      return { state: createDefaultState(now), recovered: true, reason: '浏览器禁用了本地存储' };
    }
  }
  let raw: string | null = null;
  try {
    raw = target.getItem(STORAGE_KEY);
  } catch {
    return { state: createDefaultState(now), recovered: true, reason: '读取本地存储失败' };
  }
  return parsePersisted(raw, now);
}

export function saveState(state: PersistedState, storage?: Storage): boolean {
  let target: Storage | undefined = storage;
  if (!target) {
    try {
      target = window.localStorage;
    } catch {
      return false;
    }
  }
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function backupCorruptPayload(raw: string, storage?: Storage, now = Date.now()): string | null {
  let target: Storage | undefined = storage;
  if (!target) {
    try {
      target = window.localStorage;
    } catch {
      return null;
    }
  }
  const key = `${BACKUP_PREFIX}${now}`;
  try {
    target.setItem(key, raw);
    return key;
  } catch {
    return null;
  }
}

export interface ExportPayload {
  app: typeof EXPORT_APP_ID;
  version: number;
  exportedAt: string;
  activeEventId: string | null;
  events: EventItem[];
  settings: Settings;
}

export function buildExportPayload(state: PersistedState, now = Date.now()): ExportPayload {
  return {
    app: EXPORT_APP_ID,
    version: STORAGE_VERSION,
    exportedAt: new Date(now).toISOString(),
    activeEventId: state.activeEventId,
    events: state.events,
    settings: state.settings,
  };
}

export function serializeExport(state: PersistedState, now = Date.now()): string {
  return JSON.stringify(buildExportPayload(state, now), null, 2);
}

export interface ImportResult {
  ok: boolean;
  events?: EventItem[];
  settings?: Settings;
  activeEventId?: string | null;
  error?: string;
}

export function parseImportPayload(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: '文件不是有效的 JSON，无法导入' };
  }
  if (!isPlainObject(parsed)) {
    return { ok: false, error: '导入文件结构无效' };
  }
  if (typeof parsed.version === 'number' && parsed.version > STORAGE_VERSION) {
    return { ok: false, error: '导入文件版本高于当前应用版本' };
  }
  if (!Array.isArray(parsed.events)) {
    return { ok: false, error: '导入文件缺少活动列表' };
  }
  const events: EventItem[] = [];
  const seen = new Set<string>();
  for (const item of parsed.events) {
    const event = sanitizeEvent(item);
    if (event && !seen.has(event.id)) {
      seen.add(event.id);
      events.push(event);
    }
  }
  if (events.length === 0) {
    return { ok: false, error: '导入文件中没有可用的活动' };
  }
  const settings = sanitizeSettings(parsed.settings);
  const activeEventId =
    typeof parsed.activeEventId === 'string' && events.some((event) => event.id === parsed.activeEventId)
      ? parsed.activeEventId
      : events[0].id;
  return { ok: true, events, settings, activeEventId };
}
