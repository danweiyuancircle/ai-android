# 不用脚手架：接到已有 Vue 工程

适合已经有 Vue3 + Vite（或同类打包）的项目。不要拷贝 `E*.vue`，只装 npm 包。

更完整的包说明见 [@chancestv/tv-ui](https://github.com/danweiyuancircle/chances-tv-kit)。本文只覆盖「接进去能按遥控器写页」。

## 1. 安装

```bash
pnpm add @chancestv/tv-ui @chancestv/tv-focus
```

`tv-focus` 是 peer，必须和 `tv-ui` 一起装，且整个应用只能有一份（不要再装一份 focus 引擎）。`vue` 用你项目里已有的。

目标 WebView 是 **Chromium 53**：tv-ui / tv-focus 的构建产物已经按 chrome53 降级。你的应用代码若用了更新语法，自己用 `@vitejs/plugin-legacy` 转；**不必再转译这两个包的 `node_modules`**。

## 2. 入口调一次

```ts
import { setupTvFocus } from '@chancestv/tv-ui'
import '@chancestv/tv-ui/style.css'
// 可选：要 tv-ui 接管页面 margin/滚动条时再引
// import '@chancestv/tv-ui/styles/index.css'

setupTvFocus('ott:native-keydown')
```

- 有 Android 壳、按本仓库桥约定：事件名用 `'ott:native-keydown'`。
- 纯浏览器调试：也可以传这个名字；没有原生事件时空间导航仍听普通 `keydown`。
- 自有壳：把遥控器方向键/OK 派成 window 上的该 CustomEvent，或改成你的事件名（须与 `setupTvFocus` 一致）。

页面里不要再调 `setupTvFocus`。

## 3. 换肤（项目 CSS，不要改包）

在入口 **之后** 引入你的 `theme.css`：

```css
:root {
  --chances-tv-color-focus: #1677ff;
  --chances-tv-focus-scale: 1; /* 默认不放大；1.08 即放大 */
}
```

## 4. 写页

```vue
<template>
  <EPage id="home" default-focus="play">
    <ERow id="actions">
      <EButton focus-key="play" label="播放" @enter="play" />
    </ERow>
  </EPage>
</template>

<script setup lang="ts">
import { EPage, ERow, EButton } from '@chancestv/tv-ui'
</script>
```

确认用 `@enter`。把本 skill 拷到项目 `.claude/skills/chances-tv-ui` 与 `.agents/skills/chances-tv-ui`，AI 才会按同一套约定写。

## 5. 和脚手架的差别

| | 脚手架生成 | 自有工程 |
|---|---|---|
| 目录 | `web/` + `android-app/` | 你现有的 src |
| 桥 | `@shell/core` 已接 ottService | 自己把原生键打到 `setupTvFocus` 的事件名 |
| KeepAlive | 壳已包 | 你自己决定；`EPage` 仍处理进页聚焦 |
| 滚动安全区 | 示例页已留 padding | 页面 `overflow:hidden` 时自己留边 |

不需要、也不该再跑 `create-android-shell` 覆盖你的仓库。
