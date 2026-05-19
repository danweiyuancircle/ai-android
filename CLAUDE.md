# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库定位

本仓库**没有可运行的代码**，全部内容服务于 Claude Code AI：

- `rules/` — 按目标 Android 版本分档的 WebView H5 兼容规则，**可直接拷贝到下游项目 `.claude/rules/`**

无需 build / lint / test 工具链。"测试"即把 rules 投放到目标项目里跑 Claude Code 验证效果。

## `rules/` 约定

```
rules/
├── android-webview-5.md     # Chromium 53 档
└── android-webview-9.md     # Chrome 66 档
```

内容范围：仅 JS API / CSS 特性 / SSE / 构建配置。

**严禁出现**：

- 库版本锁（如 Vue 3.4.x、Tailwind 3.2、axios 1.6 等）
- Vue / React 等框架的具体用法
- 未在下游项目 `CLAUDE.md` / `AGENTS.md` 字面出现的"经验之谈"

## 工作约定

### 修改 / 新增 rules

1. 只能从下游项目（本案例：`/Users/chances/sh_tour_ai/`、`/Users/chances/WebstormProjects/fast-platform/`）的 `CLAUDE.md` / `AGENTS.md` **字面**抽取
2. 每条约束保持极简：一行声明"禁/必/推荐什么 → 替代或要求"，不写背景论证、不嵌示例代码
3. commit 信息格式：`feat(rules): ...` / `fix(rules): ...` / `refactor(rules): ...`

### 不做的事

- 不写业务代码、构建脚本、CI 配置
- 不在 `rules/` 写库版本锁
- 不创建仓库根 `README.md`（本仓库面向 AI，不面向人工阅读）
