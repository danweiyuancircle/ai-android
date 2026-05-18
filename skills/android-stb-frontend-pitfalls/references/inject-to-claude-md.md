# 把兼容约束写入项目 CLAUDE.md / AGENTS.md

目标：让项目根的 CLAUDE.md / AGENTS.md 在所有后续 AI 协作场景中**自动加载**这些兼容约束，开发者不必每次手动告诉 AI "我们这个项目是 chrome53"。

## 一、选定目标文件

按以下优先级**检测**项目根（不要瞎建多个文件，会冲突）：

1. **`<项目根>/CLAUDE.md`** —— Claude Code 默认加载（最推荐）
2. **`<项目根>/AGENTS.md`** —— 跨 AI 工具通用约定（Cursor / Aider 等也读）
3. **`<项目根>/.claude/CLAUDE.md`** —— 项目级配置目录形式

**若都不存在 → 默认创建 `<项目根>/CLAUDE.md`**（与 `README.md` 同级，便于版本控制 + 团队共享）

**若同时存在 CLAUDE.md 和 AGENTS.md** → 两个都追加（保持两套生态一致）

## 二、追加策略

- **绝对禁止**用 Write 覆盖整个文件 → 会丢失用户已有规则
- 用 Read 读出当前内容 → 用 Edit 在文件末尾追加新章节
- 章节标题用统一格式：`## Android STB 前端兼容约束（Chrome <版本号> / Android <版本号>）`
- 若已存在同标题章节（之前注入过）→ 用 Edit 替换整段，保留其他内容
- 注入完成后**只报告**新增/更新的章节，不要把整个文件内容贴回 chat

## 三、模板（按档位选用）

### 模板 A：Chrome 53 / Android 5.1.1（极保守）

```markdown
## Android STB 前端兼容约束（Chrome 53 / Android 5.1.1）

本项目运行在 Android 机顶盒 / OTT 套壳 WebView，**Chrome 内核下限 53**（Android 5.1.1 出厂可升到的水位）。所有前端代码必须遵守以下约束。

### 禁用的 JS API（需 polyfill 或改写）

| API | since Chrome | 替代方案 |
|---|---|---|
| `structuredClone` | 98 | `rfdc` 包或 `JSON.parse(JSON.stringify(x))` |
| `Promise.withResolvers` | 119 | 手写包装（4 行） |
| `Promise.allSettled` | 76 | core-js 已注入；或手写 |
| `Promise.any` | 85 | 手写 race + 取消 |
| `Object.hasOwn` | 93 | `Object.prototype.hasOwnProperty.call(o, k)` |
| `Object.fromEntries` | 73 | 自写两行 reduce |
| `Array.prototype.at` | 92 | `arr[arr.length - 1]` |
| `Array.prototype.findLast` | 97 | 反向 for 循环 |
| `Array.prototype.flat` / `flatMap` | 69 | 自写或 lodash |
| `String.prototype.replaceAll` | 85 | `split().join()` 或正则 g flag |
| `AbortController` | 66 | abort-controller polyfill |
| `AbortSignal.timeout` | 103 | `new AbortController()` + `setTimeout` |
| `ResizeObserver` | 64 | resize-observer-polyfill |
| `URL.canParse` | 120 | `try { new URL(s); return true } catch { return false }` |
| `WeakRef` / `FinalizationRegistry` | 84 | 不要用 |
| `TextDecoderStream` | 71 | 用 `TextDecoder` + 手解析 |

### 禁用的 CSS 特性（需降级写法）

| 特性 | since Chrome | 替代方案 |
|---|---|---|
| Flex `gap` | 84 | `margin` + `:last-child { margin: 0 }` |
| `aspect-ratio` | 88 | `padding-top` 百分比 hack |
| `:is()` / `:where()` | 88 | 展开成多条选择器 |
| `:has()` | 105 | JS 检测加 class |
| Container Queries `@container` | 105 | ResizeObserver + JS 加 class |
| `dvh` / `svh` / `lvh` | 108 | `vh` + JS 监听 resize |
| `color-mix()` | 111 | Sass 预编译颜色 |
| `@layer` Cascade Layers | 99 | specificity 排序 |
| `@property` | 85 | 不用 CSS 变量动画 |
| `accent-color` | 93 | 自定义控件 |
| `min()` / `max()` / `clamp()` | 79 | 媒体查询分档写死 |
| `:focus-visible` | 86 | `:focus` 或 JS 判断 |
| `inset` 简写 | 87 | 写全 top/right/bottom/left |
| 逻辑属性（`margin-inline` 等） | 87 | 物理属性 |

### 第三方库版本锁（package.json 必须用精确版本号）

| 库 | 锁定版本 | 上限原因 |
|---|---|---|
| Vue | `3.4.x`（推荐 `3.4.21`） | 3.5+ 用 Promise.withResolvers |
| React | `18.3.x` | 19+ 用 Promise.withResolvers |
| Vue Router | `4.2.x` | 跟随 Vue |
| Pinia | `2.1.x` | 跟随 Vue |
| axios | `1.6.x` | 1.7+ 用 structuredClone |
| Tailwind CSS | `3.2.7`（或换 UnoCSS preset-mini / 手写 CSS） | v3.3+ 用 `:is()`，v4 用 `@layer` / color-mix |
| HLS.js | `1.4.x` | 1.5+ 用 ManagedMediaSource |
| date-fns | `v2.x` | v3 要 ES2020 |
| SWR | `1.x` | 2.x 用 Suspense |
| TanStack Query | `v4.x` | v5 要更新 JS API |
| Vite | `5.x` + `@vitejs/plugin-legacy@5.x` | Vite 6 esbuild 默认 target 抬高 |

### SSE / 流式输出

- **唯一可用方案**：XHR + `onprogress` 手解析（**禁用** 原生 `EventSource` 因不支持 POST/Header；**禁用** fetch + ReadableStream 因 OEM WebView 有 buffering bug；**禁用** `@microsoft/fetch-event-source` 因依赖 chrome53 没有的 API）
- 服务端 Nginx 必须 `proxy_buffering off` + `X-Accel-Buffering: no` + `Content-Type: text/event-stream` + 心跳 < 30s

### 构建配置硬约束

- **必装 `@vitejs/plugin-legacy@5.x`**，targets `['chrome >= 53', 'android >= 5.1']`
- `package.json` 必须有 `browserslist` 字段（让 PostCSS / autoprefixer 等读同一份）
- `tsconfig.json` `compilerOptions.target` 设 `ES2020`（IDE 友好，最终降级由 legacy plugin 接管）
- 额外 polyfill 列表（写到 `additionalLegacyPolyfills`）：`resize-observer-polyfill`、`abort-controller`

### 其他

- **样式工具链**：不要用 PostCSS Preset Env 的新阶段特性；autoprefixer 配置必须读 browserslist
- **UI 库**：Element Plus / Ant Design 5 等用了新 CSS 特性，需逐项验证；推荐手写或用 Naive UI（较轻）
- **性能**：`will-change: transform` 只在动画进行时短暂启用，`transitionend` 后必须立即移除；同屏动画元素 < 10；列表用虚拟滚动
- **真机验证**：构建完必须 adb push 到目标盒子真机跑一遍，模拟器和桌面 DevTools 不可信

详情查询：`.claude/skills/android-stb-frontend-pitfalls/` 下的 SKILL.md 与 references/。
```

