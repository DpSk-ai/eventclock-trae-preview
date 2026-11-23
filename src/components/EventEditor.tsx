import { useEffect, useState, type FormEvent } from 'react';
import { Clock3, Link2 } from 'lucide-react';
import {
  EVENT_KINDS,
  EVENT_KIND_META,
  REMINDER_PRESETS,
  type EventItem,
  type EventKind,
} from '../types';
import {
  epochToInputValue,
  formatReminderLabel,
  HOUR,
  MINUTE,
  timeZoneLabel,
  zonedDateTimeToEpoch,
} from '../lib/time';
import {
  DEFAULT_REMINDERS,
  normalizeReminders,
  validateEventDraft,
  type EventDraftInput,
  type FieldErrors,
} from '../lib/events';
import { Modal } from './Modal';

interface EventEditorProps {
  open: boolean;
  event: EventItem | null;
  timeZone: string;
  onClose: () => void;
  onSubmit: (draft: EventDraftInput) => void;
}

function formatSpan(ms: number): string {
  if (!Number.isFinite(ms)) return '待填写时间';
  if (ms <= 0) return '时间顺序有误';
  const totalMinutes = Math.round(ms / MINUTE);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} 天`);
  if (hours > 0) parts.push(`${hours} 小时`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} 分钟`);
  return parts.join(' ');
}

