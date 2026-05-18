# JS / 构建链 / 第三方库 避坑详谈

按"陷阱 → 症状 → 方案"组织。版本号引自 [[compat-matrix]]。

## 1. 构建链：esbuild vs Babel（legacy plugin）

| 工具 | 降语法 | 补 API polyfill | 适合 |
|---|---|---|---|
| `esbuild` (Vite 内置) | ✓ | ✗ | Chrome 80+ 的中等老设备 |
| `@vitejs/plugin-legacy` (Babel + core-js) | ✓ | ✓ | Chrome 53 及更低，必装 |

**症状（最常见 #1）**：esbuild `target: 'chrome53'` 设了，但运行时 `Uncaught ReferenceError: structuredClone is not defined`。

**根因**：esbuild 不补运行时 API polyfill。`target` 只控语法降级。

**方案**：

```ts
// vite.config.ts —— 完整推荐配置（chrome53 项目）
import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  build: {
    target: 'es2015',           // esbuild 降到 ES5 边缘
    cssTarget: 'chrome53'       // 让 esbuild 不输出 chrome53 不识别的 CSS（如 #rgba）
  },
  plugins: [
    legacy({
      targets: ['chrome >= 53', 'android >= 5.1'],
      // additionalLegacyPolyfills 一定要列你用到但 core-js 没覆盖的 DOM API：
      additionalLegacyPolyfills: [
        'resize-observer-polyfill/dist/ResizeObserver.global',
        // 'whatwg-fetch'   // chrome42+ 已原生支持 fetch，机顶盒一般不用
      ],
      modernPolyfills: false,   // 机顶盒只跑 legacy bundle，不发 modern
      renderLegacyChunks: true,
      polyfills: true
    })
  ]
})
```

`@vitejs/plugin-legacy` 默认引 `core-js@3`，会按你**实际用到的 API** 注入 polyfill（`useBuiltIns: 'usage'`），所以 `structuredClone` / `Promise.allSettled` / `Object.fromEntries` 等都会自动补。

**注意**：`@vitejs/plugin-legacy` 不补 `Promise.withResolvers` —— 这是 Vue 3.5 / React 19 用的，core-js 直到 3.36 才加。要么升级 core-js，要么避开用了它的库（推荐避开，见下面）。

## 2. TS `target` 与 Vite legacy 的关系

**症状**：TS `target: ES2020`、Vite legacy `chrome >= 53`，会冲突吗？

**结论**：不会冲突，正确的配法。

**为什么**：tsc / vite-plugin-vue 先把 TS / SFC 编译到 `ES2020` 的中间产物 → esbuild 把 `ES2020` 进一步降到 `es2015` → Vite legacy 把 `es2015` 再降到 ES5 + polyfill。三段流水线。

`tsconfig.json` 把 `target` 设到 `ES2020` 反而能让 IDE / 类型检查不报错（`Promise.allSettled` 等在 lib 里），但产物降级独立完成。

## 3. 第三方库的"隐性版本下限"

机顶盒最容易被库的小版本升级坑。**`package.json` 用精确版本号，禁用 `^` 和 `~`。**

| 库 | 安全上限 | 上限原因 |
|---|---|---|
| Vue | **3.4.x**（推荐 3.4.21+） | 3.5+ 用 `Promise.withResolvers`（Chrome 119+） |
| React | **18.3.x** | 19.0+ 用 `Promise.withResolvers` + `use()` |
| Vue Router | 4.2.x | 4.3+ 跟随 Vue 3.5 |
| Pinia | 2.1.x | 2.2+ 跟随 Vue 3.5 |
| axios | **1.6.x** | 1.7+ 用 `structuredClone`（Chrome 98+） |
| Tailwind | **3.2.7** | 3.3+ 用 `:is()`，v4 用 `@layer`/`color-mix` |
| HLS.js | **1.4.x** | 1.5+ 用 ManagedMediaSource |
| date-fns | **v2.x** | v3+ 要 ES2020 + ESM only |
| SWR | **1.x** | 2.x 用 Suspense + `Promise.withResolvers` |
| TanStack Query (React Query) | **v4.x** | v5+ 要更高 Node + 更新 JS API |
| Vite | **5.x** + legacy plugin | 6+ esbuild 默认 target 抬高 |
| `@vitejs/plugin-legacy` | **5.x** | 6+ 依赖 SWC，配置不同 |

