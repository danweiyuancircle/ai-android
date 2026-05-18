# SSE 避坑详谈

机顶盒做 AI 流式输出 / 实时通知 / 日志推送等场景。

## 1. 三方案对比

| 方案 | 最低 Chrome | 自定义 Header | POST | 中断 | 自动重连 | Last-Event-ID | 包大小 | 适合 |
|---|---|---|---|---|---|---|---|---|
| 原生 `EventSource` | 6 | ✗ | ✗ | ✗ | ✓ | ✓ | 0 | 公开 GET 接口，无 Auth |
| `fetch` + `ReadableStream` | 43（TextDecoderStream 71+） | ✓ | ✓ | ✓ | 自写 | 自写 | 0 | Chrome 66+ 且实测 fetch streaming 无 buffering |
| `@microsoft/fetch-event-source` | 64 | ✓ | ✓ | ✓ | ✓ | ✓ | ~10KB | Chrome 80+ 现代项目 |
| **XHR + `onprogress`** | **任意** | ✓ | ✓ | ✓ | 自写 | 自写 | 0 | **机顶盒首选**，全档位最稳 |

## 2. 决策树

```
你的 Chrome 下限是？
├── < Chrome 66 (Android 5.1.1 / 6.0) → 只能 XHR + onprogress
├── Chrome 66 ~ 79 (Android 7.0 / 8.0) → 推荐 XHR；fetch streaming 仅当目标基座实测无 buffering bug 时可用
└── Chrome 80+ (Android 9+) → @microsoft/fetch-event-source 或 fetch streaming
```

需要 POST 或自定义 Header（如 `Authorization: Bearer xxx`）的，**原生 EventSource 直接出局**。

## 3. XHR + onprogress 完整实现（参考 sh_tour_ai）

参考 `/Users/chances/sh_tour_ai/src/api/aiChatApi.ts:53-149` 的完整可用版。简化骨架：

```ts
interface SSEHandlers {
  onEvent?: (event: string, data: string) => void
  onMessage?: (data: string) => void
  onError?: (err: Error) => void
  onComplete?: () => void
}

export function createSSEStream(url: string, body: any, headers: Record<string, string>, h: SSEHandlers) {
  const xhr = new XMLHttpRequest()
  xhr.open('POST', url, true)
  Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))
  xhr.setRequestHeader('Content-Type', 'application/json')
  xhr.setRequestHeader('Accept', 'text/event-stream')

  let processedLen = 0
  let buffer = ''

  xhr.onprogress = () => {
    const chunk = xhr.responseText.slice(processedLen)
    processedLen = xhr.responseText.length
    buffer += chunk

    // 按 \n\n 分事件
    let idx
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      parseEvent(raw, h)
    }
  }

  xhr.onload = () => {
    if (buffer) parseEvent(buffer, h)  // 收尾
    h.onComplete?.()
  }
  xhr.onerror = () => h.onError?.(new Error('Network error'))
  xhr.ontimeout = () => h.onError?.(new Error('Timeout'))

  xhr.send(JSON.stringify(body))

  return {
    abort: () => xhr.abort()
  }
}

function parseEvent(raw: string, h: SSEHandlers) {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of raw.split('\n')) {
    if (line.startsWith(':')) continue                    // 注释 / 心跳
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
  }
  if (!dataLines.length) return
  const data = dataLines.join('\n')
  h.onEvent?.(event, data)
  if (event === 'message') h.onMessage?.(data)
}
```

**注意**：

1. `xhr.responseText` 在某些 OEM WebView 上每次 `onprogress` 会**重新返回完整字符串**，所以用 `slice(processedLen)` 提取增量
2. `xhr.responseType` **不要**设为 `'text'` 之外的值（如 `'stream'` 不存在；`'json'` 会等完整响应）
3. `setRequestHeader('Accept', 'text/event-stream')` 让服务端能识别这是 SSE 请求

## 4. fetch + ReadableStream 实现（Chrome 66+）

```ts
async function fetchSSE(url: string, body: any, headers: Record<string, string>, h: SSEHandlers) {
  const ctrl = new AbortController()  // Chrome 66+
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream', ...headers },
    body: JSON.stringify(body),
    signal: ctrl.signal
  })
  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')  // 不用 TextDecoderStream（chrome71+）
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      parseEvent(raw, h)
    }
  }
  h.onComplete?.()
  return { abort: () => ctrl.abort() }
}
```

**踩坑**：

- 某些 OEM WebView 的 fetch 实现会**buffer 整个响应**而不是流式吐出（特别是 HTTP/2 + 小 chunk + Content-Encoding gzip 同时存在时），调试时一定要在**目标真机**上验证是否真流式
- `reader.read()` 在长时间无数据时不会 timeout，要自己加心跳超时

## 5. 服务端配置（Nginx）

**Nginx 默认 `proxy_buffering on`，是 SSE 杀手**：

```nginx
location /api/stream {
    proxy_pass http://upstream;
    proxy_http_version 1.1;
    proxy_buffering off;            # 关 buffer
    proxy_cache off;                # 关 cache
    proxy_set_header Connection '';
    chunked_transfer_encoding on;
    proxy_read_timeout 3600s;       # 长连接超时拉长
    proxy_send_timeout 3600s;
    # 双保险：让所有上游（含 CDN）都不要 buffer
    add_header X-Accel-Buffering no;
}
```

