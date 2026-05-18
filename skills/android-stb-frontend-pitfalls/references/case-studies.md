# 两个真实工程的实操案例

---

## Case A：sh_tour_ai（Chrome 53 / Android 5.1.1，保守路线）

### 项目定位

OTT 机顶盒套壳 Vue3 SPA，依赖**外部 OTT 基座**（不带原生 SDK），底线兼容到 Android 5.1.1 出厂盒子。

### 关键选型

| 维度 | 选择 | 路径 |
|---|---|---|
| 构建 | Vite 5 + `@vitejs/plugin-legacy` targets `chrome >= 53` | `/Users/chances/sh_tour_ai/vite.config.ts:35-44` |
| TS target | ES2020（IDE 友好，由 legacy 接管最终降级） | `/Users/chances/sh_tour_ai/tsconfig.json:3-6` |
| Framework | Vue 3.4.0（**未升 3.5+**，避开 Promise.withResolvers） | `/Users/chances/sh_tour_ai/package.json:14` |
| State | Pinia 2.1.7 | `/Users/chances/sh_tour_ai/package.json:13` |
| Router | Vue Router 4.2.5 | `/Users/chances/sh_tour_ai/package.json:15` |
| CSS | **纯原生 CSS**，无 PostCSS / Tailwind / Autoprefixer | `/Users/chances/sh_tour_ai/src/styles/` |
| SSE | XHR + onprogress 手解析 | `/Users/chances/sh_tour_ai/src/api/aiChatApi.ts:53-149` |
| 焦点 | 自建 `useFocusManager`（加权距离算法 + DPAD） | `/Users/chances/sh_tour_ai/src/composables/useFocusManager.ts:119-209` |
| 原生桥 | `window.ottService`（存在性探测 + 降级） | `/Users/chances/sh_tour_ai/src/bridge/ottservice.ts` |
| 自定义事件 | `OTT_NATIVE_KEYDOWN_EVENT` + `CustomEvent` 旧式 fallback | `/Users/chances/sh_tour_ai/src/bridge/ottservice.ts:377-387` |

### 值得学的几点

1. **TS target 不必跟 legacy target 同步**：tsconfig 写 ES2020，legacy plugin 接管最终降级。两者解耦让 IDE 体验好。
2. **SSE 选型一步到位**：未用 EventSource / fetch streaming，直接 XHR，绕过 chrome53 fetch streaming 在 OEM WebView 上不稳的风险。
3. **bridge 探测降级**：`window.ottService` 不存在时焦点系统降级到标准 `keydown`，方便桌面 Chrome 开发联调。
4. **没引 PostCSS**：原生 CSS 写焦点样式，Chrome 53 全部支持（CSS 变量 49+）。少一层工具链少一层坑。

### 哪些坑没踩

- ✅ 没用 Tailwind v4（用了就炸）
- ✅ 没用 Vue 3.5+（避开 Promise.withResolvers）
- ✅ 没用 ResizeObserver（Chrome 64+，53 没有；改用窗口 resize 事件）
- ✅ 没用 fetch streaming（绕开 OEM buffering bug）

### 局限

- 完全依赖外部 OTT 基座，无 fallback 用户体验（基座没注入 `ottService` 时只能用键盘）
- 自建焦点算法对超长列表（>500 项）性能未优化

---

## Case B：fast-platform（Chrome 66 / Android 7.0，配套 SDK 路线）

### 项目定位

多前端 + **自带原生 Android SDK** 的完整 OTT 解决方案。自家 SDK 装 WebView 1.11.0 + Media3 ExoPlayer + LibVLC，前后端版本耦合。

### 关键选型

