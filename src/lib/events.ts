import { type EventItem, type EventKind } from '../types';
import { newId } from './ids';

export const DEFAULT_REMINDERS = [600, 300, 60, 10, 0];

export interface EventDraftInput {
  name: string;
  kind: EventKind;
  startAt: number | null;
  endAt: number | null;
  targetAt: number | null;
  reminders: number[];
}

export interface FieldErrors {
  name?: string;
  startAt?: string;
  endAt?: string;
  targetAt?: string;
  reminders?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: FieldErrors;
}

export function normalizeReminders(reminders: readonly number[]): number[] {
  const unique = new Set<number>();
  for (const value of reminders) {
    if (!Number.isFinite(value)) continue;
    const seconds = Math.round(value);
    if (seconds < 0 || seconds > 86400) continue;
    unique.add(seconds);
  }
  return [...unique].sort((a, b) => b - a).slice(0, 8);
}

export function validateEventDraft(input: EventDraftInput): ValidationResult {
  const errors: FieldErrors = {};
  const name = input.name.trim();
  if (!name) {
    errors.name = '请填写活动名称';
  } else if (name.length > 60) {
    errors.name = '活动名称不能超过 60 个字符';
  }

  if (input.startAt === null || !Number.isFinite(input.startAt)) {
    errors.startAt = '请选择有效的开始时间';
  }
  if (input.endAt === null || !Number.isFinite(input.endAt)) {
    errors.endAt = '请选择有效的结束时间';
  }
  if (input.targetAt === null || !Number.isFinite(input.targetAt)) {
    errors.targetAt = '请选择有效的倒计时目标时间';
  }

  if (!errors.startAt && !errors.endAt && input.endAt !== null && input.startAt !== null) {
    if (input.endAt <= input.startAt) {
      errors.endAt = '结束时间必须晚于开始时间';
    }
  }
  if (!errors.startAt && !errors.targetAt && input.targetAt !== null && input.startAt !== null) {
    if (input.targetAt <= input.startAt) {
      errors.targetAt = '目标时间必须晚于开始时间';
    }
  }
  if (input.endAt !== null && input.targetAt !== null && Number.isFinite(input.endAt) && Number.isFinite(input.targetAt)) {
    if (input.targetAt > input.endAt + 365 * 24 * 60 * 60 * 1000) {
      errors.targetAt = '目标时间与结束时间相差过大';
    }
  }

  const reminders = normalizeReminders(input.reminders);
  if (reminders.length === 0 && input.reminders.length > 0) {
    errors.reminders = '提醒阈值必须在 0 秒到 24 小时之间';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function sortEvents(events: readonly EventItem[]): EventItem[] {
  return [...events].sort((a, b) => {
    if (a.startAt !== b.startAt) return a.startAt - b.startAt;
    return a.createdAt - b.createdAt;
  });
}

export function createEvent(
  input: EventDraftInput,
  now: number,
  id?: string,
): EventItem {
  return {
    id: id ?? newId(),
    name: input.name.trim(),
    kind: input.kind,
    startAt: input.startAt ?? now,
    endAt: input.endAt ?? now,
    targetAt: input.targetAt ?? input.endAt ?? now,
    reminders: normalizeReminders(input.reminders),
    createdAt: now,
    updatedAt: now,
  };
}

export function applyDraftToEvent(event: EventItem, input: EventDraftInput, now: number): EventItem {
  return {
    ...event,
    name: input.name.trim(),
    kind: input.kind,
    startAt: input.startAt ?? event.startAt,
    endAt: input.endAt ?? event.endAt,
    targetAt: input.targetAt ?? event.targetAt,
    reminders: normalizeReminders(input.reminders),
    updatedAt: now,
  };
}

export function duplicateEvent(event: EventItem, now: number, id?: string): EventItem {
  const suffix = ' 副本';
  const base = event.name.endsWith(suffix) ? event.name.slice(0, -suffix.length) : event.name;
  const nextName = `${base}${suffix}`.slice(0, 60);
  return {
    ...event,
    id: id ?? newId(),
    name: nextName,
    createdAt: now,
    updatedAt: now,
  };
}
