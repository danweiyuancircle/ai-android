---
name: chances-sdk-v2
description: >-
  成思 IPTV Android 封装库（com.chances.sdk:* AAR：core / tvms / wslog / player-ijk /
  player-exo / iptv2ex / core-compiler）的接入与开发指南，并锁定 IPTV 开发的全部依赖库版本与编译约束。
  只要在依赖了 com.chances.sdk:* 的 Android IPTV 主工程里干以下任何事，就必须用本 skill（即使用户没点名）：
  声明/选择第三方库版本（OkHttp / Retrofit / RxJava / Glide / ARouter / EventBus / Tinker / ButterKnife /
  support 等）、设置 minSdk / compileSdk、在 Application 里初始化 SdkCore、调用日志(Logger)/图片加载/
  播放器(UniversalVideoView / IJK / ExoPlayer)/网络(HttpClientManager + 缓存注解)/权限(PermissionHelper)/
  长连接(tvms)/远程日志(wslog)/IPTV2 浏览器壳(iptv2ex)、处理 SdkException 错误码、判断某个 Java/Kotlin
  API 在 Android 4.4(API 19) 上能不能用。涉及 IPTV 盒子开发、低版本兼容、support 包(非 AndroidX)
  工程时也要主动用。
---

# chances-sdk：IPTV 封装库接入与版本锁定

> **适用版本：core 2.3.x / core-compiler 2.3.x / tvms 1.2.x / wslog 1.1.x / player-ijk 1.1.x / player-exo 1.1.x / iptv2ex 1.2.x**
> 本指南内容以仓库 head 实际代码为准，与历史 `doc/接入手册.md`、注释里提到的入口若有出入，以本指南为准。

成思 IPTV Android 组件化基础库，各 module 打成 AAR 发布到私有 Nexus（`com.chances.sdk:*`），供 IPTV 主工程依赖。本 skill 让你在下游主工程里：① 用对的版本和编译约束开发；② 用真实存在的 API（不调用文档里写过但代码里没有的入口）。

## 一、硬约束（红线，违反直接编译失败或盒子运行时崩溃）

- **禁止 AndroidX**。全部 `import android.support.*`（Support 库锁定 `27.1.1`）。新代码不得 `import androidx.*`。
- **minSdk 19 / compileSdk 28 / targetSdk 28 / buildToolsVersion 28.0.3**，必须兼容 Android 4.4。
- **API 19 兼容禁区**：所有 Java/Kotlin 代码用到的 SDK/JDK API 必须在 API 19 可用。**禁用** Java 8 default method、`Map.putIfAbsent` / `compute` / `getOrDefault`、`Optional`、`java.time`、`java.util.stream`、`Collection.forEach` / `removeIf`。即便 compileSdk 28 让 IDE 不报红，低版本盒子运行时仍会 `NoSuchMethodError`。需要等价能力时改用：循环 + 显式判空、`SimpleDateFormat` + `Calendar`、`for-each`。新增第三方依赖时同样核对其 minSdk。
- **构建用 JDK 8**（`jdk1.8.0_311`）。`sourceCompatibility/targetCompatibility = 1.8`，Kotlin `jvmTarget = 1.8`，kotlin 版本 `1.8.0`。
- **Gradle 插件 AGP `3.6.0`**（旧 Gradle，现代 Kotlin DSL / AGP 8.x 语法不适用）。

## 二、锁定版本表（来自 `config.gradle` 的 `ext.dependencies`，IPTV 开发统一用这些版本）

