# Tinker 补丁接入（全链路）

> **适用版本**：core 2.3.x。本文档目标：下游主工程**只看这一篇**即可把 Tinker 补丁热修跑通——从 Application 改造、Gradle `tinkerPatch` 脚本、主 dex keep、混淆/签名，到打补丁、下发、合成、重启。
>
> 与 `core-init.md` 的关系：`core-init.md` 只列 `TinkerConfig` 字段；本文档讲**完整接入流程**。两者冲突以本文档为准。

## 一、适用边界

| 场景 | 走哪 |
| --- | --- |
| 仅整包升级（NORMAL/FORCE，下载新 apk 安装） | `SKILL.md` §5.1 普通接入，**不需要本文档**，不要继承 `TinkerApplicationLike` |
| 要补丁热修（PATCH，下发差量包合成） | **本文档** |

补丁能力收口在 `UpgradeConfig.tinker` 子配置里，**没有独立 `Tinker.init` 门面**；`SdkCore.init` 也不再暴露独立 `tinker` 入参。补丁是"应用升级"的一部分，与整包升级共用同一个 `UpgradeConfig`，由 `UpgradeFetcher` 返回的 `mode = PATCH` 触发。

## 二、接入总览（三件事，缺一不可）

三件事对应的坑**绝大多数集中在第②件 Gradle 侧**——照抄本文档第四节可一次过。

| # | 事项 | 作用 |
| --- | --- | --- |
| ① | Application 改造 | 自标 `@DefaultLifeCycle`，编译期生成宿主 Application，让 Tinker 安装时序先于业务初始化 |
| ② | Gradle 构建配置 | `tinkerPatch {}` 脚本：`tinkerId` 一致性 / `packageConfig` meta / `dex.loader` / 签名 / 主 dex keep |
| ③ | 装配注入 | `onTinkerReady()` 内 `SdkCore.init(..., upgrade = UpgradeConfig.builder().tinker(TinkerConfig.default(this)).build())` |

运行时启动时序（理解了就不容易踩坑）：

```
系统启动 → @DefaultLifeCycle 生成的 AppTinkerApplication
       → attachBaseContext: MultiDex.install（基类 TinkerApplicationLike 已封装）
       → onCreate: 基类回调 onTinkerReady()
            → AppInitializer.init(this)
                 → SdkCore.init(upgrade = UpgradeConfig.builder()
                     .fetcher(...).tinker(TinkerConfig.default(this)).build())
                      → TinkerSetup.apply → TinkerManager.installTinker（Tinker 安装）
                      → UpgradeManager 就绪（等业务调 checkUpdate() 触发补丁流程）
```

## 三、Application 改造

### 3.1 新建 `AppTinkerApplicationLike`（Java，与 `app` 联调宿主跑通版一致）

```java
package your.app;

import android.app.Application;
import android.content.Intent;

import com.tencent.tinker.anno.DefaultLifeCycle;
import com.tencent.tinker.loader.shareutil.ShareConstants;

import chances.core.upgrade.tinker.TinkerApplicationLike;

/**
 * 宿主 Tinker ApplicationLike。
 *
 * @DefaultLifeCycle 在编译期生成宿主专属 Application 类（本例 your.app.AppTinkerApplication），
 * AndroidManifest 的 application android:name 指向该生成类。
 * 基类 TinkerApplicationLike 已封装 MultiDex.install + Tinker 安装时序，子类只需实现
 * onTinkerReady() 做业务初始化（等价老 Application.onCreate 末尾）。
 */
@DefaultLifeCycle(
        application = "your.app.AppTinkerApplication",   // 编译期生成的 Application 全限定名
        flags = ShareConstants.TINKER_ENABLE_ALL,
        loadVerifyFlag = false)
public class AppTinkerApplicationLike extends TinkerApplicationLike {

    public AppTinkerApplicationLike(Application application, int tinkerFlags,
                                    boolean tinkerLoadVerifyFlag, long applicationStartElapsedTime,
                                    long applicationStartMillisTime, Intent tinkerResultIntent) {
        super(application, tinkerFlags, tinkerLoadVerifyFlag, applicationStartElapsedTime,
                applicationStartMillisTime, tinkerResultIntent);
    }

    @Override
    protected void onTinkerReady() {
        AppInitializer.init(this);   // this 即 ApplicationLike，透传给 TinkerConfig，必填
    }
}
```

