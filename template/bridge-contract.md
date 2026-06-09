# ottService JSBridge 契约

Android 壳 ↔ H5 的唯一接口定义。`android-shell` 与任意 H5（`h5-vue` / `h5-react`）都以本文件为准实现，两边互为镜像。

- 句柄：H5 侧通过 `window.ottService` / `window.voiceService` / `window.playerService`（三个对象）调原生；原生通过 `window.<回调名>`（全局函数）通知 H5。语音 / TTS 内聚在 `voiceService`，播放器内聚在 `playerService`，其余壳通用能力在 `ottService`。
- 注入时机：壳在 WebView `onPageStarted/onPageFinished` 时注入这些对象（Android 用 `@JavascriptInterface` + `addJavascriptInterface(obj, "ottService")` / `addJavascriptInterface(voiceObj, "voiceService")` / `addJavascriptInterface(playerObj, "playerService")`）。
- 容错：H5 侧每个调用前判断对应句柄与方法是否存在，不存在只打日志不抛错（非 Android 环境也能跑）。

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
| `getBaseInfo` | `() => BaseInfo \| null` | 获取设备/应用基础信息；原生返回 `BaseInfo` 的 JSON 字符串，H5 侧 `JSON.parse` 为对象 |

> 注意：`@JavascriptInterface` 方法的参数/返回值只能是基本类型与 `String`，故 `sendBroadcast` / `getBaseInfo` 走 JSON 字符串而非对象。`canGoBack` 返回 `boolean`。

### BaseInfo 结构（`getBaseInfo` 的返回，原生回传 JSON 字符串）

```ts
interface BaseInfo {
  mac: string;            // 设备 MAC（机顶盒主网口，取不到为空串）
  ip: string;             // 设备 IP（机顶盒主网口，取不到为空串）
  versionName: string;    // 应用版本名，如 1.0.0
  versionCode: number;    // 应用版本号
  packageName: string;    // 应用包名
  deviceModel: string;    // 设备型号（SDK getDeviceType，空则回退 Build.MODEL）
  vendor: string;         // 设备厂商（SDK getVendor，空则回退 Build.MANUFACTURER）
  androidVersion: string; // Android 系统版本号，如 9
  androidSdkInt: number;  // Android API 级别，如 28
}
```

> 壳侧字段值取自 chances-sdk `DeviceUtils` / `AppUtils` 与 `android.os.Build`，取空的字段回传空串，不抛异常。

---

## 一·二、H5 → 原生：`window.voiceService` 方法（语音 / TTS）

语音 / TTS 内聚在独立句柄 `window.voiceService`（壳侧由 `VoiceBridge` 自带 `@JavascriptInterface` 单独注入），与 `ottService` 解耦。

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `releaseVoice` | `() => void` | 释放语音资源 |
| `playTts` | `(text: string) => void` | 播放 TTS |
| `stopTts` | `() => void` | 停止 TTS |
| `isTtsPlaying` | `() => boolean` | 是否正在播 TTS |

> `isTtsPlaying` 返回 `boolean`。原生 → H5 的语音 / TTS 回调（`onBeginSpeech` 等）见下文第二节，同由 `VoiceBridge` 转发。

## 一·三、H5 → 原生：`window.playerService` 方法（播放器）

播放器内聚在独立句柄 `window.playerService`（壳侧由 `PlayerBridge` 自带 `@JavascriptInterface` 单独注入），与 `ottService` / `voiceService` 解耦。

**背播 / 层级**：壳把播放器容器放在 WebView 之下，并将 WebView 背景设为透明，视频在 WebView 之下透出。H5 页面自身背景也须透明，视频才可见。

**多实例**：播放器是**多例**的，可同时存在多个播放器。`create` / `setup` 同步返回一个 `playerId`，后续所有方法（除 `releaseAll`）首参均为 `playerId`，回调首参也是 `playerId`，H5 据此区分实例。壳侧由 `PlayerManager` 维护 `playerId -> PlayerInstance`（每个实例一个 `UniversalVideoView`）。

