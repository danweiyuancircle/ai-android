# 禁忌

| 禁 | 用 | 原因 |
|---|---|---|
| `from '@chancestv/tv-focus'` | `@chancestv/tv-ui` 的 E 组件 | 焦点引擎是实现细节 |
| `from '@shell/tv-ui'` / 旧包名 | `from '@chancestv/tv-ui'` | 现包名 |
| 裸 `<button>` `<a>` `<input>` | `EButton` / `EInput` / `EFocusable` | 不进空间导航 |
| 手写 `tabindex` | E* 组件 | 焦点系统自己打标 |
| 可聚焦项 `@click` 当确认 | `@enter` | 遥控器 OK 不发 click |
| `<EPage>` 漏 `id` | `<EPage id="..." default-focus="...">` | `id` 必填；无 default-focus 则首次无兜底 |
| `<ERow>` 漏 `id` | `<ERow id="...">` | 跨页记不住该区焦点 |
| `focus-key` 重复或无前缀 | 页面前缀 + 唯一值 | SN 用 `[data-focus-key]` 定位 |
| `<EDialog>` 漏 `default-focus` | 显式给打开后的 focus-key | 打开后不知道落哪 |
| 自己 Teleport + 手动 `focus()` | `EDialog` / `EDrawer` | 漏隔离/复焦 |
| 页面里再调 `setupTvFocus` | 只在入口调一次 | 单例 |
| 从仓库拷 `EButton.vue` | `pnpm add @chancestv/tv-ui @chancestv/tv-focus` | 复用单元是 npm 包 |
| `@shell/feature-shared` | 工程内自己的弹层 / EDialog | 脚手架默认模板已不含业务卡带 |