| 用途 | 坐标 |
| --- | --- |
| Support design / v4 / v7(appcompat) / annotations / recyclerview | `com.android.support:*:28.0.0`（最后一个 Support 版本，后续再升需整体迁 AndroidX） |
| ConstraintLayout | `com.android.support.constraint:constraint-layout:1.1.3` |
| MultiDex | `com.android.support:multidex:1.0.3` |
| OkHttp / okhttp-urlconnection | `com.squareup.okhttp3:okhttp(-urlconnection):3.12.1` |
| Retrofit + converter-gson + converter-simplexml + adapter-rxjava2 | `com.squareup.retrofit2:*:2.6.4` |
| Gson | `com.google.code.gson:gson:2.8.5` |
| RxJava2 | `io.reactivex.rxjava2:rxjava:2.2.12` |
| RxAndroid | 声明 `2.1.1`，但根 `build.gradle` 的 `resolutionStrategy` **强制改写为 `2.0.2`** |
| RxLifecycle + rxlifecycle-android | `com.trello.rxlifecycle2:*:2.2.2` |
| Glide + compiler + recyclerview-integration | `com.github.bumptech.glide:*:4.9.0` |
| glide-transformations | `jp.wasabeef:glide-transformations:4.1.0` |
| ARouter api / compiler | `com.alibaba:arouter-api:1.3.1` / `arouter-compiler:1.1.4` |
| EventBus | `org.greenrobot:eventbus:3.1.1` |
| Tinker lib / anno | `com.tencent.tinker:tinker-android-lib(-anno):1.9.1` |
| ButterKnife | `com.jakewharton:butterknife:7.0.1` |

`core` 内部（full-GAV）还锁定：`com.jakewharton:disklrucache:2.0.2`、`com.github.getActivity:XXPermissions:26.8`、`com.elvishew:xlog:1.11.1`。

**重要**：`core` 用 `api` 暴露了 support / rxjava2 / rxandroid / gson / okhttp / retrofit(全套) / glide / tinker / multidex / kotlin-stdlib。**下游依赖 `core` 即可传递获得这整套网络+图片+support 栈，不必重复声明**。若主工程确需单独声明其中某库，**版本必须与上表一致**，否则触发版本冲突。根 `build.gradle` 的 `subprojects.resolutionStrategy` 会把除 `multidex` 外所有 `com.android.support:*` 强制改写为 `28.0.0`。

## 三、仓库与发布坐标

依赖仓库顺序（主工程 `build.gradle` 需照此声明，内网仓库需公司网络）：
```
http://maven.aliyun.com/nexus/content/groups/public/      // 阿里云 public
http://maven.aliyun.com/nexus/content/repositories/jcenter // 阿里云 jcenter
https://jitpack.io
http://192.168.220.124:8082/repository/chances-release/    // 公司内网
jcenter() / google() / mavenCentral()
```
AAR 发布端点：Release `http://222.66.77.226:8081/repository/chances-release/`，Snapshot `http://222.66.77.226:8081/repository/chances-snapshot/`。

当前发布坐标（以各模块 `CHANGELOG.md` / 实际发布物为准）：

| 坐标 | 版本 | 说明 |
| --- | --- | --- |
| `com.chances.sdk:core` | `2.3.0` | 必需基础库。2.0.0 起不再内置 IJK |
| `com.chances.sdk:core-compiler` | `2.3.0` | core 的注解处理器(APT)，处理 http 缓存注解。与 core 严格成对（共享 http.annotation/interf 源码），core 升版即同号重发 |
| `com.chances.sdk:tvms` | `1.2.0` | TVMS 长连接(socket.io)+鉴权 |
| `com.chances.sdk:wslog` | `1.1.0` | 无 ADB 远程拉 logcat / 重启 / 装 APK（DEBUG 阶段） |
| `com.chances.sdk:player-ijk` | `1.1.0` | IJK 播放引擎；额外约 38MB so（三套 ABI） |
| `com.chances.sdk:player-exo` | `1.1.0` | ExoPlayer 播放引擎（`2.9.6`，最后一个不依赖 AndroidX 的版本）；HLS/DASH/SS/Progressive；.so 在 maven aar 内，无 jniLibs；仅阿里云 jcenter 镜像可拉 |
| `com.chances.sdk:iptv2ex` | `1.2.0` | IPTV2 浏览器壳 + JS Bridge + 内嵌播放器 |

> 注：`core` 与 `core-compiler` 通过 Gradle `sourceSets` 直接共享 `chances.core.http.annotation.*` / `chances.core.http.interf.*` 源码（非 jar 依赖），**两者版本号必须严格一致、成对发布**——core 升版时 core-compiler 即便代码无改动也同号重发，保证发布物快照对齐，否则运行时可能 `NoSuchMethodError` / `IncompatibleClassChangeError`。接入时两者用同一版本号：core `2.3.0` + core-compiler `2.3.0`。

