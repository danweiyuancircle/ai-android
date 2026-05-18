# 兼容性矩阵（特性 × Chrome 版本）

数据来源：MDN + caniuse + Chrome Platform Status。机顶盒最容易踩的几个版本：**Chrome 53（Android 5.1.1）/ 66（Android 7.0）/ 80（Android 9）/ 105（Container Queries 线）/ 111（Tailwind v4 线）/ 119（Promise.withResolvers 线）**。

## 总览图例
- ✓ = 原生支持
- ✗ = 不支持，必须 polyfill 或改写
- → = 需要构建工具降级（Babel / esbuild / SWC 处理）

## ES 语法

| 特性 | since Chrome | Chrome 53 | 66 | 70 | 80 | 90 | 100 |
|---|---|---|---|---|---|---|---|
| Optional chaining `?.` | 80 | → | → | → | ✓ | ✓ | ✓ |
| Nullish coalescing `??` | 80 | → | → | → | ✓ | ✓ | ✓ |
| Logical assignment `&&=` `??=` `\|\|=` | 85 | → | → | → | → | ✓ | ✓ |
| Numeric separator `1_000` | 75 | → | → | → | ✓ | ✓ | ✓ |
| Private class fields `#x` | 74 | → | → | → | ✓ | ✓ | ✓ |
| Class fields `x = 1` | 72 | → | → | → | ✓ | ✓ | ✓ |
| Async iteration `for await` | 63 | → | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dynamic import `import()` | 63 | → | ✓ | ✓ | ✓ | ✓ | ✓ |
| Top-level await | 89 | → | → | → | → | ✓ | ✓ |
| Async/await | 55 | ✗（需 legacy 编译） | ✓ | ✓ | ✓ | ✓ | ✓ |
| `globalThis` | 71 | → | → | ✓ | ✓ | ✓ | ✓ |
| BigInt `123n` | 67 | → | → | ✓ | ✓ | ✓ | ✓ |

> Vite legacy 插件会自动用 Babel 把上述全部降到 ES5 + core-js polyfill。esbuild 仅降语法，不补运行时 polyfill。

## ES 内置 API

| 特性 | since Chrome | Chrome 53 | 66 | 80 | 100 |
|---|---|---|---|---|---|
| `String.prototype.replaceAll` | 85 | ✗ | ✗ | ✗ | ✓ |
| `String.prototype.at` | 92 | ✗ | ✗ | ✗ | ✓ |
| `Array.prototype.at` | 92 | ✗ | ✗ | ✗ | ✓ |
| `Array.prototype.findLast` / `findLastIndex` | 97 | ✗ | ✗ | ✗ | ✓ |
| `Array.prototype.flat` / `flatMap` | 69 | ✗ | ✗ | ✓ | ✓ |
| `Array.prototype.includes` | 47 | ✓ | ✓ | ✓ | ✓ |
| `Object.fromEntries` | 73 | ✗ | ✗ | ✓ | ✓ |
| `Object.hasOwn` | 93 | ✗ | ✗ | ✗ | ✓ |
| `Object.values` / `Object.entries` | 54 | ✗ | ✓ | ✓ | ✓ |
| `Object.getOwnPropertyDescriptors` | 54 | ✗ | ✓ | ✓ | ✓ |
| `structuredClone` | 98 | ✗ | ✗ | ✗ | ✓ |
| `Promise.allSettled` | 76 | ✗ | ✗ | ✓ | ✓ |
| `Promise.any` | 85 | ✗ | ✗ | ✗ | ✓ |
| `Promise.withResolvers` | 119 | ✗ | ✗ | ✗ | ✗ |
| `BigInt` | 67 | ✗ | ✗ | ✓ | ✓ |
| `Intl.RelativeTimeFormat` | 71 | ✗ | ✗ | ✓ | ✓ |
| `Intl.ListFormat` | 72 | ✗ | ✗ | ✓ | ✓ |
| `Intl.Segmenter` | 87 | ✗ | ✗ | ✗ | ✓ |

> Promise.withResolvers (Chrome 119) 是 Vue 3.5 / React 19 / SWR 等的硬依赖，**几乎所有机顶盒项目都用不了**，必须锁这些库的旧版本。

## DOM / Web API

