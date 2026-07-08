# core：初始化门面 / 日志 / 图片 / 异常 / 错误码

## SdkCore.init —— 一站式装配入口

`chances.core.SdkCore`（Kotlin object，`@JvmStatic @JvmOverloads`）。**全局只执行一次**，重复调用直接返回、新参数不生效。

```kotlin
fun init(
    application: Application,
    logger: LoggerConfig? = LoggerConfig.default(),   // 默认装兜底 Logger；传 null 跳过
    http: HttpConfig = HttpConfig.default(),           // 始终装配，不可跳过
    imageLoader: ImageLoaderConfig? = null,            // null = 不装
    player: PlayerConfig? = null,                      // null = 不装
    upgrade: UpgradeConfig? = null,                    // null = 不装；Tinker 作为 Upgrade 子配置经 upgrade.tinker 注入
)
```

装配顺序固定：Logger → Http → ImageLoader → Player → (Upgrade 内含 Tinker)，最后注册 `ActivityLifecycleCallbacksImpl`。Java 调用：`SdkCore.init(this, loggerCfg, httpCfg, imageLoaderCfg, null, null);`。

## 各 Config（Builder 风格，setter KDoc 末行标默认值）

### LoggerConfig — `chances.core.log.LoggerConfig`
`LoggerConfig.builder()` / `LoggerConfig.default()`。
| 方法 | 默认值 |
| --- | --- |
| `debug(Boolean)` | `false` |
| `logLevel(LogLevel)` | `LogLevel.INFO`（枚举 `chances.core.log.LogLevel`，有 `ALL` 等） |
| `logFileDir(String?)` | `null`（走 `cacheDir/apkLog/`） |
| `logFileMaxSize(Int)` | 20 MB |
| `showMethodStackInVDILevel(Boolean)` | `false` |
| `appPackageName/apkVersionName(String?)` | `null`（自动从 Context 读，通常不传） |
| `apkPatchVersion(String?)` | `null` |

### ImageLoaderConfig — `chances.core.imageloader.ImageLoaderConfig`
| 方法 | 默认值 |
| --- | --- |
| `placeHolder(@DrawableRes Int)` / `errorHolder(...)` | `-1`（无占位/错误图） |
| `bitmapPoolSize(Int)` | 15 MB |
| `resourceCacheSize(Int)` | 10 MB |
| `diskCacheSize(Int)` | 100 MB |
| `logLevel(Int)` | `android.util.Log.INFO` |
| `imageLoaderListener(ImageLoaderListener?)` | `null` |

### PlayerConfig — `chances.core.player.common.PlayerConfig`
`PlayerConfig.builder().defaultPlayerFactory(Class<out PlayerFactory>).build()`。默认 `null`（不设默认引擎，`UniversalVideoView` 回退到系统 `NativeFactory`）。详见 `player.md`。

### HttpConfig — `chances.core.http.HttpConfig`
`HttpConfig.builder().rxJavaErrorCallback(cb).build()`。`rxJavaErrorCallback` 默认 `null`（RxJava 全局异常仅 Logger 打 error）。详见 `http.md`。

### TinkerConfig — `chances.core.upgrade.TinkerConfig`（Upgrade 的子配置）
Tinker 补丁配置**收口在 `UpgradeConfig` 内**，经 `UpgradeConfig.builder().tinker(TinkerConfig.default(appLike)).build()` 注入，`SdkCore.init` 不再有独立 `tinker` 入参。`applicationLike(ApplicationLike)` **必填**（缺则装配跳过并 warn）；`tinkerEnable(Boolean)` 默认 `true`；`retryEnable(Boolean)` 默认 `true`；`patchRestartUiEnable(Boolean)` 默认 `true`（补丁合成成功后弹重启框）；`patchRestartUiCancelable(Boolean)` 默认 `false`（重启框不可关闭，只能点重启；可关闭则下次手动重启生效）。

可直接继承 `chances.core.upgrade.tinker.TinkerApplicationLike`（`@DefaultLifeCycle` 编译期生成 `chances.core.upgrade.tinker.CoreTinkerApplication`）：基类已封装 `MultiDex.install` + Tinker 安装时序，子类只需实现 `onTinkerReady()` 做业务初始化（在其中调 `SdkCore.init(getApplication(), upgrade = UpgradeConfig.builder().tinker(TinkerConfig.default(this)).build(), ...)`，`this` 即 ApplicationLike）。Manifest 的 `application android:name` 指向生成的 `CoreTinkerApplication`（或 combuild 主工程插件配置的 application 名）。

