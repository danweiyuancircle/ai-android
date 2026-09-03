# 写页用的焦点模型

不必读引擎源码。页面按这个搭，方向键就会走。

- **section**：`EPage` / `ERow` / `EColumn` / `EFocusGroup`。给稳定 `id`。只分组，自己不持有焦点。
- **项**：`EButton` 等带 `focus-key` 的组件。焦点落在项上，归属**最近一层** section。
- **嵌套**：外层 Row 里再套 Row，项算内层的。行间上下、行内左右靠几何，不用手写邻接表。
- **restrict**：默认 `self-first`（先本区，没有再跨区）。菜单锁死用 `self-only`。
- **记忆**：`EPage` + KeepAlive 返回落在上次项；`default-focus` 只兜底首次。
- **拦截**：少数控件（ESlider 左右、EInput 编辑）自己吃键；到边缘或方向键离开后再把焦点交出去。不要自己 `preventDefault` 全方向。
- **安全区**：滚动容器 `overflow: hidden` 时，页面自己留 padding，放大/描边才不会被裁。这不是组件库的事。