## 四、Gradle 依赖声明（主工程 module `build.gradle`）

```groovy
dependencies {
    // 必需：基础库（传递带出 support / okhttp / retrofit / rxjava / glide 等整套栈）
    implementation 'com.chances.sdk:core:2.3.0'
    // 需要 http 缓存注解(@HttpStaticalCache/@HttpDynamicCache)时才加；版本号必须与 core 严格一致
    kapt 'com.chances.sdk:core-compiler:2.3.0'          // 纯 Java 工程用 annotationProcessor

    // 按需引入（不引入即不占体积）
    implementation 'com.chances.sdk:tvms:1.2.0'         // 长连接
    implementation 'com.chances.sdk:wslog:1.1.0'        // 远程日志（一般只 DEBUG 引）
    implementation 'com.chances.sdk:player-ijk:1.1.0'   // IJK 引擎，+~38MB so
    implementation 'com.chances.sdk:player-exo:1.1.0'   // ExoPlayer 引擎（需仓库含阿里云 jcenter 镜像拉 2.9.6）
    implementation 'com.chances.sdk:iptv2ex:1.2.0'      // IPTV2 业务壳
}
```

## 五、Application 初始化骨架

core 自带 5 个模块（Logger / ImageLoader / Player / Upgrade / Tinker）+ Http 走顶层门面 `chances.core.SdkCore.init(...)`，**全局只执行一次**。子模块各自有独立入口（wslog 用 `WsLog.init`；tvms / player-ijk / iptv2ex 见各自 reference）。

> ⚠️ **接入前必须与用户确认集成方式**:Application 初始化分两种方式,对应不同的 Application 类结构和 SdkCore.init 调用位置,**选错会导致 Tinker 补丁时序异常或 Application 类生成失败**。在落地代码前主动向用户确认:
>
>```
> 请选择 Application 集成方式:
> 1. 普通接入 — Application 直接继承 Application / BaseApplication,SdkCore.init 放在 Application.onCreate 末尾
> 2. Tinker 补丁接入 — 必须改造为 TinkerApplicationLike + @DefaultLifeCycle,SdkCore.init 放在 onTinkerReady() 内(同时支持整包升级 + 补丁热修)
> ```
>
> - 用户选 **1**(普通接入) → 读 **5.1** 节,跳过 5.2
> - 用户选 **2**(Tinker 接入) → 跳过 5.1,读 **5.2** 节概要 + [`references/tinker.md`](references/tinker.md) 全链路(含整包升级 + 补丁热修二合一)
> - 仅做整包升级(不补丁)的用户 → 仍走 **5.1** 节,`SdkCore.init(...)` 的 `upgrade` 参数正常传入即可,不需要 Tinker 类改造

### 5.1 普通接入（不启用 Tinker 补丁）

```kotlin
class OttApplication : Application() {       // 组件化主工程改继承 com.chances.base.common.BaseApplication

    override fun attachBaseContext(base: Context?) {
        super.attachBaseContext(base)
        MultiDex.install(base)               // 用 multidex 时必须最先调用
    }

    override fun onCreate() {
        super.onCreate()
        SdkCore.init(
            this,
            logger = LoggerConfig.builder()
                .debug(BuildConfig.DEBUG)
                .logLevel(if (BuildConfig.DEBUG) LogLevel.ALL else LogLevel.INFO)
                .build(),
            http = HttpConfig.builder().build(),          // Http 始终装配，不传也会走 default()
            imageLoader = ImageLoaderConfig.builder().build(),
            player = PlayerConfig.builder()               // 引入 player-ijk 时把 IJK 设为默认引擎
                .defaultPlayerFactory(IjkFactory::class.java)
                .build(),
            // upgrade 不传 = 不装升级模块（Tinker 作为 Upgrade 子配置一并收口）
        )
        // wslog 独立入口（可选，通常仅 DEBUG）
        WsLog.init(applicationContext, WsLogConfig.builder().build())
    }
}
```

