# Android 5.0 / Chromium 53 H5 兼容约束

适用：Android ≥ 5.0/5.1，WebView 升级到 Chromium 53；固定分辨率（如 1280×720）。

## JS

- 禁 `Object.entries(o)` → `Object.keys(o).map(k => [k, o[k]])`
- 必装 `@vitejs/plugin-legacy`，`targets: ["chrome >= 53"]`

## CSS

- 禁 `gap`（flex/grid）→ `margin`
- 禁小数 `line-height`（如 `1.5`）→ 一律 px
- 禁 `@media` queries → 固定分辨率写死 px
- 文本截断 `:lines="1/2/4"` 需配 `max-height` + `overflow: hidden`

## SSE

- **唯一方案**：XHR + `onprogress` 手解析
- 禁 `EventSource`（不支持 POST / 自定义 Header）
- 禁 `fetch + ReadableStream`（OEM WebView 有 buffering bug）
- 禁 `@microsoft/fetch-event-source`（依赖 Chrome 64+ API）
- Nginx：`proxy_buffering off` + `proxy_cache off` + `chunked_transfer_encoding on`
- 响应头：`Content-Type: text/event-stream; charset=utf-8` / `Cache-Control: no-cache, no-transform` / `X-Accel-Buffering: no`
- 心跳：服务端每 15-25s 推 `:heartbeat\n\n`；客户端 35s watchdog 主动 `xhr.abort()` 重连
- 重连：指数退避 1s → 1.5× → 上限 30s；带 `Last-Event-Id` Header
- 背景态：监听 `visibilitychange` / `pageshow` / `ott-resume` 触发重连
- HTTP/2 首帧空白 30s：SSE 接口单独子域名强 HTTP/1.1，或首行 `:ok\n\n` 强 flush
- 不要换 WebSocket（OTT 基座防火墙常拦 WS upgrade）

## 其他

- 代码输出不含 Unicode emoji