**APISIX / Kong**：

- APISIX 默认 buffering，要在 route 上加 `enable_websocket: false` + 用 `proxy-buffering` 插件关闭
- Kong 加 `proxy_buffering: off` 在 service 配置

**Spring Cloud Gateway / Java**：

- 用 `ServerSentEvent<T>` 或 `Flux<ServerSentEvent<T>>` 返回
- 关 response compression（`server.compression.enabled=false`），gzip 会 buffer 整个响应

## 6. 响应头要求

服务端必须：

```
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

`no-transform` 防中间 CDN 自动 gzip。

## 7. HTTP/2 与 SSE

**症状**：某些老 OTT 盒子（Chrome 53 / 66）连 HTTP/2 的 SSE，第一帧前 30 秒空白后才到。

**根因**：盒子 WebView 的 HTTP/2 帧聚合策略 bug。

**方案**：

- 服务端给 SSE 接口单独的子域名，关 HTTP/2 强制 HTTP/1.1
- 或在 SSE 流第一行立刻发心跳 `:ok\n\n`，强行触发首帧 flush

## 8. SSE 消息格式（标准）

```
event: chat_message
id: 12345
retry: 5000
data: {"content":"hello"}
data: {"content":"world"}

event: done
data: [DONE]

```

注意：

- 每个事件块以**两个 `\n`** 结束（`\n\n`）
- `data:` 可多行，自动拼接为 `data1\ndata2`
- `:` 开头的行是注释（心跳常用 `:heartbeat\n\n`）
- `id:` 用于 Last-Event-ID 续传

## 9. 心跳设计

**必装**。中间链路（运营商 / 代理 / CDN）通常 30-60 秒无数据就关连接。

**服务端**：每 15-25 秒推一次 `:heartbeat\n\n`（注释行，客户端解析时跳过）

**客户端**：

```ts
let lastDataAt = Date.now()
xhr.onprogress = () => {
  lastDataAt = Date.now()
  /* 解析逻辑... */
}
const watchdog = setInterval(() => {
  if (Date.now() - lastDataAt > 35_000) {
    xhr.abort()
    clearInterval(watchdog)
    reconnect()  // 主动重连
  }
}, 5_000)
```

## 10. 断线重连

`EventSource` 自带，其他方案要手写：

```ts
async function reconnectWithBackoff(connectFn: () => Promise<void>) {
  let delay = 1000
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await connectFn()
      return
    } catch (e) {
      await new Promise(r => setTimeout(r, delay))
      delay = Math.min(delay * 1.5, 30_000)
    }
  }
  throw new Error('SSE reconnect exhausted')
}
```

支持 Last-Event-ID 续传：客户端记录最后一个事件的 `id:`，重连请求带 header `Last-Event-Id: <id>`。

## 11. 背景态行为（机顶盒特有）

机顶盒 App 常被 Home 键挂起。挂起后：

- WebView JS 时钟暂停
- 已建立的 SSE 连接**不一定立刻断**，但下游数据停止派发
- 切回前台可能：(a) 连接已被系统回收 (b) 数据队列已积压

**方案**：

```ts
function bindResumeHandlers() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkAndReconnect()
  })
  window.addEventListener('pageshow', () => checkAndReconnect())
  // 部分 OTT 基座会派自定义事件
  window.addEventListener('ott-resume', () => checkAndReconnect())
}

function checkAndReconnect() {
  if (Date.now() - lastDataAt > 10_000) reconnect()
}
```

## 12. 不要试图用 WebSocket 替代

机顶盒上 WebSocket（Chrome 16+ 全部支持）看起来更现代，但：

- 多数 OTT 基座防火墙允许 HTTP/HTTPS，对 WS upgrade 经常拦截
- SSE 走纯 HTTP，被 nginx / CDN / 反代天然支持
- SSE 单向天然契合 LLM 流式输出场景

除非你需要双向，否则不要换 WS。

## 13. 服务端 Content-Type 检查

很多框架默认 `Content-Type: application/json`，自动设错。务必在响应里**显式覆盖**：

- Spring Boot: `produces = MediaType.TEXT_EVENT_STREAM_VALUE`
- FastAPI: `EventSourceResponse`（`sse-starlette`）
- Express: `res.setHeader('Content-Type', 'text/event-stream')`
- Gin: `c.Header("Content-Type", "text/event-stream")`

## 14. 调试方法

桌面 Chrome：DevTools → Network → 选请求 → EventStream tab（自动解析事件）

机顶盒：

- adb logcat 看 WebView 日志
- 真机 USB 调试（开发者模式 + adb forward + chrome://inspect）
- 不能调试的盒子：埋点上报到自建后台

## 案例引用

- `/Users/chances/sh_tour_ai/src/api/aiChatApi.ts:53-149` — 完整 XHR + onprogress 实现（chrome53 友好）
- `/Users/chances/sh_tour_ai/src/api/aiChatApi.ts:20-49` — `event:` + `data:` 解析（含多行 data 合并）
