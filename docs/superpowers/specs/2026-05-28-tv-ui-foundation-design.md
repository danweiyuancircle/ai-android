# TV-UI 基础组件库 + 焦点框架深度集成 — 设计稿

- **日期**：2026-05-28
- **作者**：与 Claude 协作（liuyongjie / microboatofficial@gmail.com）
- **范围**：`template/h5-vue/` 模板下 `@dwy/tv-ui` 包的容器层 + 弹层扩展，加配套 Claude Skill 规范
- **目标读者**：模板维护者 / 下游项目的 AI 协作者

## 1. 背景

`template/h5-vue/` 已有 `@dwy/focus-core`（fork 自 js-spatial-navigation，TS 化）+ `@dwy/focus-vue3`（Vue 适配层）+ `@dwy/tv-ui`（4 个项目化组件 EButton/ECard/EImage/EVirtualList）。当前痛点：

1. **业务层直接接触 `@dwy/focus-vue3`**：业务文件 import `FocusSection` / `Focusable` / `useFocusable`，没有抽象边界。开发者必须懂焦点系统才能写页面。
2. **`useFocusPage`（@shell/core）是模板层补丁**：本质是"页面挂载 → SpatialNavigation.focus(id)"的封装，但要求开发者在每个页面 setup 顶部记得调一次 + 模板根 `<FocusSection>` 的 id 必须字面等于该参数，漏写 / 写错 = 进页无焦点。
3. **缺"区域容器"抽象**：写"水平 / 垂直 / grid 一组卡片成为一个焦点区域"时，业务侧得手写 `<FocusSection id="..." :enter-to="...">` + flex 样式。
4. **缺"弹层"抽象**：每个弹框（ExitDialog / HintDialog / VoiceDialog）都各自写 FocusLayer + watch(modelValue) + 手动 SpatialNavigation.focus，重复且容易漏关键步骤（如初始聚焦、Back 关闭）。
5. **缺机器可读规范**：AI 协作者在写新页面时不知道"该用什么、不该用什么"。

## 2. 目标 / 非目标

### 2.1 目标

- 业务层**只能**通过 `@dwy/tv-ui` 完成 TV 页面 / 弹框 / 列表开发；不直接接触 `@dwy/focus-vue3` / `@shell/core/useFocusPage`。
- 容器组件（ERow / EColumn / EFocusGroup）默认自动注册成 FocusSection，开发者写 `<ERow id="x">` 一句话同时拿到布局 + 焦点区域。
- 弹层组件（EDialog / EDrawer）"开箱即焦"：打开自动聚焦、关闭自动复焦、Back/ESC/遮罩自动关闭，不需要业务侧写焦点代码。
- 焦点锁焦（`restrict='self-only'`）与区域记忆（`enter-to='last-focused'`）继续走 focus-core 既有能力，tv-ui 只做透传。
- 配套 Claude Skill `tv-ui-page-author` 让 AI 协作者按规范产出代码。

### 2.2 非目标

- 不替换 focus-core / focus-vue3 的实现；只在 tv-ui 层做封装。
- 不做表单类（EInput / ESelect / ETabs）、不做媒体类（EPlayer）—— 留下一轮。
- 不做 ESLint 自定义规则、不做运行时 dev 警告（本轮只做 Skill 文档约束）。
- 不做 TS 类型层面的强约束（如"EButton 必须在 ERow 内"），靠 Skill 文档说明。

## 3. 包结构与依赖封死

