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
模块（命名前缀即层级，Studio 视图按字母序呈现 app→业务→base）：
- `app` — 壳应用：LauncherActivity（统一入口，申请权限后跳转）+ WebActivity（WebView 宿主，含 ottService/语音/地址设置弹框）+ OttApplication + flavor staging/prod
- `feature_voice/`（语音聚合目录）
  - `feature_voice/core`（`:feature_voice:core`）— 业务层·语音抽象（稳定层）：`VoiceController` / `OnVoiceListener` 接口 + `NoopVoiceController` 兜底 + `VoiceControllerProvider`（SPI）/ `VoiceControllerFactory`（ServiceLoader 发现）
  - `feature_voice/shijiu`（`:feature_voice:shijiu`）— 可热插拔的视九（`com.qcode.tvvoicehelp`）语音实现，删依赖即整模块不打包、自动回退 Noop（见其 `README.md`）；新增实现照此放 `feature_voice/<vendor>`
- `lib_base` — 基础层·壳专属逻辑：`OttServiceBridge`（ottService 契约实现）+ `WebViewJsHelper`（原生→H5）

壳直接复用 chances-sdk 现成能力，不自写：
- 页面继承 `chances.core.arc.BaseActivity`（实现 `getLayoutId/initView/initData`）
- WebView 用 `chances.core.web.TvWebView`（自带 WebSettings / 进度 / 页面回调）
- 退出走 `ActivityLifeManager.getInstance().quitApp()`

语音接线：语音双向桥接内聚在 `feature_voice:core` 的 `VoiceBridge`——构造时注册 `OnVoiceListener` 把识别/TTS 事件转发到 H5（`onBeginSpeech/onFinalResult` 等，回调统一主线程），并提供 `playTts/stopTts/isTtsPlaying/releaseVoice`。`WebActivity` 用 `VoiceControllerFactory.create(...)` 经 `OttServiceBridge` 门面装配（门面对语音方法薄委派，`@JavascriptInterface` 因 `addJavascriptInterface` 单对象约束保留在门面）。

语音热插拔：实现按 SDK 拆成 `feature_voice/<vendor>` 独立模块（如 `feature_voice/shijiu`），各自经 `META-INF/services` 注册 `VoiceControllerProvider`；`VoiceControllerFactory` 用 `ServiceLoader` 发现，未打包任何实现则回退 `NoopVoiceController`，**JS 对接层与 `WebActivity` 零改动**。增删实现 = 改 `settings.gradle` include + app `runtimeOnly` 一行。新增实现照 `feature_voice/shijiu/README.md`。

地址管理：`WebActivity` 加载地址优先级 **Intent `EXTRA_URL` > sdcard `/sdcard/web_url.txt` > `BuildConfig.H5_URL`**；运行时连按 5 次菜单键弹 `WebUrlDialog` 查看 / 修改地址，保存后落盘 sdcard（存储权限由 `LauncherActivity` 统一申请）。

签名：随仓库附带 demo keystore（`app/shell.jks` + `signing.properties`，密码 `shelltemplate`，**非生产密钥**），clone 即可出 release 签名包；正式项目替换为自有 keystore 并恢复 `.gitignore` 默认排除。

起项目改动点（搜 `TODO`）：`applicationId`、`H5_URL`（flavor）、签名（替换 demo keystore）、`app_name`、`WebUrlStorage.FILE_NAME`（sdcard 文件名）、接入真实语音 SDK（替换 `NoopVoiceController`）、应用图标（`app/src/main/res/mipmap-xxhdpi/ic_launcher_<key>.png`，用唯一名防被盒子应用同步按 `ic_launcher` 通用名覆盖）。

> ⚠️ 编译前置：`com.chances.sdk:*` 在公司内网仓库（`http://222.66.77.226:8081`），需公司网络 + Android SDK 28 + **JDK 8**（AGP 3.6.0 要求）。
> 验证（已实测通过，可装到盒子运行）：
> ```bash
> JAVA_HOME=<jdk1.8> ./gradlew :app:assembleStagingDebug
> ```
> flavor 名不能以 `test` 开头（Gradle 保留），测试环境用 `staging`。

## h5-vue

Vue3 + Vite 骨架：Chromium 53 legacy、`@chancestv/tv-ui`、`@shell/core`（ottService / 返回键 / 语音 / HTTP / 路由栈）。不含业务卡带。

入口 `apps/shell/src/main.ts` 已 `setupTvFocus`。焦点换肤改 `apps/shell/src/theme.css`。占位页：Home / Gallery / Theme / Scene / Detail / ComingSoon / PlayerControl。

业务只用 `@chancestv/tv-ui`，不要直连 `@chancestv/tv-focus`，不要拷 `E*.vue`。确认用 `@enter`。

起项目改动点（搜 `TODO`）：`apps/shell/vite.config.ts` 的 `base`（须与壳 `H5_URL` 路径一致）、`index.html` 标题、按需补 `apps/shell/src/pages`。

验证：
```bash
cd /Users/chances/workspace/eng_prod/ai-android/template/h5-vue
pnpm install
pnpm build
```

## rules / skill 绑定

生成结果：`<parent>/android-app` + `<parent>/web`，工程根带 `AGENTS.md` / `CLAUDE.md`（给 AI 当工作区入口）。CLI 再按技术栈默认勾选，把 rules/skills 拷到 `.claude/` 与 `.agents/skills/`。仓库内模板源仍是 `template/android-shell` 与 `template/h5-vue`。

| 模板 | rules | skill |
| --- | --- | --- |
| android-shell | `android-dev-spec.md` + `android-support-library-only.md` | `chances-sdk-v2` |
| h5-vue / h5-react | `android-webview-5.md` + `vue-tv-ui.md`（Android 9 设备再加 `android-webview-9.md`） | `tv-ui-page-author` |

## 新增 h5-react（约定）

React 壳同样实现 `bridge-contract.md` 的 `window.ottService`（H5→原生方法 + `window.<回调>` 全局函数 + 按键归一化），复用同一个 `android-shell`。
