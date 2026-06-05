# 新增页面开发规范（TV 焦点体系）

基于 `@shell/tv-ui` 的 E* 组件新增一个被路由管理的页面。照此写，方向键导航、首焦点、跨页焦点记忆、弹框隔离自动正确。

> 业务层**禁止**直连 `@shell/core/focus`（eslint 报错）；一律用 `@shell/tv-ui` 组件 + `setupTvFocus` 初始化。

## 心智模型（先记这 3 条）

1. **页面 = 1 个 `<EPage>`**；**布局容器（ERow/EColumn/EFocusGroup）= 1 个「焦点 section」**；**可交互项 = EButton/EFocusable 等 E 组件**。
2. **方向键**：section 内同行/同列直线移动，section 之间就近跳；**OK 键 = `@enter`，不是 `@click`**。
3. 首焦点 / 跨页记忆 / 弹框隔离都由组件内置，你只需给 `id` 和 `focus-key`。

## 步骤 1：建页面文件

路径：`apps/shell/src/pages/Xxx.vue`。最小可用模板：

```vue
<template>
  <EPage id="xxx" default-focus="xxx-first" class="page">
    <EButton focus-key="xxx-first" label="确定" variant="primary" @enter="onOk" />
    <EButton focus-key="xxx-back" label="返回" @enter="() => router.back()" />
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EButton } from '@shell/tv-ui'

const router = useRouter()
const onOk = () => { /* 业务 */ }
</script>
```

- `id`：本页唯一标识（SN section id）。
- `default-focus`：**首次**进页兜底聚焦的 `focus-key`；二次返回会自动恢复上次焦点。
- `focus-key`：**全局唯一**（SN 用 `[data-focus-key="..."]` 定位），约定加页面前缀，如 `xxx-`。

## 步骤 2：多行/多列布局（决定方向键怎么走）

每个「方向分组」用一个 section 容器包起来，给稳定 `id`：

```vue
<EPage id="menu" default-focus="top-a">
  <EColumn :gap="24">                 <!-- 整页纵向：上下在行之间走 -->
    <ERow id="top" :gap="16">         <!-- 一行：左右在项之间走 -->
      <EButton focus-key="top-a" label="A" @enter="..." />
      <EButton focus-key="top-b" label="B" @enter="..." />
    </ERow>
    <ERow id="bottom" :gap="16">
      <EButton focus-key="bot-a" label="C" @enter="..." />
      <EButton focus-key="bot-b" label="D" @enter="..." />
    </ERow>
  </EColumn>
</EPage>
```

- `<ERow>` 横向 section（左右导航）、`<EColumn>` 纵向（上下）。嵌套即得「行间上下、行内左右」。
- 每个 section 给唯一 `id` → 才会「记住上次焦点」（`enter-to` 默认 `last-focused`）。

## 步骤 3：列表 / 网格（大量项用虚拟列表）

```vue
<EVirtual
  section-id="list" direction="vertical" :cross="4" :items="items"
  :item-width="150" :item-height="90" :main-visible="3" :gap="14"
  focus-key-prefix="cell" v-slot="{ item, focusKey }"
>
  <EFocusable :focus-key="focusKey" v-slot="{ focused }" @enter="open(item)">
    <div class="cell" :class="{ hot: focused }">{{ item.name }}</div>
  </EFocusable>
</EVirtual>
```

- `direction` 横/纵、`cross` 网格列数、`main-visible` 可视屏数、`focus-key-prefix` 自动给每项生成唯一 key。

## 步骤 4：弹框 / 抽屉 / 提示

```vue
<EDialog v-model="open" title="提示" default-focus="dlg-ok">
  <EText text="内容" :font-size="22" color="#ddd" />
  <template #footer>
    <EButton focus-key="dlg-ok" variant="primary" label="知道了" @enter="open = false" />
  </template>
</EDialog>
```

