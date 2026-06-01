# Attribution

`@shell/core/focus` 的核心导航实现 fork 自 [luke-chang/js-spatial-navigation](https://github.com/luke-chang/js-spatial-navigation)，遵循 **MPL 2.0** 许可证。

## 上游

- 仓库：https://github.com/luke-chang/js-spatial-navigation
- 来源 commit：`b3539758b31d4d5df40de5da5942a4bb92b947bc`（2022-03-02 _Bump copyright year to 2022_）
- 原始版权：Copyright (c) 2022 Luke Chang
- 许可证：Mozilla Public License 2.0（见 [LICENSE](./LICENSE)）

## fork 后的修改

1. **移除 IIFE 与 jQuery 集成**：原 `;(function($) { ... })(window.jQuery)` 包装改为 ESM 模块；末尾的 `$.SpatialNavigation` / `$.fn.SpatialNavigation` jQuery 入口删除。
2. **顶部声明 `var $ = null`**：保留原代码中 4 处 `if ($)` / `$ && next instanceof $` 分支结构不变（短路为 false），无 jQuery 依赖。
3. **ESM 导出**：`export default SpatialNavigation`，原 `window.SpatialNavigation = SpatialNavigation` 作为兼容性副作用保留。
4. **CommonJS 兼容**：原 `module.exports = SpatialNavigation` 由 tsup 双格式构建产物覆盖。
5. **TypeScript 化**：增加 `// @ts-nocheck`，跳过严格类型检查；公共 API 类型定义见 `src/types.ts`。
6. **构建目标 Chromium 53**：tsup `target: 'chrome53'`，禁用 ES2015+ 语法降级。
7. **文件命名**：`spatial_navigation.js` → `spatial-navigation.ts`。

主流程算法（`partition` / `prioritize` / `navigate` / section 边界策略）**未修改**。

## MPL 2.0 合规

- 保留原 LICENSE 全文于 [LICENSE](./LICENSE)
- 保留原作者署名于源文件头部
- 修改后的源文件 `src/spatial-navigation.ts` 继续以 MPL 2.0 形式可被访问（本仓库为本地 monorepo，源码可读）
- 产物 banner 自动注入版权声明

## 后续维护

修改要点应记录在本文件下方变更日志：

### 变更日志

- 2026-05-19：初始 fork，TS 化 + 移除 jQuery + ESM 化