```
template/h5-vue/
├── packages/
│   ├── focus-core/                   不变（SN 核心）
│   ├── focus-vue3/                   不变（Vue 适配层）
│   │
│   ├── tv-ui/                        ← 本轮扩展
│   │   src/
│   │     index.ts                    唯一对外出口
│   │     ─── focus / layout ───
│   │     EPage.vue                   ＋ 新增
│   │     EFocusGroup.vue             ＋
│   │     ERow.vue                    ＋
│   │     EColumn.vue                 ＋
│   │     EFocusable.vue              ＋
│   │     ─── items（已有保留） ───
│   │     EButton.vue
│   │     ECard.vue
│   │     EImage.vue
│   │     EVirtualList.vue
│   │     ─── overlay ───
│   │     EDialog.vue                 ＋
│   │     EDrawer.vue                 ＋
│   │     EToast.vue                  ＋
│   │     ─── composables ───
│   │     composables/useEPage.ts             ＋
│   │     composables/useFocusLockedKeys.ts   ＋
│   │     composables/useOverlay.ts           ＋（EDialog/EDrawer 共享）
│   │     styles/tokens.css           不变
│   │
│   ├── core/
│   │     composables/useFocusPage.ts → ❌ 删除（被 EPage 取代）
│   │     bridge/...                  保留
│   │
│   ├── ui/                           ExitDialog / HintDialog 重构成 EDialog 实例
│   └── features/aichat/              不变
│
├── apps/shell/
│   └── package.json：
│       dependencies:
│         "@dwy/tv-ui": "workspace:*"           保留
│         "@dwy/focus-vue3": "workspace:*"      ❌ 删除（业务层封死）
│         "@shell/core": "workspace:*"          保留
│         "@shell/ui": "workspace:*"            保留
```

### 3.1 封死手段（双层）

1. **物理层**：`apps/shell/package.json` 移除 `@dwy/focus-vue3` 依赖声明。在 pnpm 工作空间下，未声明依赖的包不会被 `node_modules/.pnpm/...` 暴露给业务包；业务文件 import `@dwy/focus-vue3` 时 vue-tsc 找不到类型声明而报错。注：vite.config.ts 中的 `@dwy/focus-vue3` alias 仍**保留**（tv-ui 内部 import 走 alias 解析到源码），但业务层因依赖未声明无法触达。
2. **配置层**：ESLint 配置加 `no-restricted-imports`，业务文件夹（`apps/shell/src/`）禁止 import `@dwy/focus-vue3`、`@shell/core/composables/useFocusPage`、以及 tv-ui 内部 composables（仅 tv-ui 自身 import）。lint 阶段直接拦住。

### 3.2 内部依赖

`@dwy/tv-ui` 内部继续依赖 `@dwy/focus-vue3`，把它的能力 re-export 为 tv-ui 组件，focus-vue3 变成 tv-ui 的"实现细节"，业务层不可见。

## 4. 组件 API 详表

每个组件统一三段：**props / slots / emits**，加内部实现要点。所有 props 在 TS 里 camelCase，模板里 kebab-case 用。

### 4.1 EPage — 页面壳

```ts
interface Props {
  /** 必填。FocusSection id；同时作为页面的焦点记忆键 */
  id: string
  /** 首次进入或无记忆时兜底聚焦的 focus-key；不传仅按 last-focused 恢复 */
  defaultFocus?: string
  /** 自定义根标签，默认 div */
  tag?: string
}
// slots: default
// emits: 无
```

**内部行为**：

- 自动调 `useFocusSection({ id, enterTo: 'last-focused', restrict: 'self-first' })`
- 自动调 `useKeepAliveFocus()`（onActivated → SN.resume / onDeactivated → SN.pause）
- `onActivated` + `nextTick` 后 `SpatialNavigation.focus(id)`，失败兜底 `focus('[data-focus-key="${defaultFocus}"]')`
- 渲染 `<{tag} class="tv-page" :data-sn-section-root="id"><slot /></{tag}>`

### 4.2 EFocusGroup — 自由焦点容器

```ts
interface Props {
  /** 不传则自动生成 dwy-group-N */
  id?: string
  /** 边界策略 */
  restrict?: 'self-first' | 'self-only' | 'none'      // 默认 'self-first'
  /** 进入策略 */
  enterTo?: 'last-focused' | 'default-element' | ''   // 默认 'last-focused'
  /** 跨方向跳转规则 */
  leaveFor?: { up?: string; down?: string; left?: string; right?: string } | null
  /** 默认聚焦元素的 CSS selector */
  defaultElement?: string
  /** false 时仅渲染容器，不创建 FocusSection */
  section?: boolean                                    // 默认 true
  tag?: string                                         // 默认 div
}
// slots: default
// emits: 无
```