> `create` 实际建 View 在原生主线程异步完成，但 `playerId` 立即同步返回；后续对该 id 的 mutating 调用会排在 create 之后执行（主线程 FIFO）。

**多引擎**：每个实例运行时按 `playerType` 选择引擎（与语音"一个项目只用一个实现"不同）。壳侧由 `PlayerEngineRegistry` 注册 `type -> PlayerFactory` 类，默认注册 `ijk`（ijkplayer）与 `native`（系统 MediaPlayer），可扩展；引擎切换基于 `UniversalVideoView.setPlayerType`。传入未注册的 type 回退默认引擎（`ijk`）。

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `create` | `(playerType: string) => string` | 创建实例并选引擎（`"ijk"` / `"native"` / 自定义），返回 `playerId` |
| `setup` | `(options: PlayerSetupOptions) => string` | 便捷起播：一次性创建实例并起播，返回 `playerId` |
| `setDataSource` | `(playerId: string, url: string) => void` | 设置播放地址 |
| `start` | `(playerId: string) => void` | 开始 / 恢复播放 |
| `pause` | `(playerId: string) => void` | 暂停 |
| `stop` | `(playerId: string) => void` | 停止 |
| `release` | `(playerId: string) => void` | 释放指定实例 |
| `releaseAll` | `() => void` | 释放全部实例 |
| `seekTo` | `(playerId: string, position: number) => void` | seek 到指定位置（毫秒） |
| `setMute` | `(playerId: string, mute: boolean) => void` | 静音开关 |
| `setSpeed` | `(playerId: string, speed: number) => void` | 倍速播放 |
| `setAspectRatio` | `(playerId: string, ratio: number) => void` | 纵横比：`1` 铺满 / `2` 原比例 / `3` 16:9 / `4` 4:3 |
| `setZOrderOnTop` | `(playerId: string, onTop: boolean) => void` | SurfaceView 是否置顶（背播默认 `false`） |
| `setZOrderMediaOverlay` | `(playerId: string, overlay: boolean) => void` | SurfaceView 是否作为媒体覆盖层 |
| `isPlaying` | `(playerId: string) => boolean` | 是否正在播放 |
| `isMute` | `(playerId: string) => boolean` | 是否静音 |
| `getDuration` | `(playerId: string) => number` | 总时长（毫秒） |
| `getCurrentPosition` | `(playerId: string) => number` | 当前播放位置（毫秒） |

> `create` / `setup` 返回 `playerId` 字符串。`setup` 的 `options` 在 H5 侧 `JSON.stringify` 后传给原生 `setup(json: string)`（`@JavascriptInterface` 仅支持基本类型与 `String`）。`isPlaying` / `isMute` 返回 `boolean`，`getDuration` / `getCurrentPosition` 返回 `number`；查询类方法对未知 / 尚未创建完成的 `playerId` 返回 `false` / `0`。原生 → H5 的播放器回调（`onPlayerPrepared` 等）见下文第二节，同由 `PlayerBridge` 转发。

### PlayerSetupOptions 结构（`setup` 的 payload，字段均可选）

```ts
interface PlayerSetupOptions {
  playerType?: string;  // 引擎类型，默认 "ijk"
  url?: string;         // 播放地址
  mute?: boolean;       // 是否静音
  aspectRatio?: number; // 纵横比：1 铺满 / 2 原比例 / 3 16:9 / 4 4:3
  speed?: number;       // 倍速
  autoPlay?: boolean;   // 设置数据源后是否自动起播，默认 true
}
```

---

### IntentData 结构（`sendBroadcast` 的 payload）

```ts
interface IntentData {
  action?: string;                    // 广播 action
  packageName: string;                // 目标包名
  className?: string;                 // 目标类名（可选）
  extras?: Record<string, string>;    // 额外数据，仅字符串值
}
```

