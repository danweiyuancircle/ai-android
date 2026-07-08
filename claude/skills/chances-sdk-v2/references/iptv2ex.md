# iptv2ex：IPTV2 浏览器壳 + JS Bridge + 内嵌播放器

IPTV2 业务的 WebView 壳一体化基础库。对外 API 在 `chances.core.iptv2ex.*`：单例 `IPTV2ExtendsManager` / `IPTV2WebView` / `IPTV2ExplorerActivity` / `OttVideoView` / `IPTVLoginManager`。`IPTV2WebView.onPageFinished` 自动注入 `assets/InjectJS.js`（MediaPlayer / Event polyfill）。JS Bridge 四个全局对象：`Authentication` / `Navigation` / `Utility` / `AndroidLocalMediaPlayer`。

## 两种打开方式（取自联调代码）

### A. 直接用内置浏览器 Activity（最省事）
```kotlin
val intent = Intent(this, IPTV2ExplorerActivity::class.java).putExtra("URL", url)
startActivity(intent)   // extra key 固定 "URL"
```

### B. 自定义 Activity 嵌入 IPTV2WebView + 注入业务回调
```kotlin
val mgr = IPTV2ExtendsManager.getInstance()        // 单例
// 绑定 WebView 并挂业务回调（回调可为 null）
mgr.bindIPTV2Extends(iptv2WebView, customImpl)     // customImpl: ICustomIPTV2ExMethodImplement
// 主动注入 JS（一般 onPageFinished 已自动注入，这里是补充手段）
mgr.injectIPTV2ExJS(webView)
```

`IPTV2ExtendsManager` 主要方法：
```java
static IPTV2ExtendsManager getInstance();
void bindIPTV2Extends(IPTV2WebView webView, ICustomIPTV2ExMethodImplement impl);  // impl 可 null
void login(String url, IPTVLoginManager.IPTVLoginListener listener);             // 登录流程
void injectIPTV2ExJS(WebView webView);
void injectIPTV2ExJS(WebView webView, ValueCallback callback);
IPTV2WebView getIPTV2WebView();
ICustomIPTV2ExMethodImplement getCustomIPTV2ExMethodImplement();
void CTCSetConfig(Context ctx, String fieldName, String fieldValue);             // CTC 认证配置持久化
```

业务回调接口 `ICustomIPTV2ExMethodImplement` 常见方法：`init()` / `getAuthInfo()` / `startUpdate()` / `startLocalCfg()` / `getChannelList()` / `keyFilter()`。

## 常见坑
- 单例内部持有 `IPTV2WebView` 引用，Activity 销毁时务必 `WebView.destroy()` 避免泄漏。
- 公开方法都要在主线程调用。
- 历史坐标从 `com.chances.iptv.component:iptv2ex` 重构迁移到 `com.chances.sdk:iptv2ex`，包路径从 `chances.service.iptv2ex` → `chances.core.iptv2ex`，新老共存。
- 运行时需独立引入 `core`（>= 2.0.0）。
