# 禁忌

| 禁 | 用 | 原因 |
|---|---|---|
| `from '@chancestv/tv-focus'` / `from '@shell/core/focus'` / `from '@dwy/focus-vue3'` | `@chancestv/tv-ui` 的 E 组件 | 焦点引擎是实现细节 |
| `from '@shell/tv-ui'` / `from '@dwy/tv-ui'` | `from '@chancestv/tv-ui'` | 现包名 |
| `useFocusManager` / `<Focusable>` / `<FocusSection>` | `EPage` / `EFocusable` / `ERow` | 抽包前的旧 API |
| 裸 `<button>` `<a>` `<input>` | `EButton` / `EFocusable` | 不进空间导航 |
| 手写 `tabindex` | `EFocusable` | 焦点系统自己打标 |
| 可聚焦项 `@click` | `@enter` | 遥控器 OK 不发 click |
| `<EPage>` 漏 `id` | `<EPage id="..." default-focus="...">` | `id` 必填；无 default-focus 则首次无兜底 |
| `<ERow>` 漏 `id` | `<ERow id="...">` | 跨页记不住该区焦点 |
| `focus-key` 重复或无前缀 | 页面前缀 + 唯一值 | SN 用 `[data-focus-key]` 定位 |
| `<EDialog>` 漏 `default-focus` | 显式给打开后的 focus-key | 打开后不知道落哪 |
| 自己 Teleport + 手动 `focus()` | `EDialog` / `EDrawer` | 漏隔离/复焦 |
| 页面里再调 `setupTvFocus` | 只在 `main.ts` 调一次 | 单例，重复无益 |
| 从本仓拷 `EButton.vue` | `pnpm add @chancestv/tv-ui @chancestv/tv-focus` | 复用单元是 npm 包 |