`exitApp(text)` 的默认行为（参考实现）：先 `voiceService.releaseVoice()`（语音已拆到独立句柄），再 `sendBroadcast` 一条语音回调广播，延迟 100ms 调原生 `ottService.exitApp()`。其中 `action` / `packageName` / `extras.source` 为**项目专属**（沪小游用 coocaa/skyworth 语音协议 + `source=cn.net.ocn.ai.tour`），脚手架里改成占位，由具体项目按对接的语音/系统协议填。

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

壳侧由 `VoiceBridge`（实现 `OnVoiceListener`，注入为 `voiceService` 的同一对象）转发；H5 侧用 `setVoiceCallbacks(callbacks)` / `clearVoiceCallbacks()` 注册业务回调，全局函数仅做转发。

### 播放器

回调首参均为 `playerId`，标识是哪个播放器实例。

| 回调 | 签名 | 触发时机 |
| --- | --- | --- |
| `onPlayerPrepared` | `(playerId: string) => void` | 播放器已准备完成（可播放） |
| `onPlayerCompletion` | `(playerId: string) => void` | 播放完成（播放到结尾） |
| `onPlayerError` | `(playerId: string, what: number, extra: string) => void` | 播放错误（底层引擎原始错误码） |
| `onPlayerInfo` | `(playerId: string, what: number, extra: string) => void` | 播放流信息（`1` 缓冲开始 / `2` 缓冲结束 / `3` 首帧渲染） |
| `onPlayerBufferingUpdate` | `(playerId: string, percent: number) => void` | 缓冲进度（0-100） |
| `onPlayerSeekComplete` | `(playerId: string) => void` | seek 完成 |
| `onPlayerStateChange` | `(playerId: string, state: number) => void` | 播放状态变化（`1` 播放中 / `2` 暂停） |

壳侧由 `PlayerBridge`（实现 `OnPlayerListener`，注入为 `playerService` 的同一对象）转发；H5 侧用 `setPlayerCallbacks(callbacks)` / `clearPlayerCallbacks()` 注册业务回调，全局函数仅做转发。

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

H5 侧由 `@shell/feature-aichat` 的 `registerAIChatDeepLink(navigate)` 注册（返回注销函数），跳转用同包 `navigateToAIChat(router, route, query)`。此为 AIChat 卡带业务，不属壳 core；无 AI 对话页时可不接入。

---

## 三、实现对照清单（壳 ↔ H5 互验）

落地后逐项核对：

- [ ] 壳 `addJavascriptInterface(obj, "ottService")` + `addJavascriptInterface(voiceObj, "voiceService")` + `addJavascriptInterface(playerObj, "playerService")`，各自用 `@JavascriptInterface` 标注对应「H5→原生」方法，方法名/参数与上表一致。
- [ ] 壳在按键、语音、TTS、播放器事件处用 `evaluateJavascript` 调对应 `window.<回调>`，回调名/参数与上表一致（语音回调由 `VoiceBridge` 转发，播放器回调由 `PlayerBridge` 转发）。
- [ ] H5 `ottservice.ts` / `voiceservice.ts` / `playerservice.ts` 暴露 `ottService` / `voiceService` / `playerService` 三个对象，方法与上表一致，并注册全部 `window.<回调>` 全局函数。
- [ ] 播放器：壳把 `player_container` 放在 WebView 之下，WebView 背景设透明；H5 页面背景透明；多实例由 `PlayerManager` 按 `playerId` 管理（`create`/`setup` 返回 id，其余方法传 id，回调首参 id）；多引擎按 `playerType` 经 `PlayerEngineRegistry` 创建（默认 `ijk` / `native`，可扩展）。
- [ ] 按键映射表两端一致（壳传原始 `keyCode`+`keyCodeString`，H5 负责归一化）。
- [ ] `sendBroadcast` 两端约定 JSON 字符串；`exitApp` 的广播协议按项目占位填写。
