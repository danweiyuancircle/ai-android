# TV-UI 基础组件库 + 焦点框架深度集成 实施计划

> **已过期**：组件已迁到 `@chancestv/tv-ui` / chances-tv-kit。写 TV 页用现 skill `tv-ui-page-author`，不要按本文 `@dwy/*` 路径施工。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `template/h5-vue/packages/tv-ui` 增补容器层（EPage/EFocusGroup/ERow/EColumn/EFocusable）与弹层（EDialog/EDrawer/EToast），把焦点框架封死在 tv-ui 内部，业务层只用 tv-ui 写 TV 页面，并配套 Claude Skill `tv-ui-page-author`。

**Architecture:** tv-ui 内部薄包 `@dwy/focus-vue3`（useFocusSection / useFocusable / FocusLayer），对外暴露语义化组件；业务层（`apps/shell/src/`）通过移除 `@dwy/focus-vue3` 依赖声明 + ESLint `no-restricted-imports` 双层封死，不再直接接触焦点框架。分三阶段：① tv-ui 新组件落地（新旧并存）；② 业务页 + ui 弹框迁移 + 删 `useFocusPage`；③ 物理封死 + Skill。

**Tech Stack:** Vue 3 `<script setup>` + Vite + pnpm workspace；`@dwy/focus-core`（fork js-spatial-navigation）；目标 WebView 基线 Chromium 53（CSS 用 `flex-start`/`flex-end`，不用裸 `start`/`end`）。

**根目录约定：** 所有命令默认在 `/Users/chances/workspace/eng_prod/ai-android/template/h5-vue/` 下执行。仓库唯一类型检查/lint 入口是该目录的 `pnpm typecheck`（= `apps/shell` 的 `vue-tsc --noEmit`）与 `pnpm lint`（= `apps/shell` 的 `eslint .`）。`vue-tsc` 只检查从 `apps/shell` 可达的文件，故新建 tv-ui 组件必须被 import 才会进入类型检查——阶段一用临时 `Playground.vue` 充当类型+目视验证脚手架。

---

## 与 spec 的偏差说明（实现前必读）

读真实代码后，相对 `docs/superpowers/specs/2026-05-28-tv-ui-foundation-design.md` 有两处修正，已并入本计划：

1. **VoiceDialog 不迁移到 EDialog**（spec §5.2 该行作废）。
   实际 `packages/ui/src/components/VoiceDialog.vue` 是底部「聆听中」语音 HUD：props 为 `visible` / `text`，无按钮、无 `v-model`、不接 FocusLayer、不参与焦点。它不是焦点弹框，套 EDialog 会错误地抢焦/锁焦。**保持原样不动。**

2. **`@dwy/focus-vue3` 新增两个加法式 helper**（不替换实现，符合 spec 非目标 2.2「不替换 focus-core/focus-vue3 实现」）：
   - `src/layer-stack.ts`：模态层计数器，FocusLayer 挂载 `pushLayer()` / 卸载 `popLayer()`，导出 `hasOpenLayer()`。用于 spec §9 的 Back 冲突缓解：`@shell/core` 的 `useBackButton` 在有打开的 FocusLayer 时不响应 Back，交给 EDialog 自己关。
   - `useFocusSection` 增 `defaultElement?: ExtSelector` 透传到 `SpatialNavigation.add(...)`，以支撑 EFocusGroup/ERow/EColumn 的 `defaultElement` prop（现有 `UseFocusSectionOptions` 无此字段）。

这两处都是 EDialog/EFocusGroup 正确工作的硬前提，已作为阶段一的前置任务。

---

## 文件结构

**阶段一新增（tv-ui + focus-vue3 加法）**

| 文件 | 责任 |
|---|---|
| `packages/focus-vue3/src/layer-stack.ts` | 模态层计数器（pushLayer/popLayer/hasOpenLayer） |
| `packages/focus-vue3/src/FocusLayer.vue` | 改：onMounted pushLayer / onUnmounted popLayer |
| `packages/focus-vue3/src/useFocusSection.ts` | 改：options 增 `defaultElement` 透传 |
| `packages/focus-vue3/src/index.ts` | 改：导出 `hasOpenLayer` |
| `packages/tv-ui/src/EFocusGroup.vue` | 自由焦点容器（薄包 useFocusSection） |
| `packages/tv-ui/src/ERow.vue` | 横向 flex + section |
| `packages/tv-ui/src/EColumn.vue` | 纵向 flex + section |
| `packages/tv-ui/src/EFocusable.vue` | 自定义焦点项逃生口（薄包 useFocusable） |
| `packages/tv-ui/src/composables/useEPage.ts` | EPage 纯逻辑（注册 section + KeepAlive + 进页聚焦） |
| `packages/tv-ui/src/EPage.vue` | 页面壳 |
| `packages/tv-ui/src/composables/useFocusLockedKeys.ts` | 监听 OTT Back / 浏览器 Escape |
| `packages/tv-ui/src/composables/useOverlay.ts` | EDialog/EDrawer 共享开-关-聚-离逻辑 |
| `packages/tv-ui/src/EDialog.vue` | 弹框 |
| `packages/tv-ui/src/EDrawer.vue` | 侧抽屉 |
| `packages/tv-ui/src/EToast.vue` | 无焦点提示 |
| `packages/tv-ui/src/EHRow.vue` | 从 apps/shell 下沉的水平虚拟列表 |
| `packages/tv-ui/src/index.ts` | 改：re-export 上述组件 |
| `apps/shell/src/pages/Playground.vue`（临时） | 阶段一验证脚手架，阶段三删除 |

**阶段二迁移**

| 文件 | 改造 |
|---|---|
| `apps/shell/src/pages/Home.vue` / `Detail.vue` / `ComingSoon.vue` | `<FocusSection>`+`useFocusPage` → `<EPage>` |
| `apps/shell/src/pages/Perf.vue` | 改 `<EPage>`，EHRow 改 import 自 `@dwy/tv-ui` |
| `packages/ui/src/components/ExitDialog.vue` / `HintDialog.vue` | 内部改用 `<EDialog>`，对外 API 不变 |
| `packages/core/src/composables/useFocusPage.ts` | 删除 |
| `packages/core/src/index.ts` | 删 useFocusPage re-export |
| `packages/core/src/composables/useBackButton.ts` | 改：有打开 FocusLayer 时不响应 Back |
| `apps/shell/src/components/EHRow.vue` | 删除（已下沉 tv-ui） |

**阶段三封死 + Skill**

| 文件 | 改造 |
|---|---|
| `apps/shell/package.json` | 删 `@dwy/focus-vue3` 依赖声明 |
| `apps/shell/eslint.config.ts` | 加 `no-restricted-imports` |
| `apps/shell/src/pages/Playground.vue` + 路由 | 删除 |
| `claude/skills/tv-ui-page-author/SKILL.md` 等 5 文件 | 新增 |

---

# 阶段一 — tv-ui 新组件落地（新旧并存）

> 完成标准：旧代码一行不动，新组件可在 Playground 正常聚焦、锁焦、记忆；`pnpm typecheck` / `pnpm lint` 通过。

## Task 1.1: focus-vue3 模态层计数器

**Files:**
- Create: `packages/focus-vue3/src/layer-stack.ts`
- Modify: `packages/focus-vue3/src/FocusLayer.vue`
- Modify: `packages/focus-vue3/src/index.ts`

- [ ] **Step 1: 写 layer-stack.ts**

```ts
/**
 * 模态层计数器：FocusLayer 挂载 +1、卸载 -1。
 * 供 @shell/core 的 useBackButton 判断「当前有无打开的模态层」，
 * 有则把 Back 交给最上层弹层自己关，避免全局返回键误触发路由后退/退出。
 */
let openCount = 0

export function pushLayer(): void {
  openCount += 1
}

export function popLayer(): void {
  openCount = Math.max(0, openCount - 1)
}

export function hasOpenLayer(): boolean {
  return openCount > 0
}
```

