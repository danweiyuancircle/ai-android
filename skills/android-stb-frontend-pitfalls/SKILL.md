---
name: android-stb-frontend-pitfalls
description: Android 机顶盒 / Android TV / IPTV / OTT 套壳 H5 应用前端避坑指南。按 Chrome WebView 版本档位（Chrome 53 / 66 / 80 / 100+）给出 CSS、JS、SSE 三大维度的能用 / 不能用 / 降级方案；并能根据目标 Android 最低版本生成约束并**写入项目 CLAUDE.md / AGENTS.md** 让后续 AI 协作自动遵守；同时能**审计项目打包配置**是否满足 ES5 / ES2015 + polyfill 的兼容要求。当用户提到机顶盒、OTT、IPTV、Android TV、套壳、WebView 兼容、低版本 Chrome、老安卓盒子、Tailwind / Vue / React / Vite 能不能装在某 Android 版本上、SSE 选型（EventSource vs fetch streaming vs XHR）、@vitejs/plugin-legacy 配置、core-js polyfill、ResizeObserver / aspect-ratio / container queries / structuredClone / Promise.withResolvers 等特性能不能用、需要把兼容约束写到项目记忆（CLAUDE.md / AGENTS.md）、检查项目是否 ES5 打包 / 向下兼容打包配置审计、Vite legacy / Babel preset-env / tsconfig target / browserslist 校对时务必触发；即便用户没明说"机顶盒"，只要语境是低版本 WebView / 老安卓 / TV 大屏 / 套壳 H5 也要触发。
---

# Android 机顶盒套壳前端避坑指南

适用场景：在 Android 机顶盒 / OTT / IPTV / Android TV 上做 H5 套壳前端（被原生 WebView 加载）。

## 第一步：先确定 Chrome 档位（最关键，决定了所有选型）

机顶盒上的"Chrome 版本"指 **Android 系统 WebView** 的内核版本。三条铁律：

1. **机顶盒厂商常常冻结 WebView**：不像手机能跟 Google Play 自动升级 WebView，机顶盒厂商可能禁用 Play Store、把 WebView 锁在出厂版本。**按"出厂版本"作为兼容下限来选型，最安全。**
2. **API minSdk 不等于 WebView 版本**：原生应用的 `minSdkVersion=24` 只说明能装、能跑，不代表 WebView 内核版本。WebView 内核是独立维护的。
3. **务必到目标机型上 `navigator.userAgent` 或 `chrome://version` 实测**。OEM 定制的 HiWebView / Crosswalk / 自研内核更要单独验证。

### Android 出厂 WebView 与可升级版本对照

| Android 版本 | 出厂 WebView (Chromium) | 可单独升级到 | 当前实操目标 |
|---|---|---|---|
| 4.4 KitKat | ~30/33（**不可独立升级**） | ✗ | 放弃，工作量超过收益 |
| 5.0 / 5.1 Lollipop | ~37 / ~39 | Chrome 53 左右（独立 WebView APK 已停更） | **Chrome 53**（参考 sh_tour_ai） |
| 6.0 Marshmallow | ~44 | Chrome 70+ | Chrome 53~70（看现场） |
| 7.0 Nougat | ~51（WebView 与 Chrome 共享代码） | Chrome 66+ | **Chrome 66**（参考 fast-platform） |
| 7.1 | ~55 | Chrome 70+ | Chrome 66 |
| 8.0 Oreo | ~58 / ~61 | Chrome 77+ | Chrome 66~77 |
| 9 Pie | ~66 / ~70 | Chrome 80+ | Chrome 80 |
| 10 (Q) | ~74（WebView 与 Chrome 拆分） | 较新 Chrome | Chrome 80+ |
| 11+ | ~80+ | 跟随系统更新 | Chrome 100+ |

> **机顶盒选型实务**：先问甲方"目标设备型号 + Android 版本 + 是否允许联网升级 WebView"；不能答的，默认按"该 Android 版本出厂 WebView"取下限；激进一点的项目可以假定客户能通过 OTA 推一次 WebView 升级（但仍要给降级方案）。

---

## 第二步：三大维度速查

### CSS 速查

