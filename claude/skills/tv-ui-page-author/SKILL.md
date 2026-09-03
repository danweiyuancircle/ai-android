---
name: tv-ui-page-author
description: Use when 在 Vue/H5 写 TV/OTT 页面、弹框、抽屉、列表、网格、卡片墙、焦点、遥控器方向键、EPage/ERow/EColumn/EButton/EFocusable/EDialog，或依赖 @chancestv/tv-ui / @chancestv/tv-focus。即使用户只说加首页、选片墙、确认弹框也要用。Use when the user runs /tv-ui-page-author.
---

# 写 TV 页面（@chancestv/tv-ui）

业务层只用 `@chancestv/tv-ui`。不要直连 `@chancestv/tv-focus`，不要从本仓拷 `E*.vue`。组件说明见工程内 `web/docs/tv-ui.md`。实现在 [chances-tv-kit](https://github.com/danweiyuancircle/chances-tv-kit)。

## 三句话

1. 页面根必须是 `<EPage id="..." default-focus="...">`。
2. 方向分组用 `<ERow>` / `<EColumn>` / `<EFocusGroup>`（一个容器 = 一个焦点 section，给稳定 `id`）。
3. 可交互项用 `EButton` / `EFocusable` / `ECard` / `EImage` / `EVirtual`；确认用 `@enter`，不用 `@click`。

## 入口（每个应用一次）

`apps/shell/src/main.ts` 已调用，页面里不要再调：

```ts
import '@chancestv/tv-ui/style.css'
import '@chancestv/tv-ui/styles/index.css'
import { setupTvFocus } from '@chancestv/tv-ui'
import { OTT_NATIVE_KEYDOWN_EVENT } from '@shell/core'

setupTvFocus(OTT_NATIVE_KEYDOWN_EVENT)
```

## 按场景读附录

| 要做什么 | 读 |
|---|---|
| 一级 / 二级页 | [references/page-template.md](references/page-template.md) |
| 弹框 / 抽屉 / Toast | [references/dialog-template.md](references/dialog-template.md) |
| 卡片墙 / 列表 / 网格 / 自定义焦点块 | [references/focusable-recipes.md](references/focusable-recipes.md) |
| 不确定能不能写 | [references/anti-patterns.md](references/anti-patterns.md) |

`focus-key` 全局唯一，加页面前缀（如 `home-`）。section `id` 稳定，二次进页才记得上次焦点。

## 样板

生成工程里路径如下（本仓库开发模板则在 `template/h5-vue/` 下同名文件）：

- 简单页：`web/apps/shell/src/pages/Home.vue`
- 全组件 + 弹框：`web/apps/shell/src/pages/Gallery.vue`
- 分类墙：`web/apps/shell/src/pages/scene/SceneView.vue`
- 换肤：`web/apps/shell/src/pages/Theme.vue`
