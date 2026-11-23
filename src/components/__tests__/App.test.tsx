import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { STORAGE_KEY, createDefaultState } from '../../lib/storage';
import { HOUR, SECOND } from '../../lib/time';
import type { PersistedState } from '../../types';

const BASE = Date.UTC(2026, 10, 28, 6, 10, 0);
const TARGET = Date.UTC(2026, 10, 28, 9, 10, 0);
let currentEpoch = BASE;

function setupUser() {
  return userEvent.setup({ delay: null });
}

function jumpTo(epoch: number) {
  currentEpoch = epoch;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

function seedState(mutator: (state: PersistedState) => void) {
  const state = createDefaultState(BASE);
  mutator(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function header() {
  return within(screen.getByRole('banner'));
}

beforeEach(() => {
  localStorage.clear();
  currentEpoch = BASE;
  vi.spyOn(Date, 'now').mockImplementation(() => currentEpoch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EventClock 主界面', () => {
  it('展示默认活动的绝对时间倒计时与进行中状态', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: /四川大学 TRAE on Campus/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('timer', { name: '倒计时 0 天 3 小时 0 分 0 秒' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('进行中').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/11月28日/).length).toBeGreaterThan(0);
  });

  it('页面重新可见时按当前时间重新校准，并进入已结束状态', () => {
    render(<App />);
    jumpTo(TARGET);
    expect(
      screen.getByRole('timer', { name: '倒计时 0 天 0 小时 0 分 0 秒' }),
    ).toBeInTheDocument();
    expect(screen.getByText('活动已结束 · 倒计时已归零')).toBeInTheDocument();
  });

  it('创建活动后立即生效、保存并写入本地存储', async () => {
    const user = setupUser();
    render(<App />);
    await user.click(header().getByRole('button', { name: '新建活动' }));
    const dialog = screen.getByRole('dialog', { name: '新建活动' });
    await user.type(within(dialog).getByLabelText('活动名称'), 'AI 编程挑战赛');
    await user.click(within(dialog).getByRole('button', { name: '创建活动' }));

    expect(screen.getByRole('heading', { level: 1, name: 'AI 编程挑战赛' })).toBeInTheDocument();
    expect(screen.getByText('活动已创建')).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as PersistedState;
    expect(stored.events.some((event) => event.name === 'AI 编程挑战赛')).toBe(true);
    expect(stored.activeEventId).toBe(
      stored.events.find((event) => event.name === 'AI 编程挑战赛')?.id,
    );
  });

  it('阻止空名称活动提交并显示字段错误', async () => {
    const user = setupUser();
    render(<App />);
    await user.click(header().getByRole('button', { name: '新建活动' }));
    const dialog = screen.getByRole('dialog', { name: '新建活动' });
    await user.click(within(dialog).getByRole('button', { name: '创建活动' }));
    expect(screen.getByText('请填写活动名称')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '新建活动' })).toBeInTheDocument();
  });

  it('刷新后仍保留新建的活动', async () => {
    const user = setupUser();
    const first = render(<App />);
    await user.click(header().getByRole('button', { name: '新建活动' }));
    const dialog = screen.getByRole('dialog', { name: '新建活动' });
    await user.type(within(dialog).getByLabelText('活动名称'), '刷新后仍存在');
    await user.click(within(dialog).getByRole('button', { name: '创建活动' }));
    first.unmount();

    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: '刷新后仍存在' })).toBeInTheDocument();
  });

  it('切换活动会更新主倒计时与激活项', async () => {
    const user = setupUser();
    seedState((state) => {
      const first = state.events[0];
      const second = {
        ...first,
        id: 'evt-second',
        name: '评审与颁奖',
        startAt: first.startAt + 4 * HOUR,
        endAt: first.endAt + 4 * HOUR,
        targetAt: first.targetAt + 4 * HOUR,
      };
      state.events = [first, second];
    });
    render(<App />);
    await user.click(screen.getByRole('button', { name: '切换到 评审与颁奖' }));
    expect(screen.getByRole('heading', { level: 1, name: '评审与颁奖' })).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as PersistedState;
    expect(stored.activeEventId).toBe('evt-second');
  });

  it('删除最后一个活动后展示空状态且持久化为空列表', async () => {
    const user = setupUser();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^删除 / }));
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(screen.getByRole('heading', { name: '还没有活动' })).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as PersistedState;
    expect(stored.events).toEqual([]);
    expect(stored.activeEventId).toBeNull();
  });

  it('达到提醒阈值时触发通知并在归零时提示结束', () => {
    seedState((state) => {
      const event = state.events[0];
      const target = BASE + 30 * SECOND;
      state.events[0] = {
        ...event,
        startAt: BASE - HOUR,
        endAt: target,
        targetAt: target,
        reminders: [10, 0],
      };
      state.settings.sound = false;
    });
    render(<App />);
    jumpTo(BASE + 21 * SECOND);
    expect(screen.getByText('最后 10 秒')).toBeInTheDocument();
    jumpTo(BASE + 31 * SECOND);
    expect(screen.getByText(/的倒计时已归零/)).toBeInTheDocument();
  });
});

