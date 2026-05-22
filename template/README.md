# 脚手架模板

「Android WebView 壳 + H5 前端」可复用模板。按组合起新项目：壳固定，H5 层在 Vue / React 间切换。

## 组合矩阵

| 目标形态 | 选用模板 |
| --- | --- |
| Vue + Android 壳 | `android-shell` + `h5-vue` |
| React + Android 壳 | `android-shell` + `h5-react`（待补） |

壳与 H5 通过 **`bridge-contract.md`** 定义的 `window.ottService` JSBridge 对接，与 H5 框架无关——同一个 `android-shell` 可配任意实现该契约的 H5。

## 目录

```
template/
├── bridge-contract.md   # ⭐ 壳↔H5 的 ottService 契约（唯一权威定义，先读）
├── android-shell/       # 通用 Android WebView 壳（chances-sdk 基线）
├── h5-vue/              # Vue3 + Vite H5 壳骨架
└── README.md
# h5-react/  待补
```

## android-shell

chances-sdk 基线的 Android 壳。工具链硬约束（遵 `claude/skills/chances-sdk/SKILL.md`）：
- AGP 3.6.0 / Gradle 6.8.3 / JDK 8 / Kotlin 1.8.0
- minSdk 19 / compileSdk 28 / targetSdk 28，Support 27.1.1，**禁止 AndroidX**
三模块（命名前缀即层级，Studio 视图按字母序呈现 app→业务→base）：
- `app` — 壳应用：MainActivity + OttApplication + flavor staging/prod
- `feature_voice` — 业务层·语音抽象独立模块：`VoiceController` / `OnVoiceListener` 接口 + `NoopVoiceController` 空实现（未接真实语音 SDK）
- `lib_base` — 基础层·壳专属逻辑：`OttServiceBridge`（ottService 契约实现）+ `WebViewJsHelper`（原生→H5）

壳直接复用 chances-sdk 现成能力，不自写：
- 页面继承 `chances.core.arc.BaseActivity`（实现 `getLayoutId/initView/initData`）
- WebView 用 `chances.core.web.TvWebView`（自带 WebSettings / 进度 / 页面回调）
- 退出走 `ActivityLifeManager.getInstance().quitApp()`

语音接线：语音双向桥接内聚在 `feature_voice` 的 `VoiceBridge`——构造时注册 `OnVoiceListener` 把识别/TTS 事件转发到 H5（`onBeginSpeech/onFinalResult` 等），并提供 `playTts/stopTts/isTtsPlaying/releaseVoice`。`MainActivity` 只需 `VoiceBridge(webView, NoopVoiceController())` 再交给 `OttServiceBridge` 门面（门面对语音方法薄委派，`@JavascriptInterface` 因 `addJavascriptInterface` 单对象约束保留在门面）。接真实语音 SDK 时只需实现 `VoiceController` 替换 `NoopVoiceController`，其余不动。

起项目改动点（搜 `TODO`）：`applicationId`、`H5_URL`（flavor）、签名（`signing.properties.example` → `signing.properties`）、`app_name`、接入真实语音 SDK（替换 `NoopVoiceController`）。

> ⚠️ 编译前置：`com.chances.sdk:*` 在公司内网仓库（`http://222.66.77.226:8081`），需公司网络 + Android SDK 28 + **JDK 8**（AGP 3.6.0 要求）。
> 验证（已实测通过，可装到盒子运行）：
> ```bash
> JAVA_HOME=<jdk1.8> ./gradlew :app:assembleStagingDebug
> ```
> flavor 名不能以 `test` 开头（Gradle 保留），测试环境用 `staging`。

## h5-vue

sh_tour_ai 抽象出的 Vue3 骨架，保留：Vite legacy（Chromium 53）、TV 焦点框架（`useFocusManager` + `Focusable*`）、`ottService` bridge、配置系统、退出/语音弹框。剥掉沪小游业务，留占位页（Home / Detail / AIChat / ComingSoon）。

起项目改动点（搜 `TODO`）：`vite.config.ts` 的 `base`（须与壳 `H5_URL` 路径一致）、`index.html` 标题、`public/{test,prod}-config.json`、`src/api/url.ts` 端点、按需补 `src/views`。

验证：
```bash
cd h5-vue && npm install && npm run build:test
```

## rules / skill 绑定

起项目时从仓库 `claude/` 拷贝对应资产到目标工程 `.claude/`（单一来源在 `claude/`，模板不冗余携带）：

| 模板 | rules | skill |
| --- | --- | --- |
| android-shell | `android-dev-spec.md` + `android-support-library-only.md` | `chances-sdk` |
| h5-vue / h5-react | `android-webview-5.md`（含 Android 9 设备再加 `android-webview-9.md`） | — |

## 新增 h5-react（约定）

React 壳同样实现 `bridge-contract.md` 的 `window.ottService`（H5→原生方法 + `window.<回调>` 全局函数 + 按键归一化），复用同一个 `android-shell`。