| 特性 | 起始 Chrome | Chrome 53 (Android 5.1.1) | Chrome 66 (Android 7.0) | Chrome 80 (Android 9) | 备注 / 降级 |
|---|---|---|---|---|---|
| Flex `gap` | 84 | ✗ | ✗ | ✗ | `margin` + `:last-child { margin: 0 }` |
| `aspect-ratio` | 88 | ✗ | ✗ | ✗ | `padding-top` 百分比 hack |
| `:is()` / `:where()` | 88 | ✗ | ✗ | ✗ | 展开多条选择器 |
| `:has()` | 105 | ✗ | ✗ | ✗ | JS 加 class |
| Container Queries | 105 | ✗ | ✗ | ✗ | JS 测尺寸 + media query 兜底 |
| `dvh` / `svh` / `lvh` | 108 | ✗ | ✗ | ✗ | `vh` + JS 监听 resize 修正 |
| `color-mix()` | 111 | ✗ | ✗ | ✗ | Sass 预编译 |
| `@layer` CSS Cascade Layers | 99 | ✗ | ✗ | ✗ | 用 specificity 排序 |
| CSS Grid | 57 | ✗ | ✓ | ✓ | Flex 布局 |
| CSS 变量 | 49 | ✓ | ✓ | ✓ | 安全 |
| `env(safe-area-inset-*)` | 69 | ✗ | ✗ | ✓ | media query + 固定值 |

详见 `references/css-pitfalls.md`。

### JS 速查

| 特性 / 库 | 最低 Chrome | Chrome 53 | Chrome 66 | Chrome 80 | 降级 |
|---|---|---|---|---|---|
| Optional chaining `?.` | 80 | 需 legacy 编译 | 需 legacy 编译 | ✓ | `@vitejs/plugin-legacy` 自动降级 |
| Nullish coalescing `??` | 80 | 需 legacy 编译 | 需 legacy 编译 | ✓ | 同上 |
| `structuredClone` | 98 | ✗ | ✗ | ✗ | `JSON.parse(JSON.stringify())` 或 `rfdc` |
| `Object.hasOwn` | 93 | ✗ | ✗ | ✗ | `Object.prototype.hasOwnProperty.call(o, k)` |
| `Array.prototype.at(-1)` | 92 | ✗ | ✗ | ✗ | `arr[arr.length - 1]` |
| `Array.findLast` | 97 | ✗ | ✗ | ✗ | 反向 for 循环 |
| `Promise.allSettled` | 76 | 需 core-js | 需 core-js | ✓ | core-js 注入 |
| `Promise.withResolvers` | 119 | ✗ | ✗ | ✗ | 手写包装（4 行） |
| `AbortController` | 66 | ✗ | ✓ | ✓ | abort-controller polyfill |
| `AbortSignal.timeout` | 103 | ✗ | ✗ | ✗ | `setTimeout(() => ctrl.abort(), ms)` |
| `ResizeObserver` | 64 | ✗ | ✓ | ✓ | resize-observer-polyfill |
| `IntersectionObserver` | 51 | ✓ | ✓ | ✓ | 安全 |
| `requestIdleCallback` | 47 | ✓ | ✓ | ✓ | 安全 |
| `URL.canParse` | 120 | ✗ | ✗ | ✗ | `try { new URL(s); return true } catch { return false }` |

库的隐性下限（必看）：
- **Vue 3.5+** 用 `Promise.withResolvers` → Chrome 53/66 锁 **Vue 3.4.x**
- **React 19** 用 `Promise.withResolvers` + `use()` → Chrome 53/66/80 都锁 **React 18.x**
- **Tailwind v4** 需要 Chrome **111+**（用 `@layer` + `color-mix()` + `@property`）→ 老机顶盒锁 **Tailwind v3.0-v3.2**（v3.3+ 已用 `:is()`）
- **axios 1.7+** 用 `structuredClone` → 锁 **axios 1.6.x**
- **HLS.js 1.5+** 用 ManagedMediaSource → 锁 **HLS.js 1.4.x**
- **date-fns v3** 要 ES2020 → Chrome 53 用 v2

详见 `references/js-pitfalls.md`。

### SSE 速查（流式输出选型）

| 方案 | 最低 Chrome | 自定义 Header | POST | 中断 | 自动重连 | 包大小 | 适用场景 |
|---|---|---|---|---|---|---|---|
| 原生 `EventSource` | 6 | ✗ | ✗ | ✗ | ✓ | 0 | 公开 GET 接口、不需 Auth |
| `fetch` + `ReadableStream` | 43（TextDecoderStream 71+） | ✓ | ✓ | ✓ | 自写 | 0 | Chrome 66+，且基座 fetch streaming 实测无 buffering bug |
| `@microsoft/fetch-event-source` | 64 | ✓ | ✓ | ✓ | ✓ | ~10KB | Chrome 80+ |
| **XHR + `onprogress` 手解析** | **任意（含 Chrome 53）** | ✓ | ✓ | ✓ | 自写 | 0 | **机顶盒首选**，最稳 |