describe('路演计时交互', () => {
  it('开始、暂停、继续、重置均独立于活动倒计时', async () => {
    const user = setupUser();
    render(<App />);
    const roadshowTimer = () => screen.getByRole('timer', { name: /路演剩余/ });
    expect(roadshowTimer()).toHaveTextContent('03:00');

    await user.click(screen.getByRole('button', { name: '开始计时' }));
    expect(roadshowTimer()).toHaveTextContent('03:00');
    expect(screen.getAllByText('进行中').length).toBeGreaterThan(0);

    jumpTo(BASE + 30 * SECOND);
    expect(roadshowTimer()).toHaveTextContent('02:30');

    await user.click(screen.getByRole('button', { name: '暂停' }));
    expect(screen.getByText('已暂停')).toBeInTheDocument();
    jumpTo(BASE + 120 * SECOND);
    expect(roadshowTimer()).toHaveTextContent('02:30');

    await user.click(screen.getByRole('button', { name: '继续' }));
    jumpTo(BASE + 125 * SECOND);
    expect(roadshowTimer()).toHaveTextContent('02:25');

    expect(
      screen.getByRole('timer', { name: '倒计时 0 天 2 小时 57 分 55 秒' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重置' }));
    expect(roadshowTimer()).toHaveTextContent('03:00');
    expect(screen.getByText('就绪')).toBeInTheDocument();
  });

  it('自定义时长生效并在超时后进入提醒状态', async () => {
    const user = setupUser();
    render(<App />);
    const custom = screen.getByLabelText('自定义路演时长（分钟）');
    await user.clear(custom);
    await user.type(custom, '2');
    await user.click(screen.getByRole('button', { name: '设定' }));
    expect(screen.getByRole('timer', { name: /路演剩余/ })).toHaveTextContent('02:00');

    await user.click(screen.getByRole('button', { name: '开始计时' }));
    jumpTo(BASE + 121 * SECOND);
    expect(screen.getByText('超时')).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: /路演剩余/ })).toHaveTextContent('00:00');
    expect(screen.getByText('路演时间到')).toBeInTheDocument();
  });

  it('拒绝非法的自定义时长', async () => {
    const user = setupUser();
    render(<App />);
    const custom = screen.getByLabelText('自定义路演时长（分钟）');
    await user.clear(custom);
    await user.type(custom, '999');
    await user.click(screen.getByRole('button', { name: '设定' }));
    expect(screen.getByText('请输入 0.5–240 分钟之间的时长')).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: /路演剩余/ })).toHaveTextContent('03:00');
  });
});

describe('大屏与设置', () => {
  it('打开大屏、切换沉浸模式并可用 Esc 退出', async () => {
    const user = setupUser();
    render(<App />);
    await user.click(header().getByRole('button', { name: '大屏' }));
    const stage = screen.getByRole('dialog', { name: '大屏演示' });
    expect(stage).toBeInTheDocument();
    expect(within(stage).getByRole('timer', { name: /倒计时/ })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('i');
    await waitFor(
      () => {
        expect(document.querySelector('.stage-head')).toHaveClass('is-hidden');
      },
      { timeout: 4000 },
    );

    await user.click(screen.getByRole('button', { name: '显示控件' }));
    expect(document.querySelector('.stage-head')).toHaveClass('is-visible');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '大屏演示' })).not.toBeInTheDocument();
  });

  it('设置中切换主题、显示模式与提醒开关并持久化', async () => {
    const user = setupUser();
    render(<App />);
    await user.click(header().getByRole('button', { name: '设置' }));
    const dialog = screen.getByRole('dialog', { name: '设置' });

    await user.click(within(dialog).getByRole('button', { name: '浅色' }));
    expect(document.documentElement.dataset.theme).toBe('light');

    await user.click(within(dialog).getByRole('button', { name: '总时 · 分 · 秒' }));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as PersistedState;
    expect(stored.settings.theme).toBe('light');
    expect(stored.settings.displayMode).toBe('hours');

    const reminderSwitch = within(dialog).getByRole('switch', { name: '启用活动提醒' });
    expect(reminderSwitch).toHaveAttribute('aria-checked', 'true');
    await user.click(reminderSwitch);
    expect(reminderSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('设置面板可恢复默认设置', async () => {
    const user = setupUser();
    seedState((state) => {
      state.settings.theme = 'light';
      state.settings.displayMode = 'compact';
    });
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('light');
    await user.click(header().getByRole('button', { name: '设置' }));
    await user.click(screen.getByRole('button', { name: '恢复默认设置' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByText('设置已恢复默认')).toBeInTheDocument();
  });

  it('快捷键 N 打开新建活动，F 打开大屏', async () => {
    const user = setupUser();
    render(<App />);
    await user.keyboard('n');
    expect(screen.getByRole('dialog', { name: '新建活动' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '新建活动' })).not.toBeInTheDocument();
    await user.keyboard('f');
    expect(screen.getByRole('dialog', { name: '大屏演示' })).toBeInTheDocument();
  });
});

describe('损坏数据恢复', () => {
  it('启动时恢复损坏的本地数据并提示', () => {
    localStorage.setItem(STORAGE_KEY, '{ completely broken');
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: /四川大学 TRAE on Campus/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('本地数据已恢复')).toBeInTheDocument();
    expect(Object.keys(localStorage).some((key) => key.startsWith('eventclock.v2.corrupt.'))).toBe(
      true,
    );
  });
});