### 模板 B：Chrome 66 / Android 7.0（中等保守）

```markdown
## Android STB 前端兼容约束（Chrome 66 / Android 7.0）

本项目运行在 Android 机顶盒 WebView，**Chrome 内核下限 66**（Android 7.0 出厂可升到水位）。所有前端代码必须遵守以下约束。

### 禁用的 JS API（需 polyfill 或改写）

| API | since Chrome | 替代方案 |
|---|---|---|
| `structuredClone` | 98 | `rfdc` 包 |
| `Promise.withResolvers` | 119 | 4 行手写 |
| `Object.hasOwn` | 93 | `Object.prototype.hasOwnProperty.call` |
| `Object.fromEntries` | 73 | 自写 reduce |
| `Array.at` / `findLast` | 92 / 97 | 索引 / 反向 for |
| `String.replaceAll` | 85 | split/join |
| `AbortSignal.timeout` | 103 | AbortController + setTimeout |
| `URL.canParse` | 120 | try/catch |
| `Intl.Segmenter` | 87 | 不用 |
| `TextDecoderStream` | 71 | TextDecoder + 手解析 |

✓ 已可用（Chrome 66+ 原生）：`AbortController`、`ResizeObserver`、`IntersectionObserver`、`Promise.allSettled`（需 Chrome 76，可走 core-js）、`Array.flat`、`Object.fromEntries`

### 禁用的 CSS 特性

| 特性 | since Chrome | 替代方案 |
|---|---|---|
| Flex `gap` | 84 | margin + :last-child |
| `aspect-ratio` | 88 | padding-top hack |
| `:is()` / `:where()` | 88 | 展开多条选择器 |
| `:has()` | 105 | JS 加 class |
| Container Queries | 105 | ResizeObserver + JS |
| `dvh` / `svh` | 108 | vh + JS 修正 |
| `color-mix()` | 111 | Sass 预编译 |
| `@layer` | 99 | specificity 排序 |
| `@property` | 85 | 不用 |
| `min()` / `max()` / `clamp()` | 79 | 媒体查询写死 |

✓ 已可用：CSS Grid、CSS 变量、`scroll-behavior: smooth`、Grid `gap`、`:focus-within`

### 第三方库版本锁

| 库 | 锁定版本 | 原因 |
|---|---|---|
| Vue | `3.4.x` | 3.5+ withResolvers |
| React | `18.3.x` | 19+ withResolvers |
| axios | `1.6.x` | 1.7+ structuredClone |
| Tailwind | `3.2.7`（或 v3.3-3.4 实测验证；**禁用 v4**） | v4 要 Chrome 111+ |
| HLS.js | `1.4.x` | 1.5+ ManagedMediaSource |
| date-fns | `v2.x` | v3 要 ES2020 |
| Vite | `5.x` | Vite 6 target 抬高 |

### SSE / 流式输出

- **首选**：XHR + onprogress（OEM 兼容性最稳）
- **次选**：fetch + ReadableStream（**需真机实测**确认无 buffering bug，建议在 SDK 自家盒子做完测试再用）
- **禁用**：原生 EventSource（不支持 POST + Auth）
- 服务端 Nginx 必须 `proxy_buffering off` + `X-Accel-Buffering: no` + 心跳 < 30s

### 构建配置

- 推荐 `@vitejs/plugin-legacy@5.x` 兜底（即便 esbuild target=chrome66，库的运行时 API 仍可能超出）
- `vite.config.ts` `build.target: 'chrome66'` + `cssTarget: 'chrome66'`
- `tsconfig.json` `compilerOptions.target: 'ES2020'`
- `package.json` `browserslist: ['chrome >= 66', 'android >= 7']`

详情查询：`.claude/skills/android-stb-frontend-pitfalls/`。
```