**内部行为**：`section !== false` 时调 `useFocusSection({ id, restrict, enterTo, leaveFor })`。是 ERow/EColumn 的"无布局基类"。grid 墙、绝对定位场景用它。

### 4.3 ERow / EColumn — 布局 + section

```ts
interface Props {
  // EFocusGroup 全部 props 透传
  id?: string
  restrict?: 'self-first' | 'self-only' | 'none'      // 默认 'self-first'
  enterTo?: 'last-focused' | 'default-element' | ''   // 默认 'last-focused'
  leaveFor?: { up?: string; down?: string; left?: string; right?: string } | null
  defaultElement?: string
  section?: boolean                                    // 默认 true

  /** 子项间距，px，默认 16 */
  gap?: number
  /** 主轴对齐 */
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around'
  /** 交叉轴对齐 */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** 是否换行（仅 ERow 暴露） */
  wrap?: boolean
}
// slots: default
// emits: 无
```

**内部行为**：

- 继承 EFocusGroup 的 section 行为（同一份逻辑，slot 接 EFocusGroup）
- 加 `display: flex; flex-direction: row|column; gap: ${gap}px; justify-content: ${justify}; align-items: ${align}`
- 默认 `restrict='self-first'` —— 允许焦点穿出；锁焦时业务侧显式写 `restrict='self-only'`

### 4.4 EFocusable — 自定义焦点元素逃生口

```ts
interface Props {
  /** 必填 */
  focusKey: string
  /** false 时占位但不参与焦点（disabled） */
  enabled?: boolean              // 默认 true
  tag?: string                   // 默认 div
}
// slots: default { focused: boolean }
// emits: enter, focus, blur
```

**用法**：

```vue
<EFocusable focus-key="poster-1" v-slot="{ focused }" @enter="play()">
  <div :class="['poster', { 'is-focused': focused }]">
    <img src="..." />
    <div class="overlay">{{ title }}</div>
  </div>
</EFocusable>
```

**内部行为**：薄包 `useFocusable({ focusKey, onEnter, onFocus, onBlur })`，把 `focused` 通过 v-slot 暴露。

### 4.5 EDialog — 弹框

```ts
interface Props {
  /** v-model */
  modelValue: boolean
  /** 标题；不传则不渲染 title 区 */
  title?: string
  /** 必填：打开后初始聚焦的 focus-key */
  defaultFocus: string
  /** Back/ESC 是否自动关闭，默认 true */
  closeOnBack?: boolean
  /** 点击遮罩是否自动关闭，默认 true */
  closeOnMaskClick?: boolean
  /** 宽度，px，默认 420 */
  width?: number | string
  /** 是否传送到 body，默认 true */
  teleport?: boolean
}
// slots: default（主体）, footer（按钮区）
// emits: 'update:modelValue', open, close
```

**`defaultFocus` 必填**：TS 类型显式 required，漏写编译期报错。

**内部行为**（自动接管）：

1. `modelValue=true` 时：
   - `<Teleport to="body">` 包裹
   - `<FocusLayer>` disable 外层 section，保存 `previousActiveElement`
   - `<EFocusGroup restrict="self-only">` 锁焦
   - `watch(modelValue) → nextTick → SpatialNavigation.focus('[data-focus-key="${defaultFocus}"]')`
2. 关闭路径：
   - `closeOnBack=true` 监听 `ott:native-keydown` 的 `KEYCODE_BACK` + window keydown 的 `Escape`，emit `update:modelValue=false`
   - `closeOnMaskClick=true` 监听遮罩 `@click.self`
3. `modelValue=false` 时：FocusLayer 卸载 → 焦点自动回到 `previousActiveElement`

### 4.6 EDrawer — 侧抽屉