- [ ] **Step 2: FocusLayer.vue 接入计数**

在 `packages/focus-vue3/src/FocusLayer.vue` 的 `import` 段加：

```ts
import { pushLayer, popLayer } from './layer-stack'
```

在现有 `onMounted(() => {` 体的**第一行**加 `pushLayer()`；在现有 `onUnmounted(() => {` 体的**第一行**加 `popLayer()`。改后两个钩子形如：

```ts
onMounted(() => {
  pushLayer()
  previousActiveElement = (document.activeElement as HTMLElement) ?? null
  outerSections = listSections().filter((id) => !innerSectionIds.has(id))
  outerSections.forEach((id) => {
    ;(SpatialNavigation as any).disable(id)
  })
})

onUnmounted(() => {
  popLayer()
  outerSections.forEach((id) => {
    ;(SpatialNavigation as any).enable(id)
  })
  outerSections = []
  if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
    try {
      previousActiveElement.focus()
    } catch {
      /* ignore */
    }
  }
  previousActiveElement = null
})
```

- [ ] **Step 3: index.ts 导出**

在 `packages/focus-vue3/src/index.ts` 的 `export { useKeepAliveFocus } from './keep-alive-bridge'` 下一行加：

```ts
export { hasOpenLayer } from './layer-stack'
```

- [ ] **Step 4: 提交**

```bash
git add packages/focus-vue3/src/layer-stack.ts packages/focus-vue3/src/FocusLayer.vue packages/focus-vue3/src/index.ts
git commit -m "feat(focus-vue3): 加模态层计数器 hasOpenLayer 供 Back 冲突判断"
```

## Task 1.2: useFocusSection 透传 defaultElement

**Files:**
- Modify: `packages/focus-vue3/src/useFocusSection.ts`

- [ ] **Step 1: 接口加字段**

在 `UseFocusSectionOptions` 接口（`rememberSource` 之后）加：

```ts
  /** 进入 section 时默认聚焦的元素（CSS selector / Element） */
  defaultElement?: import('@dwy/focus-core').ExtSelector
```

- [ ] **Step 2: add 配置透传**

在 `(SpatialNavigation as any).add(sectionId, {...})` 的配置对象里，`rememberSource` 那行之后加：

```ts
      defaultElement: options.defaultElement,
```

（`SpatialNavigation.add` 对 `undefined` 字段按默认处理，无需兜底。）

- [ ] **Step 3: 验证类型**

Run: `pnpm typecheck`
Expected: PASS（此改动不影响现有调用点，均为可选字段）

- [ ] **Step 4: 提交**

```bash
git add packages/focus-vue3/src/useFocusSection.ts
git commit -m "feat(focus-vue3): useFocusSection 透传 defaultElement 到 SN"
```

## Task 1.3: EFocusGroup — 自由焦点容器

**Files:**
- Create: `packages/tv-ui/src/EFocusGroup.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <component :is="tag" class="e-focus-group" :data-sn-section-root="sectionId">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { useFocusSection } from '@dwy/focus-vue3'
import type { Restrict, EnterTo, LeaveFor } from '@dwy/focus-vue3'

interface Props {
  /** 不传则 useFocusSection 自动生成 dwy-section-N */
  id?: string
  restrict?: Restrict
  enterTo?: EnterTo
  leaveFor?: LeaveFor | null
  /** 进入时默认聚焦元素的 CSS selector */
  defaultElement?: string
  /** false 时仅渲染容器，不创建 section */
  section?: boolean
  tag?: string
}

const props = withDefaults(defineProps<Props>(), {
  restrict: 'self-first',
  enterTo: 'last-focused',
  leaveFor: null,
  section: true,
  tag: 'div',
})

let sectionId = ''
if (props.section) {
  const ctx = useFocusSection({
    id: props.id,
    restrict: props.restrict,
    enterTo: props.enterTo,
    leaveFor: props.leaveFor,
    defaultElement: props.defaultElement,
  })
  sectionId = ctx.sectionId
}
</script>
```

> 注：`useFocusSection` 内部用 `provide(FOCUS_SECTION_KEY)` 暴露 ctx，子树里的 EButton/EFocusable 会通过 inject 自动归属本 section。`section=false` 时不调用 useFocusSection，子项归属再外层 section（用于纯布局嵌套）。

- [ ] **Step 2: 提交**

```bash
git add packages/tv-ui/src/EFocusGroup.vue
git commit -m "feat(tv-ui): EFocusGroup 自由焦点容器"
```

## Task 1.4: ERow / EColumn — 布局 + section

**Files:**
- Create: `packages/tv-ui/src/ERow.vue`
- Create: `packages/tv-ui/src/EColumn.vue`

- [ ] **Step 1: 写 ERow.vue**

```vue
<template>
  <EFocusGroup
    :id="id"
    :restrict="restrict"
    :enter-to="enterTo"
    :leave-for="leaveFor"
    :default-element="defaultElement"
    :section="section"
    :tag="tag"
    class="e-row"
    :style="flexStyle"
  >
    <slot />
  </EFocusGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EFocusGroup from './EFocusGroup.vue'
import type { Restrict, EnterTo, LeaveFor } from '@dwy/focus-vue3'

interface Props {
  id?: string
  restrict?: Restrict
  enterTo?: EnterTo
  leaveFor?: LeaveFor | null
  defaultElement?: string
  section?: boolean
  tag?: string
  gap?: number
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around'
  align?: 'start' | 'center' | 'end' | 'stretch'
  wrap?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  restrict: 'self-first',
  enterTo: 'last-focused',
  leaveFor: null,
  section: true,
  tag: 'div',
  gap: 16,
  wrap: false,
})

// Chromium 53 基线：用 flex-start/flex-end，不用裸 start/end
const AXIS: Record<string, string> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  stretch: 'stretch',
  'space-between': 'space-between',
  'space-around': 'space-around',
}

const flexStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'row' as const,
  gap: `${props.gap}px`,
  flexWrap: props.wrap ? ('wrap' as const) : ('nowrap' as const),
  justifyContent: props.justify ? AXIS[props.justify] : undefined,
  alignItems: props.align ? AXIS[props.align] : undefined,
}))
</script>
```

- [ ] **Step 2: 写 EColumn.vue**

与 ERow 一致，去掉 `wrap` prop，`flexDirection` 改 `'column'`：

```vue
<template>
  <EFocusGroup
    :id="id"
    :restrict="restrict"
    :enter-to="enterTo"
    :leave-for="leaveFor"
    :default-element="defaultElement"
    :section="section"
    :tag="tag"
    class="e-column"
    :style="flexStyle"
  >
    <slot />
  </EFocusGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EFocusGroup from './EFocusGroup.vue'
import type { Restrict, EnterTo, LeaveFor } from '@dwy/focus-vue3'

interface Props {
  id?: string
  restrict?: Restrict
  enterTo?: EnterTo
  leaveFor?: LeaveFor | null
  defaultElement?: string
  section?: boolean
  tag?: string
  gap?: number
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around'
  align?: 'start' | 'center' | 'end' | 'stretch'
}

const props = withDefaults(defineProps<Props>(), {
  restrict: 'self-first',
  enterTo: 'last-focused',
  leaveFor: null,
  section: true,
  tag: 'div',
  gap: 16,
})

const AXIS: Record<string, string> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  stretch: 'stretch',
  'space-between': 'space-between',
  'space-around': 'space-around',
}

const flexStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column' as const,
  gap: `${props.gap}px`,
  justifyContent: props.justify ? AXIS[props.justify] : undefined,
  alignItems: props.align ? AXIS[props.align] : undefined,
}))
</script>
```

