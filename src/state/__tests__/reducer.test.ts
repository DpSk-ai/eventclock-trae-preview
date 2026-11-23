import { describe, expect, it } from 'vitest';
import { reducer } from '../reducer';
import { createDefaultState, createDefaultSettings } from '../../lib/storage';
import type { EventDraftInput } from '../../lib/events';
import type { EventItem } from '../../types';

const NOW = Date.UTC(2026, 10, 18, 4, 0);
const START = Date.UTC(2026, 11, 1, 2, 0);
const END = Date.UTC(2026, 11, 1, 5, 0);

function draft(partial: Partial<EventDraftInput> = {}): EventDraftInput {
  return {
    name: '新活动',
    kind: 'workshop',
    startAt: START,
    endAt: END,
    targetAt: END,
    reminders: [300, 60],
    ...partial,
  };
}

function baseState() {
  return createDefaultState(NOW);
}

describe('活动 CRUD', () => {
  it('新增活动后排序并设为当前活动', () => {
    const state = baseState();
    const next = reducer(state, {
      type: 'event/add',
      draft: draft(),
      now: NOW,
      id: 'evt-new',
    });
    expect(next.events.some((event) => event.id === 'evt-new')).toBe(true);
    expect(next.activeEventId).toBe('evt-new');
    expect(next.events[0].startAt).toBeLessThanOrEqual(next.events[1].startAt);
  });

  it('编辑活动保留 id 与创建时间，更新 updatedAt', () => {
    const state = baseState();
    const original = state.events[0];
    const next = reducer(state, {
      type: 'event/update',
      id: original.id,
      draft: draft({ name: '改名后的活动' }),
      now: NOW + 5000,
    });
    const updated = next.events.find((event) => event.id === original.id)!;
    expect(updated.name).toBe('改名后的活动');
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt).toBe(NOW + 5000);
  });

  it('编辑不存在的活动不改变状态', () => {
    const state = baseState();
    const next = reducer(state, {
      type: 'event/update',
      id: 'missing',
      draft: draft(),
      now: NOW,
    });
    expect(next).toBe(state);
  });

  it('删除当前活动后回退到列表第一个', () => {
    const state = baseState();
    const withSecond = reducer(state, {
      type: 'event/add',
      draft: draft({ name: '第二个' }),
      now: NOW,
      id: 'evt-second',
    });
    const next = reducer(withSecond, { type: 'event/delete', id: 'evt-second' });
    expect(next.events.map((event) => event.id)).not.toContain('evt-second');
    expect(next.activeEventId).toBe(state.events[0].id);
  });

  it('删除最后一个活动后活动列表为空', () => {
    const state = baseState();
    const next = reducer(state, { type: 'event/delete', id: state.events[0].id });
    expect(next.events).toEqual([]);
    expect(next.activeEventId).toBeNull();
  });

  it('复制活动生成副本并激活', () => {
    const state = baseState();
    const next = reducer(state, {
      type: 'event/duplicate',
      id: state.events[0].id,
      now: NOW,
      newEventId: 'evt-copy',
    });
    expect(next.events).toHaveLength(2);
    expect(next.activeEventId).toBe('evt-copy');
    expect(next.events.find((event) => event.id === 'evt-copy')?.name).toContain('副本');
  });

  it('切换活动只影响 activeEventId', () => {
    const state = baseState();
    const withSecond = reducer(state, {
      type: 'event/add',
      draft: draft(),
      now: NOW,
      id: 'evt-second',
    });
    const next = reducer(withSecond, { type: 'event/activate', id: state.events[0].id });
    expect(next.activeEventId).toBe(state.events[0].id);
    expect(next.events).toEqual(withSecond.events);
  });

  it('切换到不存在的活动无效', () => {
    const state = baseState();
    expect(reducer(state, { type: 'event/activate', id: 'nope' })).toBe(state);
  });
});

describe('设置与数据', () => {
  it('更新单个设置字段', () => {
    const state = baseState();
    const next = reducer(state, {
      type: 'settings/update',
      patch: { theme: 'light', sound: false },
    });
    expect(next.settings.theme).toBe('light');
    expect(next.settings.sound).toBe(false);
    expect(next.settings.displayMode).toBe(state.settings.displayMode);
  });

  it('恢复默认设置', () => {
    const state = { ...baseState(), settings: { ...baseState().settings, theme: 'light' as const } };
    const next = reducer(state, { type: 'settings/reset' });
    expect(next.settings).toEqual(createDefaultSettings());
  });

  it('导入替换活动与设置并清理当前活动', () => {
    const state = baseState();
    const imported: EventItem[] = [
      { ...state.events[0], id: 'imported-a', name: '导入 A', startAt: START, endAt: END, targetAt: END },
      { ...state.events[0], id: 'imported-b', name: '导入 B', startAt: START + 1, endAt: END + 1, targetAt: END + 1 },
    ];
    const next = reducer(state, {
      type: 'data/import',
      events: imported,
      settings: { ...createDefaultSettings(), theme: 'light', timeZone: 'UTC' },
      activeEventId: 'imported-b',
    });
    expect(next.events.map((event) => event.id)).toEqual(['imported-a', 'imported-b']);
    expect(next.activeEventId).toBe('imported-b');
    expect(next.settings.theme).toBe('light');
    expect(next.settings.timeZone).toBe('UTC');
  });

  it('导入空列表被忽略', () => {
    const state = baseState();
    const next = reducer(state, {
      type: 'data/import',
      events: [],
      settings: createDefaultSettings(),
      activeEventId: null,
    });
    expect(next).toBe(state);
  });

  it('重置数据恢复默认活动与设置', () => {
    const state = baseState();
    const modified = reducer(state, { type: 'settings/update', patch: { theme: 'light' } });
    const next = reducer(modified, { type: 'data/reset', now: NOW });
    expect(next.settings.theme).toBe('dark');
    expect(next.events).toHaveLength(1);
    expect(next.events[0].id).toBe(state.events[0].id);
  });
});

describe('路演 reducer 动作', () => {
  it('开始、暂停、继续、结束、重置', () => {
    let state = baseState();
    state = reducer(state, { type: 'roadshow/start', now: NOW });
    expect(state.roadshow.status).toBe('running');
    state = reducer(state, { type: 'roadshow/pause', now: NOW + 20_000 });
    expect(state.roadshow.remainingMs).toBe(160_000);
    state = reducer(state, { type: 'roadshow/resume', now: NOW + 30_000 });
    expect(state.roadshow.endsAt).toBe(NOW + 30_000 + 160_000);
    state = reducer(state, { type: 'roadshow/finish' });
    expect(state.roadshow.status).toBe('finished');
    state = reducer(state, { type: 'roadshow/reset' });
    expect(state.roadshow.status).toBe('idle');
    expect(state.roadshow.remainingMs).toBe(180_000);
  });

  it('配置时长会重置计时', () => {
    let state = baseState();
    state = reducer(state, { type: 'roadshow/start', now: NOW });
    state = reducer(state, { type: 'roadshow/configure', durationMs: 300_000 });
    expect(state.roadshow.status).toBe('idle');
    expect(state.roadshow.durationMs).toBe(300_000);
  });

  it('路演动作不影响活动与设置', () => {
    const state = baseState();
    const next = reducer(state, { type: 'roadshow/start', now: NOW });
    expect(next.events).toEqual(state.events);
    expect(next.settings).toEqual(state.settings);
    expect(next.activeEventId).toBe(state.activeEventId);
  });
});