> Tinker 补丁**完整接入流程**(Application 改造 + Gradle `tinkerPatch` 脚本 + 主 dex keep + 混淆/签名 + 打补丁步骤 + 踩坑速查表)内容量大,见独立文档 [`tinker.md`](tinker.md)。本节仅列 `TinkerConfig` 字段。

### UpgradeConfig — `chances.core.upgrade.UpgradeConfig`
三种升级模式（默认 / 强制 / 补丁）内置默认 UI，每个环节可替换。**只覆盖升级流程内部的检查 SPI / UI / 安装器 / 倒计时等行为**，检查升级的网络请求过程封装在外部 `UpgradeFetcher` 实现内。字段：
- **检查 SPI（必填）**：`fetcher(UpgradeFetcher)`——外部实现 `fetch(callback)`（应用层自选网络库请求升级后端、把响应映射成 `UpgradeResponse` 经 `callback.onSuccess` 交回 SDK；失败走 `callback.onError(SdkException)` 或同步抛 `SdkException`，SDK 都会 catch），注入后 `UpgradeManager.checkUpdate()` 后台调它拿结果。
- 安装器：`apkInstaller(ApkInstaller)`（默认 `DefaultApkInstaller`，走标准 Intent+FileProvider）；`fileProviderAuthority(String)` 默认运行时按 `<packageName>.upgrade.file.provider` 拼接。
- UI：`uiProvider(UpgradeUiProvider)`（默认 `DefaultUpgradeUiProvider`，可整体替换）；`countdownSeconds(Int)` 默认 `5`（默认升级倒计时秒数）；`allowCancelNormalUpgrade(Boolean)` 默认 `false`（默认升级框是否给取消按钮，取消不影响返回键）。
- Tinker 子配置：`tinker(TinkerConfig)` 默认 `null`（不装 Tinker）；非 null 时 `SdkCore.init` 内部据此触发 Tinker 装配，字段见上文 `TinkerConfig` 节。

**检查升级接入范式（升级库不内置网络层）**：
1. 主工程实现 `chances.core.upgrade.UpgradeFetcher`：`fetch(callback)` 内用自己的 Retrofit/OkHttp 请求升级后端、把响应映射成公共边界模型 `chances.core.upgrade.UpgradeResponse`（字段 status / **mode** / apkVersionName / apkVersionCode / fileName / fileSize / fileMd5 / downloadUrl / patchDownloadUrl / patchVersion / patchMd5 / localReusePath，private + getter/setter），并**直接设定 `mode`**（`UpgradeMode.NORMAL/FORCE/PATCH/NONE`，版本比对 / 补丁可用性由实现判定）；失败走 `callback.onError(SdkException)` 或同步抛 `SdkException`。
2. 注入：`UpgradeConfig.builder().fetcher(yourFetcher).build()`（经 `SdkCore.init(..., upgrade = ...)`）。
3. 触发：`UpgradeManager.getInstance().checkUpdate()`（**无参无回调**，内部后台调 fetcher、主线程驱动流程）。
4. 错误：`UpgradeManager.getInstance().setErrorCallback(UpgradeErrorCallback)` 注册一次，check / 下载 / 补丁任意阶段错误统一收口为 `SdkException` 从此透传（不二次包装）；**成功无回调**。

`UpgradeResponse` 即升级流程的唯一结果边界模型，服务端字段命名/结构差异由主工程在 fetcher 映射阶段对齐。**定时 / 轮询检查由主工程自行调度**（SDK 不再提供 `checkUpdateAuto` / `checkUpgradeInterval`）。

升级交互：默认升级=静默后台下载→下载完弹 N 秒倒计时框→确认/倒计时结束安装；强制升级=进度条框拦截所有按键→下载完安装；补丁升级=Tinker 合成成功后弹重启框。任一失败都强制关闭弹框。错误码见 `chances.core.upgrade.UpgradeErrorCode`（53xxx 收编）。

