---
description: TV/OTT Vue 页面焦点硬约束。写 .vue 页面、弹框、列表、遥控器焦点时必守。
paths:
  - "**/*.vue"
---

# TV Vue 焦点硬约束

业务层只用 `@chancestv/tv-ui`。写页面 / 弹框 / 列表先读 skill `tv-ui-page-author`。

- 页面根：`<EPage id default-focus>`
- 确认：`@enter`，不是 `@click`
- 可交互：`EButton` / `EFocusable` / `ECard` 等，禁裸 `button` / `a` / `input`，禁 `tabindex`
- 禁止 `import ... from '@chancestv/tv-focus'`
- 初始化：应用入口一次 `setupTvFocus(...)`，页面里不要再调