**结论**：机顶盒场景一律推荐 **XHR + onprogress** 方案，参考 `/Users/chances/sh_tour_ai/src/api/aiChatApi.ts:53-149` 的完整实现。

服务端务必关 Nginx `proxy_buffering` + 加 `X-Accel-Buffering: no` + 心跳 < 30s。详见 `references/sse-pitfalls.md`。

---

## 第三步：钻取 references/

- `references/compat-matrix.md` — 特性 × Chrome 版本完整矩阵
- `references/css-pitfalls.md` — CSS 详细避坑（含示例代码）
- `references/js-pitfalls.md` — JS / 构建链 / 第三方库 详细避坑
- `references/sse-pitfalls.md` — SSE 三方案对比 + Nginx / HTTP/2 / 重连 / 背景态
- `references/case-studies.md` — 两个真实工程的实操经验引用
- `references/inject-to-claude-md.md` — **把约束写入项目 CLAUDE.md / AGENTS.md 的完整模板与流程**
- `references/es5-build-audit.md` — **ES5 / ES2015 + polyfill 打包配置审计清单与修复方案**

---

## 第四步（核心用法）：把约束写入项目 CLAUDE.md / AGENTS.md

**适用场景**：你接手或新建一个机顶盒项目，希望让所有后续在该项目里工作的 AI 协作伙伴（Claude Code、Cursor、Copilot 等）**自动遵守目标 WebView 的兼容约束**，不需要每次重新解释。

### 触发关键词

- "把这些约束写进项目"
- "更新到项目 CLAUDE.md / AGENTS.md / 项目记忆"
- "同步到项目让大模型遵守"
- "生成项目约束文档"
- 用户给出目标 Android / Chrome 版本，并要求"沉淀到当前项目"

### 流程

1. **确认目标 Chrome 档位**：先按第一步的 Android↔Chrome 对照表确定档位（53 / 66 / 80 / 100+）。如用户未给目标 Android 版本，主动问。
2. **检测项目根的记忆文件**：
   - 优先级 1：`<项目根>/CLAUDE.md`（Claude Code 默认）
   - 优先级 2：`<项目根>/AGENTS.md`（多工具通用约定）
   - 优先级 3：`<项目根>/.claude/CLAUDE.md`
   - 若都不存在，**默认创建 `CLAUDE.md`**（在项目根，与 README.md 同级）
3. **读取已有内容**：用 Read 工具看一遍，避免重复注入或与现有规则冲突
4. **追加约束章节**（不要覆盖现有内容）：按 `references/inject-to-claude-md.md` 的模板，按档位填空生成完整约束章节，加在文件末尾
5. **写入后报告**：
   - 修改的文件绝对路径
   - 新增的章节标题（如 "## Android STB 前端兼容约束（Chrome 53 / Android 5.1.1）"）
   - 简明摘要：本次注入的关键禁用 / 锁定 / 推荐项

### 关键设计原则

- **追加不覆盖**：用 Edit 而非 Write；插入到现有文档末尾，保留所有用户已有规则
- **章节有明确标题**：让后续工作的 AI 一眼能找到这段约束
- **可被搜索**：标题里带 "Android STB 前端兼容约束" + "Chrome 53"（或对应档位），方便 grep
- **可复读**：约束本身是声明式的（"必须 X" / "禁止 Y"），不要写"具体怎么实现"，那些放 skill references/ 里
- **版本号显式**：所有约束都带 "since Chrome X" 标注，方便后续若 WebView 抬高再来更新

详见 `references/inject-to-claude-md.md`（含三档完整模板）。

---

## 第五步（核心用法）：审计项目是否 ES5 / ES2015 打包

**适用场景**：接手已有项目，要确认其构建配置是否真的能产出兼容老 WebView 的代码；或新项目第一次配置完想验证。

### 触发关键词

- "检查项目打包配置 / build 配置"
- "是否 ES5 兼容 / 向下兼容打包"
- "为什么我的项目装不上老盒子 / 老盒子白屏"
- "ES5 打包审计 / 兼容审计"
- "vite.config / tsconfig / babel.config 是否正确"

### 重要前置说明：到底要不要 ES5？