### 3.2 为什么必须自标 `@DefaultLifeCycle`（不能只靠父类的注解）

`@DefaultLifeCycle` 的 `@Retention(SOURCE)` 决定它**不随父类继承**。core 基类上的注解只会让 APT 生成 `chances.core.upgrade.tinker.CoreTinkerApplication`，而这个类反射加载的是抽象基类、无法实例化。**宿主不自己标注解，运行期就没有可实例化的具体 Application 类**，启动直接崩。

### 3.3 AndroidManifest 指向生成的类（不是 Like 类）

```xml
<application
    android:name="your.app.AppTinkerApplication"   <!-- 编译期生成，不是 AppTinkerApplicationLike -->
    ... >
```

### 3.4 Kotlin 工程差异（关键坑）

基类 `onTinkerReady()` 是 `protected abstract`。Kotlin 子类 override 时**必须保留 `protected`**：

```kotlin
@DefaultLifeCycle(application = "your.app.AppTinkerApplication",
        flags = ShareConstants.TINKER_ENABLE_ALL, loadVerifyFlag = false)
class AppTinkerApplicationLike(
    application: Application, tinkerFlags: Int, tinkerLoadVerifyFlag: Boolean,
    applicationStartElapsedTime: Long, applicationStartMillisTime: Long, tinkerResultIntent: Intent
) : TinkerApplicationLike(application, tinkerFlags, tinkerLoadVerifyFlag,
    applicationStartElapsedTime, applicationStartMillisTime, tinkerResultIntent) {

    protected override fun onTinkerReady() {   // ★ 必须 protected，漏了编译报 exposes protected member
        AppInitializer.init(this)
    }
}
```

漏 `protected`（默认 public）→ 编译报 `'onTinkerReady' in 'TinkerApplicationLike' is protected and cannot be exposed in public`。

## 四、Gradle 构建配置（主工程 module `build.gradle`）

本节是接入的核心，所有 Gradle 侧坑都在这里。4.1~4.8 是 `build.gradle` 的散件配置，4.9 是 `tinkerPatch {}` 整块脚本。

### 4.1 根 `build.gradle`：patch 插件 classpath

```groovy
buildscript {
    dependencies {
        //  Tinker 补丁打包插件。版本与运行时 lib 不同:
        //  运行时 lib/anno 是 1.9.1（经 core 传递），patch 插件是 1.9.14.17，二者独立、不可混用坐标
        classpath 'com.tencent.tinker:tinker-patch-gradle-plugin:1.9.14.17'
    }
}
```

> **常见混淆**：patch 插件版本（`1.9.14.17`）与运行时 lib 版本（`1.9.1`）是**两个独立坐标、各自升版本**。不要因数字不一致就强行对齐——对齐反而引入未经验证的组合。

### 4.2 主工程依赖声明

```groovy
dependencies {
    implementation 'com.chances.sdk:core:2.3.0'   // core 经 api 已传递带出 tinker-android-lib，无需重复声明 lib

    // Tinker @DefaultLifeCycle 注解处理器:编译期生成宿主 Application 类
    kapt rootProject.ext.dependencies["Tinker-Anno"]
    // @DefaultLifeCycle（SOURCE 保留）需在编译期可解析;同时显式 annotationProcessor 满足
    // AGP 对 compile classpath 上注解处理器的强制声明要求
    compileOnly rootProject.ext.dependencies["Tinker-Anno"]
    annotationProcessor rootProject.ext.dependencies["Tinker-Anno"]
}
```

`Tinker-Anno` = `com.tencent.tinker:tinker-android-anno:1.9.1`（`config.gradle` 的 key）。**不要**再声明 `tinker-android-lib`，core 已 `api` 传递。三处声明（`kapt`/`compileOnly`/`annotationProcessor`）缺一不可：`kapt` 触发 APT 生成 Application，`compileOnly` 让源码编译期能引用注解，`annotationProcessor` 满足 AGP 对注解处理器的显式声明要求。

