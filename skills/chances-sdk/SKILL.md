---
name: chances-sdk
description: >-
  成思 IPTV Android 封装库（com.chances.sdk:* AAR：core / tvms / wslog / player-ijk /
  iptv2ex / core-compiler）的接入与开发指南，并锁定 IPTV 开发的全部依赖库版本与编译约束。
  只要在依赖了 com.chances.sdk:* 的 Android IPTV 主工程里干以下任何事，就必须用本 skill（即使用户没点名）：
  声明/选择第三方库版本（OkHttp / Retrofit / RxJava / Glide / ARouter / EventBus / Tinker / ButterKnife /
  support 等）、设置 minSdk / compileSdk、在 Application 里初始化 SdkCore、调用日志(Logger)/图片加载/
  播放器(UniversalVideoView / IJK)/网络(HttpClientManager + 缓存注解)/权限(PermissionHelper)/
  长连接(tvms)/远程日志(wslog)/IPTV2 浏览器壳(iptv2ex)、处理 SdkException 错误码、判断某个 Java/Kotlin
  API 在 Android 4.4(API 19) 上能不能用。涉及 IPTV 盒子开发、低版本兼容、support 包(非 AndroidX)
  工程时也要主动用。
---

# chances-sdk：IPTV 封装库接入与版本锁定

> **适用版本：core 2.0.x / tvms 1.0.x / wslog 1.0.x / player-ijk 1.0.x / iptv2ex 1.0.x / core-compiler 1.0.x**
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
| Support design / v4 / v7(appcompat) / annotations / recyclerview | `com.android.support:*:27.1.1` |
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

**重要**：`core` 用 `api` 暴露了 support / rxjava2 / rxandroid / gson / okhttp / retrofit(全套) / glide / tinker / multidex / kotlin-stdlib。**下游依赖 `core` 即可传递获得这整套网络+图片+support 栈，不必重复声明**。若主工程确需单独声明其中某库，**版本必须与上表一致**，否则触发版本冲突。根 `build.gradle` 的 `subprojects.resolutionStrategy` 会把除 `multidex` 外所有 `com.android.support:*` 强制改写为 `27.1.1`。

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
| `com.chances.sdk:core` | `2.0.0` | 必需基础库。2.0.0 起不再内置 IJK |
| `com.chances.sdk:core-compiler` | `1.0.2` | core 的注解处理器(APT)，处理 http 缓存注解 |
| `com.chances.sdk:tvms` | `1.0.0` | TVMS 长连接(socket.io)+鉴权 |
| `com.chances.sdk:wslog` | `1.0.0` | 无 ADB 远程拉 logcat / 重启 / 装 APK（DEBUG 阶段） |
| `com.chances.sdk:player-ijk` | `1.0.0` | IJK 播放引擎；额外约 38MB so（三套 ABI） |
| `com.chances.sdk:iptv2ex` | `1.0.0` | IPTV2 浏览器壳 + JS Bridge + 内嵌播放器 |

> 注：仓库约定 `core` 与 `core-compiler` 版本应成对一致，但当前 head 实际是 `core 2.0.0` + `core-compiler 1.0.2`。接入时**以你实际拉到的坐标版本为准**，并核对两者 CHANGELOG。

## 四、Gradle 依赖声明（主工程 module `build.gradle`）

```groovy
dependencies {
    // 必需：基础库（传递带出 support / okhttp / retrofit / rxjava / glide 等整套栈）
    implementation 'com.chances.sdk:core:2.0.0'
    // 需要 http 缓存注解(@HttpStaticalCache/@HttpDynamicCache)时才加，版本随 core
    kapt 'com.chances.sdk:core-compiler:1.0.2'          // 纯 Java 工程用 annotationProcessor

    // 按需引入（不引入即不占体积）
    implementation 'com.chances.sdk:tvms:1.0.0'         // 长连接
    implementation 'com.chances.sdk:wslog:1.0.0'        // 远程日志（一般只 DEBUG 引）
    implementation 'com.chances.sdk:player-ijk:1.0.0'   // IJK 引擎，+~38MB so
    implementation 'com.chances.sdk:iptv2ex:1.0.0'      // IPTV2 业务壳
}
```

## 五、Application 初始化骨架

core 自带 5 个模块（Logger / ImageLoader / Player / Tinker / Upgrade）+ Http 走顶层门面 `chances.core.SdkCore.init(...)`，**全局只执行一次**。子模块各自有独立入口（wslog 用 `WsLog.init`；tvms / player-ijk / iptv2ex 见各自 reference）。

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
            // tinker / upgrade 不传 = 不装
        )
        // wslog 独立入口（可选，通常仅 DEBUG）
        WsLog.init(applicationContext, WsLogConfig.builder().build())
    }
}
```

要点：① 不传（传 `null`）= 不装该模块；② Logger 永远第一个装；③ `http` 即便传 `null` 也会用 `HttpConfig.default()` 强制装配，否则 `HttpClientManager.createClient` 会抛 `没有调用init方法进行初始化`。

### 组件化主工程接入（沿用仓库约定）
- `gradle.properties` 写 `mainmodulename=<主 Module 名>`。
- 主 Application 继承 `com.chances.base.common.BaseApplication`，组件初始化放 `onCreate` 末尾，**禁止在 onCreate 中直接操作组件**。
- 主 module `build.gradle`：`apply plugin: 'com.chances.buildgradle'` + `combuild { applicationName=...; isRegisterCompoAuto=true }`；该插件只用于主工程，不用于 library。
- `proguard-rules.pro` 按 `com.chances.base.annotation.KeepAll` 注释配置；http 缓存需 `-keep class * implements chances.core.http.interf.IResponseDataChecker { *; }`。

## 六、模块地图（按需读对应 reference）

| 能力 | 入口类（真实存在） | 详见 |
| --- | --- | --- |
| 初始化门面 / 日志 / 图片 / 异常 / 错误码 | `chances.core.SdkCore`、`Logger`、各 `*Config`、`SdkException`、`SdkErrorCodeRegistry` | `references/core-init.md` |
| 网络 + 缓存注解 | `chances.core.http.HttpClientManager` + `@HttpStaticalCache` / `@HttpDynamicCache` | `references/http.md` |
| 运行时权限 | `chances.core.permission.PermissionHelper` | `references/permission.md` |
| 播放器（系统 + IJK 热切换） | `chances.core.player.UniversalVideoView`、`PlayerKernel`、`player-ijk` 的 `IjkFactory` | `references/player.md` |
| TVMS 长连接 | `TvmsServerApi`（注入）+ `TvmsManager.connect`（**不存在 `Tvms.init`**） | `references/tvms.md` |
| 远程日志 | `chances.core.wslog.provider.WsLog` + `WsLogManager` | `references/wslog.md` |
| IPTV2 浏览器壳 / JS Bridge | `chances.core.iptv2ex.IPTV2ExtendsManager`、`IPTV2WebView`、`IPTV2ExplorerActivity` | `references/iptv2ex.md` |

> 反面提醒：CLAUDE.md / 旧文档提到的 `chances.core.tvms.Tvms.init(...)`、`chances.core.player.ijk.Ijk.init(...)` 在 head 代码中**不存在**，不要调用。tvms / IJK 的真实接法见对应 reference。

## §版本差异（按版本倒序，记录对调用方可观察的接入差异）

- **core 2.0.x**：拆出 IJK 为独立模块 `player-ijk`，core 不再内置 IJK；装配统一走 `SdkCore.init(...)` 门面（取代历史 `SdkSetup` / `Installer` SPI / `CoreInitializer`）。`http` 参数始终强制装配。