| 模块 | 维度 | 选择 | 路径 |
|---|---|---|---|
| **fast-tv-web (TV 端)** | Framework | React 18.3.1 | `/Users/chances/WebstormProjects/fast-platform/fast-tv-web/package.json:19` |
| | 构建 | Vite 6 + esbuild target=chrome66 | `/Users/chances/WebstormProjects/fast-platform/fast-tv-web/vite.config.ts:11-14` |
| | Legacy 兜底 | `@vitejs/plugin-legacy` 8.0 已加（但 target=chrome66 已较新） | `/Users/chances/WebstormProjects/fast-platform/fast-tv-web/package.json:29` |
| | 媒体 | HLS.js 1.5/1.6 | - |
| | SSE | **未用** | - |
| **fast-admin-web (后台)** | Framework | Vue 3.4.15 | `/Users/chances/WebstormProjects/fast-platform/fast-admin-web/package.json:28` |
| | 构建 | Vite 5 + 默认 esbuild | `/Users/chances/WebstormProjects/fast-platform/fast-admin-web/package.json:53` |
| | CSS | **Tailwind v4.1.18 + PostCSS 8.5.6**（只在桌面浏览器跑） | `/Users/chances/WebstormProjects/fast-platform/fast-admin-web/postcss.config.js` |
| **fast-player-sdk (原生)** | Android | minSdk 24 / targetSdk 34 / compileSdk 34 | `/Users/chances/WebstormProjects/fast-platform/fast-player-sdk/gradle.properties` |
| | WebView | androidx.webkit 1.11.0 | `/Users/chances/WebstormProjects/fast-platform/fast-player-sdk/sdk/build.gradle.kts:81` |
| | WebView 配置 | JS on / 媒体 autoplay / 混合内容 allow | `/Users/chances/WebstormProjects/fast-platform/fast-player-sdk/sdk/src/main/java/chances/fast/player/FastTvView.kt:49-52` |
| | 遥控器 | `RemoteKeyHandler.kt` 在原生层映射 KeyEvent → 标准 KeyboardEvent | `/Users/chances/WebstormProjects/fast-platform/fast-player-sdk/sdk/src/main/java/chances/fast/player/input/RemoteKeyHandler.kt:19-30` |
| | TV 标识 | AndroidManifest `LEANBACK_LAUNCHER` + 横屏锁定 + 保持屏幕常亮 | `/Users/chances/WebstormProjects/fast-platform/fast-player-sdk/app/src/main/AndroidManifest.xml:21` |

### 值得学的几点

1. **前后端版本耦合**：SDK 出货时绑定 androidx.webkit 1.11.0，前端 target=chrome66 是 SDK 在 minSdk=24 (Android 7.0) 上的安全下限。**SDK 升级 = 前端可以同步抬高 target**。
2. **后台与 TV 端分仓配置**：fast-admin-web 用 Tailwind v4 跑桌面浏览器，fast-tv-web 不引 Tailwind 跑 TV。**同一仓库不同包目标浏览器不一样**。
3. **遥控器键位在原生层映射**：把 Android `KeyEvent.KEYCODE_*` 转成标准 `KeyboardEvent` 派给 WebView，前端只关心 `event.key`/`event.code`。与 sh_tour_ai 的"JS 层映射"路线不同，**原生层映射 Web 端代码更通用**（同代码可以跑在桌面 Chrome 调试）。
4. **媒体自动播放**：`mediaPlaybackRequiresUserGesture=false` 让视频自动播。机顶盒场景没"用户手势"概念，必开。
5. **混合内容 allow**：`mixedContentMode=ALWAYS_ALLOW` 允许 HTTPS 页加载 HTTP 资源，机顶盒回源经常是 HTTP，必开。

### 必须注意的"边界"

- ⚠️ **fast-admin-web 的 Tailwind v4 不能搬到 fast-tv-web**：Tailwind v4 要 Chrome 111+，chrome66 直接炸
- ⚠️ **fast-tv-web 的 esbuild target=chrome66 没有 legacy bundle 兜底**：意味着如果未来引入用 chrome66+ API 的库（如 axios 1.7+），需要补 `@vitejs/plugin-legacy` 兜底，或锁库版本
- ⚠️ **SDK minSdk=24 (Android 7.0) ≠ WebView 内核就是 chrome66**：实际 Android 7.0 出厂的 WebView 可能更老（chrome51）；这套方案隐含假设"用户至少升级过一次 WebView"。如果客户设备无法联网升级，需要在 Android 7.0 设备实测

### 哪些坑可能踩

- 后台和 TV 端共享业务模型时，如果共享代码用了 axios 1.7+ / structuredClone 等，会污染 TV 端
- 没显式 browserslist 配置（fast-admin-web 无独立 browserslist），换协作者容易引入超出 target 的库

---

## 两个工程的对比启示

| 维度 | sh_tour_ai 路线 | fast-platform 路线 | 适合场景 |
|---|---|---|---|
| 谁定 WebView 版本 | 客户的 OTT 基座 | 自家 SDK | 看是否能控制 WebView 版本 |
| 兼容策略 | 极保守（chrome53） | 适度激进（chrome66） | 看客户机型分布 |
| 构建配置 | legacy plugin 兜底 | esbuild target | 看是否要兜超老设备 |
| 焦点 / 键位 | JS 层 | 原生层 | 看是否自家原生层可控 |
| SSE | XHR | （未用） | 通用：XHR 最稳 |
| CSS 工具链 | 无 | Tailwind v4（仅桌面） | TV 端原生 CSS / UnoCSS |

**通用规律**：

1. **WebView 版本是底线，不是目标**：选型按底线兜，富余版本支持的特性视情况渐进增强（用 `@supports` 包起来）
2. **少即是多**：构建链 / CSS 工具链每多一层就多一种坑，TV 端尽量精简
3. **真机实测不可省**：模拟器和桌面 Chrome 都骗人，必须在目标盒子上跑完整测试
