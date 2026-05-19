# Android 9.0 / Chrome 66 H5 兼容约束

适用：Android ≥ 9.0，WebView 为出厂默认 Chrome 66 或后续小升级。

## JS

- Vite `esbuild.target: 'chrome66'`（**仅降语法，不补 polyfill**）
- 用 Chrome 66+ 才有的运行时 API（如 `structuredClone` Chrome 98+）需自行 polyfill

## CSS

构建工具**不处理** CSS 降级，人工避：

| 特性 | since Chrome | 替代 |
|---|---|---|
| `inset` | 87 | 写全 `top`/`right`/`bottom`/`left` |
| `gap`（Flexbox） | 84 | `margin` + `:last-child { margin: 0 }` |
| `aspect-ratio` | 88 | `padding-top` 百分比 hack |
| `overflow: clip` | 90 | `overflow: hidden` |
| `:is()` / `:where()` | 88 | 展开为完整选择器 |

## SSE

- **推荐**：XHR + `onprogress`（最稳，同 5.0 档）
- **次选**：`fetch + ReadableStream + AbortController`，但必须**目标真机实测**无 buffering（HTTP/2 + 小 chunk + gzip 易触发整响应 buffer）；`reader.read()` 无 timeout，需自加心跳
- 禁 `EventSource`（不支持 POST / 自定义 Header）
- Nginx / 响应头 / 心跳 / 重连 / 背景态 / HTTP/2 处理同 5.0 档：见 [android-webview-5.md](./android-webview-5.md#sse)