要点：① 不传（传 `null`）= 不装该模块；② Logger 永远第一个装；③ `http` 即便传 `null` 也会用 `HttpConfig.default()` 强制装配，否则 `HttpClientManager.createClient` 会抛 `没有调用init方法进行初始化`。

### 5.2 Tinker 补丁接入（整包升级 + 补丁热修）

Tinker 补丁作为 `UpgradeConfig` 子配置注入（`SdkCore.init` 不再有独立 `tinker` 入参）。补丁能跑通需三件事，缺一不可：

1. **Application 改造** — 继承 `chances.core.upgrade.tinker.TinkerApplicationLike` + **自标** `@DefaultLifeCycle`（注解 `SOURCE` 保留、不随父类继承，宿主不自标就没有可实例化的 Application 类），编译期生成宿主 Application。
2. **Gradle `tinkerPatch {}` 构建配置** — `tinkerId` 一致性、`packageConfig`（`TINKER_ID` 带 `tinker_id_` 前缀 / `platform=all`）、`dex.loader=[]`、主 dex keep、基准/补丁同签名。**多数坑在这一步**。
3. **装配注入** — `onTinkerReady()` 内 `SdkCore.init(..., upgrade = UpgradeConfig.builder().tinker(TinkerConfig.default(this)).build())`，`this`（ApplicationLike）必填。

最小骨架（Java；Kotlin 差异见 tinker.md）：

```java
@DefaultLifeCycle(application = "your.app.AppTinkerApplication",
        flags = ShareConstants.TINKER_ENABLE_ALL, loadVerifyFlag = false)
public class AppTinkerApplicationLike extends TinkerApplicationLike {
    @Override
    protected void onTinkerReady() { AppInitializer.init(this); }   // this 透传给 TinkerConfig，必填
}
```

Manifest `application android:name` = 注解生成的 `your.app.AppTinkerApplication`（不是 Like 类）。

> **完整接入指南**（照着做到补丁生效）：`build.gradle` 的 `tinkerPatch {}` 全量脚本、主 dex keep、混淆/签名、`UpgradeFetcher` 实现、打补丁流程、Kotlin `protected override` 差异、补丁合成错误码 -7/-24、12 条踩坑速查表，见 [`references/tinker.md`](references/tinker.md)。

### 组件化主工程接入（沿用仓库约定）
- `gradle.properties` 写 `mainmodulename=<主 Module 名>`。
- 主 Application 继承 `com.chances.base.common.BaseApplication`，组件初始化放 `onCreate` 末尾，**禁止在 onCreate 中直接操作组件**。
- 主 module `build.gradle`：`apply plugin: 'com.chances.buildgradle'` + `combuild { applicationName=...; isRegisterCompoAuto=true }`；该插件只用于主工程，不用于 library。
- `proguard-rules.pro` 按 `com.chances.base.annotation.KeepAll` 注释配置；http 缓存需 `-keep class * implements chances.core.http.interf.IResponseDataChecker { *; }`。

## 六、模块地图（按需读对应 reference）

| 能力 | 入口类（真实存在） | 详见 |
| --- | --- | --- |
| 初始化门面 / 日志 / 图片 / 异常 / 错误码 | `chances.core.SdkCore`、`Logger`、各 `*Config`、`SdkException`、`SdkErrorCodeRegistry` | `references/core-init.md` |
| 升级（整包 + Tinker 补丁热修） | `UpgradeManager.checkUpdate()`、`UpgradeConfig`、`UpgradeFetcher`、`TinkerConfig`、`AppTinkerApplicationLike` | [`references/tinker.md`](references/tinker.md)（补丁全链路）、`references/core-init.md`（UpgradeConfig/TinkerConfig 字段） |
| 网络 + 缓存注解 | `chances.core.http.HttpClientManager` + `@HttpStaticalCache` / `@HttpDynamicCache` | `references/http.md` |
| 运行时权限 | `chances.core.permission.PermissionHelper` | `references/permission.md` |
| 播放器（系统 + IJK + ExoPlayer 热切换） | `chances.core.player.UniversalVideoView`、`PlayerKernel`、`player-ijk` 的 `IjkFactory`、`player-exo` 的 `ExoFactory` | `references/player.md` |
| TVMS 长连接 | `TvmsServerApi`（注入）+ `TvmsManager.connect`（**不存在 `Tvms.init`**） | `references/tvms.md` |
| 远程日志 | `chances.core.wslog.provider.WsLog` + `WsLogManager` | `references/wslog.md` |
| IPTV2 浏览器壳 / JS Bridge | `chances.core.iptv2ex.IPTV2ExtendsManager`、`IPTV2WebView`、`IPTV2ExplorerActivity` | `references/iptv2ex.md` |