- [ ] **Step 3: 提交**

```bash
git add packages/tv-ui/src/ERow.vue packages/tv-ui/src/EColumn.vue
git commit -m "feat(tv-ui): ERow/EColumn 布局+section 容器"
```

## Task 1.5: EFocusable — 自定义焦点项逃生口

**Files:**
- Create: `packages/tv-ui/src/EFocusable.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <component
    :is="tag"
    ref="elRef"
    class="e-focusable"
    :class="{ 'is-focused': focused }"
    tabindex="-1"
    :disabled="!enabled || undefined"
  >
    <slot :focused="focused" />
  </component>
</template>

<script setup lang="ts">
import { useFocusable } from '@dwy/focus-vue3'

interface Props {
  /** 必填：焦点记忆/脚本聚焦/调试用 */
  focusKey: string
  /** false 时占位但不参与焦点（SN isNavigable 见 disabled 属性即跳过） */
  enabled?: boolean
  tag?: string
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true,
  tag: 'div',
})

const emit = defineEmits<{ enter: []; focus: []; blur: [] }>()

const { elRef, focused } = useFocusable({
  focusKey: props.focusKey,
  onEnter: () => {
    if (props.enabled) emit('enter')
  },
  onFocus: () => emit('focus'),
  onBlur: () => emit('blur'),
})
</script>
```

> 注：`@dwy/focus-core` 的 `isNavigable` 对 `elem.hasAttribute('disabled')` 直接判不可导航（spatial-navigation.ts:532），故 `:disabled="!enabled || undefined"` 即可让禁用项退出导航；Vue 对 falsy 的 `undefined` 不渲染该属性。

- [ ] **Step 2: 提交**

```bash
git add packages/tv-ui/src/EFocusable.vue
git commit -m "feat(tv-ui): EFocusable 自定义焦点项逃生口"
```

## Task 1.6: useEPage + EPage — 页面壳

**Files:**
- Create: `packages/tv-ui/src/composables/useEPage.ts`
- Create: `packages/tv-ui/src/EPage.vue`

- [ ] **Step 1: 写 useEPage.ts**

```ts
import { nextTick, onActivated } from 'vue'
import {
  useFocusSection,
  useKeepAliveFocus,
  SpatialNavigation,
} from '@dwy/focus-vue3'

/**
 * EPage 的纯逻辑：注册页面级 section（last-focused 记忆）+ KeepAlive 暂停/恢复 +
 * 每次激活后聚焦本页 section（失败兜底 defaultFocus）。
 *
 * 注：这是 tv-ui 内部 composable，取代被删除的 @shell/core/useFocusPage。
 * 仅 tv-ui 包内 import；业务层用 <EPage> 组件，不直接 import 本文件。
 */
export function useEPage(id: string, defaultFocusKey?: string): void {
  useFocusSection({ id, restrict: 'self-first', enterTo: 'last-focused' })
  useKeepAliveFocus()
  onActivated(async () => {
    await nextTick()
    const ok = (SpatialNavigation as any).focus(id)
    if (!ok && defaultFocusKey) {
      ;(SpatialNavigation as any).focus(`[data-focus-key="${defaultFocusKey}"]`)
    }
  })
}
```

> 注：`SpatialNavigation.focus(sectionId)` 按 section id 聚焦；该 section 由本 composable 的 `useFocusSection({ id })` 注册，二者 id 同源，业务层只写一次 `EPage.id`，不会再出现 spec §1.2 的「id 写错」问题。

- [ ] **Step 2: 写 EPage.vue**

```vue
<template>
  <component :is="tag" class="tv-page" :data-sn-section-root="id">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { useEPage } from './composables/useEPage'

interface Props {
  /** 必填：页面级 section id，同时作焦点记忆键 */
  id: string
  /** 首次进入或无记忆时兜底聚焦的 focus-key */
  defaultFocus?: string
  tag?: string
}

const props = withDefaults(defineProps<Props>(), { tag: 'div' })

useEPage(props.id, props.defaultFocus)
</script>
```

- [ ] **Step 3: 提交**

```bash
git add packages/tv-ui/src/composables/useEPage.ts packages/tv-ui/src/EPage.vue
git commit -m "feat(tv-ui): EPage 页面壳 + useEPage（取代 useFocusPage）"
```

## Task 1.7: useFocusLockedKeys — Back/ESC 监听

**Files:**
- Create: `packages/tv-ui/src/composables/useFocusLockedKeys.ts`

- [ ] **Step 1: 写 composable**

```ts
import { onUnmounted, watch, type Ref } from 'vue'

/**
 * 监听「返回键」：OTT 原生 Back（CustomEvent 'ott:native-keydown'，
 * detail.key==='Back' 或 detail.keyCodeString==='KEYCODE_BACK'）+ 浏览器 Escape。
 * enabled 为 true 时绑定，false 时解绑。EDialog/EDrawer 内部用。
 *
 * 事件名 'ott:native-keydown' 是壳↔H5 桥契约常量（见 template/bridge-contract.md），
 * 这里用字面量以免 tv-ui 反向依赖 @shell/core。
 */
const OTT_NATIVE_KEYDOWN = 'ott:native-keydown'

interface Options {
  enabled: Ref<boolean>
  onBack: () => void
}

export function useFocusLockedKeys({ enabled, onBack }: Options): void {
  const nativeHandler = (event: Event) => {
    const detail = (event as CustomEvent<{ key?: string; keyCodeString?: string }>).detail
    if (!detail) return
    if (detail.key === 'Back' || detail.keyCodeString === 'KEYCODE_BACK') {
      event.stopImmediatePropagation()
      onBack()
    }
  }
  const browserHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape' || event.key === 'BrowserBack') {
      event.preventDefault()
      event.stopImmediatePropagation()
      onBack()
    }
  }

  function bind() {
    window.addEventListener(OTT_NATIVE_KEYDOWN, nativeHandler)
    window.addEventListener('keydown', browserHandler)
  }
  function unbind() {
    window.removeEventListener(OTT_NATIVE_KEYDOWN, nativeHandler)
    window.removeEventListener('keydown', browserHandler)
  }

  watch(
    enabled,
    (on) => {
      unbind()
      if (on) bind()
    },
    { immediate: true },
  )

  onUnmounted(unbind)
}
```

> 注：弹层打开时本监听 `stopImmediatePropagation`，但 `@shell/core` 的 `useBackButton` 同样监听 `ott:native-keydown` 且监听器绑定时机更早（App 挂载即绑），无法保证顺序。真正的兜底是 Task 2.7 让 `useBackButton` 在 `hasOpenLayer()` 时直接 return。两层并存：本层负责「关弹窗」，core 层负责「不再后退/退出」。

- [ ] **Step 2: 提交**

```bash
git add packages/tv-ui/src/composables/useFocusLockedKeys.ts
git commit -m "feat(tv-ui): useFocusLockedKeys 监听 Back/Escape"
```

## Task 1.8: useOverlay — 弹层共享开关聚离逻辑

**Files:**
- Create: `packages/tv-ui/src/composables/useOverlay.ts`

- [ ] **Step 1: 写 composable**

