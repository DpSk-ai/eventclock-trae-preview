import { describe, expect, it } from 'vitest';
import {
  DAY,
  HOUR,
  MINUTE,
  SECOND,
  epochToInputValue,
  formatClockDuration,
  formatEventTimeRange,
  formatStageClock,
  getCountdown,
  getPhase,
  getProgress,
  getSeverity,
  getZonedParts,
  padValue,
  zonedDateTimeToEpoch,
} from '../time';

describe('getCountdown', () => {
  it('拆分天、时、分、秒与总小时', () => {
    const now = Date.UTC(2026, 10, 28, 0, 0, 0);
    const target = now + 3 * DAY + 4 * HOUR + 5 * MINUTE + 6 * SECOND;
    const countdown = getCountdown(target, now);
    expect(countdown).toMatchObject({
      days: 3,
      hours: 4,
      minutes: 5,
      seconds: 6,
      totalHours: 76,
      isZero: false,
    });
    expect(countdown.remainingMs).toBe(target - now);
  });

  it('向上取整，避免最后一秒提前归零', () => {
    expect(getCountdown(5000, 4000).totalSeconds).toBe(1);
    expect(getCountdown(5000, 4500).seconds).toBe(1);
    expect(getCountdown(5000, 5000).totalSeconds).toBe(0);
  });

  it('目标已过时归零且不出现负数', () => {
    const countdown = getCountdown(1000, 9000);
    expect(countdown.remainingMs).toBe(0);
    expect(countdown.totalSeconds).toBe(0);
    expect(countdown.days).toBe(0);
    expect(countdown.isZero).toBe(true);
  });

  it('非法目标时间不会产生 NaN', () => {
    const countdown = getCountdown(Number.NaN, 1000);
    expect(Number.isNaN(countdown.remainingMs)).toBe(false);
    expect(countdown.isZero).toBe(true);
  });

  it('跨天计算总小时正确', () => {
    const countdown = getCountdown(49 * HOUR, 0);
    expect(countdown.days).toBe(2);
    expect(countdown.hours).toBe(1);
    expect(countdown.totalHours).toBe(49);
  });
});

describe('getPhase', () => {
  const start = Date.UTC(2026, 10, 28, 6, 10);
  const target = Date.UTC(2026, 10, 28, 9, 10);

  it('开始前为 upcoming', () => {
    expect(getPhase(start, target, start - 1)).toBe('upcoming');
  });

  it('开始后、目标前为 live', () => {
    expect(getPhase(start, target, start)).toBe('live');
    expect(getPhase(start, target, target - 1)).toBe('live');
  });

  it('到达目标后为 ended', () => {
    expect(getPhase(start, target, target)).toBe('ended');
    expect(getPhase(start, target, target + 1000)).toBe('ended');
  });
});

describe('getSeverity', () => {
  it('按剩余时间分级', () => {
    expect(getSeverity(0)).toBe('ended');
    expect(getSeverity(-500)).toBe('ended');
    expect(getSeverity(60 * SECOND)).toBe('critical');
    expect(getSeverity(5 * MINUTE)).toBe('warning');
    expect(getSeverity(10 * MINUTE)).toBe('notice');
    expect(getSeverity(10 * MINUTE + 1)).toBe('normal');
  });
});

describe('getProgress', () => {
  const start = 1000;
  const target = 5000;

  it('开始前为 0，中间为比例，结束后为 1', () => {
    expect(getProgress(start, target, 0)).toBe(0);
    expect(getProgress(start, target, 3000)).toBe(0.5);
    expect(getProgress(start, target, 9000)).toBe(1);
  });

  it('非法区间安全处理', () => {
    expect(getProgress(5000, 5000, 4000)).toBe(0);
    expect(getProgress(5000, 5000, 6000)).toBe(1);
  });
});

describe('时区转换', () => {
  it('北京时间转绝对时间戳', () => {
    expect(zonedDateTimeToEpoch('2026-11-28T14:10', 'Asia/Shanghai')).toBe(
      Date.UTC(2026, 10, 28, 6, 10),
    );
  });

  it('epoch 与输入值可往返', () => {
    const epoch = Date.UTC(2026, 10, 28, 6, 10);
    const input = epochToInputValue(epoch, 'Asia/Shanghai');
    expect(input).toBe('2026-11-28T14:10');
    expect(zonedDateTimeToEpoch(input, 'Asia/Shanghai')).toBe(epoch);
  });

  it('处理夏令时偏移（纽约冬夏）', () => {
    expect(zonedDateTimeToEpoch('2026-07-01T12:00', 'America/New_York')).toBe(
      Date.UTC(2026, 6, 1, 16, 0),
    );
    expect(zonedDateTimeToEpoch('2026-01-15T12:00', 'America/New_York')).toBe(
      Date.UTC(2026, 0, 15, 17, 0),
    );
  });

  it('拒绝非法日期与格式', () => {
    expect(zonedDateTimeToEpoch('2026-02-30T10:00', 'Asia/Shanghai')).toBeNull();
    expect(zonedDateTimeToEpoch('2026-13-01T10:00', 'Asia/Shanghai')).toBeNull();
    expect(zonedDateTimeToEpoch('2026-11-28T25:00', 'Asia/Shanghai')).toBeNull();
    expect(zonedDateTimeToEpoch('not-a-date', 'Asia/Shanghai')).toBeNull();
    expect(zonedDateTimeToEpoch('', 'Asia/Shanghai')).toBeNull();
  });

  it('跟随系统时区时使用本地时间', () => {
    const epoch = zonedDateTimeToEpoch('2026-11-28T14:10', 'system');
    expect(epoch).toBe(new Date(2026, 10, 28, 14, 10, 0, 0).getTime());
  });
});

describe('格式化', () => {
  it('展示活动时间范围并附带星期', () => {
    const start = Date.UTC(2026, 10, 28, 6, 10);
    const end = Date.UTC(2026, 10, 28, 9, 10);
    const range = formatEventTimeRange(start, end, 'Asia/Shanghai');
    expect(range).toContain('11月28日');
    expect(range).toContain('14:10');
    expect(range).toContain('17:10');
  });

  it('跨天范围显示两段日期', () => {
    const start = Date.UTC(2026, 10, 28, 6, 10);
    const end = Date.UTC(2026, 10, 29, 6, 10);
    const range = formatEventTimeRange(start, end, 'Asia/Shanghai');
    expect(range).toContain('11月28日');
    expect(range).toContain('11月29日');
  });

  it('倒计时时分秒格式补零', () => {
    expect(formatClockDuration(65 * SECOND)).toBe('01:05');
    expect(formatClockDuration(0)).toBe('00:00');
    expect(formatClockDuration(600 * MINUTE)).toBe('600:00');
    expect(padValue(7, 'padded')).toBe('07');
    expect(padValue(7, 'plain')).toBe('7');
  });

  it('大屏时钟为 24 小时制', () => {
    expect(formatStageClock(Date.UTC(2026, 10, 28, 6, 10, 5), 'Asia/Shanghai')).toBe('14:10:05');
    expect(formatStageClock(Date.UTC(2026, 10, 28, 16, 5, 9), 'Asia/Shanghai')).toBe('00:05:09');
  });

  it('分区时间字段可用于日期构建', () => {
    const parts = getZonedParts(Date.UTC(2026, 10, 28, 6, 10), 'Asia/Shanghai');
    expect(parts).toMatchObject({ year: 2026, month: 11, day: 28, hour: 14, minute: 10 });
    expect(parts.weekday).toContain('周');
  });
});
