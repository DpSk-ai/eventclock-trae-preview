import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Maximize2, Plus, Settings as SettingsIcon } from 'lucide-react';
import type { DisplayMode, EventItem } from './types';
import { EVENT_KIND_META } from './types';
import { reducer } from './state/reducer';
import type { EventDraftInput } from './lib/events';
import {
  backupCorruptPayload,
  loadState,
  parseImportPayload,
  saveState,
  serializeExport,
} from './lib/storage';
import { getZonedParts, pad2 } from './lib/time';
import { unlockAudio } from './lib/sound';
import { useNow } from './hooks/useNow';
import { useToasts } from './hooks/useToasts';
import { useFullscreen } from './hooks/useFullscreen';
import { useCountdownReminders, useRoadshowReminder } from './hooks/useReminders';
import { CountdownHero } from './components/CountdownHero';
import { EventList } from './components/EventList';
import { RoadshowTimer } from './components/RoadshowTimer';
import { RoadshowStage } from './components/RoadshowStage';
import { EventEditor } from './components/EventEditor';
import { SettingsPanel } from './components/SettingsPanel';
import { PresentationStage } from './components/PresentationStage';
import { Modal } from './components/Modal';
import { ToastStack } from './components/ToastStack';
import { TimeCalibrationNotice } from './components/TimeCalibrationNotice';
import { getBranding } from './config/branding';

const DISPLAY_ORDER: DisplayMode[] = ['days', 'hours', 'compact'];

