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

全部配置集中在根 `gradle.properties` 的 `voice.internet.*` 段（全局单一来源）：

1. 设 `voice.internet.asrMode` / `voice.internet.ttsMode`（如 `IFLY`），填对应一家的密钥，其余留空。
2. 本模块 `build.gradle` 经 `project.findProperty` 读取 `voice.internet.*` 注入 `BuildConfig`，`VoiceConfigFactory.build()` 据此构造 `VoiceRemoteConfig`：配了哪家 appId 非空就生效哪家。缺密钥时回退空串，模块仍可编译。
3. ⚠️ `gradle.properties` 入库，**真实密钥勿提交**，放 `~/.gradle/gradle.properties` 用同名 key 覆盖即可。

| 引擎 | asrMode/ttsMode | 需填（gradle.properties key） |
|---|---|---|
| 讯飞 | `IFLY` | `voice.internet.ifly.appId` / `voice.internet.ifly.apiKey` / `voice.internet.ifly.apiSecret` |
| 腾讯 | `TENCENT` | `voice.internet.tencent.secretId` / `voice.internet.tencent.secretKey` / `voice.internet.tencent.appId` |
| 火山 | `VOLC` | `voice.internet.volc.appId` / `voice.internet.volc.token` |

## 插拔开关与视九二选一

切换由根 `gradle.properties` 的 `voice.engine` 决定（编译期），`app/build.gradle` 据此只 `runtimeOnly` 选中的实现模块：

- **启用本模块**：`voice.engine=internet`（命令行临时覆盖：`./gradlew assembleStagingDebug -Pvoice.engine=internet`）。
- **切视九**：改 `voice.engine=shijiu`。
- 选中谁就只打包谁，未选中者不进 classpath，`VoiceControllerFactory` 经 ServiceLoader 命中确定；非法值构建报错。**上层（WebActivity/VoiceBridge）零改动。**

## 端到端验证

盒子起后监听 `networkPort`（默认 9527）；用 voice-remote-sdk 仓库的 `web-remote/index.html` 或 `remote/` 手机 App 连 `盒子IP:9527` 发音频 → 验证 H5 端 `window.onFinalResult` 收到识别结果、`ottService.playTts` 能播报（需先在 `gradle.properties` 的 `voice.internet.*` 配好一家云引擎密钥）。