```ts
interface Props {
  modelValue: boolean
  title?: string
  defaultFocus: string                              // 必填
  closeOnBack?: boolean                             // 默认 true
  closeOnMaskClick?: boolean                        // 默认 true
  teleport?: boolean                                // 默认 true
  /** 抽屉位置 */
  placement?: 'left' | 'right' | 'top' | 'bottom'   // 默认 'right'
  /** 主轴尺寸 */
  size?: number | string                            // 默认 360
}
// slots: default, footer
// emits: 'update:modelValue', open, close
```

**内部行为**：除位置 / 尺寸样式外，焦点行为与 EDialog 完全相同，共享 `useOverlay` composable。

### 4.7 EToast — 无焦点提示

```ts
interface Props {
  modelValue: boolean
  message: string
  /** 自动关闭毫秒；0 = 不自动关 */
  duration?: number                                 // 默认 2000
  placement?: 'top' | 'center' | 'bottom'           // 默认 'bottom'
  teleport?: boolean                                // 默认 true
}
// slots: 无（用 message prop）
// emits: 'update:modelValue'
```

**内部行为**：

- 不接 FocusLayer / FocusSection（不参与焦点）
- `modelValue=true` 时 setTimeout(duration) emit 关闭（duration=0 跳过）
- 仅 Teleport + 居中定位 + 文字渲染

### 4.8 公共 composables

`@dwy/tv-ui` 内部 composables，**业务层不直接 import**（ESLint 拦住），仅 tv-ui 组件自己用：

```ts
// useEPage(id: string, defaultFocusKey?: string): void
//   EPage 的纯逻辑实现
//   注：这是新增的 tv-ui 内部 composable，不同于被删除的 @shell/core/useFocusPage
//   作为 EPage 的实现细节存在；少数已有自定义布局且不能直接套 <EPage> 的复杂页（如 AIChat）
//   可在 tv-ui 包内部以"白名单"方式 import

// useFocusLockedKeys({ onBack?, onEscape?, enabled? }): void
//   监听 OTT Back / 浏览器 Escape，自动绑 / 解绑
//   EDialog / EDrawer 内部用

// useOverlay({ modelValue, defaultFocus, closeOnBack, closeOnMaskClick }): {...}
//   EDialog / EDrawer 共享的"开 - 关 - 聚 - 离"四步逻辑
```

## 5. 现有代码改造点

### 5.1 删除

- `packages/core/src/composables/useFocusPage.ts` — 被 EPage 取代
- `packages/core/src/index.ts` 中 useFocusPage 的 re-export

### 5.2 重构

| 现有文件 | 改造 |
|---|---|
| `packages/ui/src/components/ExitDialog.vue` | 内部改用 `<EDialog>` + `<EButton>`，对外 API 不变（仍 v-model + emit confirm/cancel） |
| `packages/ui/src/components/HintDialog.vue` | 同上，改用 `<EDialog>` |
| `packages/ui/src/components/VoiceDialog.vue` | 改用 `<EDialog :close-on-back="false" :close-on-mask-click="false">`，由语音生命周期决定开关，遥控器不能关 |
| `apps/shell/src/pages/Home.vue` | 把 `<FocusSection id="home">` 改为 `<EPage id="home" default-focus="home-detail">`，去掉 `useFocusPage` import |
| `apps/shell/src/pages/Detail.vue` | 同上 |
| `apps/shell/src/pages/ComingSoon.vue` | 同上 |
| `apps/shell/src/pages/Perf.vue` | 改用 `<EPage>` + `<EColumn>` / `<ERow>` |
| `apps/shell/src/components/EHRow.vue` | 下沉到 `packages/tv-ui/EHRow.vue` 作为水平虚拟列表对外暴露；Perf 页改 import 自 `@dwy/tv-ui` |

### 5.3 新增