### 模板 C：Chrome 80 / Android 9（适度激进）

```markdown
## Android STB 前端兼容约束（Chrome 80 / Android 9）

本项目运行在 Android 机顶盒 WebView，**Chrome 内核下限 80**。所有前端代码必须遵守以下约束。

### 禁用的 JS API

| API | since Chrome | 替代 |
|---|---|---|
| `structuredClone` | 98 | rfdc 或 polyfill |
| `Promise.withResolvers` | 119 | 手写 |
| `Object.hasOwn` | 93 | hasOwnProperty.call |
| `Array.at` / `findLast` | 92 / 97 | 索引 / 反向 for |
| `AbortSignal.timeout` | 103 | 手写 |
| `URL.canParse` | 120 | try/catch |
| `Intl.Segmenter` | 87 | 不用 |

✓ 已可用：optional chaining `?.`、nullish coalescing `??`、`Promise.allSettled`、所有 ES2015-2019 语法、全部 fetch streaming、所有 DOM Observer

### 禁用的 CSS 特性

| 特性 | since Chrome | 替代 |
|---|---|---|
| Flex `gap` | 84 | margin |
| `aspect-ratio` | 88 | padding-top |
| `:is()` / `:where()` | 88 | 展开 |
| `:has()` | 105 | JS class |
| Container Queries | 105 | ResizeObserver |
| `dvh` / `svh` | 108 | vh + JS |
| `color-mix()` | 111 | Sass |
| `@layer` | 99 | specificity |

✓ 已可用：CSS Grid、CSS 变量、`@property`（85+）、Conic gradient、backdrop-filter

### 第三方库版本锁

| 库 | 锁定 | 原因 |
|---|---|---|
| Vue | `3.4.x` | 3.5+ withResolvers |
| React | `18.3.x` | 19+ withResolvers |
| axios | `1.6.x` | 1.7+ structuredClone |
| Tailwind | `3.x`（**禁用 v4**） | v4 要 Chrome 111+ |
| HLS.js | `1.4.x` | 1.5+ MMS |

### 构建配置

- Vite 5/6 OK，target=chrome80
- legacy plugin 可不装（库版本锁好的话）
- `tsconfig` target=ES2020
- `package.json` `browserslist: ['chrome >= 80', 'android >= 9']`

### SSE

- 任意方案都可（`@microsoft/fetch-event-source` 推荐）
- Nginx 配置同前

详情：`.claude/skills/android-stb-frontend-pitfalls/`。
```

## 四、注入示例（典型工作流）

```
user: 帮我把约束写到项目 CLAUDE.md，我们目标 Android 5.1.1

AI 行动：
1. Bash: ls /项目根/CLAUDE.md /项目根/AGENTS.md /项目根/.claude/CLAUDE.md
2. 假设只有 CLAUDE.md → Read 它
3. 检查是否已含 "Android STB 前端兼容约束" 段（grep "Android STB"）
4. 没有 → Edit 在文件末尾追加 模板 A
   有 → Edit 替换该段为新版本（用旧标题作 old_string 锚点）
5. 报告：
   - "已更新 /路径/CLAUDE.md"
   - "新增章节：## Android STB 前端兼容约束（Chrome 53 / Android 5.1.1）"
   - "关键约束摘要：Vue ≤3.4 / Tailwind ≤3.2 / axios ≤1.6 / 禁用 :is/:has/aspect-ratio/Flex gap / SSE 仅 XHR / 必装 @vitejs/plugin-legacy"
```

## 五、常见错误与防范

- **错误**：直接 Write 覆盖整个 CLAUDE.md → 用户的其他规则丢失
  - **防**：必须 Read 再 Edit 追加
- **错误**：注入了模板但忘了改占位符（如档位）
  - **防**：模板 A/B/C 已是按档位固化的成品，**直接选档位别瞎改占位符**
- **错误**：同时在 CLAUDE.md 和 AGENTS.md 注入不同档位的约束 → AI 蒙圈
  - **防**：两个文件保持完全相同；只在一个文件里维护，另一个空 / 一行 `参见 CLAUDE.md`
- **错误**：注入完没告诉用户新章节标题，下次想修改找不到
  - **防**：报告里必须列出新增章节标题
