# 更新日志

## V2.1 - TRAE Hackathon Edition (2026-11-23)

### 🎨 视觉升级

#### TRAE 黑客松专属设计
- **品牌配置系统**：新增 `src/config/branding.ts`，可编辑主题文案、阶段名称、队伍名称、视觉参数
- **清晰的品牌标识**：
  - 页面头部显示 "TRAE on Campus"、"AI Coding Hackathon"、"四川大学"
  - Logo 从 "EC" 改为 "TR"（TRAE 缩写）
  - 活动倒计时大屏显示主办方、活动名称、阶段状态
  - 路演大屏显示 TRAE 品牌与活动信息

#### 原创视觉元素（`src/components/VisualEffects.tsx`）
- **代码粒子流（CodeParticles）**：50 个浮动代码片段（function、const、AI、λ 等），支持强度调节
- **发光网格（GridPattern）**：SVG 网格背景，科技感十足
- **数据脉冲（DataPulse）**：活动进行时的脉冲环动画
- **协作图（CooperationGraph）**：Canvas 节点连线动画（已实现但未使用）
- 所有动画支持 `prefers-reduced-motion` 和手动关闭

#### 明确倒计时目标
- 主页面增加"正在倒计时：距离目标时间 XXX"标签
- 避免混淆"活动开始/结束时间"与"倒计时目标时间"

---

### 📺 路演计时投影大屏

#### 新组件：`RoadshowStage.tsx`
- **独立全屏模式**：专为路演设计，与活动倒计时大屏分离
- **队伍名称显示**：超大标题显示参赛队伍/选手名称
- **清晰状态指示**：
  - 剩余时间超大显示（响应式字体 5rem–48rem）
  - 超时后显示负数计时（如 "-00:32"）
  - "已超时" 红色标签
  - "已暂停" 黄色标签
- **现场控制**：
  - 大屏内暂停/继续/重置按钮
  - 鼠标移动唤醒控件，3 秒后自动隐藏
  - Esc 退出全屏
- **品牌元素**：显示 TRAE logo、活动名称、主办方

#### 路演计时功能增强（`RoadshowTimer.tsx`）
- 增加 **队伍/选手名称输入** 字段（`<input type="text" />`）
- 增加 **投影大屏按钮**（Maximize2 图标）
- 一键从路演计时面板进入投影全屏

#### State 与 Reducer 更新
- `RoadshowState` 增加 `teamName: string` 字段
- `reducer.ts` 增加 `roadshow/setTeamName` action
- `roadshow.ts` 中 `createRoadshow()` 默认 `teamName: ''`

---

### 🕐 时间校准提示

#### 新组件：`TimeCalibrationNotice.tsx`
- **自动检测时间偏差**：页面加载时调用 `worldtimeapi.org` 检测本地时间与网络时间差异
- **智能提示**：偏差超过 5 秒显示浮动提示条，5 秒内不显示
- **明确限制**：清楚说明"本应用为纯静态前端，无法自动纠正设备时钟"
- **现场校准建议**：提示用户校准系统时间或确保所有设备使用同一时间源（NTP）
- **可关闭**：点击关闭后存储在 `sessionStorage`，本次会话不再显示

#### 在 App.tsx 中集成
- 渲染在最外层，z-index 50
- 仅首次加载检查一次，避免频繁网络请求

---

### 📱 界面与交互改进

#### 主页面（`CountdownHero.tsx`）
- 增加粒子流和网格背景
- 增加"正在倒计时：距离目标时间"标签
- 所有内容增加 `relative z-10` 确保在背景之上

#### 活动大屏（`PresentationStage.tsx`）
- 增加网格和数据脉冲背景
- 显示主办方、活动名称、阶段状态（重新布局 eyebrow）
- Logo 改为 "TR"，Brand 改为 TRAE 信息

#### 应用头部与底部（`App.tsx`）
- Logo 改为 "TR"
- 标题改为 "TRAE on Campus"，副标题 "AI Coding Hackathon · 四川大学"
- 页脚增加"跨设备需手动导出/导入"说明

---

### 🔧 技术改进

#### 新文件
- `src/config/branding.ts` - 品牌配置
- `src/components/VisualEffects.tsx` - 视觉效果组件
- `src/components/RoadshowStage.tsx` - 路演投影大屏
- `src/components/TimeCalibrationNotice.tsx` - 时间校准提示

#### 修改文件
- `src/types.ts` - `RoadshowState` 增加 `teamName`
- `src/state/reducer.ts` - 增加 `roadshow/setTeamName` action
- `src/lib/roadshow.ts` - `createRoadshow()` 增加 `teamName` 字段
- `src/components/RoadshowTimer.tsx` - 增加队伍名称输入和大屏按钮
- `src/components/CountdownHero.tsx` - 增加 TRAE 品牌元素和视觉效果
- `src/components/PresentationStage.tsx` - 增加 TRAE 品牌元素和视觉效果
- `src/App.tsx` - 整合路演大屏、时间校准提示、品牌信息
- `src/index.css` - 增加 `.stage-sep` 样式

#### 保持兼容性
- ✅ 保留所有现有活动 CRUD 功能
- ✅ 保留时区设置、提醒、JSON 导入导出
- ✅ 保留原有倒计时显示模式和大屏功能
- ✅ LocalStorage 数据结构向下兼容（增加字段不影响旧数据加载）

---

### 📝 文档更新

- `README.md` 完全重写，突出 TRAE 黑客松专属设计
- 增加"自定义品牌与文案"章节
- 增加"时间精度说明"与"时间校准"章节
- 明确"已知限制"与"仍需现场验证的事项"
- 增加"升级日志"章节

---

### ⚠️ 仍需验证

#### 类型检查与构建
- [ ] 运行 `npm run typecheck` 确认无类型错误
- [ ] 运行 `npm run build` 确认构建成功
- [ ] 检查构建产物大小（预期 JS gzip ≈ 70–80 KB）

#### 测试
- [ ] 更新现有测试以适配 `RoadshowState.teamName`
- [ ] 增加路演大屏组件测试
- [ ] 增加品牌配置测试
- [ ] 运行 `npm run test` 确认通过

#### 浏览器实测
- [ ] 桌面浏览器（Chrome/Edge/Firefox）：视觉效果、粒子流性能
- [ ] 移动端（390×844）：路演计时面板、队伍名称输入
- [ ] 1920×1080 投影：活动大屏、路演大屏、字体大小
- [ ] 大屏进入/退出、全屏失败降级
- [ ] 路演计时：开始/暂停/继续/重置/超时
- [ ] 路演大屏：队伍名称显示、超时提示、控件唤醒
- [ ] 时间校准提示：网络请求、偏差计算、关闭按钮
- [ ] 动画关闭：设置中关闭动效，确认粒子流和网格不显示

#### 现场验证
- [ ] 投影仪实际分辨率适配
- [ ] 队伍名称最大长度测试（如"XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"）
- [ ] 超时提示在投影仪上的可见性
- [ ] 多设备导出/导入 JSON 流程
- [ ] 时间校准提示在现场网络环境下是否正常工作

---

### 🎯 视觉验收标准

打开大屏后，观众应在几秒内看出：
1. ✅ 这是 TRAE 黑客松（不是通用计时器）
2. ✅ 当前倒数的事项是什么
3. ✅ 还剩多久
4. ✅ 主持人能快速切到路演计时并控制它
5. ✅ 临近截止时有明显提示，但画面仍然清晰、稳定、适合持续投影

---

## V2.0 (2026-11-18)

初始版本，包含基础倒计时、活动管理、提醒、大屏、路演计时、本地持久化功能。

详见原 README.md。