| 特性 | since Chrome | Chrome 53 | 66 | 80 | 100 |
|---|---|---|---|---|---|
| `AbortController` | 66 | ✗ | ✓ | ✓ | ✓ |
| `AbortSignal.timeout(ms)` | 103 | ✗ | ✗ | ✗ | ✗ |
| `AbortSignal.any(signals)` | 116 | ✗ | ✗ | ✗ | ✗ |
| `ResizeObserver` | 64 | ✗ | ✓ | ✓ | ✓ |
| `IntersectionObserver` | 51 | ✓ | ✓ | ✓ | ✓ |
| `IntersectionObserver v2` (trackVisibility) | 74 | ✗ | ✗ | ✓ | ✓ |
| `requestIdleCallback` | 47 | ✓ | ✓ | ✓ | ✓ |
| `requestAnimationFrame` | 24 | ✓ | ✓ | ✓ | ✓ |
| `Element.toggleAttribute` | 69 | ✗ | ✗ | ✓ | ✓ |
| `Element.scrollIntoView({behavior:'smooth'})` | 61 | ✗ | ✓ | ✓ | ✓ |
| `Element.matches` | 33 | ✓ | ✓ | ✓ | ✓ |
| `Element.closest` | 41 | ✓ | ✓ | ✓ | ✓ |
| `URL` 构造函数 | 32 | ✓ | ✓ | ✓ | ✓ |
| `URL.canParse` | 120 | ✗ | ✗ | ✗ | ✗ |
| `URLSearchParams` | 49 | ✓ | ✓ | ✓ | ✓ |
| `CustomEvent` 构造函数 | 15 | ✓ | ✓ | ✓ | ✓ |
| `MutationObserver` | 26 | ✓ | ✓ | ✓ | ✓ |
| `WeakRef` | 84 | ✗ | ✗ | ✓ | ✓ |
| `FinalizationRegistry` | 84 | ✗ | ✗ | ✓ | ✓ |
| `Web Animations API` | 84（完整） | 部分 | 部分 | ✓ | ✓ |

## Fetch / 网络

| 特性 | since Chrome | Chrome 53 | 66 | 80 | 100 |
|---|---|---|---|---|---|
| `fetch` 基础 | 42 | ✓ | ✓ | ✓ | ✓ |
| `fetch` `ReadableStream` 响应体 | 43 | ✓（但 OEM WebView 偶 buffer） | ✓ | ✓ | ✓ |
| `TextDecoder` | 38 | ✓ | ✓ | ✓ | ✓ |
| `TextDecoderStream` | 71 | ✗ | ✗ | ✓ | ✓ |
| `fetch` keepalive | 66 | ✗ | ✓ | ✓ | ✓ |
| `fetch` streaming upload | 105 | ✗ | ✗ | ✗ | ✗ |
| `fetch` 自定义 `signal` | 66 | ✗ | ✓ | ✓ | ✓ |
| `Headers.entries()` | 60 | ✗ | ✓ | ✓ | ✓ |
| `Response.json()` | 42 | ✓ | ✓ | ✓ | ✓ |
| `Request.duplex: 'half'` (uploads streaming) | 105 | ✗ | ✗ | ✗ | ✗ |
| `EventSource` | 6 | ✓（不支持 POST / 自定义 header） | ✓ | ✓ | ✓ |
| `XMLHttpRequest` + `onprogress` | 远古 | ✓ | ✓ | ✓ | ✓ |
| `WebSocket` | 16 | ✓ | ✓ | ✓ | ✓ |
| `navigator.sendBeacon` | 39 | ✓ | ✓ | ✓ | ✓ |

## CSS 布局

| 特性 | since Chrome | Chrome 53 | 66 | 80 | 100 |
|---|---|---|---|---|---|
| Flexbox | 29 | ✓ | ✓ | ✓ | ✓ |
| Flex `gap` | 84 | ✗ | ✗ | ✗ | ✓ |
| CSS Grid | 57 | ✗ | ✓ | ✓ | ✓ |
| Grid `subgrid` | 117 | ✗ | ✗ | ✗ | ✗ |
| Grid `gap`（block 兼容） | 66 | ✗ | ✓ | ✓ | ✓ |
| `aspect-ratio` | 88 | ✗ | ✗ | ✗ | ✗ |
| `container-type` / `@container` | 105 | ✗ | ✗ | ✗ | ✗ |
| `inset` 简写 | 87 | ✗ | ✗ | ✗ | ✓ |
| Logical properties (`margin-inline`, `padding-block`) | 87 | ✗ | ✗ | ✗ | ✓ |
| `gap` for multi-column | 66 | ✗ | ✓ | ✓ | ✓ |

## CSS 选择器

| 特性 | since Chrome | Chrome 53 | 66 | 80 | 100 |
|---|---|---|---|---|---|
| `:is()` | 88 | ✗ | ✗ | ✗ | ✗ |
| `:where()` | 88 | ✗ | ✗ | ✗ | ✗ |
| `:has(...)` | 105 | ✗ | ✗ | ✗ | ✗ |
| `:not(complex selector)` | 88 | ✗ | ✗ | ✗ | ✗ |
| `:focus-visible` | 86 | ✗ | ✗ | ✗ | ✓ |
| `:focus-within` | 60 | ✗ | ✓ | ✓ | ✓ |
| Attribute selector `[i]`（不区分大小写） | 49 | ✓ | ✓ | ✓ | ✓ |