```ts
import { computed, nextTick, watch, type Ref } from 'vue'
import { SpatialNavigation } from '@dwy/focus-vue3'
import { useFocusLockedKeys } from './useFocusLockedKeys'

interface Options {
  modelValue: Ref<boolean>
  defaultFocus: Ref<string>
  closeOnBack: Ref<boolean>
  close: () => void
}

/**
 * EDialog/EDrawer 共享逻辑：
 * - 打开后 nextTick 聚焦 defaultFocus（FocusLayer 负责隔离外层 + 关闭复焦）
 * - closeOnBack 时监听 Back/Escape → close
 * 焦点的隔离与复焦交给 <FocusLayer>（pushLayer/popLayer + 保存/恢复 activeElement），
 * 本 composable 不重复处理。
 */
export function useOverlay({ modelValue, defaultFocus, closeOnBack, close }: Options) {
  const backEnabled = computed(() => modelValue.value && closeOnBack.value)

  useFocusLockedKeys({
    enabled: backEnabled,
    onBack: close,
  })

  watch(
    modelValue,
    async (open) => {
      if (!open) return
      await nextTick()
      ;(SpatialNavigation as any).focus(`[data-focus-key="${defaultFocus.value}"]`)
    },
    { immediate: true },
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add packages/tv-ui/src/composables/useOverlay.ts
git commit -m "feat(tv-ui): useOverlay 弹层开-关-聚-离共享逻辑"
```

## Task 1.9: EDialog — 弹框

**Files:**
- Create: `packages/tv-ui/src/EDialog.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <Teleport to="body" :disabled="!teleport">
    <FocusLayer v-if="modelValue" :id="`e-dialog-${dialogId}`" class="e-dialog__mask" @click.self="onMaskClick">
      <EFocusGroup
        :id="`e-dialog-group-${dialogId}`"
        restrict="self-only"
        class="e-dialog__panel"
        :style="{ width: typeof width === 'number' ? `${width}px` : width }"
      >
        <div v-if="title" class="e-dialog__title">{{ title }}</div>
        <div class="e-dialog__body"><slot /></div>
        <div class="e-dialog__footer"><slot name="footer" /></div>
      </EFocusGroup>
    </FocusLayer>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { FocusLayer } from '@dwy/focus-vue3'
import EFocusGroup from './EFocusGroup.vue'
import { useOverlay } from './composables/useOverlay'

interface Props {
  modelValue: boolean
  /** 必填：打开后初始聚焦的 focus-key（编译期强制） */
  defaultFocus: string
  title?: string
  closeOnBack?: boolean
  closeOnMaskClick?: boolean
  width?: number | string
  teleport?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  closeOnBack: true,
  closeOnMaskClick: true,
  width: 420,
  teleport: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: []
  close: []
}>()

// 同一进程多个弹框时，id 各自唯一，避免 section id 撞名
let counter = 0
const dialogId = (counter += 1) + '-' + Math.floor(performance.now())

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onMaskClick() {
  if (props.closeOnMaskClick) close()
}

useOverlay({
  modelValue: toRef(props, 'modelValue'),
  defaultFocus: toRef(props, 'defaultFocus'),
  closeOnBack: toRef(props, 'closeOnBack'),
  close,
})
</script>

<style scoped>
.e-dialog__mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.e-dialog__panel {
  padding: 36px 32px 28px;
  background: #2a2a2a;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}
.e-dialog__title {
  font-size: 24px;
  color: #fff;
  margin-bottom: 24px;
  text-align: center;
}
.e-dialog__body {
  width: 100%;
  color: #fff;
}
.e-dialog__footer {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-top: 24px;
}
.e-dialog__footer:empty {
  display: none;
}
</style>
```

> 注：`dialogId` 用 `performance.now()` 而非 `Date.now()`/`Math.random()`，避免 SSR/构建期差异；本模板纯客户端运行无虞。`defaultFocus` 在 `Props` 无默认值 ⇒ TS 视为 required，漏传编译期报错（满足 spec §4.5）。

- [ ] **Step 2: 提交**

```bash
git add packages/tv-ui/src/EDialog.vue
git commit -m "feat(tv-ui): EDialog 弹框（开箱即焦+Back/遮罩关）"
```

## Task 1.10: EDrawer — 侧抽屉

**Files:**
- Create: `packages/tv-ui/src/EDrawer.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <Teleport to="body" :disabled="!teleport">
    <FocusLayer v-if="modelValue" :id="`e-drawer-${drawerId}`" class="e-drawer__mask" @click.self="onMaskClick">
      <EFocusGroup
        :id="`e-drawer-group-${drawerId}`"
        restrict="self-only"
        :class="['e-drawer__panel', `e-drawer__panel--${placement}`]"
        :style="panelStyle"
      >
        <div v-if="title" class="e-drawer__title">{{ title }}</div>
        <div class="e-drawer__body"><slot /></div>
        <div class="e-drawer__footer"><slot name="footer" /></div>
      </EFocusGroup>
    </FocusLayer>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { FocusLayer } from '@dwy/focus-vue3'
import EFocusGroup from './EFocusGroup.vue'
import { useOverlay } from './composables/useOverlay'

interface Props {
  modelValue: boolean
  defaultFocus: string
  title?: string
  closeOnBack?: boolean
  closeOnMaskClick?: boolean
  teleport?: boolean
  placement?: 'left' | 'right' | 'top' | 'bottom'
  size?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  closeOnBack: true,
  closeOnMaskClick: true,
  teleport: true,
  placement: 'right',
  size: 360,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  open: []
  close: []
}>()

let counter = 0
const drawerId = (counter += 1) + '-' + Math.floor(performance.now())

const sizeCss = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
const panelStyle = computed(() => {
  const horizontal = props.placement === 'left' || props.placement === 'right'
  return horizontal ? { width: sizeCss.value, height: '100%' } : { width: '100%', height: sizeCss.value }
})

function close() {
  emit('update:modelValue', false)
  emit('close')
}
function onMaskClick() {
  if (props.closeOnMaskClick) close()
}

useOverlay({
  modelValue: toRef(props, 'modelValue'),
  defaultFocus: toRef(props, 'defaultFocus'),
  closeOnBack: toRef(props, 'closeOnBack'),
  close,
})
</script>

<style scoped>
.e-drawer__mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
}
.e-drawer__panel {
  position: absolute;
  background: #2a2a2a;
  box-shadow: 0 0 32px rgba(0, 0, 0, 0.5);
  box-sizing: border-box;
  padding: 24px;
  display: flex;
  flex-direction: column;
}
.e-drawer__panel--right { top: 0; right: 0; }
.e-drawer__panel--left { top: 0; left: 0; }
.e-drawer__panel--top { top: 0; left: 0; }
.e-drawer__panel--bottom { bottom: 0; left: 0; }
.e-drawer__title { font-size: 22px; color: #fff; margin-bottom: 16px; }
.e-drawer__body { flex: 1; color: #fff; overflow: auto; }
.e-drawer__footer { display: flex; gap: 16px; margin-top: 16px; }
.e-drawer__footer:empty { display: none; }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add packages/tv-ui/src/EDrawer.vue
git commit -m "feat(tv-ui): EDrawer 侧抽屉（复用 useOverlay）"
```

## Task 1.11: EToast — 无焦点提示

**Files:**
- Create: `packages/tv-ui/src/EToast.vue`

- [ ] **Step 1: 写组件**

```vue
<template>
  <Teleport to="body" :disabled="!teleport">
    <div v-if="modelValue" :class="['e-toast', `e-toast--${placement}`]">
      {{ message }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch } from 'vue'

interface Props {
  modelValue: boolean
  message: string
  /** 自动关闭毫秒；0 = 不自动关 */
  duration?: number
  placement?: 'top' | 'center' | 'bottom'
  teleport?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  duration: 2000,
  placement: 'bottom',
  teleport: true,
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

let timer: ReturnType<typeof setTimeout> | null = null
watch(
  () => props.modelValue,
  (open) => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (open && props.duration > 0) {
      timer = setTimeout(() => emit('update:modelValue', false), props.duration)
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.e-toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  max-width: 80%;
  padding: 14px 28px;
  background: rgba(0, 0, 0, 0.82);
  color: #fff;
  font-size: 20px;
  border-radius: 8px;
  z-index: 10000;
  pointer-events: none;
  text-align: center;
}
.e-toast--top { top: 48px; }
.e-toast--center { top: 50%; transform: translate(-50%, -50%); }
.e-toast--bottom { bottom: 64px; }
</style>
```

