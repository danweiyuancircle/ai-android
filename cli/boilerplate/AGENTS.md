# 本工程（脚手架生成）

Android WebView 壳 + Vue3 H5。打开**本目录**作为工作区即可让 AI 写代码。

| 目录 | 做什么 |
|---|---|
| `web/` | TV 页面、焦点、样式。日常开发主要在这里 |
| `android-app/` | 原生壳、JSBridge、语音。改 applicationId / H5_URL / 签名 |

## H5（先读）

- 业务只用 `@chancestv/tv-ui`，不要 `import '@chancestv/tv-focus'`
- 页面根 `<EPage id default-focus>`，确认用 `@enter`，不要裸 `button` / `@click`
- 换肤：`web/apps/shell/src/theme.css`
- 用法：`web/docs/tv-ui.md`
- 写页配方：skill `chances-tv-ui`（`.claude/skills/` 与 `.agents/skills/`）
- 样板：`web/apps/shell/src/pages/Home.vue`、`Gallery.vue`、`Theme.vue`

```bash
cd web && pnpm install && pnpm dev
```

## Android

壳约束见 `.claude/rules/android-dev-spec.md`（Support 27.1.1，禁止 AndroidX）。skill：`chances-sdk-v2`。
