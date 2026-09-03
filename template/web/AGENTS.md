# web

可直接 `pnpm install && pnpm dev`。TV 组件来自 npm `@chancestv/tv-ui`，壳逻辑在 `@shell/core`。

## 写页

- 页面放 `apps/shell/src/pages/`，路由 `apps/shell/src/router/index.ts`
- 根用 `<EPage id default-focus>`，确认用 `@enter`
- 不要 `import '@chancestv/tv-focus'`，不要裸 `button` / `@click`
- 焦点换肤改 `apps/shell/src/theme.css`，示例页 `pages/Theme.vue`
- 组件用法：`docs/tv-ui.md`；写页 skill：`chances-tv-ui`

## 样板

- 首页：`pages/Home.vue`（正式版删掉「查看示例」按钮即可）
- 示例目录：`pages/Examples.vue`
- 组件总览：`pages/Gallery.vue`
- 布局：`pages/scene/SceneView.vue`
- 换肤：`pages/Theme.vue`
