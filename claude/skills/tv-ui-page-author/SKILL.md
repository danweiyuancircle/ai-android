---
name: tv-ui-page-author
description: 写 TV 页面 / 弹框 / 列表时必读。强制规约：只用 @dwy/tv-ui 组件，不直接 import @dwy/focus-vue3 / @shell/core/useFocusPage，不裸用 <div tabindex>。涵盖 EPage / ERow / EColumn / EFocusGroup / EDialog / EDrawer / EToast / EFocusable 的标准写法。
---

# TV-UI 页面开发规约

## 三句话规约

1. 页面必从 `<EPage id="..." default-focus="...">` 起，不写 `<FocusSection>`、不调 `useFocusPage`。
2. 可聚焦元素必是 tv-ui 组件：`EButton` / `ECard` / `EVirtualList` / `EFocusable`。不裸用 `<div tabindex>`。
3. 焦点区域容器必是 tv-ui 容器：`ERow` / `EColumn` / `EFocusGroup` / `EDialog` / `EDrawer`。

## 决策树

```
要做什么？
  ├─ 一级 / 二级页 ............... references/page-template.md
  ├─ 弹框 / 抽屉 / Toast ......... references/dialog-template.md
  ├─ 卡片列表 / 网格 / 锁焦区 .... references/focusable-recipes.md
  └─ 自定义 UI 但要成焦点项 ...... references/focusable-recipes.md（§自定义焦点项）
```

## 焦点行为速记

- 锁焦（焦点不出区）：容器加 `restrict="self-only"`。
- 区域间记忆：容器给 `id`，默认 `enter-to="last-focused"` 自动记住上次焦点。
- OK 键用 `@enter`，**不要**用 `@click`（遥控器路径不触发 click）。
- 应用入口（main.ts）用 `setupTvFocus(事件名)` 初始化，业务页不碰。

## 绝对禁忌

见 references/anti-patterns.md。违反任意一条 = lint 报错或运行期无焦点。