> **核对方法**：选定版本后到 `unpkg.com/<pkg>@<version>/` 浏览源码，搜 `structuredClone` / `withResolvers` / `Object.hasOwn` / `Array.prototype.at`，有则降版本

## 4. JS API 替代速查（写代码时直接抄）

```js
// structuredClone (Chrome 98+) → 用 rfdc 库 或 JSON 浅克隆
import rfdc from 'rfdc'
const clone = rfdc()
const copy = clone(obj)
// 简单对象（无 Date/Map/Set/Function/RegExp）可以：
const copy = JSON.parse(JSON.stringify(obj))

// Object.hasOwn(o, k) (Chrome 93+) →
Object.prototype.hasOwnProperty.call(o, k)

// Array.prototype.at(-1) (Chrome 92+) →
arr[arr.length - 1]

// Array.findLast (Chrome 97+) →
function findLast(arr, fn) {
  for (let i = arr.length - 1; i >= 0; i--) if (fn(arr[i], i)) return arr[i]
}

// Array.flat / flatMap (Chrome 69+) →
function flat(arr, depth = 1) {
  return depth ? arr.reduce((a, b) => a.concat(Array.isArray(b) ? flat(b, depth - 1) : b), []) : arr.slice()
}

// Object.fromEntries (Chrome 73+) →
function fromEntries(entries) {
  const o = {}
  for (const [k, v] of entries) o[k] = v
  return o
}

// String.replaceAll (Chrome 85+) →
str.split(search).join(replace)
// 或正则：str.replace(new RegExp(escape(search), 'g'), replace)

// AbortSignal.timeout(ms) (Chrome 103+) →
function timeoutSignal(ms) {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(new DOMException('TimeoutError', 'TimeoutError')), ms)
  return ctrl.signal
}

// Promise.allSettled (Chrome 76+) → core-js 已含；或手写
Promise.allSettled = Promise.allSettled || function (promises) {
  return Promise.all(promises.map(p =>
    Promise.resolve(p)
      .then(value => ({ status: 'fulfilled', value }))
      .catch(reason => ({ status: 'rejected', reason }))
  ))
}

// Promise.withResolvers (Chrome 119+) → 4 行手写
Promise.withResolvers = Promise.withResolvers || function () {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

// URL.canParse (Chrome 120+) →
function canParseUrl(s, base) {
  try { new URL(s, base); return true } catch { return false }
}
```

## 5. DOM API 缺失：ResizeObserver / AbortController（Chrome 53 必装）

- `ResizeObserver`（Chrome 64+）→ `resize-observer-polyfill` 包，约 4KB
- `AbortController`（Chrome 66+）→ `abort-controller` polyfill
- `IntersectionObserver`（Chrome 51+）→ Chrome 53 OK，不用 polyfill

写到 `vite.config.ts` 的 `additionalLegacyPolyfills` 列表里，全局自动注入。

## 6. WebView 引擎的真实 BUG（不是规范，是 OEM 实现）

- **Chrome 53 上 `<dialog>` 没实现**：必须用 popup div + JS 控制 `display`
- **Chrome 53 上 `getComputedStyle` 在 `display:none` 的父元素下取尺寸返回 0**：要测元素尺寸必须先显示
- **部分 OEM WebView 的 `Object.fromEntries` 返回 null**：双保险，用 polyfill 覆盖
- **某些海思 / 华为 HiWebView 上 `fetch` 大文件会卡死**：用 XHR
- **某些机顶盒 `console.log` 大对象会闪退**：日志前 stringify 并截断长度
- **某些机顶盒 `setTimeout(fn, 0)` 实际延迟 16ms 起步**：性能敏感场景用 `Promise.resolve().then()` 替代
- **某些机顶盒 `localStorage` 容量上限 < 1MB**：大数据用 IndexedDB（chrome53 可用）