export default function App() {
  const [bootstrap] = useState(() => loadState());
  const [state, dispatch] = useReducer(reducer, bootstrap.state);
  const now = useNow(250);
  const { toasts, push, dismiss } = useToasts();
  const { enter: enterFullscreen, exit: exitFullscreen } = useFullscreen();
  const branding = getBranding();

  const [stageOpen, setStageOpen] = useState(false);
  const [roadshowStageOpen, setRoadshowStageOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const saveFailedRef = useRef(false);
  const recoveryHandledRef = useRef(false);

  const activeEvent = useMemo(
    () =>
      state.events.find((event) => event.id === state.activeEventId) ??
      state.events[0] ??
      null,
    [state.events, state.activeEventId],
  );

  useEffect(() => {
    if (recoveryHandledRef.current) return;
    recoveryHandledRef.current = true;
    if (bootstrap.recovered) {
      if (bootstrap.raw) backupCorruptPayload(bootstrap.raw);
      push({
        title: '本地数据已恢复',
        body: bootstrap.reason ?? '检测到损坏的本地数据，已使用安全默认值',
        tone: 'warning',
      });
    }
  }, [bootstrap, push]);

  useEffect(() => {
    const saved = saveState(state);
    if (!saved && !saveFailedRef.current) {
      saveFailedRef.current = true;
      push({
        title: '本地保存失败',
        body: '浏览器存储不可用或空间不足，本次更改可能无法保留',
        tone: 'danger',
      });
    }
  }, [state, push]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = state.settings.theme;
    root.dataset.motion = state.settings.animations ? 'on' : 'off';
    root.style.colorScheme = state.settings.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', state.settings.theme === 'dark' ? '#06070a' : '#f3f4f7');
    }
  }, [state.settings.theme, state.settings.animations]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useCountdownReminders({
    event: activeEvent,
    now,
    enabled: state.settings.remindersEnabled,
    sound: state.settings.sound,
    onNotice: (notice) => push(notice),
  });

  useRoadshowReminder({
    roadshow: state.roadshow,
    now,
    sound: state.settings.sound,
    onNotice: (notice) => push(notice),
  });

  useEffect(() => {
    if (
      state.roadshow.status === 'running' &&
      state.roadshow.endsAt !== null &&
      now >= state.roadshow.endsAt
    ) {
      dispatch({ type: 'roadshow/finish' });
    }
  }, [now, state.roadshow.status, state.roadshow.endsAt]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setStageOpen(false);
        setRoadshowStageOpen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const openStage = useCallback(() => {
    setStageOpen(true);
    void enterFullscreen();
  }, [enterFullscreen]);

  const closeStage = useCallback(() => {
    setStageOpen(false);
    void exitFullscreen();
  }, [exitFullscreen]);

  const openRoadshowStage = useCallback(() => {
    setRoadshowStageOpen(true);
    void enterFullscreen();
  }, [enterFullscreen]);

  const closeRoadshowStage = useCallback(() => {
    setRoadshowStageOpen(false);
    void exitFullscreen();
  }, [exitFullscreen]);

  const openCreate = useCallback(() => {
    setEditingEvent(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((event: EventItem) => {
    setEditingEvent(event);
    setEditorOpen(true);
  }, []);

  const handleSave = useCallback(
    (draft: EventDraftInput) => {
      if (editingEvent) {
        dispatch({ type: 'event/update', id: editingEvent.id, draft, now: Date.now() });
        push({ title: '活动已更新', body: draft.name.trim(), tone: 'success' });
      } else {
        dispatch({ type: 'event/add', draft, now: Date.now() });
        push({ title: '活动已创建', body: draft.name.trim(), tone: 'success' });
      }
      setEditorOpen(false);
      setEditingEvent(null);
    },
    [editingEvent, push],
  );

  const handleDuplicate = useCallback(
    (event: EventItem) => {
      dispatch({ type: 'event/duplicate', id: event.id, now: Date.now() });
      push({ title: '已复制活动', body: event.name, tone: 'success' });
    },
    [push],
  );

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    dispatch({ type: 'event/delete', id: deleteTarget.id });
    push({ title: '活动已删除', body: deleteTarget.name, tone: 'success' });
    setDeleteTarget(null);
  }, [deleteTarget, push]);

  const handleExport = useCallback(() => {
    try {
      if (typeof URL.createObjectURL !== 'function') {
        push({ title: '当前环境不支持导出', body: '请使用现代浏览器打开应用', tone: 'warning' });
        return;
      }
      const blob = new Blob([serializeExport(state)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `eventclock-v2-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      push({
        title: '已导出 JSON',
        body: `${state.events.length} 个活动与全部设置`,
        tone: 'success',
      });
    } catch {
      push({ title: '导出失败', body: '浏览器阻止了文件下载', tone: 'danger' });
    }
  }, [state, push]);

  const handleImportFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const result = parseImportPayload(text);
        if (!result.ok || !result.events || !result.settings) {
          push({ title: '导入失败', body: result.error ?? '文件内容无效', tone: 'danger' });
          return;
        }
        dispatch({
          type: 'data/import',
          events: result.events,
          settings: result.settings,
          activeEventId: result.activeEventId ?? null,
        });
        push({
          title: '导入完成',
          body: `已导入 ${result.events.length} 个活动`,
          tone: 'success',
        });
      } catch {
        push({ title: '导入失败', body: '无法读取所选文件', tone: 'danger' });
      }
    },
    [push],
  );

  const handleClearData = useCallback(() => {
    dispatch({ type: 'data/reset', now: Date.now() });
    setClearOpen(false);
    push({ title: '本地数据已重置', body: '已恢复默认活动与设置', tone: 'success' });
  }, [push]);

  const cycleDisplayMode = useCallback(() => {
    const index = DISPLAY_ORDER.indexOf(state.settings.displayMode);
    const next = DISPLAY_ORDER[(index + 1) % DISPLAY_ORDER.length];
    dispatch({ type: 'settings/update', patch: { displayMode: next } });
  }, [state.settings.displayMode]);

  const activeIndex = activeEvent
    ? state.events.findIndex((event) => event.id === activeEvent.id)
    : -1;

  const goRelative = useCallback(
    (delta: number) => {
      if (state.events.length < 2) return;
      const index = (activeIndex + delta + state.events.length) % state.events.length;
      dispatch({ type: 'event/activate', id: state.events[index].id });
    },
    [activeIndex, state.events],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }
      const modalOpen = editorOpen || settingsOpen || Boolean(deleteTarget) || clearOpen;
      if (event.key === 'Escape') {
        if (modalOpen) return;
        if (stageOpen) closeStage();
        return;
      }
      if (modalOpen) return;
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        if (stageOpen) closeStage();
        else openStage();
      } else if ((event.key === 'n' || event.key === 'N') && !stageOpen) {
        event.preventDefault();
        openCreate();
      } else if ((event.key === 's' || event.key === 'S') && !stageOpen) {
        event.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stageOpen, editorOpen, settingsOpen, deleteTarget, clearOpen, openStage, closeStage, openCreate]);

  const zonedNow = getZonedParts(now, state.settings.timeZone);
  const compactDate = `${zonedNow.weekday} ${pad2(zonedNow.hour)}:${pad2(zonedNow.minute)}`;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            TR
          </span>
          <div className="min-w-0">
            <div className="brand-name">
              {branding.eventTitle} <span className="brand-version">V2</span>
            </div>
            <div className="brand-sub">{branding.eventSubtitle} · {branding.organization}</div>
          </div>
        </div>
        <div className="header-actions">
          <span className="header-clock" aria-label="当前时间">
            {compactDate}
          </span>
          <button
            type="button"
            className="btn btn-ghost header-settings"
            onClick={() => setSettingsOpen(true)}
            aria-label="设置"
          >
            <SettingsIcon size={16} />
            <span className="hidden sm:inline">设置</span>
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={openCreate}
            aria-label="新建活动"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">新建活动</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={openStage}>
            <Maximize2 size={16} />
            大屏
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="primary-column">
          <CountdownHero
            event={activeEvent}
            now={now}
            settings={state.settings}
            onEdit={() => activeEvent && openEdit(activeEvent)}
            onOpenStage={openStage}
            onCreate={openCreate}
          />
          <div className="stage-hint-bar">
            <span className="stage-hint-dot" aria-hidden="true" />
            按 <kbd>F</kbd> 进入大屏，<kbd>I</kbd> 切换沉浸模式，倒计时在刷新与休眠后自动校准
          </div>
        </div>

        <aside className="side-column">
          <RoadshowTimer
            state={state.roadshow}
            now={now}
            teamName={state.roadshow.teamName}
            onStart={() => dispatch({ type: 'roadshow/start', now: Date.now() })}
            onPause={() => dispatch({ type: 'roadshow/pause', now: Date.now() })}
            onResume={() => dispatch({ type: 'roadshow/resume', now: Date.now() })}
            onReset={() => dispatch({ type: 'roadshow/reset' })}
            onConfigure={(durationMs) => dispatch({ type: 'roadshow/configure', durationMs })}
            onTeamNameChange={(teamName) => dispatch({ type: 'roadshow/setTeamName', teamName })}
            onOpenStage={openRoadshowStage}
          />
          <EventList
            events={state.events}
            activeEventId={activeEvent?.id ?? null}
            now={now}
            settings={state.settings}
            onActivate={(id) => dispatch({ type: 'event/activate', id })}
            onEdit={openEdit}
            onDuplicate={handleDuplicate}
            onDelete={setDeleteTarget}
            onCreate={openCreate}
          />
        </aside>
      </main>

      <footer className="app-foot">
        <span>{branding.eventTitle} · EventClock V2 · 本地优先</span>
        <span>所有数据仅保存在当前浏览器，跨设备需手动导出/导入</span>
      </footer>

      <EventEditor
        open={editorOpen}
        event={editingEvent}
        timeZone={state.settings.timeZone}
        onClose={() => {
          setEditorOpen(false);
          setEditingEvent(null);
        }}
        onSubmit={handleSave}
      />

      <SettingsPanel
        open={settingsOpen}
        settings={state.settings}
        onClose={() => setSettingsOpen(false)}
        onChange={(patch) => dispatch({ type: 'settings/update', patch })}
        onExport={handleExport}
        onImportFile={handleImportFile}
        onResetSettings={() => {
          dispatch({ type: 'settings/reset' });
          push({ title: '设置已恢复默认', tone: 'success' });
        }}
        onClearData={() => setClearOpen(true)}
      />

      <Modal
        open={Boolean(deleteTarget)}
        title="删除活动"
        description={
          deleteTarget
            ? `确定删除「${deleteTarget.name}」吗？此操作只影响本地数据，且不可撤销。`
            : undefined
        }
        onClose={() => setDeleteTarget(null)}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
              取消
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>
              确认删除
            </button>
          </div>
        }
      >
        {deleteTarget ? (
          <p className="text-[13px] leading-relaxed text-muted">
            {EVENT_KIND_META[deleteTarget.kind].label} · 数据存储在当前浏览器中。
          </p>
        ) : null}
      </Modal>

      <Modal
        open={clearOpen}
        title="清空所有本地数据"
        description="将删除全部活动与设置，并恢复默认活动。此操作不可撤销。"
        onClose={() => setClearOpen(false)}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setClearOpen(false)}>
              取消
            </button>
            <button type="button" className="btn btn-danger" onClick={handleClearData}>
              清空并恢复默认
            </button>
          </div>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">
          建议先在设置中导出 JSON 备份，再执行清空操作。
        </p>
      </Modal>

      {stageOpen ? (
        <PresentationStage
          event={activeEvent}
          now={now}
          settings={state.settings}
          totalEvents={state.events.length}
          eventIndex={activeIndex < 0 ? 0 : activeIndex}
          onExit={closeStage}
          onPrev={() => goRelative(-1)}
          onNext={() => goRelative(1)}
          onCycleDisplayMode={cycleDisplayMode}
        />
      ) : null}

      {roadshowStageOpen ? (
        <RoadshowStage
          state={state.roadshow}
          now={now}
          teamName={state.roadshow.teamName || branding.roadshow.defaultTeamName}
          onExit={closeRoadshowStage}
          onPause={() => dispatch({ type: 'roadshow/pause', now: Date.now() })}
          onResume={() => dispatch({ type: 'roadshow/resume', now: Date.now() })}
          onReset={() => dispatch({ type: 'roadshow/reset' })}
        />
      ) : null}

      <TimeCalibrationNotice />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