## CSS 单位 / 函数 / 其他

| 特性 | since Chrome | Chrome 53 | 66 | 80 | 100 |
|---|---|---|---|---|---|
| CSS 变量 `var()` | 49 | ✓ | ✓ | ✓ | ✓ |
| `calc()` | 26 | ✓ | ✓ | ✓ | ✓ |
| `min()` / `max()` / `clamp()` | 79 | ✗ | ✗ | ✓ | ✓ |
| `env(safe-area-inset-*)` | 69 | ✗ | ✗ | ✓ | ✓ |
| `color-mix()` | 111 | ✗ | ✗ | ✗ | ✗ |
| `accent-color` | 93 | ✗ | ✗ | ✗ | ✓ |
| `@property` | 85 | ✗ | ✗ | ✓ | ✓ |
| `@layer` Cascade Layers | 99 | ✗ | ✗ | ✗ | ✗ |
| `@supports` | 28 | ✓ | ✓ | ✓ | ✓ |
| `scroll-behavior: smooth` | 61 | ✗ | ✓ | ✓ | ✓ |
| `dvh` / `svh` / `lvh` 视口单位 | 108 | ✗ | ✗ | ✗ | ✗ |
| Conic gradient | 69 | ✗ | ✗ | ✓ | ✓ |
| `backdrop-filter` | 76 | ✗ | ✗ | ✓ | ✓ |
| Custom properties registered with `@property` | 85 | ✗ | ✗ | ✓ | ✓ |

## 两个真实工程的覆盖情况

| 维度 | sh_tour_ai (chrome53) | fast-platform / fast-tv-web (chrome66) |
|---|---|---|
| 构建出口 | 全部走 Vite legacy 降级 | esbuild target=chrome66，无 legacy 兜底 |
| 高风险特性使用 | 极保守，全避开 | 可用 ResizeObserver / AbortController / Grid / scroll-behavior |
| Tailwind | 未用 | fast-admin-web 用 Tailwind v4（**不能搬到 TV 端**） |
| SSE | XHR + onprogress | 暂无 SSE |

## 真机自测：粘到目标盒子的 WebView console

只检测 API / CSS 特性（语法支持与否不在这里检测——能跑这段脚本说明基础语法已支持，否则脚本压根无法加载）。

```js
var features = {
  'structuredClone': function () { return typeof structuredClone === 'function'; },
  'Object.hasOwn': function () { return typeof Object.hasOwn === 'function'; },
  'Object.fromEntries': function () { return typeof Object.fromEntries === 'function'; },
  'Array.at': function () { return typeof Array.prototype.at === 'function'; },
  'Array.findLast': function () { return typeof Array.prototype.findLast === 'function'; },
  'String.replaceAll': function () { return typeof String.prototype.replaceAll === 'function'; },
  'Promise.allSettled': function () { return typeof Promise.allSettled === 'function'; },
  'Promise.any': function () { return typeof Promise.any === 'function'; },
  'Promise.withResolvers': function () { return typeof Promise.withResolvers === 'function'; },
  'AbortController': function () { return typeof AbortController === 'function'; },
  'AbortSignal.timeout': function () { return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'; },
  'ResizeObserver': function () { return typeof ResizeObserver === 'function'; },
  'IntersectionObserver': function () { return typeof IntersectionObserver === 'function'; },
  'requestIdleCallback': function () { return typeof requestIdleCallback === 'function'; },
  'ReadableStream': function () { return typeof ReadableStream === 'function'; },
  'TextDecoder': function () { return typeof TextDecoder === 'function'; },
  'TextDecoderStream': function () { return typeof TextDecoderStream === 'function'; },
  'EventSource': function () { return typeof EventSource === 'function'; },
  'CSS aspect-ratio': function () { return CSS.supports('aspect-ratio: 1'); },
  'CSS flex gap': function () {
    var el = document.createElement('div');
    el.style.display = 'flex';
    el.style.gap = '1px';
    return el.style.gap === '1px';
  },
  'CSS :is()': function () { try { document.querySelector(':is(div)'); return true; } catch (e) { return false; } },
  'CSS :has()': function () { try { document.querySelector(':has(div)'); return true; } catch (e) { return false; } },
  'CSS container queries': function () { return CSS.supports('container-type: inline-size'); },
  'CSS color-mix': function () { return CSS.supports('color: color-mix(in srgb, red, blue)'); },
  'CSS @layer': function () { return CSS.supports('@layer x { }'); },
  'CSS dvh': function () { return CSS.supports('height: 1dvh'); },
  'CSS color() function': function () { return CSS.supports('color: color(display-p3 1 0 0)'); }
};
var result = {};
for (var k in features) { try { result[k] = !!features[k](); } catch (e) { result[k] = false; } }
console.log(JSON.stringify(result, null, 2));
console.log('UA:', navigator.userAgent);
```
