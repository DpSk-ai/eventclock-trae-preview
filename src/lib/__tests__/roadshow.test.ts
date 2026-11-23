import { describe, expect, it } from 'vitest';
import {
  configureRoadshow,
  createRoadshow,
  finishRoadshow,
  getRoadshowRemaining,
  isRoadshowOvertime,
  pauseRoadshow,
  resetRoadshow,
  resumeRoadshow,
  roadshowProgress,
  startRoadshow,
} from '../roadshow';
import { MINUTE, SECOND } from '../time';

const NOW = Date.UTC(2026, 10, 28, 6, 0);

describe('路演计时', () => {
  it('开始后以绝对结束时间运行', () => {
    const state = startRoadshow(createRoadshow(), NOW);
    expect(state.status).toBe('running');
    expect(state.endsAt).toBe(NOW + 3 * MINUTE);
    expect(getRoadshowRemaining(state, NOW)).toBe(180 * SECOND);
  });

  it('暂停记录剩余时间，继续时重建结束时间', () => {
    const started = startRoadshow(createRoadshow(), NOW);
    const paused = pauseRoadshow(started, NOW + 30 * SECOND);
    expect(paused.status).toBe('paused');
    expect(paused.endsAt).toBeNull();
    expect(paused.remainingMs).toBe(150 * SECOND);

    const resumed = resumeRoadshow(paused, NOW + 90 * SECOND);
    expect(resumed.status).toBe('running');
    expect(resumed.endsAt).toBe(NOW + 90 * SECOND + 150 * SECOND);
    expect(getRoadshowRemaining(resumed, NOW + 90 * SECOND)).toBe(150 * SECOND);
  });

  it('后台跳变后剩余时间按绝对时间校准', () => {
    const started = startRoadshow(createRoadshow(), NOW);
    const later = NOW + 2 * MINUTE;
    expect(getRoadshowRemaining(started, later)).toBe(60 * SECOND);
    const after = NOW + 4 * MINUTE;
    expect(getRoadshowRemaining(started, after)).toBe(-60 * SECOND);
    expect(isRoadshowOvertime(started, after)).toBe(true);
  });

  it('到达终点后暂停变为超时状态', () => {
    const started = startRoadshow(createRoadshow(), NOW);
    const paused = pauseRoadshow(started, NOW + 10 * MINUTE);
    expect(paused.status).toBe('finished');
    expect(paused.remainingMs).toBe(0);
  });

  it('重置恢复完整时长', () => {
    const started = startRoadshow(createRoadshow(), NOW);
    const reset = resetRoadshow(started);
    expect(reset.status).toBe('idle');
    expect(reset.remainingMs).toBe(reset.durationMs);
    expect(reset.endsAt).toBeNull();
  });

  it('配置自定义时长并回到就绪', () => {
    const started = startRoadshow(createRoadshow(), NOW);
    const configured = configureRoadshow(started, 5 * MINUTE);
    expect(configured.durationMs).toBe(5 * MINUTE);
    expect(configured.status).toBe('idle');
    expect(configured.remainingMs).toBe(5 * MINUTE);
  });

  it('结束操作只对运行中的计时生效', () => {
    const idle = createRoadshow();
    expect(finishRoadshow(idle).status).toBe('idle');
    const running = startRoadshow(idle, NOW);
    const finished = finishRoadshow(running);
    expect(finished.status).toBe('finished');
    expect(finished.remainingMs).toBe(0);
  });

  it('进度随时间递减且被限制在 0–1', () => {
    const state = startRoadshow(createRoadshow(), NOW);
    expect(roadshowProgress(state, NOW)).toBe(1);
    expect(roadshowProgress(state, NOW + 90 * SECOND)).toBe(0.5);
    expect(roadshowProgress(state, NOW + 999 * SECOND)).toBe(0);
  });

  it('无效的自定义时长仍由上层校验，不被静默修正', () => {
    const configured = configureRoadshow(createRoadshow(), 0);
    expect(configured.durationMs).toBe(0);
  });
});
