import { useRef } from 'react';
import {
  Download,
  Keyboard,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  TIME_ZONE_OPTIONS,
  type DisplayMode,
  type NumberFormat,
  type Settings,
  type ThemeMode,
} from '../types';
import { Modal } from './Modal';
import { Segmented, SwitchRow } from './Controls';

interface SettingsPanelProps {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onChange: (patch: Partial<Settings>) => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
  onResetSettings: () => void;
  onClearData: () => void;
}

const SHORTCUTS: ReadonlyArray<{ keys: string[]; label: string }> = [
  { keys: ['F'], label: '打开 / 关闭大屏' },
  { keys: ['I'], label: '沉浸模式（大屏内）' },
  { keys: ['←', '→'], label: '切换活动（大屏内）' },
  { keys: ['N'], label: '新建活动' },
  { keys: ['Esc'], label: '关闭弹窗 / 退出大屏' },
];

export function SettingsPanel({
  open,
  settings,
  onClose,
  onChange,
  onExport,
  onImportFile,
  onResetSettings,
  onClearData,
}: SettingsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Modal
      open={open}
      title="设置"
      description="外观、时间与提醒偏好会自动保存在本地。"
      onClose={onClose}
      size="md"
    >
      <div className="settings-stack">
        <section className="settings-section" aria-labelledby="settings-appearance">
          <h3 id="settings-appearance" className="settings-heading">
            外观
          </h3>

          <div className="setting-block">
            <div className="setting-label">主题</div>
            <Segmented<ThemeMode>
              label="主题"
              value={settings.theme}
              onChange={(theme) => onChange({ theme })}
              options={[
                { value: 'dark', label: '深色', icon: <Moon size={14} /> },
                { value: 'light', label: '浅色', icon: <Sun size={14} /> },
              ]}
            />
          </div>

          <div className="setting-block">
            <div className="setting-label">倒计时显示模式</div>
            <Segmented<DisplayMode>
              label="倒计时显示模式"
              value={settings.displayMode}
              onChange={(displayMode) => onChange({ displayMode })}
              options={[
                { value: 'days', label: '天 · 时 · 分 · 秒' },
                { value: 'hours', label: '总时 · 分 · 秒' },
                { value: 'compact', label: '紧凑' },
              ]}
            />
          </div>

          <div className="setting-block">
            <div className="setting-label">数字格式</div>
            <Segmented<NumberFormat>
              label="数字格式"
              value={settings.numberFormat}
              onChange={(numberFormat) => onChange({ numberFormat })}
              options={[
                { value: 'padded', label: '补零 08' },
                { value: 'plain', label: '自然 8' },
              ]}
            />
          </div>

          <SwitchRow
            label="界面动效"
            description="关闭后减少过渡与动画（同时遵循系统减弱动态效果设置）"
            checked={settings.animations}
            onChange={(animations) => onChange({ animations })}
          />
        </section>

        <section className="settings-section" aria-labelledby="settings-time">
          <h3 id="settings-time" className="settings-heading">
            时间
          </h3>
          <div className="setting-block">
            <label className="setting-label" htmlFor="settings-timezone">
              时区
            </label>
            <select
              id="settings-timezone"
              className="text-input"
              value={settings.timeZone}
              onChange={(event) => onChange({ timeZone: event.target.value })}
            >
              {TIME_ZONE_OPTIONS.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </select>
            <p className="setting-hint">用于展示活动时间与编辑时间输入，倒计时本身始终基于绝对时间戳。</p>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-reminders">
          <h3 id="settings-reminders" className="settings-heading">
            提醒
          </h3>
          <SwitchRow
            label="启用活动提醒"
            description="按每个活动设置的阈值触发界面通知"
            checked={settings.remindersEnabled}
            onChange={(remindersEnabled) => onChange({ remindersEnabled })}
          />
          <SwitchRow
            label="提醒声音"
            description="仅在页面交互后播放，遵守浏览器自动播放限制"
            checked={settings.sound}
            onChange={(sound) => onChange({ sound })}
          />
        </section>

        <section className="settings-section" aria-labelledby="settings-data">
          <h3 id="settings-data" className="settings-heading">
            本地数据
          </h3>
          <p className="setting-hint">
            所有活动与设置保存在当前浏览器的 LocalStorage，不上传服务器。
          </p>
          <div className="data-actions">
            <button type="button" className="btn btn-outline" onClick={onExport}>
              <Download size={15} />
              导出 JSON
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={15} />
              导入 JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="选择要导入的 JSON 文件"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImportFile(file);
                event.target.value = '';
              }}
            />
            <button type="button" className="btn btn-outline" onClick={onResetSettings}>
              <RotateCcw size={15} />
              恢复默认设置
            </button>
            <button type="button" className="btn btn-danger-outline" onClick={onClearData}>
              <Trash2 size={15} />
              清空所有数据
            </button>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-shortcuts">
          <h3 id="settings-shortcuts" className="settings-heading">
            <Keyboard size={15} className="inline-block align-[-2px]" /> 快捷键
          </h3>
          <ul className="shortcut-list">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.label}>
                <span>{shortcut.label}</span>
                <span className="shortcut-keys">
                  {shortcut.keys.map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="settings-footnote">EventClock V2 · 本地优先 · 数据版本 2</p>
        </section>
      </div>
    </Modal>
  );
}