> 注：不接 FocusLayer/FocusSection，不参与焦点（spec §4.7）。

- [ ] **Step 2: 提交**

```bash
git add packages/tv-ui/src/EToast.vue
git commit -m "feat(tv-ui): EToast 无焦点提示"
```

## Task 1.12: EHRow 下沉到 tv-ui

**Files:**
- Create: `packages/tv-ui/src/EHRow.vue`（内容 = 现 `apps/shell/src/components/EHRow.vue` 原样）

- [ ] **Step 1: 复制文件**

把现有 `apps/shell/src/components/EHRow.vue` 全文原样复制到 `packages/tv-ui/src/EHRow.vue`。该文件 import 路径无需改（`@dwy/focus-vue3` / `@dwy/focus-core` 在 tv-ui 内同样可解析）。**此时先不删 apps/shell 下的旧文件**（阶段二迁 Perf 时再删，保证新旧并存）。

- [ ] **Step 2: 验证内容一致**

Run: `diff apps/shell/src/components/EHRow.vue packages/tv-ui/src/EHRow.vue`
Expected: 无差异输出

- [ ] **Step 3: 提交**

```bash
git add packages/tv-ui/src/EHRow.vue
git commit -m "feat(tv-ui): 下沉 EHRow 水平虚拟列表到 tv-ui"
```

## Task 1.13: tv-ui index 出口

**Files:**
- Modify: `packages/tv-ui/src/index.ts`

- [ ] **Step 1: 追加导出**

在现有 4 行 export 之后追加：

```ts
// ─── focus / layout ───
export { default as EPage } from './EPage.vue'
export { default as EFocusGroup } from './EFocusGroup.vue'
export { default as ERow } from './ERow.vue'
export { default as EColumn } from './EColumn.vue'
export { default as EFocusable } from './EFocusable.vue'
export { default as EHRow } from './EHRow.vue'
// ─── overlay ───
export { default as EDialog } from './EDialog.vue'
export { default as EDrawer } from './EDrawer.vue'
export { default as EToast } from './EToast.vue'
```

> composables（useEPage/useFocusLockedKeys/useOverlay）**不导出**——它们是 tv-ui 内部实现细节，业务层不可见（阶段三 ESLint 再加一道物理拦截）。

- [ ] **Step 2: 提交**

```bash
git add packages/tv-ui/src/index.ts
git commit -m "feat(tv-ui): index 导出容器层+弹层组件"
```

## Task 1.14: Playground 验证脚手架（临时）

**Files:**
- Create: `apps/shell/src/pages/Playground.vue`
- Modify: `apps/shell/src/router/index.ts`

- [ ] **Step 1: 写 Playground.vue**

```vue
<template>
  <EPage id="playground" default-focus="pg-open-dialog" class="pg">
    <h1 class="pg__title">tv-ui Playground</h1>

    <!-- 横向锁焦区：焦点不外跑 -->
    <ERow id="pg-locked" restrict="self-only" :gap="16" class="pg__block">
      <EButton focus-key="pg-lock-1" label="锁焦 A" />
      <EButton focus-key="pg-lock-2" label="锁焦 B" />
      <EButton focus-key="pg-lock-3" label="锁焦 C" />
    </ERow>

    <!-- 普通横向区：可上下跨区 + 区域间记忆 -->
    <ERow id="pg-row-a" :gap="16" class="pg__block">
      <EButton focus-key="pg-a-1" label="A1" />
      <EButton focus-key="pg-a-2" label="A2" />
    </ERow>
    <ERow id="pg-row-b" :gap="16" class="pg__block">
      <EButton focus-key="pg-b-1" label="B1" />
      <EButton focus-key="pg-b-2" label="B2" />
    </ERow>

    <!-- 自定义焦点项 -->
    <ERow id="pg-custom" :gap="16" class="pg__block">
      <EFocusable focus-key="pg-poster" v-slot="{ focused }" @enter="toastOpen = true">
        <div :class="['pg-poster', { 'is-focused': focused }]">自定义海报</div>
      </EFocusable>
    </ERow>

    <!-- 弹层触发 -->
    <ERow id="pg-actions" :gap="16" class="pg__block">
      <EButton focus-key="pg-open-dialog" label="开 EDialog" @enter="dialogOpen = true" />
      <EButton focus-key="pg-open-drawer" label="开 EDrawer" @enter="drawerOpen = true" />
      <EButton focus-key="pg-open-toast" label="开 EToast" @enter="toastOpen = true" />
    </ERow>

    <EDialog v-model="dialogOpen" title="确认？" default-focus="pg-dlg-ok">
      <p>这是 EDialog 主体</p>
      <template #footer>
        <EButton focus-key="pg-dlg-ok" label="确定" @enter="dialogOpen = false" />
        <EButton focus-key="pg-dlg-cancel" label="取消" @enter="dialogOpen = false" />
      </template>
    </EDialog>

    <EDrawer v-model="drawerOpen" title="抽屉" default-focus="pg-drawer-ok" placement="right">
      <p>这是 EDrawer 主体</p>
      <template #footer>
        <EButton focus-key="pg-drawer-ok" label="关闭" @enter="drawerOpen = false" />
      </template>
    </EDrawer>

    <EToast v-model="toastOpen" message="这是一条 Toast" />
  </EPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { EPage, ERow, EButton, EFocusable, EDialog, EDrawer, EToast } from '@dwy/tv-ui'

const dialogOpen = ref(false)
const drawerOpen = ref(false)
const toastOpen = ref(false)
</script>

<style scoped>
.pg { padding: 32px; color: #fff; }
.pg__title { font-size: 28px; margin-bottom: 24px; }
.pg__block { margin-bottom: 20px; }
.pg-poster {
  width: 200px; height: 120px; border-radius: 8px;
  background: #444; display: flex; align-items: center; justify-content: center;
  transition: transform 0.15s ease;
}
.pg-poster.is-focused { transform: scale(1.08); outline: 3px solid #4a9eff; }
</style>
```

- [ ] **Step 2: 临时注册路由**

在 `apps/shell/src/router/index.ts` 的路由数组里加一条（与现有页面同级）：

```ts
{ path: '/playground', name: 'Playground', component: () => import('../pages/Playground.vue') },
```

- [ ] **Step 3: 类型检查 + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: 均 PASS（此时 Playground 已 import 全部新组件，vue-tsc 覆盖到所有阶段一文件）

- [ ] **Step 4: 启动 dev 手测**

Run: `pnpm dev`，浏览器开 `http://localhost:5173/app/#/playground`（hash 路由按实际 router 模式调整）。
逐项确认：
- 方向键在「锁焦 A/B/C」内左右移动，**到边界不跳出本行**（restrict=self-only 生效）
- 在 pg-row-a 与 pg-row-b 间上下切换，回到某行时落在**上次离开的那个按钮**（last-focused 记忆）
- 「自定义海报」可聚焦、放大、OK 触发 Toast
- 开 EDialog → 自动聚焦「确定」；按返回键 → 弹框关闭且焦点回到「开 EDialog」按钮
- 开 EDrawer → 同上；开 EToast → 2s 自动消失

- [ ] **Step 5: 提交**

```bash
git add apps/shell/src/pages/Playground.vue apps/shell/src/router/index.ts
git commit -m "test(shell): 临时 Playground 验证 tv-ui 新组件（阶段三删除）"
```

---