## 7. JSON.stringify / parse 大对象

老盒子单次 stringify > 10MB 会卡 200-500ms 主线程。

**方案**：

- 数据切片，分次 stringify
- 大数据用 `requestIdleCallback`（chrome 47+）切到 idle 帧
- 走 IndexedDB 直接存对象，不必 stringify

## 8. `console.log` 的代价

老盒子上 `console.log` 即使没有 DevTools 连接，仍会序列化对象并占内存。

**方案**：

```js
// 生产打包剔除 console
// vite.config.ts
export default defineConfig({
  esbuild: {
    drop: ['console', 'debugger']  // 注意：只 drop 顶层调用，模板字符串里的不会
  }
})
```

或保留 `console.error` 上报到 Sentry。

## 9. 全局错误兜底

机顶盒 WebView 报错不像桌面那样有 Source Map，必须接全局监听上报：

```js
window.addEventListener('error', e => {
  report({ msg: e.message, src: e.filename, line: e.lineno, col: e.colno, stack: e.error && e.error.stack })
})
window.addEventListener('unhandledrejection', e => {
  report({ msg: 'unhandledrejection', reason: String(e.reason), stack: e.reason && e.reason.stack })
})
```

## 10. 模块化：`<script type="module">`（Chrome 61+）

机顶盒 chrome53 不支持 ESM module 标签，必须靠 `@vitejs/plugin-legacy` 产出 nomodule bundle 自动兜底。

确认产物里有 `<script nomodule src="..."></script>` 那一条；如缺失检查 `renderLegacyChunks: true` 是否打开。

## 11. WeakRef / FinalizationRegistry（Chrome 84+）

老盒子用不了。任何依赖弱引用做缓存的库（如某些状态管理库 / Apollo Cache 3.x）注意核对。

## 12. ES Module 动态 import + 路径

```js
const mod = await import(`./pages/${name}.vue`)
```

Chrome 63+ 才有 dynamic import，但更关键的是：**Vite legacy 会把 dynamic import 转成 Promise + script tag**，路径拼接动态变量要走 Vite 的 `import.meta.glob` 才能被静态分析：

```js
const pages = import.meta.glob('./pages/*.vue')
const mod = await pages[`./pages/${name}.vue`]()
```

## 13. Date.now / Performance.now 时间精度

老盒子 `Date.now()` 精度在 1ms，`performance.now()` 在 1ms（桌面 Chrome 精度 5μs）。性能测量不要小于 5ms 的差值就下结论。

## 14. 内存：图片解码

老盒子内存少（512MB-1GB），同屏 50 张高分辨率图片 + 浏览器图层缓存能直接吃 300MB。

**方案**：

- `<img loading="lazy">` Chrome 76+，老盒子用 IntersectionObserver 自实现
- 列表用虚拟滚动（vue-virtual-scroller、react-window 等都能跑在 chrome53，注意锁版本）
- 大图缩略图后端按机型尺寸切，不要前端 `transform: scale` 缩
- 移出视口的 `<img>` `src` 清空（或换 1×1 占位图）能释放解码缓存

## 案例引用

- `/Users/chances/sh_tour_ai/vite.config.ts:35-44` — 完整 Vite + legacy 配置
- `/Users/chances/WebstormProjects/fast-platform/fast-tv-web/vite.config.ts:11-14` — esbuild chrome66 单独 target 写法（**注意**：fast-tv-web 没加 legacy plugin，理论上 chrome66 上跑没问题，但要确保没库用到 chrome66 之后的 API）
- `/Users/chances/sh_tour_ai/src/composables/useFocusManager.ts:376-387` — `CustomEvent` 旧浏览器构造方式 fallback
