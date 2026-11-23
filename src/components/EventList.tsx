import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import type { EventItem, Settings } from '../types';
import { EVENT_KIND_META } from '../types';
import {
  formatCountdownText,
  formatEventTimeRange,
  getCountdown,
  getPhase,
} from '../lib/time';

interface EventListProps {
  events: EventItem[];
  activeEventId: string | null;
  now: number;
  settings: Settings;
  onActivate: (id: string) => void;
  onEdit: (event: EventItem) => void;
  onDuplicate: (event: EventItem) => void;
  onDelete: (event: EventItem) => void;
  onCreate: () => void;
}

export function EventList({
  events,
  activeEventId,
  now,
  settings,
  onActivate,
  onEdit,
  onDuplicate,
  onDelete,
  onCreate,
}: EventListProps) {
  return (
    <section className="panel list-panel" aria-labelledby="events-heading">
      <div className="panel-head">
        <div>
          <h2 id="events-heading" className="panel-title">
            活动列表
            <span className="count-badge">{events.length}</span>
          </h2>
          <p className="panel-subtitle">切换、编辑或复制活动，数据保存在本地</p>
        </div>
        <button type="button" className="icon-btn" onClick={onCreate} aria-label="新建活动" title="新建活动">
          <Plus size={17} />
        </button>
      </div>

      {events.length === 0 ? (
        <div className="list-empty">
          <p>暂无活动</p>
          <button type="button" className="btn btn-outline mt-3" onClick={onCreate}>
            <Plus size={15} />
            新建活动
          </button>
        </div>
      ) : (
        <ul className="event-list">
          {events.map((event) => {
            const active = event.id === activeEventId;
            const phase = getPhase(event.startAt, event.targetAt, now);
            const countdown = getCountdown(event.targetAt, now);
            return (
              <li key={event.id} className={`event-row ${active ? 'is-active' : ''}`}>
                <button
                  type="button"
                  className="event-main"
                  onClick={() => onActivate(event.id)}
                  aria-current={active ? 'true' : undefined}
                  aria-label={`切换到 ${event.name}`}
                >
                  <span className={`event-status status-${phase}`} aria-hidden="true" />
                  <span className="event-copy">
                    <span className="event-name">{event.name}</span>
                    <span className="event-meta">
                      {EVENT_KIND_META[event.kind].short} ·{' '}
                      {formatEventTimeRange(event.startAt, event.endAt, settings.timeZone)}
                    </span>
                  </span>
                  <span className="event-time" aria-hidden="true">
                    {phase === 'ended' ? '已结束' : formatCountdownText(countdown, 'padded')}
                  </span>
                </button>
                <div className="event-actions">
                  <button
                    type="button"
                    className="event-action"
                    aria-label={`编辑 ${event.name}`}
                    title="编辑"
                    onClick={() => onEdit(event)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="event-action"
                    aria-label={`复制 ${event.name}`}
                    title="复制"
                    onClick={() => onDuplicate(event)}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    className="event-action event-action-danger"
                    aria-label={`删除 ${event.name}`}
                    title="删除"
                    onClick={() => onDelete(event)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
