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
    tinker: TinkerConfig? = null,                      // null = 不装；传时 applicationLike 必填
    upgrade: UpgradeConfig? = null,                    // null = 不装
)
```

装配顺序固定：Logger → Http → ImageLoader → Player → Tinker → Upgrade，最后注册 `ActivityLifecycleCallbacksImpl`。Java 调用：`SdkCore.init(this, loggerCfg, httpCfg, imageLoaderCfg, null, null, null);`。

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

### TinkerConfig — `chances.core.upgrade.tinker.TinkerConfig`
`applicationLike(ApplicationLike)` **必填**（缺则装配跳过并 warn）；`tinkerEnable(Boolean)` 默认 `true`；`retryEnable(Boolean)` 默认 `true`；`patchRestartUiEnable(Boolean)` 默认 `true`（补丁合成成功后弹重启框）；`patchRestartUiCancelable(Boolean)` 默认 `false`（重启框不可关闭，只能点重启；可关闭则下次手动重启生效）。

可直接继承 `chances.core.upgrade.tinker.TinkerApplicationLike`（`@DefaultLifeCycle` 编译期生成 `chances.core.upgrade.tinker.CoreTinkerApplication`）：基类已封装 `MultiDex.install` + Tinker 安装时序，子类只需实现 `onTinkerReady()` 做业务初始化（在其中调 `SdkCore.init(getApplication(), tinker = TinkerConfig.default(this), ...)`，`this` 即 ApplicationLike）。Manifest 的 `application android:name` 指向生成的 `CoreTinkerApplication`（或 combuild 主工程插件配置的 application 名）。

### UpgradeConfig — `chances.core.upgrade.UpgradeConfig`
三种升级模式（默认 / 强制 / 补丁）内置默认 UI，每个环节可替换。字段：
- 网络请求两条路（二选一，`updateTransformer` 优先）：
  - **注入 Server（推荐）**：`upgradeServer(UpgradeServer)` 注入外部 Retrofit 实例（BaseUrl 由外部决定，`@Url` 动态地址）+ `checkUpdateUrl(String)` 完整请求地址 + `responseAdapter(UpgradeResponseAdapter)`（默认 `DefaultUpgradeResponseAdapter` 同名直映）。
  - **完全自定义（退路）**：`updateTransformer(UpgradeManager.UpdateServiceTransformer)` 自己发请求，绕过 server+adapter。
- 安装器：`apkInstaller(ApkInstaller)`（默认 `DefaultApkInstaller`，走标准 Intent+FileProvider）；`fileProviderAuthority(String)` 默认运行时按 `<packageName>.upgrade.file.provider` 拼接。
- UI：`uiProvider(UpgradeUiProvider)`（默认 `DefaultUpgradeUiProvider`，可整体替换）；`countdownSeconds(Int)` 默认 `5`（默认升级倒计时秒数）；`allowCancelNormalUpgrade(Boolean)` 默认 `false`（默认升级框是否给取消按钮，取消不影响返回键）。
- `checkUpgradeInterval(Long)` 默认 2 小时，`≤0` 视为不覆盖。

升级交互：默认升级=静默后台下载→下载完弹 N 秒倒计时框→确认/倒计时结束安装；强制升级=进度条框拦截所有按键→下载完安装；补丁升级=Tinker 合成成功后弹重启框。任一失败都强制关闭弹框。手动检查走 `UpgradeManager.getInstance().checkUpdateManual(context, OnCheckUpdateCallback)`。错误码见 `chances.core.upgrade.UpgradeErrorCode`（53xxx 收编）。

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