# 阶段二 — 业务侧迁移

> 完成标准：业务页/弹框全部走 tv-ui；`useFocusPage` 删除；`pnpm typecheck`/`lint` 通过；手测三场景焦点正常。**本阶段尚未做物理封死，`@dwy/focus-vue3` 仍可 import（阶段三才封）。**

## Task 2.1: 迁移 Home.vue

**Files:**
- Modify: `apps/shell/src/pages/Home.vue`

- [ ] **Step 1: 改模板与脚本**

把 `<FocusSection id="home" :enter-to="'last-focused'" class="page home">…</FocusSection>` 改为 `<EPage>`，并删 `useFocusPage` 与 `FocusSection` 的 import。改后 `<template>` 与 `<script setup>`：

```vue
<template>
  <EPage id="home" default-focus="home-detail" class="page home">
    <p class="hint">遥控器方向键移动焦点，OK 键确认，返回键退出。</p>
    <div class="actions">
      <EButton focus-key="home-detail" label="进入详情页" @enter="goDetail" />
      <EButton focus-key="home-soon" label="敬请期待页" @enter="goSoon" />
      <EButton focus-key="home-perf" label="性能压测页" @enter="goPerf" />
      <EButton focus-key="home-tts" label="播报 TTS" @enter="speak" />
    </div>
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EButton } from '@dwy/tv-ui'
import { ottService } from '@shell/core'

const router = useRouter()
const goDetail = () => router.push({ name: 'Detail' })
const goSoon = () => router.push({ name: 'ComingSoon' })
const goPerf = () => router.push({ name: 'Perf' })
const speak = () => ottService.playTts('这是一个壳模板首页')
</script>
```

`<style>` 不变（`.home` 的 flex 布局仍作用于 EPage 根，因 class 透传到 EPage 的 `<component :is="tag">` 根节点）。

- [ ] **Step 2: 提交**

```bash
git add apps/shell/src/pages/Home.vue
git commit -m "refactor(shell): Home 改用 EPage"
```

## Task 2.2: 迁移 Detail.vue

**Files:**
- Modify: `apps/shell/src/pages/Detail.vue`

- [ ] **Step 1: 改模板与脚本**

```vue
<template>
  <EPage id="detail" default-focus="detail-back" class="page detail">
    <h1 class="title">详情页占位</h1>
    <div class="actions">
      <EButton focus-key="detail-back" label="返回首页" @enter="goBack" />
    </div>
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EButton } from '@dwy/tv-ui'

const router = useRouter()
const goBack = () => router.back()
</script>
```

`<style>` 不变。

- [ ] **Step 2: 提交**

```bash
git add apps/shell/src/pages/Detail.vue
git commit -m "refactor(shell): Detail 改用 EPage"
```

## Task 2.3: 迁移 ComingSoon.vue

**Files:**
- Modify: `apps/shell/src/pages/ComingSoon.vue`

- [ ] **Step 1: 改模板与脚本**

```vue
<template>
  <EPage id="coming-soon" default-focus="soon-back" class="page coming-soon">
    <h1 class="title">敬请期待</h1>
    <div class="actions">
      <EButton focus-key="soon-back" label="返回" @enter="goBack" />
    </div>
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EButton } from '@dwy/tv-ui'

const router = useRouter()
const goBack = () => router.back()
</script>
```

`<style>` 不变。

- [ ] **Step 2: 提交**

```bash
git add apps/shell/src/pages/ComingSoon.vue
git commit -m "refactor(shell): ComingSoon 改用 EPage"
```

## Task 2.4: 迁移 Perf.vue

**Files:**
- Modify: `apps/shell/src/pages/Perf.vue`
- Delete: `apps/shell/src/components/EHRow.vue`

- [ ] **Step 1: 改外层 section + 菜单 section + EHRow 来源**

把最外层 `<FocusSection id="perf" …>` 改为 `<EPage id="perf" default-focus="cat-0" class="page perf-page">`（闭合标签同步改 `</EPage>`）。左侧菜单的 `<FocusSection id="perf-menu" …>` 改为 `<EFocusGroup id="perf-menu" tag="div" class="perf-menu">`（闭合改 `</EFocusGroup>`）。`<script setup>` 改为：

```ts
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { EPage, EFocusGroup, EButton, ECard, EVirtualList, EHRow } from '@dwy/tv-ui'
import PerfHud from '../components/PerfHud.vue'
```

删除原 `import { FocusSection } from '@dwy/focus-vue3'`、`import { useFocusPage } from '@shell/core'`、`import EHRow from '../components/EHRow.vue'`。删除 `useFocusPage('perf', 'cat-0')` 调用（EPage 已接管）。

> 数据生成、`onGlobalFocused`、`rowsListRef`、`<EVirtualList section-id="perf-rows">`、内层 `<EHRow :section-id=...>` 全部保留不动（EVirtualList/EHRow 本轮仍用 `section-id` prop，见 spec §9）。

- [ ] **Step 2: 删旧 EHRow**

```bash
git rm apps/shell/src/components/EHRow.vue
```

- [ ] **Step 3: 类型检查 + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add apps/shell/src/pages/Perf.vue
git commit -m "refactor(shell): Perf 改用 EPage/EFocusGroup，EHRow 改 import 自 tv-ui"
```

## Task 2.5: 重构 ExitDialog.vue 用 EDialog

**Files:**
- Modify: `packages/ui/src/components/ExitDialog.vue`

- [ ] **Step 1: 重写**

对外 API（`modelValue` + `confirm`/`cancel` + `title`/`confirmText`/`cancelText`）保持不变，内部改用 `<EDialog>` + `<EButton>`：

```vue
<template>
  <EDialog
    v-model="open"
    :title="title"
    default-focus="exit-confirm-btn"
    :width="420"
    @close="handleMaskOrBackClose"
  >
    <template #footer>
      <EButton focus-key="exit-confirm-btn" variant="primary" :label="confirmText" @enter="handleConfirm" />
      <EButton focus-key="exit-cancel-btn" variant="secondary" :label="cancelText" @enter="handleCancel" />
    </template>
  </EDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EDialog, EButton } from '@dwy/tv-ui'

interface Props {
  modelValue: boolean
  title?: string
  confirmText?: string
  cancelText?: string
}
interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认退出？',
  confirmText: '确定',
  cancelText: '取消',
})
const emit = defineEmits<Emits>()

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const handleConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}
const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
// EDialog 的遮罩/Back 关闭走 @close：语义等同取消
const handleMaskOrBackClose = () => emit('cancel')
</script>
```

> 删除原 `<style>` 中弹框自绘样式（mask/panel/btn）——这些已由 EDialog + EButton 承担。若 App 视觉需保留确认按钮主色，靠 `variant="primary"`。

- [ ] **Step 2: 提交**

```bash
git add packages/ui/src/components/ExitDialog.vue
git commit -m "refactor(ui): ExitDialog 内部改用 EDialog，对外 API 不变"
```

## Task 2.6: 重构 HintDialog.vue 用 EDialog

**Files:**
- Modify: `packages/ui/src/components/HintDialog.vue`

- [ ] **Step 1: 重写**

保留 `message`/`showConfirm`/`showCancel`/`confirmText`/`cancelText` 与 `confirm`/`cancel` 语义。`default-focus` 按是否显示确定/取消动态取：

```vue
<template>
  <EDialog
    v-model="open"
    :default-focus="defaultFocusKey"
    :width="420"
    @close="handleBackOrMaskClose"
  >
    <Text :lines="2" :text="message" class="hint-message" />
    <template #footer>
      <EButton
        v-if="showConfirm"
        focus-key="hint-confirm-btn"
        variant="primary"
        :label="confirmText"
        @enter="handleConfirm"
      />
      <EButton
        v-if="showCancel"
        focus-key="hint-cancel-btn"
        variant="secondary"
        :label="cancelText"
        @enter="handleCancel"
      />
    </template>
  </EDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Text from './Text.vue'