export function EventEditor({ open, event, timeZone, onClose, onSubmit }: EventEditorProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<EventKind>('hackathon');
  const [startValue, setStartValue] = useState('');
  const [endValue, setEndValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [reminders, setReminders] = useState<number[]>(DEFAULT_REMINDERS);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customError, setCustomError] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;
    if (event) {
      setName(event.name);
      setKind(event.kind);
      setStartValue(epochToInputValue(event.startAt, timeZone));
      setEndValue(epochToInputValue(event.endAt, timeZone));
      setTargetValue(epochToInputValue(event.targetAt, timeZone));
      setReminders(normalizeReminders(event.reminders));
    } else {
      const step = 15 * MINUTE;
      const startEpoch = Math.ceil((Date.now() + HOUR) / step) * step;
      const endEpoch = startEpoch + 2 * HOUR;
      setName('');
      setKind('hackathon');
      setStartValue(epochToInputValue(startEpoch, timeZone));
      setEndValue(epochToInputValue(endEpoch, timeZone));
      setTargetValue(epochToInputValue(endEpoch, timeZone));
      setReminders([...DEFAULT_REMINDERS]);
    }
    setErrors({});
    setCustomError('');
    setCustomMinutes('');
  }, [open, event, timeZone]);

  const startEpoch = zonedDateTimeToEpoch(startValue, timeZone);
  const targetEpoch = zonedDateTimeToEpoch(targetValue, timeZone);
  const span =
    startEpoch !== null && targetEpoch !== null ? targetEpoch - startEpoch : Number.NaN;

  const toggleReminder = (seconds: number) => {
    setReminders((current) =>
      current.includes(seconds)
        ? normalizeReminders(current.filter((value) => value !== seconds))
        : normalizeReminders([...current, seconds]),
    );
  };

  const addCustomReminder = () => {
    const parsed = Number(customMinutes);
    if (!customMinutes.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setCustomError('请输入大于 0 的分钟数');
      return;
    }
    const seconds = Math.round(parsed * 60);
    if (seconds > 86400) {
      setCustomError('提醒时间不能超过 24 小时');
      return;
    }
    if (reminders.length >= 8) {
      setCustomError('最多设置 8 个提醒阈值');
      return;
    }
    setCustomError('');
    setReminders((current) => normalizeReminders([...current, seconds]));
    setCustomMinutes('');
  };

  const customReminders = reminders.filter(
    (seconds) => !REMINDER_PRESETS.some((preset) => preset.seconds === seconds),
  );

  const handleSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const draft: EventDraftInput = {
      name,
      kind,
      startAt: startEpoch,
      endAt: zonedDateTimeToEpoch(endValue, timeZone),
      targetAt: targetEpoch,
      reminders,
    };
    const result = validateEventDraft(draft);
    setErrors(result.errors);
    if (!result.ok) return;
    onSubmit(draft);
  };

  return (
    <Modal
      open={open}
      title={event ? '编辑活动' : '新建活动'}
      description={`所有时间按 ${timeZoneLabel(timeZone)} 解析，倒计时基于绝对时间戳计算。`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" form="event-editor-form" className="btn btn-primary">
            {event ? '保存修改' : '创建活动'}
          </button>
        </div>
      }
    >
      <form id="event-editor-form" className="form-grid" onSubmit={handleSubmit} noValidate>
        <div className="form-field form-span-2">
          <label className="form-label" htmlFor="event-name">
            活动名称
          </label>
          <input
            id="event-name"
            type="text"
            className="text-input"
            value={name}
            maxLength={60}
            placeholder="例如：TRAE on Campus AI Coding Hackathon"
            onChange={(inputEvent) => setName(inputEvent.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'event-name-error' : undefined}
          />
          {errors.name ? (
            <p className="field-error" id="event-name-error" role="alert">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="event-kind">
            活动类型
          </label>
          <select
            id="event-kind"
            className="text-input"
            value={kind}
            onChange={(selectEvent) => setKind(selectEvent.target.value as EventKind)}
          >
            {EVENT_KINDS.map((value) => (
              <option key={value} value={value}>
                {EVENT_KIND_META[value].label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <span className="form-label">倒计时跨度</span>
          <div className="span-readout">
            <Clock3 size={14} />
            <span>{formatSpan(span)}</span>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="event-start">
            开始时间
          </label>
          <input
            id="event-start"
            type="datetime-local"
            step={60}
            className="text-input"
            value={startValue}
            onChange={(inputEvent) => setStartValue(inputEvent.target.value)}
            aria-invalid={Boolean(errors.startAt)}
            aria-describedby={errors.startAt ? 'event-start-error' : undefined}
          />
          {errors.startAt ? (
            <p className="field-error" id="event-start-error" role="alert">
              {errors.startAt}
            </p>
          ) : null}
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="event-end">
            结束时间
          </label>
          <input
            id="event-end"
            type="datetime-local"
            step={60}
            className="text-input"
            value={endValue}
            onChange={(inputEvent) => setEndValue(inputEvent.target.value)}
            aria-invalid={Boolean(errors.endAt)}
            aria-describedby={errors.endAt ? 'event-end-error' : undefined}
          />
          {errors.endAt ? (
            <p className="field-error" id="event-end-error" role="alert">
              {errors.endAt}
            </p>
          ) : null}
        </div>

        <div className="form-field form-span-2">
          <div className="flex items-end justify-between gap-3">
            <label className="form-label" htmlFor="event-target">
              倒计时目标时间
            </label>
            <button
              type="button"
              className="link-btn"
              onClick={() => setTargetValue(endValue)}
            >
              <Link2 size={13} />
              与结束时间一致
            </button>
          </div>
          <input
            id="event-target"
            type="datetime-local"
            step={60}
            className="text-input"
            value={targetValue}
            onChange={(inputEvent) => setTargetValue(inputEvent.target.value)}
            aria-invalid={Boolean(errors.targetAt)}
            aria-describedby={errors.targetAt ? 'event-target-error' : undefined}
          />
          {errors.targetAt ? (
            <p className="field-error" id="event-target-error" role="alert">
              {errors.targetAt}
            </p>
          ) : null}
        </div>

        <fieldset className="form-field form-span-2">
          <legend className="form-label">提醒阈值</legend>
          <div className="chip-row">
            {REMINDER_PRESETS.map((preset) => {
              const selected = reminders.includes(preset.seconds);
              return (
                <button
                  key={preset.seconds}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  className={`chip ${selected ? 'is-selected' : ''}`}
                  onClick={() => toggleReminder(preset.seconds)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {customReminders.length > 0 ? (
            <div className="chip-row mt-2">
              {customReminders.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  className="chip chip-custom is-selected"
                  onClick={() => toggleReminder(seconds)}
                  aria-label={`移除 ${formatReminderLabel(seconds)} 提醒`}
                >
                  {formatReminderLabel(seconds)} ×
                </button>
              ))}
            </div>
          ) : null}

          <div className="custom-reminder">
            <input
              type="number"
              min={0.5}
              step={0.5}
              className="text-input"
              value={customMinutes}
              onChange={(inputEvent) => setCustomMinutes(inputEvent.target.value)}
              placeholder="自定义分钟数"
              aria-label="自定义提醒分钟数"
            />
            <button type="button" className="btn btn-outline" onClick={addCustomReminder}>
              添加提醒
            </button>
          </div>
          {customError ? (
            <p className="field-error" role="alert">
              {customError}
            </p>
          ) : null}
          {errors.reminders ? (
            <p className="field-error" role="alert">
              {errors.reminders}
            </p>
          ) : null}
          <p className="form-hint">
            提醒在活动进行中触发，声音需先在页面中交互后才能播放。
          </p>
        </fieldset>
      </form>
    </Modal>
  );
}