**UpgradeFetcher 实现模板（Kotlin + OkHttp）**：
```kotlin
class AppUpgradeFetcher(private val context: Context) : UpgradeFetcher {

    override fun fetch(callback: UpgradeFetcher.OnResponseCallback) {
        val request = Request.Builder()
            .url("https://your-server/api/upgrade/check")
            .post(RequestBody.create(JSON_MEDIA_TYPE, "{\"versionCode\":${BuildConfig.VERSION_CODE}}"))
            .build()

        OkHttpClient().newCall(request).enqueue(object : Callback {
            override fun onResponse(call: Call, response: Response) {
                try {
                    val body = response.body()?.string()
                    if (!response.isSuccessful || body.isNullOrEmpty()) {
                        callback.onError(SdkException(UpgradeErrorCode.CHECK_SERVER_CODE_ERROR,
                            "检查升级响应异常: code=${response.code()}"))
                        return
                    }
                    // ★ 应用层把后端响应 convert 成 SDK 内部的 UpgradeResponse, 经 callback 交回
                    callback.onSuccess(mapResponse(body))
                } catch (e: SdkException) {
                    callback.onError(e)
                } catch (e: Exception) {
                    callback.onError(SdkException(UpgradeErrorCode.CHECK_PARSE_FAILURE,
                        "响应解析失败: ${e.message}", e))
                } finally {
                    response.close()
                }
            }

            override fun onFailure(call: Call, e: IOException) {
                callback.onError(SdkException(UpgradeErrorCode.CHECK_NO_NETWORK,
                    "检查升级网络异常: ${e.message}", e))
            }
        })
    }

    private fun mapResponse(body: String): UpgradeResponse {
        val json = JsonParser().parse(body).asJsonObject
        return UpgradeResponse().apply {
            status = json.get("status")?.asInt ?: 0
            apkVersionName = json.get("apkVersionName")?.asString ?: ""
            apkVersionCode = json.get("apkVersionCode")?.asInt ?: 0
            fileName = json.get("fileName")?.asString ?: ""
            fileSize = json.get("fileSize")?.asString ?: ""
            fileMd5 = json.get("fileMd5")?.asString ?: ""
            downloadUrl = json.get("downloadUrl")?.asString ?: ""
            patchDownloadUrl = json.get("patchDownloadUrl")?.asString ?: ""
            patchVersion = json.get("patchVersion")?.asString ?: ""
            patchMd5 = json.get("patchMd5")?.asString ?: ""
            // ★ 由应用层直接设定 mode（SDK 不做模式判定）
            mode = when (json.get("needUpdate")?.asString) {
                "2" -> UpgradeMode.FORCE
                "1" -> UpgradeMode.NORMAL
                else -> UpgradeMode.NONE
            }
        }
    }
}
```

## 日志 Logger — `chances.core.log.Logger`
静态方法，五级 `v/d/i/w/e`，每级有多个重载：`(tag, message)`、`(tag, message, Throwable)`、`(tag, Object)`、`(tag, String format, Object... args)`、`(tag, Object[])`。
```kotlin
Logger.i("MyTag", "user=%s id=%d", name, id)
Logger.e("MyTag", "请求失败", throwable)
```
业务统一走 `Logger`，不要直接 `android.util.Log`。

## 异常 SdkException — `chances.core.exception.SdkException`
`extends RuntimeException`，三字符串字段：
```java
new SdkException(code, message)
new SdkException(code, message, cause)   // originStack = cause 的 stacktrace 字符串
String getCode(); String getMessage(); String getOriginStack();
```
各模块对外回调统一抛/传 `SdkException`（如 tvms `onError(stbNo, SdkException)`、PermissionHelper `onError(SdkException)`）。

## 错误码注册中心 SdkErrorCodeRegistry — `chances.core.exception.SdkErrorCodeRegistry`
各子模块在自己的 `XxxErrorCode` 常量类 `static {}` 块里 `register(moduleName, code, message)` 自注册。主工程一次性拉取：
```java
Map<String, Map<String,String>> grouped = SdkErrorCodeRegistry.getGrouped(); // 按模块分组
Map<String, String> flat = SdkErrorCodeRegistry.getAll();                    // code -> "[module] msg"
String msg = SdkErrorCodeRegistry.describe(code);                            // 反查，未注册返回 null
```
需要某模块错误码出现在表里，先触发其类加载（如 `XxxErrorCode.ensureRegistered()`）。

## 常见坑
- `SdkCore.init` 只生效第一次；不要在多处分别 init 期望叠加配置。
- 没装 Http 就 `createClient` → `RuntimeException("没有调用init方法进行初始化")`。所以 `http` 参数永远会被装配，别显式跳过。