### 4.3 tinkerId 机制（基准包与补丁包的匹配依据）

```groovy
//  取 git 短哈希做 tinkerId:基准包与补丁包必须用同一个值，否则补丁合成报 -7（TINKER_ID_NOT_EQUAL）
def gitSha = {
    try {
        def proc = 'git rev-parse --short HEAD'.execute(null, rootDir)
        proc.waitFor()
        return proc.exitValue() == 0 ? proc.text.trim() : 'nogit'
    } catch (Exception ignored) { return 'nogit' }
}()
def tinkerIdValue = "git-${gitSha}"

android {
    defaultConfig {
        //  基准包自报 tinkerId，运行期与补丁包 packageConfig 的 TINKER_ID 比对
        buildConfigField "String", "TINKER_ID", "\"${tinkerIdValue}\""
    }
}
```

> 关键：**同一批基准包与补丁包必须用同一个 `tinkerId`**。打基准包后改了代码出补丁，不要重新生成 `tinkerId`（git 哈希会变）——要么固定一个值，要么打补丁前回退到基准包那个 commit。app 宿主用 git 短哈希，主工程可用任意稳定来源（版本号、构建号）。

### 4.4 主 dex keep 配置（API 19 必需，高频坑）

minSdk 19 低于 21，MultiDex 在运行时安装。**补丁加载链路与 `MultiDex.install` 之前就要用到的类必须进主 `classes.dex`**，否则 4.4 设备启动即 `ClassNotFound` 崩溃。经 `multiDexKeepProguard` 指定：

```groovy
android {
    defaultConfig {
        multiDexKeepProguard file('multidex-keep.pro')
    }
}
```

`multidex-keep.pro`（用通配符覆盖继承链，新增宿主或 core 再封一层都**无需改本文件**）：

```
# minSdk 19(<21)主 dex keep。以下类在 Application.attachBaseContext -> MultiDex.install 之前被加载，
# 必须进主 classes.dex，否则 4.4 设备启动即 ClassNotFound 崩溃。
# 注:本文件语义是"进主 dex"，与 proguard-rules.pro 的"不混淆"是两套独立机制，都需要。
# 用通配符对齐 Tinker 官方 keep:自动覆盖宿主 AppTinkerApplication/AppTinkerApplicationLike
# 与 core 封装 TinkerApplicationLike,新增宿主或 core 再封装无需改本文件。

# Tinker 加载器全量进主 dex(补丁加载链路起点,install 前即被加载)
-keep class com.tencent.tinker.loader.** { *; }
# @DefaultLifeCycle 生成的宿主 Application(manifest android:name 指向它)
-keep class * extends com.tencent.tinker.loader.app.TinkerApplication { *; }
# 所有 ApplicationLike 子类(宿主 Like + core 封装 Like)
-keep class * extends com.tencent.tinker.loader.app.ApplicationLike { *; }
# MultiDex 自身(install 前即调用)
-keep class android.support.multidex.** { *; }
```

> **主 dex keep ≠ 不混淆**：这是两套独立机制。`multidex-keep.pro` 决定类**进哪个 dex**（强制进主 dex），`proguard-rules.pro` 决定类**是否被混淆**。开混淆时两者都要配，缺任一都会崩。

### 4.5 签名配置（基准/补丁同把钥匙）

