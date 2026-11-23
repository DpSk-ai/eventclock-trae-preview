import { useEffect, useRef } from 'react';
import type { EventItem } from '../types';
import { formatReminderLabel } from '../lib/time';
import { playChime } from '../lib/sound';
import type { ToastTone } from './useToasts';
import { isRoadshowOvertime } from '../lib/roadshow';
import type { RoadshowState } from '../types';

export interface ReminderNotice {
  title: string;
  body: string;
  tone: ToastTone;
}

interface CountdownReminderOptions {
  event: EventItem | null;
  now: number;
  enabled: boolean;
  sound: boolean;
  onNotice: (notice: ReminderNotice) => void;
}

export function useCountdownReminders({
  event,
  now,
  enabled,
  sound,
  onNotice,
}: CountdownReminderOptions): void {
  const tracker = useRef<{ eventId: string | null; prevRemaining: number | null; fired: Set<number> }>({
    eventId: null,
    prevRemaining: null,
    fired: new Set(),
  });
  const noticeRef = useRef(onNotice);
  noticeRef.current = onNotice;

  useEffect(() => {
    if (!event || !enabled) {
      tracker.current = {
        eventId: event?.id ?? null,
        prevRemaining: null,
        fired: new Set(),
      };
      return;
    }
    const remaining = Math.max(0, event.targetAt - now);
    const current = tracker.current;
    if (current.eventId !== event.id) {
      tracker.current = { eventId: event.id, prevRemaining: remaining, fired: new Set() };
      return;
    }
    const previous = current.prevRemaining;
    current.prevRemaining = remaining;
    if (previous === null) return;
    if (remaining > previous) {
      current.fired.clear();
    }

    const thresholds = [...event.reminders].sort((a, b) => a - b);
    let crossed: number | null = null;
    for (const threshold of thresholds) {
      const ms = threshold * 1000;
      if (previous > ms && remaining <= ms && !current.fired.has(threshold)) {
        crossed = threshold;
      }
    }
    if (crossed === null) return;
    current.fired.add(crossed);

    const title =
      crossed === 0 ? '活动已结束' : crossed <= 10 ? '最后 10 秒' : `剩余 ${formatReminderLabel(crossed)}`;
    const body =
      crossed === 0
        ? `${event.name} 的倒计时已归零`
        : `${event.name} 即将结束，请做好准备`;
    const tone: ToastTone = crossed === 0 ? 'danger' : crossed <= 60 ? 'warning' : 'info';

    if (sound) {
      playChime(crossed === 0 ? 'done' : crossed <= 60 ? 'critical' : 'notice');
    }
    noticeRef.current({ title, body, tone });
  }, [event, now, enabled, sound]);
}

interface RoadshowReminderOptions {
  roadshow: RoadshowState;
  now: number;
  sound: boolean;
  onNotice: (notice: ReminderNotice) => void;
}

export function useRoadshowReminder({
  roadshow,
  now,
  sound,
  onNotice,
}: RoadshowReminderOptions): void {
  const fired = useRef(false);
  const noticeRef = useRef(onNotice);
  noticeRef.current = onNotice;

  useEffect(() => {
    const overtime = isRoadshowOvertime(roadshow, now);
    if (!overtime) {
      fired.current = false;
      return;
    }
    if (roadshow.status === 'running' && !fired.current) {
      fired.current = true;
      if (sound) playChime('done');
      noticeRef.current({
        title: '路演时间到',
        body: '路演计时已结束，可继续准备问答环节',
        tone: 'danger',
      });
    }
  }, [roadshow, now, sound]);
}