| 文件 | 用途 |
|---|---|
| `packages/tv-ui/src/EPage.vue` | 页面壳 |
| `packages/tv-ui/src/EFocusGroup.vue` | 自由焦点容器 |
| `packages/tv-ui/src/ERow.vue` | 水平布局 + section |
| `packages/tv-ui/src/EColumn.vue` | 垂直布局 + section |
| `packages/tv-ui/src/EFocusable.vue` | 自定义焦点元素逃生口 |
| `packages/tv-ui/src/EDialog.vue` | 弹框 |
| `packages/tv-ui/src/EDrawer.vue` | 抽屉 |
| `packages/tv-ui/src/EToast.vue` | 提示 |
| `packages/tv-ui/src/composables/useEPage.ts` | EPage 纯逻辑 |
| `packages/tv-ui/src/composables/useFocusLockedKeys.ts` | Back/ESC 监听 |
| `packages/tv-ui/src/composables/useOverlay.ts` | EDialog/EDrawer 共享逻辑 |
| `claude/skills/tv-ui-page-author/SKILL.md` | Claude Skill 入口 |
| `claude/skills/tv-ui-page-author/references/page-template.md` | 页面模板 |
| `claude/skills/tv-ui-page-author/references/dialog-template.md` | 弹层模板 |
| `claude/skills/tv-ui-page-author/references/focusable-recipes.md` | 焦点配方 |
| `claude/skills/tv-ui-page-author/references/anti-patterns.md` | 禁忌清单 |

## 6. Claude Skill 设计

放在 `claude/skills/tv-ui-page-author/`。下游项目按既有约定（CLAUDE.md 中"起项目时按 template/README.md 的绑定表从 claude/ 拷贝对应 rules/skill 到目标工程 .claude/"）拷贝到 `.claude/skills/`。

### 6.1 SKILL.md frontmatter

```yaml
---
name: tv-ui-page-author
description: 写 TV 页面 / 弹框 / 列表时必读。强制规约：只用 @dwy/tv-ui 组件，不直接 import @dwy/focus-vue3 / @shell/core/useFocusPage，不裸用 <div tabindex>。涵盖 EPage / ERow / EColumn / EFocusGroup / EDialog / EDrawer / EToast / EFocusable 的标准写法。
---
```

### 6.2 SKILL.md body（< 80 行）

三段：

1. **三句话规约**
   - 页面必从 `<EPage id="..." default-focus="...">` 起
   - 可聚焦元素必是 tv-ui 组件（EButton / ECard / EFocusable / EVirtualList）
   - 焦点区域容器必是 tv-ui 容器（ERow / EColumn / EFocusGroup / EDialog / EDrawer）
2. **决策树**
   ```
   要做什么？
     ├─ 一级 / 二级页 → references/page-template.md
     ├─ 弹框 / 抽屉 / Toast → references/dialog-template.md
     ├─ 卡片列表 / 网格 / 锁焦区 → references/focusable-recipes.md
     └─ 自定义 UI 但要成焦点项 → references/focusable-recipes.md §自定义焦点项
   ```
3. **绝对禁忌** → 链到 `references/anti-patterns.md`

### 6.3 references/page-template.md

含两种页面模板（一级页 + 二级页），可复制粘贴。附说明：

- `EPage.id` 与 `defaultFocus` 的契约
- `ERow.id` 是子区域 section 的命名（用于区域间记忆）
- KeepAlive 自动接，不用手写

### 6.4 references/dialog-template.md

三段：EDialog / EDrawer / EToast 各一段。每段含「场景 / 模板 / 关键参数」。明确"别再写 ExitDialog/HintDialog 自己包，用 EDialog"。

### 6.5 references/focusable-recipes.md

四个常见 recipe：

1. **横向卡片墙** → `<ERow id="x"> + v-for ECard`
2. **纵向无限列表** → `<EVirtualList section-id="x" ...>`
3. **锁焦区**（菜单 / Tab 组） → `<ERow id="x" restrict="self-only">`
4. **自定义焦点项** → `<EFocusable v-slot="{focused}" ...>` 包业务自画 UI

### 6.6 references/anti-patterns.md