```groovy
android {
    signingConfigs {
        release {
            //  基准包与补丁包必须同一把钥匙，否则补丁签名校验失败无法加载
            storeFile file("${System.properties['user.home']}/.android/debug.keystore")
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

联调可复用 `debug.keystore`，生产用正式签名。**铁律：基准包与补丁包必须同一把钥匙**。

### 4.6 混淆配置（ProGuard / R8）

**推荐：关混淆（`minifyEnabled false`）**。理由：① AGP 3.6.0 强制 R8，R8 对 support FileProvider 体系会把系统接口 `XmlResourceParser.getAttributeValue` 改名，致启动 `installContentProviders` `NoSuchMethodError`，任何 keep 规则均压不住；② Tinker 官方建议关优化（优化破坏补丁 diff 稳定性）。

```groovy
buildTypes {
    release {
        minifyEnabled false   // 关混淆
        signingConfig signingConfigs.release
    }
}
```

**主工程若必须开混淆**（生产交付常需），三步：
1. `tinkerPatch.buildConfig` 里 `applyMapping`/`applyResourceMapping` 指向基准包的 `mapping.txt`/`resources.txt`（4.9 脚本已条件化处理），保证补丁混淆名与基准一致。
2. `proguard-rules.pro` 加 Tinker 相关 keep：

```
# Tinker 运行时全量不混淆 + 抑制第三方库警告(com.tencent.tinker.** 已含 loader.**,不重复列)
-keep class com.tencent.tinker.** { *; }
-dontwarn com.tencent.tinker.**
# @DefaultLifeCycle 生成的宿主 Application + 所有 ApplicationLike 子类(宿主 Like + core 封装 Like)
# 用通配符对齐官方 keep:新增宿主或 core 再封一层,无需改本文件
-keep class * extends com.tencent.tinker.loader.app.TinkerApplication { *; }
-keep class * extends com.tencent.tinker.loader.app.ApplicationLike { *; }
# @DefaultLifeCycle 是 SOURCE 保留、不随父类继承,宿主自标的注解类不混淆
-keep @com.tencent.tinker.anno.DefaultLifeCycle class * { *; }
# core Tinker 封装包(装配链路反射,整包不混淆)
-keep class chances.core.upgrade.tinker.** { *; }
# MultiDex
-keep class android.support.multidex.** { *; }
```

3. 每次打基准包把 `mapping.txt`/`resources.txt` 拷到 `baseApk/`（与 apk 同目录）。

> app 联调宿主关混淆（`minifyEnabled false`）。开混淆路径的 keep 规则按 Tinker 官方 + 本工程结构整理，主工程启用前请在 Android 4.4 真机验证一次启动与补丁合成。

### 4.7 依赖排除（xpp3 / simple-xml，启动崩溃坑）

经 `retrofit2:converter-simplexml` 传递引入 `xpp3`/`simple-xml`，会拖入一份完整 `org.xmlpull` 实现，打进 APK 后污染系统 `XmlPullParser`，致 FileProvider 启动 `NoSuchMethodError` 崩溃。`org.xmlpull` 接口 Android 系统已自带，整链排除不影响（本工程无 SimpleXML 用法）：

```groovy
configurations.all {
    exclude group: 'xpp3', module: 'xpp3'
    exclude group: 'com.squareup.retrofit2', module: 'converter-simplexml'
    exclude group: 'org.simpleframework', module: 'simple-xml'
    exclude group: 'stax', module: 'stax'
    exclude group: 'stax', module: 'stax-api'
    exclude group: 'xmlpull', module: 'xmlpull'
}
```

### 4.8 apply plugin 位置

```groovy
//  必须在 android{} 之后 apply:patch 插件要拿到 android 变体（variant）
apply plugin: 'com.tencent.tinker.patch'
```

### 4.9 `tinkerPatch {}` 完整脚本（照抄，关键 why 已逐项标注）

```groovy
tinkerPatch {
    //  基准包:打补丁前把上次 assembleRelease 的产物拷到工程内固定目录（见第七节流程），
    //  用固定目录而非 build/ 是避免 clean 后丢失基准产物
    oldApk = "${projectDir}/baseApk/app-release.apk"
    //  loader 留空（见下方 dex.loader）时，放行 Tinker 对"加载链路类引用非 loader 类"的保守警告
    ignoreWarning = true
    //  开启签名:补丁包用 release signingConfig 重签，与基准包同钥匙
    useSign = true
    tinkerEnable = true

    buildConfig {
        //  沿用基准包 mapping，保证补丁混淆名与基准一致。条件化:关混淆时不产出 mapping/resources，
        //  文件缺失却仍 apply 会让 tinkerPatch 报错;故仅当文件存在（主工程开混淆场景）才 apply
        def mappingFile = file("${projectDir}/baseApk/mapping.txt")
        def resMappingFile = file("${projectDir}/baseApk/resources.txt")
        if (mappingFile.exists()) { applyMapping = mappingFile.absolutePath }
        if (resMappingFile.exists()) { applyResourceMapping = resMappingFile.absolutePath }
        //  与 BuildConfig.TINKER_ID 同源:基准包/补丁包匹配依据
        tinkerId = tinkerIdValue
    }

    dex {
        dexMode = "jar"
        pattern = ["classes*.dex"]
        //  loader 留空。Tinker 默认已把 com.tencent.tinker.loader.* 与 ApplicationLike 等加载链路类
        //  视为 loader，无需显式列;显式把它们列进 loader 反而触发"loader 类引用非 loader 类
        //  (MultiDex / AppInitializer)"的 FATAL。配合上面的 ignoreWarning=true 即可正常打补丁
        loader = []
    }

    lib {
        pattern = ["lib/*/*.so"]
    }

    res {
        pattern = ["res/*", "r/*", "assets/*", "resources.arsc", "AndroidManifest.xml"]
        ignoreChange = []
        largeModSize = 100
    }

    packageConfig {
        configField("patchMessage", "tinker patch")
        //  ★ 补丁 meta 的 TINKER_ID 必须与基准包 manifest 的 TINKER_ID 一致，否则合成报 -7
        //  (ERROR_PATCH_TINKERID_NOT_EQUAL)。tinker plugin 注入 manifest 时会自动给 tinkerId 加
        //  "tinker_id_" 前缀，但 packageConfig 不会自动加，故这里手动补前缀对齐
        configField("TINKER_ID", "tinker_id_${tinkerIdValue}")
        //  与 TinkerManager.getPatchVersion 读取的 packageConfig 对齐
        configField("patchVersion", "1.0")
        //  ★ core 的 TinkerPatchListener.patchCheck 会读补丁 meta 的 platform，为空返回 -24
        //  (ERROR_PATCH_CONDITION_NOT_SATISFIED)拒绝合成。必须注入，否则补丁收不下
        configField("platform", "all")
    }

    sevenZip {
        //  走仓库拉 7za，免装本地 7z
        zipArtifact = "com.tencent.mm:SevenZip:1.1.10"
    }
}
```

> **三个"不配就合成失败/拒收"的字段**（最高频坑）：`packageConfig.TINKER_ID`（带 `tinker_id_` 前缀）、`packageConfig.platform = "all"`、`tinkerId` 与基准包一致。三者缺任一，补丁要么 -7 要么 -24。

## 五、装配注入（`onTinkerReady()` 内）

### 5.1 AppInitializer（业务初始化器）

```kotlin
package your.app