> 反面提醒：CLAUDE.md / 旧文档提到的 `chances.core.tvms.Tvms.init(...)`、`chances.core.player.ijk.Ijk.init(...)` 在 head 代码中**不存在**，不要调用。tvms / IJK 的真实接法见对应 reference。

## §版本差异（按版本倒序，记录对调用方可观察的接入差异）

- **core 2.3.x / core-compiler 2.3.x / tvms 1.2.x / wslog 1.1.x / player-ijk 1.1.x / player-exo 1.1.x / iptv2ex 1.2.x（Support 库统一升至 28.0.0）**：
  - Support 库 `27.1.1` → `28.0.0`（最后一个 Support 版本；compileSdk 28 已满足，非 AndroidX，仍走 `android.support.*`）。经 `config.gradle` 的 `supportVersion` + 根 `build.gradle` 的 `resolutionStrategy.eachDependency` 全局统一，下游依赖传递获得的 support 版本同步升至 28.0.0。
  - **接入影响**：主工程若直接 `implementation 'com.android.support:*'`，版本须与 28.0.0 一致（`resolutionStrategy` 本也会强制改写）；后续若需再升 support，只能整体迁 AndroidX（support 28.0.0 是末版）。
  - `core-compiler` 跟随 core 同号 2.3.0 成对发布（共享 http 注解/接口子包未改动）。
- **core 2.2.x（升级库收口为「注入 SPI 检查 + 全局错误回调 + 流程驱动」）**：
  - **BREAKING**：升级库不再内置网络层。新增检查升级 SPI `chances.core.upgrade.UpgradeChecker`（外部实现 `checkUpgrade()` 同步网络+映射，经 `UpgradeConfig.checker(...)` 注入）；删除 `UpgradeServer` / `UpgradeServerApi` / `ServerTransformer` / `CheckUpdateRequest` / `UpdateServiceTransformer` / `OnUpdateServiceResultCallBack` / `OnCheckUpdateCallback`。`UpgradeConfig` 去掉 `upgradeServer` / `checkUpdateUrl` / `updateTransformer` / `checkUpgradeInterval`。
  - **BREAKING**：`UpgradeManager.checkUpdate()` 改为**无参无回调**——内部后台调注入的 `UpgradeChecker`、按 `mode` 驱动下载/安装/补丁；成功不回调。原 `checkUpdateManual/Auto(...)` / `getLastCheckTime()` 删除，定时/轮询由主工程自调度。
  - **BREAKING**：`CheckUpdateResponse.needUpdate`(String "1"/"2") → `mode`（复用 `UpgradeMode`：NORMAL/FORCE/PATCH/NONE，由外部 checker 设定）；字段改 `private` + getter/setter，新增 `toString()`。`UpgradeMode.from(...)` 判定工厂删除。
  - 新增全局错误回调 `UpgradeErrorCallback`（经 `UpgradeManager.setErrorCallback(...)` 注册），check/下载/补丁任意阶段错误统一收口为 `SdkException` 透传；`reportError` 改签名 `(SdkException)` 不再二次包装。
  - `UpgradeErrorCode` 删除 `SERVER_NOT_INJECTED`/`TRANSFORMER_NULL`/`CHECK_TIMEOUT`/`CHECK_HTTP_404`/`CHECK_JSON_ERROR`（网络阶段码外移），保留 `CHECK_UNKNOWN` + 下载阶段码。
  - **BREAKING**：Tinker 补丁配置收口进 `UpgradeConfig`。`SdkCore.init` 删除 `tinker` 形参——Tinker 经 `UpgradeConfig.tinker(TinkerConfig)` 子配置注入，`init` 内部从 `upgrade.tinker` 触发 `TinkerSetup`。`TinkerConfig` 包路径 `chances.core.upgrade.tinker.TinkerConfig` → `chances.core.upgrade.TinkerConfig`（迁入 `UpgradeConfig.kt` 同文件），类/`default(applicationLike)` 工厂/Builder API 不变，仅 import 路径变更。迁移：`SdkCore.init(tinker = TinkerConfig.default(this), ...)` → `SdkCore.init(upgrade = UpgradeConfig.builder().tinker(TinkerConfig.default(this)).build(), ...)`。
  - `core-compiler` 跟随 core 成对 bump 到 2.2.0（共享 `http.annotation` / `http.interf` 源码虽未改动，但按成对约束同号重发，保证发布物快照对齐）。
