# 本工程

脚手架生成的 Android TV 套壳工程。工作区根目录就是本文件所在目录。

## 结构

- `web/` — Vue3 H5（Chromium 53）。页面在 `web/apps/shell/src/pages/`
- `android-app/` — WebView 壳。工具链：AGP 3.6 / JDK 8 / compileSdk 28 / 禁止 AndroidX

## 写 TV 页

先读 skill `tv-ui-page-author`，组件说明见 `web/docs/tv-ui.md`。

- 只用 `@chancestv/tv-ui`
- `<EPage id default-focus>`
- 确认 `@enter`，禁止 `@click`、裸 `button` / `input`
- 禁止 `import '@chancestv/tv-focus'`
- `setupTvFocus` 已在 `web/apps/shell/src/main.ts`，页面里不要再调
- 换肤改 `web/apps/shell/src/theme.css`

## 命令

```bash
cd web && pnpm install && pnpm dev
```
