# feature_voice/internet（:feature_voice:internet）

互联网语音实现模块，源自 voice-remote-sdk（`chances.android.voice.sdk.*`，源码移植入库），可整体热插拔。语音相关模块聚合在 `feature_voice/` 下：`core`=抽象稳定层，`shijiu`=视九实现，`internet`=本实现。

## 这个模块做什么

把 voice-remote-sdk 的「互联网语音」能力适配成 `feature_voice:core` 的 `VoiceController` 抽象：

```
手机客户端（录音）  ──PCM/WebSocket──►  盒子=本壳（WebSocket Server，默认 9527）
                                          → 云端 ASR 识别 → 结果回推
   显示识别结果     ◄──────────────────  → VoiceController → OnVoiceListener → H5
```

- 手机连上盒子发 audio_start/audio_data/audio_stop → 云端 ASR → `OnVoiceListener.onBeginSpeech/onDynamicResult/onFinalResult/onEndSpeech`
- TTS 播报 → `onTtsStart/onTtsDone`，`playTts/stopTts/isTtsPlaying`

固定网络输入模式（`NETWORK_ONLY`）。不含 NLP 与识别 UI（由 H5 负责）。

## 引擎与密钥配置

网络输入模式下 **ASR 必须用云引擎**（讯飞 / 腾讯 / 火山）：`SYSTEM` 走设备 `SpeechRecognizer`、`OFFLINE` 为占位，都不吃手机发来的网络 PCM。

1. 复制 `voice.properties.example` 为 `voice.properties`（不入库）。
2. 设 `asrMode` / `ttsMode`（如 `IFLY`），填对应一家的密钥，其余留空。
3. `build.gradle` 读取 `voice.properties` 注入 `BuildConfig`，`VoiceConfigFactory.build()` 据此构造 `VoiceRemoteConfig`：配了哪家 appId 非空就生效哪家。缺密钥时回退空串，模块仍可编译。

| 引擎 | asrMode/ttsMode | 需填 |
|---|---|---|
| 讯飞 | `IFLY` | `ifly.appId` / `ifly.apiKey` / `ifly.apiSecret` |
| 腾讯 | `TENCENT` | `tencent.secretId` / `tencent.secretKey` / `tencent.appId` |
| 火山 | `VOLC` | `volc.appId` / `volc.token` |

## 插拔开关

- **启用**：
  1. `settings.gradle` 加 `include ':feature_voice:internet'`
  2. `app/build.gradle` 的 `dependencies` 加 `runtimeOnly project(':feature_voice:internet')`
- **停用**：删上面两行。模块源码不再编译/打包，`VoiceControllerFactory` 经 ServiceLoader 找不到实现 → 自动回退 `NoopVoiceController`。**上层（WebActivity/VoiceBridge）零改动。**

## 与视九二选一

`ServiceLoader` 取发现到的第一个实现（顺序不定）。`internet` 与 `shijiu` 同时启用时只命中其一，**需确定性时只启用一个**：用 `internet` 就注释/删除 `shijiu` 的 `include` 与 `runtimeOnly`（反之亦然）。

## 端到端验证

盒子起后监听 `networkPort`（默认 9527）；用 voice-remote-sdk 仓库的 `web-remote/index.html` 或 `remote/` 手机 App 连 `盒子IP:9527` 发音频 → 验证 H5 端 `window.onFinalResult` 收到识别结果、`ottService.playTts` 能播报（需先在 `voice.properties` 配好一家云引擎密钥）。
