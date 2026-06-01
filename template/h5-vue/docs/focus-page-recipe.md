# 焦点页面接入规范

新建一个被路由 + KeepAlive 管的业务页面时，按下面三步走，焦点（首次默认 / 跨页面记忆 / 弹框隔离与复焦）自动正确。

## 三步模板

```vue
<template>
  <!-- 1. 根元素用 FocusSection 包，id 与下面 useFocusPage 第一参一致，必须设 enter-to -->
  <FocusSection id="my-page" :enter-to="'last-focused'" class="page">

    <!-- 业务内容：可聚焦项用 dwy 的 Focusable / @shell/tv-ui 的 EButton / EImage / ECard / EVirtualList -->
    <EButton focus-key="my-default-btn" label="..." @enter="..." />
    ...

  </FocusSection>
</template>

<script setup lang="ts">
import { FocusSection } from '@shell/core/focus'
import { EButton } from '@shell/tv-ui'
import { useFocusPage } from '@shell/core'

// 2. 一行接入：sectionId 必须与上面 FocusSection 的 id 一致；第二参是首次进入兜底聚焦的 focus-key
useFocusPage('my-page', 'my-default-btn')
</script>
```

## 三件必做的事 / 一行调用都包了

`useFocusPage(sectionId, defaultFocusKey?)` 内部做的：

1. 调 `useKeepAliveFocus()` —— dwy 契约，KeepAlive 缓存的页面切走时 `SpatialNavigation.pause()`、切回时 `resume()`，缺这一步会让别的页面 `focus()` 失效
2. 注册 `onActivated` —— Vue 3 在 KeepAlive 包裹下 `onActivated` 在**首次 mount 后**也会触发，覆盖"首次进入 + 复活"两场景，且早于业务自己的 onMounted 也安全
3. 在 `onActivated` 里 `await nextTick()` 后调 `SpatialNavigation.focus(sectionId)`：
   - section 有上次聚焦项记忆 → 自动恢复（依赖 `enter-to: 'last-focused'`）
   - section 无记忆（首次访问） → 兜底到 `defaultFocusKey`

## 弹框（Modal）

弹框场景不用 `useFocusPage`，用 `<FocusLayer>` 自动做模态隔离 + 关闭复焦，但**初始焦点要自己显式指定**（dwy 故意不自动，因不同弹框默认聚焦位置不同）：

```vue
<template>
  <FocusLayer v-if="modelValue" id="my-dialog" class="overlay">
    <FocusSection id="my-dialog-btns" :restrict="'self-only'">
      <Focusable focus-key="ok-btn" v-slot="{ focused }" @enter="ok">
        <button :class="{ 'is-focused': focused }">确定</button>
      </Focusable>
    </FocusSection>
  </FocusLayer>
</template>
<script setup>
import { watch, nextTick } from 'vue'
import { Focusable, FocusLayer, FocusSection, SpatialNavigation } from '@shell/core/focus'
const props = defineProps<{ modelValue: boolean }>()
watch(() => props.modelValue, async (open) => {
  if (!open) return
  await nextTick()
  SpatialNavigation.focus('[data-focus-key="ok-btn"]')
})
</script>
```

参考 `packages/tv-ui/src/components/ExitDialog.vue` / `HintDialog.vue` 实战样板。

## 反例

| 反例 | 正面 |
|---|---|
| 只绑 `onMounted` 设焦点 | KeepAlive 复用时不再触发 onMounted；且首次 onMounted 早于上游 onActivated.resume()，调 focus() 时 SN 仍 paused → 失败 |
| FocusSection 不写 `enter-to="last-focused"` | section 不会记忆上次聚焦项，回来始终落到默认 |
| 用 KeepAlive 但不调 `useKeepAliveFocus()` | 切走时 SN 未 pause，下个页面 setFocus 时机/状态错乱 |
| 弹框开后不 watch + focus | FocusLayer 只管隔离与关闭复焦，初始焦点要自己设 |
| 路由组件的 `@click` 写业务跳转 | TV 场景遥控器按 OK 触发的是 `@enter`，不是 `@click`；`@click` 只响鼠标 |

## 一行体检

新页面写完，对照下面 4 点过一遍：

- [ ] 模板根是 `<FocusSection id="xxx" :enter-to="'last-focused'">`
- [ ] script setup 有 `useFocusPage('xxx', '<default-key>')`
- [ ] 所有可聚焦项用 `EButton`/`Focusable`，事件用 `@enter` 不是 `@click`
- [ ] 进二级页再返回，焦点回到走前那个按钮（不是默认）
