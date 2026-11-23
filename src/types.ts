export type ThemeMode = 'dark' | 'light';
export type DisplayMode = 'days' | 'hours' | 'compact';
export type NumberFormat = 'padded' | 'plain';
export type Phase = 'upcoming' | 'live' | 'ended';
export type Tone = 'normal' | 'notice' | 'warning' | 'critical' | 'ended';

export type EventKind = 'hackathon' | 'workshop' | 'ceremony' | 'meeting' | 'deadline' | 'other';

export interface EventItem {
  id: string;
  name: string;
  kind: EventKind;
  startAt: number;
  endAt: number;
  targetAt: number;
  reminders: number[];
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  theme: ThemeMode;
  displayMode: DisplayMode;
  numberFormat: NumberFormat;
  timeZone: string;
  animations: boolean;
  sound: boolean;
  remindersEnabled: boolean;
}

export type RoadshowStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface RoadshowState {
  durationMs: number;
  status: RoadshowStatus;
  endsAt: number | null;
  remainingMs: number;
  label: string;
  teamName: string;
}

export interface PersistedState {
  version: number;
  events: EventItem[];
  activeEventId: string | null;
  settings: Settings;
  roadshow: RoadshowState;
}

export const TIME_ZONE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'Asia/Shanghai', label: '北京时间 (UTC+8)' },
  { value: 'system', label: '跟随系统' },
  { value: 'UTC', label: '协调世界时 (UTC)' },
  { value: 'Asia/Tokyo', label: '东京 (UTC+9)' },
  { value: 'Asia/Singapore', label: '新加坡 (UTC+8)' },
  { value: 'Europe/London', label: '伦敦' },
  { value: 'America/New_York', label: '纽约' },
  { value: 'America/Los_Angeles', label: '洛杉矶' },
];

export const EVENT_KIND_META: Record<EventKind, { label: string; short: string }> = {
  hackathon: { label: '黑客松 / 比赛', short: '比赛' },
  workshop: { label: '工作坊 / 分享', short: '工作坊' },
  ceremony: { label: '典礼 / 颁奖', short: '典礼' },
  meeting: { label: '会议', short: '会议' },
  deadline: { label: '提交截止', short: '截止' },
  other: { label: '其他', short: '其他' },
};

export const EVENT_KINDS = Object.keys(EVENT_KIND_META) as EventKind[];

export const REMINDER_PRESETS: ReadonlyArray<{ seconds: number; label: string; short: string }> = [
  { seconds: 600, label: '提前 10 分钟', short: '10 分钟' },
  { seconds: 300, label: '提前 5 分钟', short: '5 分钟' },
  { seconds: 60, label: '提前 1 分钟', short: '1 分钟' },
  { seconds: 10, label: '最后 10 秒', short: '10 秒' },
  { seconds: 0, label: '截止时刻', short: '截止' },
];
