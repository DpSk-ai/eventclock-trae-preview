import { beforeEach, describe, expect, it } from 'vitest';
import {
  BACKUP_PREFIX,
  STORAGE_KEY,
  STORAGE_VERSION,
  backupCorruptPayload,
  createDefaultState,
  loadState,
  parseImportPayload,
  parsePersisted,
  sanitizeRoadshow,
  saveState,
  serializeExport,
} from '../storage';
import type { EventItem, PersistedState } from '../../types';

const NOW = Date.UTC(2026, 10, 18, 4, 0);

function stateWithEvents(): PersistedState {
  return createDefaultState(NOW);
}

describe('parsePersisted', () => {
  it('空存储返回默认活动，未标记为恢复', () => {
    const result = parsePersisted(null, NOW);
    expect(result.recovered).toBe(false);
    expect(result.state.events).toHaveLength(1);
    expect(result.state.events[0].name).toContain('四川大学');
    expect(result.state.activeEventId).toBe(result.state.events[0].id);
    expect(result.state.settings.theme).toBe('dark');
  });

  it('默认活动为北京时间 2026-11-28 14:10–17:10', () => {
    const event = parsePersisted(null, NOW).state.events[0];
    expect(event.startAt).toBe(Date.UTC(2026, 10, 28, 6, 10));
    expect(event.endAt).toBe(Date.UTC(2026, 10, 28, 9, 10));
    expect(event.targetAt).toBe(event.endAt);
  });

  it('损坏 JSON 恢复默认并保留原始数据用于备份', () => {
    const result = parsePersisted('{ broken json', NOW);
    expect(result.recovered).toBe(true);
    expect(result.reason).toBeTruthy();
    expect(result.raw).toBe('{ broken json');
    expect(result.state.events).toHaveLength(1);
  });

  it('结构异常返回默认', () => {
    expect(parsePersisted('[]', NOW).recovered).toBe(true);
    expect(parsePersisted('{"events":"nope"}', NOW).recovered).toBe(true);
  });

  it('不支持的数据版本触发恢复', () => {
    const result = parsePersisted(JSON.stringify({ version: 99, events: [] }), NOW);
    expect(result.recovered).toBe(true);
    expect(result.state.version).toBe(STORAGE_VERSION);
  });

  it('丢弃损坏活动并保留有效活动', () => {
    const valid = createDefaultState(NOW).events[0];
    const raw = JSON.stringify({
      version: 2,
      events: [valid, { id: 'broken' }],
      activeEventId: valid.id,
      settings: {},
      roadshow: {},
    });
    const result = parsePersisted(raw, NOW);
    expect(result.recovered).toBe(true);
    expect(result.state.events.map((event) => event.id)).toEqual([valid.id]);
  });

  it('允许用户删除所有活动后的空列表', () => {
    const base = createDefaultState(NOW);
    base.events = [];
    base.activeEventId = null;
    const result = parsePersisted(JSON.stringify(base), NOW);
    expect(result.recovered).toBe(false);
    expect(result.state.events).toEqual([]);
    expect(result.state.activeEventId).toBeNull();
  });

  it('activeEventId 失效时回退到第一个活动', () => {
    const base = createDefaultState(NOW);
    base.activeEventId = 'missing';
    const result = parsePersisted(JSON.stringify(base), NOW);
    expect(result.state.activeEventId).toBe(base.events[0].id);
  });

  it('清洗非法设置并保留合法字段', () => {
    const base = createDefaultState(NOW);
    const raw = JSON.stringify({
      ...base,
      settings: {
        theme: 'neon',
        displayMode: 'compact',
        numberFormat: 'plain',
        timeZone: 'Mars/Olympus',
        animations: false,
      },
    });
    const settings = parsePersisted(raw, NOW).state.settings;
    expect(settings.theme).toBe('dark');
    expect(settings.displayMode).toBe('compact');
    expect(settings.numberFormat).toBe('plain');
    expect(settings.timeZone).toBe('Asia/Shanghai');
    expect(settings.animations).toBe(false);
    expect(settings.sound).toBe(true);
  });

  it('恢复中的路演计时缺少结束时间时转为暂停', () => {
    const roadshow = sanitizeRoadshow({
      status: 'running',
      durationMs: 180000,
      endsAt: null,
      remainingMs: 120000,
    });
    expect(roadshow.status).toBe('paused');
    expect(roadshow.remainingMs).toBe(120000);
  });

  it('清洗路演时长边界', () => {
    expect(sanitizeRoadshow({ durationMs: 1000 }).durationMs).toBe(180000);
    expect(sanitizeRoadshow({ durationMs: 5 * 60 * 60 * 1000 }).durationMs).toBe(180000);
  });
});

describe('storage 持久化', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('保存后可完整读回', () => {
    const state = stateWithEvents();
    state.settings.theme = 'light';
    expect(saveState(state)).toBe(true);
    const result = loadState(localStorage, NOW);
    expect(result.recovered).toBe(false);
    expect(result.state.settings.theme).toBe('light');
    expect(result.state.events[0].id).toBe(state.events[0].id);
  });

  it('读取过程中损坏会恢复并给出原因', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    const result = loadState(localStorage, NOW);
    expect(result.recovered).toBe(true);
    expect(result.reason).toBeTruthy();
    expect(result.state.events).toHaveLength(1);
  });

  it('备份损坏数据到独立键', () => {
    const key = backupCorruptPayload('broken-payload', localStorage, NOW);
    expect(key).toBe(`${BACKUP_PREFIX}${NOW}`);
    expect(localStorage.getItem(key!)).toBe('broken-payload');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('存储写入异常时返回 false 而不抛出', () => {
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } as unknown as Storage;
    expect(saveState(stateWithEvents(), failing)).toBe(false);
  });
});

describe('导入导出', () => {
  it('导出后可重新导入', () => {
    const state = stateWithEvents();
    const text = serializeExport(state, NOW);
    const payload = JSON.parse(text);
    expect(payload.app).toBe('eventclock-v2');
    expect(payload.version).toBe(STORAGE_VERSION);
    expect(payload.exportedAt).toBe(new Date(NOW).toISOString());

    const result = parseImportPayload(text);
    expect(result.ok).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.settings?.theme).toBe('dark');
  });

  it('拒绝非 JSON 与缺少活动列表的文件', () => {
    expect(parseImportPayload('oops').ok).toBe(false);
    expect(parseImportPayload('{"version":2}').ok).toBe(false);
    expect(parseImportPayload('{"version":2,"events":[]}').ok).toBe(false);
  });

  it('拒绝更高版本导入', () => {
    const result = parseImportPayload('{"version":999,"events":[]}');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('版本');
  });

  it('导入时丢弃非法活动与重复 id', () => {
    const event: EventItem = createDefaultState(NOW).events[0];
    const raw = JSON.stringify({
      version: 2,
      events: [event, { ...event }, { id: 'bad', name: '坏数据', startAt: 10, endAt: 5 }],
    });
    const result = parseImportPayload(raw);
    expect(result.ok).toBe(true);
    expect(result.events).toHaveLength(1);
  });
});