- **core 2.1.x / tvms 1.1.1 / iptv2ex 1.0.1（异常体系收口）**：
  - **BREAKING**：http / 下载 / 升级回调接口的错误参数统一改为 `chances.core.exception.SdkException`（原 `Throwable` / `String status`）。受影响接口：`RxJavaErrorCallback.onError(SdkException)`、`HttpClientManager.HttpErrorCallback.onRequestError(String, SdkException)`、`DownloadCallback.onDownloadFailure(SdkException)`、`UpgradeDownloadManager.UpgradeListener.onError(SdkException)`。**下游实现这些回调的 `@Override` 必须把形参类型改为 `SdkException`**，通过 `e.getCode()` 取错误码。播放器 `OnErrorListener.onError(PlayerErrorInfo)` 不变（播放器错误保留 what/extra 独立体系）。
  - 新增错误码：`HttpErrorCode`（MODULE="http"，10001-10901）、`LoggerErrorCode`（MODULE="logger"）、`Iptv2exErrorCode`（MODULE="iptv2ex"，54001）；`UpgradeErrorCode` 补 53100/53101，`TvmsErrorCode` 补 TVMS_30001-30003。均经各模块装配入口 `ensureRegistered()` 注册到 `SdkErrorCodeRegistry`，主工程 `getAll()` / `getGrouped()` 可一次性拉全。
  - `HttpClientManager`（未 init / baseUrl 非法）、各 `XxxServerApi`（Server 未注入）、`TvmsBootConfig`（Builder 校验）、`Logger`（未 init）等对外校验从原生 `RuntimeException` 等改抛 `SdkException`；`UpgradeManager.reportError(Throwable,message,errorCode)` 对外签名不变、内部统一构造 `SdkException`。
  - `core-compiler` 维持 2.0.0（本次未触及 `http.annotation` / `http.interf` 共享子包）。
- **player-exo 1.0.x**：首次发布，新增第三套播放引擎 `ExoFactory`（`chances.core.player.exo.*`），基于 ExoPlayer `2.9.6`（最后一个不依赖 AndroidX 的版本，仅阿里云 jcenter 镜像可拉）。支持 HLS/DASH/SS/Progressive，经 `UniversalVideoView.setPlayerType(ExoFactory.class)` 或 `PlayerConfig.defaultPlayerFactory(ExoFactory.class)` 接入，与 IJK 风格一致。`compileOnly(project(':core'))`，运行时需 core>=2.0.0。
- **core-compiler 2.0.x**：跟随 core 2.0.0 成对发布，注解处理逻辑无变更；坐标版本号须与 core 严格一致。
- **tvms 1.1.x**：删除 `client/ClientHelper.md5(String)` / `SignUtils.encodeHexString`/`encodeHex` 等重复实现的 public 方法（改用 core `MD5Utils.md5` / `StringUtils.toHexString1`），内部日志改走 `Logger`。均为无外部使用方的内部清理，常规接入无感。
- **core 2.0.x**：拆出 IJK 为独立模块 `player-ijk`，core 不再内置 IJK；装配统一走 `SdkCore.init(...)` 门面（取代历史 `SdkSetup` / `Installer` SPI / `CoreInitializer`）。`http` 参数始终强制装配。
