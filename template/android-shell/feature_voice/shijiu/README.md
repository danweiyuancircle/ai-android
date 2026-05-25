# feature_voice/shijiu（:feature_voice:shijiu）

视九（`com.qcode.tvvoicehelp`）语音实现模块，可整体热插拔。语音相关模块聚合在 `feature_voice/` 下：`core`=抽象稳定层，`shijiu`=本实现。

## 这个模块做什么

把视九 SDK 的事件适配成 `feature_voice:core` 的 `VoiceController` 抽象，仅做事件转发：
- 遥控器语音键触发 → ASR 流式识别 → `OnVoiceListener.onBeginSpeech/onDynamicResult/onFinalResult/onEndSpeech`
- TTS 播报 → `onTtsStart/onTtsDone`，`playTts/stopTts/isTtsPlaying`

不含 NLP 后端查询与识别 UI 弹框（由 H5 负责 AI 与界面）。视九经绑定 TV 系统语音服务录音，**应用无需 RECORD_AUDIO**。

SDK 以本地 aar 入库：`libs/VoiceConnectSDK-release.aar`。

## 插拔开关

- **启用**：
  1. `settings.gradle` 加 `include ':feature_voice:shijiu'`
  2. `app/build.gradle` 的 `dependencies` 加 `runtimeOnly project(':feature_voice:shijiu')`
- **停用**：删上面两行。模块源码 + aar 不再编译/打包，`VoiceControllerFactory` 经 ServiceLoader 找不到实现 → 自动回退 `NoopVoiceController`。**上层（WebActivity/VoiceBridge）零改动。**

## 如何新增一个语音实现（如腾讯）

在 `feature_voice/` 下新建一个 `feature_voice/<vendor>`（如 `feature_voice/tencent`，模块路径 `:feature_voice:tencent`），照本模块结构：

1. `build.gradle`：`api project(':feature_voice:core')` + 引入该 SDK 依赖（aar 走 `flatDir`，或 maven 坐标）。
2. 写 `XxxVoiceController : VoiceController`：把该 SDK 事件适配到 `OnVoiceListener`，**回调切主线程**（见 `OnVoiceListener` 线程契约）。
3. 写 `XxxVoiceControllerProvider : VoiceControllerProvider`（公开无参构造），`create()` 返回上面的 controller。
4. 新建 `src/main/resources/META-INF/services/com.example.shell.voice.VoiceControllerProvider`，单行写 Provider 全类名。
5. `consumer-rules.pro` keep 住 SDK 包、Provider 无参构造（R8 release 防裁剪）。
6. `settings.gradle` 加 `include ':feature_voice:<vendor>'` + `app/build.gradle` `runtimeOnly project(':feature_voice:<vendor>')` 启用。

> 同时启用多个实现时，`ServiceLoader` 取发现到的第一个。需要确定性时只启用一个实现模块。