import { EDialog, EButton } from '@dwy/tv-ui'

interface Props {
  modelValue: boolean
  message: string
  showConfirm?: boolean
  showCancel?: boolean
  confirmText?: string
  cancelText?: string
}
interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  showConfirm: true,
  showCancel: true,
  confirmText: '确定',
  cancelText: '取消',
})
const emit = defineEmits<Emits>()

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const defaultFocusKey = computed(() =>
  props.showConfirm ? 'hint-confirm-btn' : 'hint-cancel-btn',
)

const handleConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}
const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
const handleBackOrMaskClose = () => emit('cancel')
</script>

<style scoped>
.hint-message {
  text-align: center;
  font-size: 22px;
  color: #fff;
  line-height: 32px;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add packages/ui/src/components/HintDialog.vue
git commit -m "refactor(ui): HintDialog 内部改用 EDialog，对外 API 不变"
```

## Task 2.7: useBackButton 适配模态层 + 删 useFocusPage

**Files:**
- Modify: `packages/core/src/composables/useBackButton.ts`
- Delete: `packages/core/src/composables/useFocusPage.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: useBackButton 守卫**

在 `useBackButton.ts` 顶部 import 段加：

```ts
import { hasOpenLayer } from "@dwy/focus-vue3";
```

在 `handleBackButton` 函数体**第一行**加守卫（有打开的模态层时，把 Back 交给最上层弹层自己关，全局不再后退/退出）：

```ts
  const handleBackButton = () => {
    if (hasOpenLayer()) return;
    if (route.path === "/" || route.path === "") {
      showExitDialog.value = true;
    } else {
      handleGoBack();
    }
  };
```

- [ ] **Step 2: 删 useFocusPage**

```bash
git rm packages/core/src/composables/useFocusPage.ts
```

- [ ] **Step 3: 删 re-export**

在 `packages/core/src/index.ts` 删掉这一行：

```ts
export * from './composables/useFocusPage'
```

- [ ] **Step 4: 类型检查 + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS（确认无任何文件仍引用 `useFocusPage`；若报错说明阶段二某页漏迁）

- [ ] **Step 5: 提交**

```bash
git add packages/core/src/composables/useBackButton.ts packages/core/src/index.ts
git commit -m "refactor(core): Back 在模态层打开时让位弹层；删除 useFocusPage"
```

## Task 2.8: 阶段二整体手测

- [ ] **Step 1: 启动并三场景验证**

Run: `pnpm dev`，逐页验证 spec §7.5 / §7.6：
- Home/Detail/ComingSoon/Perf：①首次进入 ②Back 回流 ③KeepAlive 复活 三场景焦点都落到对应元素
- 首页按 Back → 弹出 ExitDialog → 自动聚焦「确定」→ 再按 Back → 弹框关闭、焦点回到触发前元素（验证 Task 2.7 守卫生效，不会越过弹框直接退出）
- HintDialog（若有触发入口；无则在 Playground 临时挂一个验证）打开聚焦、Back 关闭、关后复焦

- [ ] **Step 2: 无新增代码则跳过提交**（纯手测）

---

# 阶段三 — 物理封死 + Skill

> 完成标准：业务层物理上无法 import 焦点框架；`grep` 零结果（spec §7.1）；Skill 落地；`typecheck`/`lint` 通过。

## Task 3.1: 删除 Playground 脚手架

**Files:**
- Delete: `apps/shell/src/pages/Playground.vue`
- Modify: `apps/shell/src/router/index.ts`

- [ ] **Step 1: 删文件 + 路由**

```bash
git rm apps/shell/src/pages/Playground.vue
```

删除 `apps/shell/src/router/index.ts` 中 Task 1.14 加的 `/playground` 路由条目。

- [ ] **Step 2: 提交**

```bash
git add apps/shell/src/router/index.ts
git commit -m "chore(shell): 移除临时 Playground 脚手架"
```

## Task 3.2: 移除 @dwy/focus-vue3 依赖声明

**Files:**
- Modify: `apps/shell/package.json`

- [ ] **Step 1: 删依赖行**

删除 `apps/shell/package.json` `dependencies` 中：

```json
    "@dwy/focus-vue3": "workspace:*",
```

（保留 vite.config.ts 中的 `@dwy/focus-vue3` alias——tv-ui 内部 import 仍需它解析到源码。）

- [ ] **Step 2: 重装依赖**

Run: `pnpm install`
Expected: 成功；`apps/shell/node_modules` 不再直接暴露 `@dwy/focus-vue3`

- [ ] **Step 3: 验证物理封死生效**

Run: `pnpm typecheck`
Expected: PASS（业务层此时已无任何 `@dwy/focus-vue3` import；若仍 PASS 说明迁移彻底）

- [ ] **Step 4: 提交**

```bash
git add apps/shell/package.json pnpm-lock.yaml
git commit -m "chore(shell): 移除 @dwy/focus-vue3 直接依赖（物理封死业务层）"
```

## Task 3.3: ESLint no-restricted-imports

**Files:**
- Modify: `apps/shell/eslint.config.ts`

- [ ] **Step 1: 加规则块**

在 `apps/shell/eslint.config.ts` 的 `defineConfig([...])` 数组里，现有 `rules` 块**之后**追加一个仅作用于业务源码目录的配置块：

```ts
  {
    files: ["src/**/*.{ts,vue}"],
    ignores: ["src/pages/Playground.vue"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@dwy/focus-vue3",
              message: "业务层禁止直接用焦点框架，请用 @dwy/tv-ui 的 EPage/ERow/EColumn/EFocusGroup/EDialog/EFocusable。",
            },
            {
              name: "@shell/core/composables/useFocusPage",
              message: "useFocusPage 已废弃，请用 <EPage>。",
            },
          ],
          patterns: [
            {
              group: ["@dwy/tv-ui/src/composables/*", "**/tv-ui/src/composables/*"],
              message: "tv-ui 内部 composables 不对业务层开放。",
            },
          ],
        },
      ],
    },
  },
```

> `ignores` 里的 Playground 已在 Task 3.1 删除，此条可省；保留无害。最终以 Task 3.1 删除后不再有该文件为准——若已删，去掉 `ignores` 行。

- [ ] **Step 2: 验证规则可触发**

临时在 `apps/shell/src/pages/Home.vue` 顶部加一行 `import { FocusSection } from '@dwy/focus-vue3'`，运行：

Run: `pnpm lint`
Expected: 报 `no-restricted-imports` error，指向该行。随后**删掉这行临时代码**，再 `pnpm lint` → PASS。

- [ ] **Step 3: 提交**

```bash
git add apps/shell/eslint.config.ts
git commit -m "chore(shell): ESLint 禁业务层 import 焦点框架/内部 composables"
```

## Task 3.4: 验证 grep 零结果（spec §7.1）

- [ ] **Step 1: 跑封死校验**

Run:
```bash
grep -rnE "from '@dwy/focus-vue3'|from \"@dwy/focus-vue3\"|@shell/core/composables/useFocusPage|<FocusSection|<Focusable|<FocusLayer|useFocusPage\(" apps/shell/src/ || echo "CLEAN"
```
Expected: 输出 `CLEAN`（零匹配）

- [ ] **Step 2: 跑每页以 EPage 起**

Run:
```bash
for f in apps/shell/src/pages/*.vue; do head -3 "$f" | grep -q "<EPage" || echo "MISS: $f"; done; echo done
```
Expected: 仅输出 `done`（无 MISS）

## Task 3.5: 写 SKILL.md

**Files:**
- Create: `claude/skills/tv-ui-page-author/SKILL.md`

- [ ] **Step 1: 写 SKILL.md**

```markdown
---
name: tv-ui-page-author
description: 写 TV 页面 / 弹框 / 列表时必读。强制规约：只用 @dwy/tv-ui 组件，不直接 import @dwy/focus-vue3 / @shell/core/useFocusPage，不裸用 <div tabindex>。涵盖 EPage / ERow / EColumn / EFocusGroup / EDialog / EDrawer / EToast / EFocusable 的标准写法。
---

# TV-UI 页面开发规约

## 三句话规约

1. 页面必从 `<EPage id="..." default-focus="...">` 起，不写 `<FocusSection>`、不调 `useFocusPage`。
2. 可聚焦元素必是 tv-ui 组件：`EButton` / `ECard` / `EVirtualList` / `EHRow` / `EFocusable`。不裸用 `<div tabindex>`。
3. 焦点区域容器必是 tv-ui 容器：`ERow` / `EColumn` / `EFocusGroup` / `EDialog` / `EDrawer`。

## 决策树

\`\`\`
要做什么？
  ├─ 一级 / 二级页 ............... references/page-template.md
  ├─ 弹框 / 抽屉 / Toast ......... references/dialog-template.md
  ├─ 卡片列表 / 网格 / 锁焦区 .... references/focusable-recipes.md
  └─ 自定义 UI 但要成焦点项 ...... references/focusable-recipes.md（§自定义焦点项）
\`\`\`

## 焦点行为速记

- 锁焦（焦点不出区）：容器加 `restrict="self-only"`。
- 区域间记忆：容器给 `id`，默认 `enter-to="last-focused"` 自动记住上次焦点。
- OK 键用 `@enter`，**不要**用 `@click`（遥控器路径不触发 click）。

## 绝对禁忌

见 references/anti-patterns.md。违反任意一条 = lint 报错或运行期无焦点。
```

- [ ] **Step 2: 提交**

```bash
git add claude/skills/tv-ui-page-author/SKILL.md
git commit -m "docs(skill): tv-ui-page-author SKILL.md"
```

## Task 3.6: 写 references（4 文件）

**Files:**
- Create: `claude/skills/tv-ui-page-author/references/page-template.md`
- Create: `claude/skills/tv-ui-page-author/references/dialog-template.md`
- Create: `claude/skills/tv-ui-page-author/references/focusable-recipes.md`
- Create: `claude/skills/tv-ui-page-author/references/anti-patterns.md`

- [ ] **Step 1: page-template.md**

含两段可复制模板 + 契约说明：
- **一级页模板** = Task 2.1 迁移后的 `Home.vue` 全文（`<EPage id default-focus>` + `<EButton @enter>`）。
- **二级页模板** = Task 2.2 迁移后的 `Detail.vue` 全文。
- 契约说明三条：① `EPage.id` 必填且与 `default-focus` 配对；② 子区域用 `<ERow id="...">` 命名以支持区域间记忆；③ KeepAlive 暂停/恢复由 EPage 自动接，业务不写。

- [ ] **Step 2: dialog-template.md**

三段，每段「场景 / 模板 / 关键参数」：
- **EDialog**：模板 = Playground 里的 EDialog 片段；关键参数 `default-focus`（必填）、`close-on-back`、`close-on-mask-click`。明确「不要再像旧 ExitDialog 那样自己包 FocusLayer + watch」。
- **EDrawer**：模板 = Playground 里的 EDrawer 片段；关键参数 `placement` / `size`。
- **EToast**：模板 = `<EToast v-model="x" message="..." />`；关键参数 `duration`（0=不自动关）；强调「不参与焦点」。

- [ ] **Step 3: focusable-recipes.md**

四个 recipe：
1. **横向卡片墙**：`<ERow id="x"> + v-for <ECard :focus-key>`
2. **纵向无限列表**：`<EVirtualList section-id="x" :items :item-size :visible-count>`（注明本组件仍用 `section-id`）
3. **锁焦区（菜单/Tab）**：`<ERow id="x" restrict="self-only">`
4. **§自定义焦点项**：`<EFocusable focus-key="..." v-slot="{ focused }" @enter="...">` 包业务自画 UI（模板 = Playground 的 `pg-poster` 片段）

- [ ] **Step 4: anti-patterns.md**

照搬 spec §6.6 的 8 行对照表（❌ 反例 / ✅ 正确 / 原因），逐字落为 Markdown 表格。

- [ ] **Step 5: 提交**

```bash
git add claude/skills/tv-ui-page-author/references/
git commit -m "docs(skill): tv-ui-page-author references（page/dialog/recipes/anti-patterns）"
```

## Task 3.7: 阶段三终检

- [ ] **Step 1: 全量校验**

Run: `pnpm typecheck && pnpm lint`
Expected: 均 PASS

Run: Task 3.4 的两条 grep
Expected: `CLEAN` + 无 MISS

- [ ] **Step 2: 最终手测**

`pnpm dev` 跑一遍 spec §7.5 / §7.6 全场景，确认物理封死后页面行为与阶段二一致（无回归）。

---

## 自检（against spec）

- **§2.1 目标**：业务层只用 tv-ui（阶段二迁移 + 阶段三双层封死）✅；容器自动注册 section（EFocusGroup/ERow/EColumn，Task 1.3/1.4）✅；弹层开箱即焦（EDialog/EDrawer + useOverlay，Task 1.8/1.9/1.10）✅；锁焦/记忆走 focus-core 透传（restrict/enterTo 全部透传）✅；Skill（Task 3.5/3.6）✅。
- **§3.1 双层封死**：物理（Task 3.2）+ ESLint（Task 3.3）✅。
- **§4.1–4.8 组件 API**：EPage(1.6)/EFocusGroup(1.3)/ERow·EColumn(1.4)/EFocusable(1.5)/EDialog(1.9)/EDrawer(1.10)/EToast(1.11)/composables(1.6/1.7/1.8) 全覆盖；`defaultFocus` required 已用「无默认值」实现编译期强制 ✅。
- **§5.1 删除**：useFocusPage + re-export（Task 2.7）✅。
- **§5.2 重构**：Home/Detail/ComingSoon/Perf（2.1–2.4）、ExitDialog/HintDialog（2.5/2.6）、EHRow 下沉（1.12/2.4）✅；**VoiceDialog 不迁移**（见偏差说明 1）。
- **§5.3 新增**：所有 tv-ui 文件 + 5 个 skill 文件 ✅。
- **§6 Skill**：SKILL.md（3.5）+ 4 references（3.6）✅。
- **§7 验证**：grep 零结果（3.4）/每页 EPage 起（3.4）/typecheck（多处）/lint（多处）/手测（2.8、3.7）✅。
- **§8 分批**：三阶段对应批 1/2/3 ✅。
- **§9 风险**：Back 冲突（layer-stack + useBackButton 守卫，1.1/2.7）✅；Teleport 不打断 provide（EDialog 用 Teleport+FocusLayer+EFocusGroup，手测覆盖，Task 1.14 step4）✅；EVirtualList 仍用 section-id（保留，2.4）✅；AIChat 未在迁移范围内（features/aichat 本轮不动，符合 spec §3 "不变"，如后续需要另起计划）。

**类型一致性**：`hasOpenLayer`（1.1 定义 / 2.7 使用）一致；`useOverlay({ modelValue, defaultFocus, closeOnBack, close })`（1.8 定义 / 1.9·1.10 使用）一致；`useFocusLockedKeys({ enabled, onBack })`（1.7 定义 / 1.8 使用）一致；`useEPage(id, defaultFocusKey?)`（1.6 定义 / EPage 使用）一致。