- 弹框**自动**隔离背景焦点 + 关闭后复焦；**但必须显式给 `default-focus`**（不同弹框初始焦点位置不同，故不自动猜）。
- 同类：`EDrawer`（抽屉，加 `placement`）、`EHintDialog`（`message` + `@confirm`）、`EToast`（轻提示）。

## 步骤 5：注册路由 + 跳转

在 `apps/shell/src/router/index.ts` 的 `routes` 加一项（懒加载）：

```ts
{ path: '/xxx', name: 'Xxx', component: () => import('../pages/Xxx.vue') }
```

跳转用 `name`：`router.push({ name: 'Xxx' })`；返回：`router.back()`。

## 步骤 6（按需）：内容超屏 → 焦点跟随滚动

固定头 + 滚动区，用 `useScrollFollow`（见 `apps/shell/src/pages/Gallery.vue`）：聚焦项自动滚进可视区，`transform: translateY(-scrollY)`。

## 组件速查

| 组件 | 作用 | 关键 props | 事件/插槽 |
|---|---|---|---|
| `EPage` | 页面根 + 焦点初始化 | `id`、`default-focus` | — |
| `ERow` | 横向 section | `id`、`gap`、`justify`、`align`、`wrap` | — |
| `EColumn` | 纵向 section | `id`、`gap`、`justify`、`align` | — |
| `EFocusGroup` | 通用 section | `id`、`restrict`、`enter-to`、`leave-for` | — |
| `EButton` | 按钮 | `focus-key`、`label`、`variant`(primary/secondary/ghost/danger)、`size`(sm/md/lg)、`disabled` | `@enter`/`@focus`/`@blur` |
| `EFocusable` | 自定义可聚焦块 | `focus-key`、`enabled` | `@enter`，slot `{ focused }` |
| `EImage`/`ECard` | 可聚焦图/卡片 | `focus-key`、… | — |
| `EVirtual` | 虚拟列表/网格 | `section-id`、`direction`、`items`、`item-width/height`、`main-visible`、`cross`、`gap`、`focus-key-prefix` | slot `{ item, focusKey }` |
| `EDialog`/`EDrawer` | 弹框/抽屉 | `v-model`、`default-focus`、`title` | `@open`/`@close` |
| `EHintDialog`/`EToast` | 提示/轻提示 | `v-model`、`message` | `@confirm` |

## 硬规矩（违反 eslint 直接报错）

| 禁 | 用 |
|---|---|
| 裸 `<button>`/`<a>`/`<input>`/`<select>`/`<textarea>` | `EButton` / `EFocusable` 等 E 组件（裸标签不进焦点系统） |
| 手写 `tabindex` | `EFocusable` |
| 可聚焦项用 `@click` 触发确认 | `@enter`（遥控器 OK 不发 click） |
| 业务层 `import ... from '@shell/core/focus'`（及子路径、tv-ui 内部 composables） | 只用 `@shell/tv-ui` 组件 |

## 提交前自检

- [ ] 根是 `<EPage>`，有唯一 `id` + `default-focus`
- [ ] 每个方向分组用 `ERow`/`EColumn` 包并给了 `id`
- [ ] 所有可聚焦项有**全局唯一** `focus-key`，确认走 `@enter`
- [ ] 路由已在 `apps/shell/src/router/index.ts` 注册，用 `name` 跳转
- [ ] 弹框用 `EDialog`/`EDrawer` 且设了 `default-focus`
- [ ] 无裸标签 / `tabindex` / `@click`，无 `@shell/core/focus` 直连
- [ ] 进二级页再返回，焦点回到离开前那一项（不是默认项）

## 实战样板

- 简单页：`apps/shell/src/pages/Home.vue` / `apps/shell/src/pages/Detail.vue`
- 多分组 + 滚动 + 全组件 + 弹框：`apps/shell/src/pages/Gallery.vue`
- 分类场景：`apps/shell/src/pages/scene/SceneView.vue`