| ❌ 反例 | ✅ 正确 | 原因 |
|---|---|---|
| `import { FocusSection } from '@dwy/focus-vue3'` | 用 `<EFocusGroup>` / `<ERow>` / `<EColumn>` | 业务层不接触 focus-vue3 |
| `import { useFocusPage } from '@shell/core'` | 用 `<EPage>` | useFocusPage 已废弃 |
| `<div tabindex="0" @keyup.enter="...">` | `<EButton>` 或 `<EFocusable>` | 裸 div 不进 SN，键位不归一 |
| `<EButton>` 漏 `focus-key` | 必填 `focus-key` | 焦点记忆 / 测试定位 / 调试要靠它 |
| `<ERow>` 漏 `id` | `<ERow id="...">` | 子焦点区无名 = section 间无法跨页记忆 |
| `<EDialog>` 漏 `default-focus` | `<EDialog default-focus="confirm">` | 编译期已强制必填 |
| 自己写 v-if + Teleport + 手动焦点 | `<EDialog>` | 重复造轮 + 易漏 FocusLayer |
| `<EButton @click="goto(...)">` | `<EButton @enter="goto(...)">` | @click 在遥控器路径上不触发 |

## 7. 验证标准

实施完成后必须满足：

1. `apps/shell/src/` 全目录 `grep` **零结果**：`from '@dwy/focus-vue3'`、`from '@shell/core/composables/useFocusPage'`、`<FocusSection`、`<Focusable`、`<FocusLayer`、`useFocusPage(`
2. `apps/shell/src/pages/*.vue` 每个页面以 `<EPage id="..." default-focus="...">` 起
3. `apps/shell` 的 `pnpm typecheck` 通过
4. `apps/shell` 的 `pnpm lint` 通过
5. 手测：每个页面首次进入 / Back 回流 / KeepAlive 复活 三种场景焦点都正常落到对应元素
6. 手测：ExitDialog / HintDialog 弹框打开自动聚焦确定按钮、Back 自动关闭、关闭后焦点回到打开前的元素

## 8. 实施分批

建议分三批合入，每批可独立验证：

1. **批 1 — tv-ui 新组件落地**：新增 EPage / EFocusGroup / ERow / EColumn / EFocusable / EDialog / EDrawer / EToast 文件 + composables + tv-ui index.ts re-export。批 1 完成后旧代码不动，新旧并存。
2. **批 2 — 业务侧迁移**：把 apps/shell/src/pages/*.vue、ui/ExitDialog/HintDialog/VoiceDialog 全迁过来。删除 useFocusPage 文件。
3. **批 3 — 物理封死 + Skill**：apps/shell/package.json 移除 @dwy/focus-vue3、ESLint 加 no-restricted-imports、写 claude/skills/tv-ui-page-author。

## 9. 风险与开放点

| 项 | 风险 | 缓解 |
|---|---|---|
| EDialog 的 Back 拦截与 useAutoBackButton 冲突 | 弹框打开时，useAutoBackButton（App.vue 全局）也会响应 Back → 触发 router.back | EDialog 内部通过 stopPropagation / 标志位告诉 useAutoBackButton 跳过；或 useAutoBackButton 改成检测顶层 FocusLayer 存在时不响应 |
| `<Teleport to="body">` 后 FocusLayer 的 inner section 收集 | FocusLayer 用 provide/inject 收集子 section，Teleport 不打断 provide | 验证：Teleport 不打断 provide，本身 Vue 3 行为正确，但要测 |
| EVirtualList 旧 API（`section-id`）与新规范一致性 | 旧组件用 `section-id` props，新组件统一用 `id` | EVirtualList 暂保留 section-id 不动，下一轮统一改名 |
| AIChat feature 的页面是否也走 EPage | features/aichat 是卡带，可能有自己的页面结构 | 评估时一并迁移；如有特殊性留下记录 |

## 10. 下一步

转 writing-plans 出实施计划（三批，每批分到任务级），按 superpowers:executing-plans 流程逐批落地。
