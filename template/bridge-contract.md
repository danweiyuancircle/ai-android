# ottService JSBridge 契约

Android 壳 ↔ H5 的唯一接口定义。`android-shell` 与任意 H5（`h5-vue` / `h5-react`）都以本文件为准实现，两边互为镜像。

- 句柄：H5 侧通过 `window.ottService`（对象）调原生；原生通过 `window.<回调名>`（全局函数）通知 H5。
- 注入时机：壳在 WebView `onPageStarted/onPageFinished` 时注入 `window.ottService`（Android 用 `@JavascriptInterface` + `addJavascriptInterface(obj, "ottService")`）。
- 容错：H5 侧每个调用前判断 `window.ottService` 与方法是否存在，不存在只打日志不抛错（非 Android 环境也能跑）。

来源：抽取自 `/Users/chances/sh_tour_ai/src/bridge/ottservice.ts`。

---

## 一、H5 → 原生：`window.ottService` 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `canGoBack` | `() => boolean` | WebView 能否后退 |
| `reloadIndex` | `() => void` | 重新加载入口页（首页） |
| `reload` | `() => void` | 重新加载当前页 |
| `showToast` | `(message: string) => void` | 弹 Toast |
| `exitApp` | `(text?: string) => void` | 退出应用；`text` 为退出时回传系统语音的文本（可选） |
| `sendBroadcast` | `(json: string) => void` | 发系统广播；H5 传入 `JSON.stringify(IntentData)` |
| `hideLoading` | `() => void` | 隐藏加载动画 |
| `releaseVoice` | `() => void` | 释放语音资源 |
| `playTts` | `(text: string) => void` | 播放 TTS |
| `stopTts` | `() => void` | 停止 TTS |
| `isTtsPlaying` | `() => boolean` | 是否正在播 TTS |

> 注意：`@JavascriptInterface` 方法的参数/返回值只能是基本类型与 `String`，故 `sendBroadcast` 走 JSON 字符串而非对象。`canGoBack` / `isTtsPlaying` 返回 `boolean`。

### IntentData 结构（`sendBroadcast` 的 payload）

```ts
interface IntentData {
  action?: string;                    // 广播 action
  packageName: string;                // 目标包名
  className?: string;                 // 目标类名（可选）
  extras?: Record<string, string>;    // 额外数据，仅字符串值
}
```

`exitApp(text)` 的默认行为（参考实现）：先 `releaseVoice()`，再 `sendBroadcast` 一条语音回调广播，延迟 100ms 调原生 `exitApp()`。其中 `action` / `packageName` / `extras.source` 为**项目专属**（沪小游用 coocaa/skyworth 语音协议 + `source=cn.net.ocn.ai.tour`），脚手架里改成占位，由具体项目按对接的语音/系统协议填。

---

## 二、原生 → H5：`window.<回调>` 全局函数

壳在对应事件发生时，于 WebView 主线程执行 `webView.evaluateJavascript("window.xxx(...)", null)` 调用：

### 语音识别 / TTS

| 回调 | 签名 | 触发时机 |
| --- | --- | --- |
| `onBeginSpeech` | `() => void` | 开始语音识别 |
| `onEndSpeech` | `() => void` | 结束语音识别 |
| `onDynamicResult` | `(result: string) => void` | 实时识别中间结果 |
| `onFinalResult` | `(result: string) => void` | 最终识别结果 |
| `onVoiceError` | `(error: string) => void` | 识别错误 |
| `onTtsStart` | `(id: string) => void` | TTS 开始播放 |
| `onTtsDone` | `(id: string) => void` | TTS 播放完成 |

H5 侧用 `setVoiceCallbacks(callbacks)` / `clearVoiceCallbacks()` 注册业务回调，全局函数仅做转发。

### 遥控器按键透传

| 回调 | 签名 |
| --- | --- |
| `onNativeKeyDown` | `(keyCode: number, keyCodeString?: string) => void` |

H5 收到后归一化为标准 key，再派发自定义事件 `ott:native-keydown`（`detail = { keyCode, keyCodeString, key }`），供焦点系统消费。

**按键归一化映射**（优先按 `keyCodeString`，回退按 `keyCode`）：

| 归一化 key | keyCodeString | keyCode |
| --- | --- | --- |
| `Back` | `KEYCODE_BACK` | `4` |
| `ArrowUp` | `KEYCODE_DPAD_UP` | `19` |
| `ArrowDown` | `KEYCODE_DPAD_DOWN` | `20` |
| `ArrowLeft` | `KEYCODE_DPAD_LEFT` | `21` |
| `ArrowRight` | `KEYCODE_DPAD_RIGHT` | `22` |
| `Enter` | `KEYCODE_DPAD_CENTER` / `KEYCODE_ENTER` / `KEYCODE_NUMPAD_ENTER` | `23` / `66` / `160` |

**Chromium 53 降级**：派发事件时优先 `new CustomEvent(...)`；不可用时降级 `document.createEvent("CustomEvent")` + `initCustomEvent(...)`。

### 第三方拉起 AIChat（可选业务回调）

| 回调 | 签名 | 说明 |
| --- | --- | --- |
| `onNavigateToAIChat` | `(query: string) => void` | 第三方应用拉起时传入 query，H5 路由跳转到 AI 对话页 |

H5 侧用 `setNavigateToAIChatCallback(cb)` / `clearNavigateToAIChatCallback()` 注册。此为业务可选项，无 AI 对话页时可不实现。

---

## 三、实现对照清单（壳 ↔ H5 互验）

落地后逐项核对：

- [ ] 壳 `addJavascriptInterface(obj, "ottService")`，`obj` 用 `@JavascriptInterface` 标注全部「H5→原生」方法，方法名/参数与上表一致。
- [ ] 壳在按键、语音、TTS 事件处用 `evaluateJavascript` 调对应 `window.<回调>`，回调名/参数与上表一致。
- [ ] H5 `ottservice.ts` 暴露 `ottService` 对象方法与上表一致，并注册全部 `window.<回调>` 全局函数。
- [ ] 按键映射表两端一致（壳传原始 `keyCode`+`keyCodeString`，H5 负责归一化）。
- [ ] `sendBroadcast` 两端约定 JSON 字符串；`exitApp` 的广播协议按项目占位填写。
