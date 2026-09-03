---
name: chances-tv-ui
description: Use when 在 Vue/H5 写 TV/OTT 页面、弹框、抽屉、列表、网格、卡片墙、输入框、开关、进度条、焦点、遥控器方向键、EPage/ERow/EColumn/EButton/EInput/ESwitch/ESlider/EFocusable/EDialog，或依赖 @chancestv/tv-ui / @chancestv/tv-focus。即使用户只说加首页、选片墙、确认弹框、搜索框也要用。Use when the user runs /chances-tv-ui.
---

# 写 TV 页面（@chancestv/tv-ui）

业务层只用 `@chancestv/tv-ui`。不要直连 `@chancestv/tv-focus`，不要拷 `E*.vue`。

- 给人看的说明：[README.md](README.md)
- 不用本脚手架、接到已有 Vue：[references/integrate.md](references/integrate.md)
- 组件速查：生成工程 `web/docs/tv-ui.md`（无脚手架则看 README 组件表）

## 三句话

1. 页面根必须是 `<EPage id="..." default-focus="...">`。
2. 方向分组用 `<ERow>` / `<EColumn>` / `<EFocusGroup>`（一个容器 = 一个焦点 section，给稳定 `id`）。
3. 可交互用 `EButton` / `EInput` / `ESwitch` / `ESlider` / `ECard` / `EImage` / `EFocusable` / `EVirtual`；确认用 `@enter`，不用 `@click`。

## 入口（每个应用一次）

脚手架工程已在 `web/apps/shell/src/main.ts` 调过，页面里不要再调。无脚手架见 [integrate.md](references/integrate.md)。

## 按场景读附录

| 要做什么 | 读 |
|---|---|
| 焦点怎么走（section / restrict） | [references/focus-model.md](references/focus-model.md) |
| 一级 / 二级页 | [references/page-template.md](references/page-template.md) |
| 弹框 / 抽屉 / Toast | [references/dialog-template.md](references/dialog-template.md) |
| 卡片墙 / 列表 / 输入 / 开关 / 滑块 | [references/focusable-recipes.md](references/focusable-recipes.md) |
| 不确定能不能写 | [references/anti-patterns.md](references/anti-patterns.md) |
| 接到已有 Vue（不用脚手架） | [references/integrate.md](references/integrate.md) |

`focus-key` 全局唯一，加页面前缀（如 `home-`）。section `id` 稳定，二次进页才记得上次焦点。

## 样板（脚手架生成工程）

- 简单页：`web/apps/shell/src/pages/Home.vue`
- 全组件 + 弹框：`web/apps/shell/src/pages/Gallery.vue`
- 分类墙：`web/apps/shell/src/pages/scene/SceneView.vue`
- 换肤：`web/apps/shell/src/pages/Theme.vue`