- **Chrome 53+** 原生支持 **ES2015 (ES6) 绝大部分**（class / let/const / 箭头函数 / Promise / Map/Set / template literal 全部 OK），且支持 ES2016 / 大部分 ES2017（async/await 需 Chrome 55+，53 上要 transpile）
- **实操标准**：构建目标 `es2015` + Babel/SWC 把 async/await 等少数 ES2017+ 语法降到 ES2015 + core-js 补 API polyfill。**不必降到真 ES5**（产物大、慢、收益低）
- **真正要 ES5 的情况**：要兼容 Chrome 30-48（Android 4.4 KitKat 出厂 WebView）—— 这类盒子建议直接放弃，工作量远大于收益

skill 内部把"ES5 打包"实际理解为"**ES2015 + Babel/SWC 降级少数新语法 + core-js polyfill 补 API + nomodule 兜底**"这个**实操标准**，不是字面的 ES5。

### 审计清单（必查 6 项）

按顺序检查项目根：

1. **`package.json` 的 `browserslist` 字段**
   - 必须存在，必须包含目标 Chrome 下限（如 `"chrome >= 53"`）
   - 若不存在：补一份，让 PostCSS / autoprefixer / eslint-plugin-compat 等都读它

2. **构建工具的 target**
   - Vite：`vite.config.*` 里 `build.target` 应为 `'es2015'` 或更低；**关键还要看是否有 `@vitejs/plugin-legacy`**（esbuild 只降语法，不补 polyfill）
   - Webpack：`output.environment` 或 `babel-loader` 的 `@babel/preset-env` targets
   - Rollup：`output.format: 'iife'` + Babel
   - Turbopack：`compilerOptions.target`

3. **`tsconfig.json` 的 `compilerOptions.target`**
   - 推荐 `ES2020`（IDE 友好），由 Vite legacy / Babel 接管最终降级
   - 不需要降到 `ES5`，因为 tsc 不补 polyfill，降到 ES5 也只解决一半问题

4. **`@vitejs/plugin-legacy` 是否安装与配置**
   - 机顶盒项目必装；缺则 `structuredClone` / `Promise.allSettled` 等 API 上线就炸
   - `targets` 必须显式写（不读 browserslist）
   - `additionalLegacyPolyfills` 应列出常用 DOM polyfill（resize-observer / abort-controller 等）

5. **`core-js` 版本**
   - 应 `^3.36+`（更早版本可能没覆盖 `Promise.withResolvers`）
   - 应在 `dependencies` 而非仅 `devDependencies`

6. **scan 源码是否已使用超档位 API**（grep）
   - `structuredClone(` （Chrome 98+）
   - `Promise.withResolvers` （Chrome 119+）
   - `Object.hasOwn(` （Chrome 93+）
   - `.findLast(` / `.findLastIndex(` （Chrome 97+）
   - `.at(-` （Chrome 92+）
   - `AbortSignal.timeout` （Chrome 103+）
   - `new ResizeObserver` （Chrome 64+，53 没有）
   - 若有使用且未配 polyfill → 标红

### 输出格式

审计完输出 Markdown 报告，分三段：

1. **当前状态**：每一项的实际值（含 file:line 引用，方便点开看）
2. **不符合项**：每项给出修复建议（具体代码片段）
3. **下一步行动**：按优先级排好的修复清单（高/中/低）

详见 `references/es5-build-audit.md`（含完整审计模板 + 修复代码片段）。

---

## 通用建议（无论档位都适用）

1. **构建产物必须有 nomodule 兜底**：用 `@vitejs/plugin-legacy`，不要只靠 esbuild target。esbuild 只降语法不补 polyfill，老 WebView 用到 `structuredClone` 等 API 时会运行时报错。
2. **CSS 与 JS 的目标版本必须对齐**：Vite legacy `targets` 和 PostCSS `browserslist` 是**两套独立**配置，常见漏配。把 `browserslist` 写在 `package.json`，让所有工具读同一份。
3. **第三方库锁版本**：机顶盒项目 `package.json` 用精确版本号（不要 `^`、`~`），尤其 Vue/React/axios/Tailwind/HLS.js 这类常踩坑的库。
4. **在目标机型上 smoke test**：构建产物用 USB / adb push 装到真机跑一遍，模拟器和 Chrome DevTools 都骗人。
5. **错误监控**：接 Sentry 或自建上报，监控 `script error` 和未捕获 Promise，机顶盒 WebView 经常吐出与桌面 Chrome 不一样的报错。
