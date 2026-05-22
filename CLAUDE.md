# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库定位

本仓库分两部分：

- `claude/` — 服务于 Claude Code AI 的资产，无可运行代码
  - `claude/rules/` — 按目标 Android 版本分档的 WebView H5 兼容规则，**可直接拷贝到下游项目 `.claude/rules/`**
  - `claude/skills/` — 可直接拷贝到下游项目的 skill
- `template/` — 脚手架工程，存放可运行的模板代码
  - `template/bridge-contract.md` — 壳↔H5 的 `window.ottService` JSBridge 契约（壳与各 H5 模板共同实现）
  - `template/android-shell/` — 通用 Android WebView 壳（chances-sdk 基线：Support 27.1.1 / 非 AndroidX / AGP 3.6.0 / compileSdk 28 / minSdk 19）
  - `template/h5-vue/` — Vue3 + Vite H5 壳骨架（Chromium 53 兼容 + TV 焦点框架），后续可加 `template/h5-react/`
  - `template/README.md` — 组合矩阵（Vue/React + 壳）与 rules/skill 绑定表

起项目时按 `template/README.md` 的绑定表，从 `claude/` 拷贝对应 rules/skill 到目标工程 `.claude/`（单一来源在 `claude/`，模板不冗余携带）。

`claude/` 无需 build / lint / test 工具链。"测试"即把 rules 投放到目标项目里跑 Claude Code 验证效果。

## `claude/rules/` 约定

```
claude/rules/
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

- 不在 `claude/` 写业务代码、构建脚本、CI 配置（业务代码归 `template/`）
- 不在 `claude/rules/` 写库版本锁
- 不创建仓库根 `README.md`（本仓库面向 AI，不面向人工阅读）
