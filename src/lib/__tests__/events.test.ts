import { describe, expect, it } from 'vitest';
import {
  createEvent,
  duplicateEvent,
  normalizeReminders,
  sortEvents,
  validateEventDraft,
  type EventDraftInput,
} from '../events';
import type { EventItem } from '../../types';

const start = Date.UTC(2026, 10, 28, 6, 10);
const end = Date.UTC(2026, 10, 28, 9, 10);

function draft(partial: Partial<EventDraftInput> = {}): EventDraftInput {
  return {
    name: '测试活动',
    kind: 'hackathon',
    startAt: start,
    endAt: end,
    targetAt: end,
    reminders: [600, 300, 60, 10, 0],
    ...partial,
  };
}

describe('validateEventDraft', () => {
  it('接受合法配置', () => {
    const result = validateEventDraft(draft());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('拒绝空名称与超长名称', () => {
    expect(validateEventDraft(draft({ name: '   ' })).errors.name).toBeTruthy();
    expect(validateEventDraft(draft({ name: 'x'.repeat(61) })).errors.name).toBeTruthy();
  });

  it('拒绝结束时间早于或等于开始时间', () => {
    const result = validateEventDraft(draft({ endAt: start }));
    expect(result.ok).toBe(false);
    expect(result.errors.endAt).toContain('晚于');
    expect(validateEventDraft(draft({ endAt: start - 1 })).ok).toBe(false);
  });

  it('拒绝目标时间早于开始时间', () => {
    const result = validateEventDraft(draft({ targetAt: start - 1000 }));
    expect(result.ok).toBe(false);
    expect(result.errors.targetAt).toBeTruthy();
  });

  it('拒绝缺失或非法时间', () => {
    const result = validateEventDraft(draft({ startAt: null, endAt: null, targetAt: null }));
    expect(result.ok).toBe(false);
    expect(result.errors.startAt).toBeTruthy();
    expect(result.errors.endAt).toBeTruthy();
    expect(result.errors.targetAt).toBeTruthy();
  });

  it('拒绝 NaN 时间', () => {
    const result = validateEventDraft(draft({ startAt: Number.NaN }));
    expect(result.ok).toBe(false);
    expect(result.errors.startAt).toBeTruthy();
  });

  it('过滤非法提醒阈值，保留合法值', () => {
    const result = validateEventDraft(
      draft({ reminders: [-1, 10, 10, 60, 90000, Number.NaN] }),
    );
    expect(result.ok).toBe(true);
  });

  it('全部提醒非法时给出错误', () => {
    const result = validateEventDraft(draft({ reminders: [-5, 86401] }));
    expect(result.ok).toBe(false);
    expect(result.errors.reminders).toBeTruthy();
  });
});

describe('normalizeReminders', () => {
  it('去重、取整、降序并最多保留 8 个', () => {
    expect(normalizeReminders([10, 600, 10, 300, 59.6])).toEqual([600, 300, 60, 10]);
    expect(normalizeReminders([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toHaveLength(8);
    expect(normalizeReminders([-1, 90000, Number.NaN])).toEqual([]);
  });
});

describe('createEvent / duplicateEvent / sortEvents', () => {
  it('创建时补齐 id 与时间戳并清洗名称与提醒', () => {
    const now = 1_700_000_000_000;
    const event = createEvent(draft({ name: '  名称  ', reminders: [60, 60, 5] }), now, 'evt-1');
    expect(event.id).toBe('evt-1');
    expect(event.name).toBe('名称');
    expect(event.reminders).toEqual([60, 5]);
    expect(event.createdAt).toBe(now);
    expect(event.updatedAt).toBe(now);
  });

  it('复制生成新 id 与副本名称，不改动源对象', () => {
    const now = 1_700_000_000_000;
    const source: EventItem = createEvent(draft(), now, 'evt-src');
    const copy = duplicateEvent(source, now + 1000, 'evt-copy');
    expect(copy.id).toBe('evt-copy');
    expect(copy.name).toBe('测试活动 副本');
    expect(copy.createdAt).toBe(now + 1000);
    expect(source.name).toBe('测试活动');
  });

  it('复制副本时不会叠加副本后缀', () => {
    const now = 1_700_000_000_000;
    const source = createEvent(draft({ name: '测试活动 副本' }), now, 'evt-src');
    expect(duplicateEvent(source, now, 'evt-copy').name).toBe('测试活动 副本');
  });

  it('按开始时间排序', () => {
    const base: EventItem = createEvent(draft(), 1, 'a');
    const later = { ...base, id: 'b', startAt: base.startAt + 1000, createdAt: 2 };
    const earlier = { ...base, id: 'c', startAt: base.startAt - 1000, createdAt: 3 };
    expect(sortEvents([later, base, earlier]).map((event) => event.id)).toEqual(['c', 'a', 'b']);
  });
});