import com.tencent.tinker.loader.app.ApplicationLike
import your.app.BuildConfig                      // 主工程自己的 BuildConfig（包名按实际替换）
import chances.core.SdkCore
import chances.core.http.HttpConfig
import chances.core.imageloader.ImageLoaderConfig
import chances.core.log.LogLevel
import chances.core.log.LoggerConfig
import chances.core.player.common.PlayerConfig
import chances.core.player.ijk.IjkFactory
import chances.core.upgrade.TinkerConfig
import chances.core.upgrade.UpgradeConfig

object AppInitializer {

    /** 由 AppTinkerApplicationLike.onTinkerReady() 调用一次。 */
    @JvmStatic
    fun init(appLike: ApplicationLike) {
        val app = appLike.application

        SdkCore.init(
            app,
            logger = LoggerConfig.builder()
                .debug(BuildConfig.DEBUG)
                .logLevel(if (BuildConfig.DEBUG) LogLevel.ALL else LogLevel.INFO)
                .build(),
            http = HttpConfig.builder().build(),
            imageLoader = ImageLoaderConfig.builder().build(),
            player = PlayerConfig.builder().defaultPlayerFactory(IjkFactory::class.java).build(),
            upgrade = UpgradeConfig.builder()
                .fetcher(AppUpgradeFetcher(app))            // 必填:升级检查 SPI，见 5.2
                .tinker(TinkerConfig.default(appLike))      // ★ appLike 必填(this)，触发 Tinker 装配
                .build()
        )
    }
}
```

要点：
- `TinkerConfig.default(appLike)` 的 `appLike` **必填**（即 `AppTinkerApplicationLike` 自身）；留空时 `TinkerSetup.apply` 只打 warn 日志跳过装配，补丁永远不生效。
- `UpgradeConfig.tinker(...)` 非 null 时，`SdkCore.init` 内部先 `TinkerSetup.apply` 装配 Tinker，再装配 Upgrade。
- `fetcher` 必填（`UpgradeConfig.build()` 未注入会抛 `SdkException(CHECK_FETCHER_NULL)`）。它是补丁能下发的源头——fetcher 返回 `mode = PATCH` 才触发补丁流程。

### 5.2 UpgradeFetcher 实现（决定何时走补丁）

`UpgradeFetcher` 是升级检查 SPI，外部实现 `fetch(callback)`：自选网络库请求升级后端，把响应映射成 `UpgradeResponse` 经 `callback.onSuccess` 交回 SDK。**是否走补丁取决于 `UpgradeResponse.mode`**：响应带 `patchDownloadUrl` 且应用层判定可补丁 → 设 `mode = UpgradeMode.PATCH`，core 自动走 Tinker 下载合成 + 重启框。

完整模板见 `core-init.md` 的 `UpgradeFetcher` 节；跑通参照见 `app/src/main/java/chances/app/activity/upgrade/AppUpgradeFetcher.kt`。关键映射：

```kotlin
resp.mode = when {
    needUpdate == "2" -> UpgradeMode.FORCE                  // 强制整包
    needUpdate == "1" -> UpgradeMode.NORMAL                 // 默认整包
    patchUrl.isNotEmpty() -> UpgradeMode.PATCH              // ★ 有补丁地址走补丁
    else -> UpgradeMode.NONE
}
```

## 六、AndroidManifest 与权限

- `application android:name` = `@DefaultLifeCycle` 生成的类（`your.app.AppTinkerApplication`），**不是** Like 类。
- Tinker 补丁下载落盘复用整包升级的存储权限，按主工程既有声明即可，Tinker 不额外要权限。

## 七、打补丁操作流程

> task 命名规则：`tinkerPatch${VariantName}`。无 flavor 工程 = `tinkerPatchRelease`；有 flavor（如 `local`/`remote`）= `tinkerPatchLocalRelease`。

1. **出基准包**：`./gradlew :app:assembleRelease`（下游按自己 variant 替换；产物 `app/build/outputs/apk/<flavor>/release/*.apk`）。
2. **拷基准到固定目录**：把基准 apk 拷到 `${projectDir}/baseApk/app-release.apk`（对齐 `oldApk`）。**开混淆的工程**额外拷 `mapping.txt` / `resources.txt` 到同目录（关混淆工程跳过）。
3. **改业务代码**（修 bug）。**不要动 `tinkerId`**——基准包与补丁包必须同 id，改了就匹配不上（合成 -7）。
4. **出补丁**：`./gradlew :app:tinkerPatchRelease`，产物在 `app/build/outputs/apk/<flavor>/tinkerPatch/<flavor>/release/`，下发 `*-patch_signed.apk`（签名版；`*_7zip.apk` 是 7z 压缩版，二选一）。
5. **下发并触发**：补丁 apk 放到升级后端可下载处，业务调 `UpgradeManager.getInstance().checkUpdate()`（无参）；fetcher 返回 `mode = PATCH`（响应带 `patchDownloadUrl`）→ core 自动下载 → Tinker 合成 → 弹重启框 → 重启后补丁生效。任意阶段错误经 `UpgradeManager.setErrorCallback { ... }` 收口为 `SdkException` 透传。

## 八、踩坑速查表

| # | 现象 | 根因 | 对策 | 错误码/表现 |
| --- | --- | --- | --- | --- |
| 1 | 补丁合成失败 | 基准包与补丁包 `tinkerId` 不一致 | 用同一 `tinkerIdValue`；`packageConfig` 的 `TINKER_ID` 手动加 `tinker_id_` 前缀对齐 manifest | `-7` `ERROR_PATCH_TINKERID_NOT_EQUAL` |
| 2 | 补丁收到但拒收 | `packageConfig.platform` 为空，`TinkerPatchListener.patchCheck` 判不过 | `configField("platform", "all")` | `-24` `ERROR_PATCH_CONDITION_NOT_SATISFIED` |
| 3 | 打补丁构建 FATAL | 显式把 loader/ApplicationLike 列进 `dex.loader`，触发"loader 引用非 loader 类" | `dex.loader = []` 留空 + `ignoreWarning = true` | 构建期 FATAL |
| 4 | 补丁签名校验失败 | 基准包与补丁包用了不同签名钥匙 | `release.signingConfig` 基准/补丁同把钥匙，`useSign = true` | 加载失败 |
| 5 | `tinkerPatch` 报 mapping 文件缺失 | 关混淆（`minifyEnabled false`）不产出 mapping，却仍 `applyMapping` | `applyMapping`/`applyResourceMapping` 条件化：文件存在才 apply | 构建报错 |
| 6 | `clean` 后打补丁 `oldApk` 找不到 | `oldApk` 指向 `build/`（会被 clean 清掉） | `oldApk` 指工程内固定目录 `baseApk/`，基准包拷进去 | 构建报错 |
| 7 | Android 4.4 启动即 ClassNotFound | loader / 生成的 Application / Like / 基类 / support-multidex 没进主 dex | `multiDexKeepProguard file('multidex-keep.pro')` keep 上述类 | 启动崩溃 |
| 8 | Kotlin 编译 `'onTinkerReady' exposes 'protected' member` | override 时漏 `protected`（默认 public） | `protected override fun onTinkerReady()` | 编译报错 |
| 9 | 启动 `installContentProviders` `NoSuchMethodError` | R8 改系统接口 `XmlResourceParser.getAttributeValue`；且 `xpp3`/`simple-xml` 污染 `XmlPullParser` | `minifyEnabled false` + `configurations.all { exclude ... xpp3/simple-xml }` | 启动崩溃 |
| 10 | 运行期找不到宿主 Application 类 | `@DefaultLifeCycle` 是 `SOURCE` 保留、不随父类继承，宿主没自标 | 宿主 `AppTinkerApplicationLike` 自标 `@DefaultLifeCycle(application = "...")` | Manifest 类找不到/抽象类实例化失败 |
| 11 | Tinker 装配静默跳过 | `TinkerConfig.default(appLike)` 的 `appLike` 传了 null | `onTinkerReady()` 里把 `this`（ApplicationLike）透传进去，必填 | `TinkerSetup` warn 日志，补丁不生效 |
| 12 | 插件/lib 版本混淆 | patch 插件 `1.9.14.17` 与运行时 lib `1.9.1` 是两个独立坐标 | 各自按锁定版本用，不强对齐 | — |

## 九、补丁合成错误码对照

core 的 Tinker 合成沿用 Tinker 原生错误码（`com.tencent.tinker.loader.shareutil.ShareConstants`），合成结果经 `TinkerLoadResultService` / `UpgradeErrorCallback` 上报。高频码：

| 错误码 | 常量 | 含义 | 本文对策 |
| --- | --- | --- | --- |
| `0` | `ERROR_PATCH_OK` | 合成成功 | — |
| `-7` | `ERROR_PATCH_TINKERID_NOT_EQUAL` | 补丁与基准 `tinkerId` 不等 | 踩坑表 #1 |
| `-24` | `ERROR_PATCH_CONDITION_NOT_SATISFIED` | 补丁 meta 条件不满足（多为 `platform` 缺） | 踩坑表 #2 |

其余原生码（内存/磁盘空间不足、补丁文件损坏、MD5 不匹配等）见 Tinker 官方文档。core 在 `TinkerPatchListener` 额外加了平台校验（`platform` 字段）与崩溃次数限制（同 md5 快速崩溃 ≥3 次拒绝合成）。

---

> 本文档以 `app` 联调宿主（`app/src/main/java/chances/app/AppTinkerApplicationLike.java` + `app/build.gradle` 的 `tinkerPatch {}`）为跑通参照实现，与 `core` head 代码一致。
