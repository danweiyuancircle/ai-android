# http：网络请求 + 缓存注解

入口：`chances.core.http.HttpClientManager`（单例）。底层 OkHttp 3.12.1 + Retrofit 2.6.4 + RxJava2 适配器，已内置缓存/日志/错误回调拦截器与 SSL 配置。装配由 `SdkCore.init(http=...)` 完成（见 `core-init.md`），业务不直接调 `HttpClientManager.init`。

## 最小用法：创建 Retrofit Service

```kotlin
interface RawApi {
    @GET
    fun get(@Url url: String): io.reactivex.Single<retrofit2.Response<okhttp3.ResponseBody>>
}

// baseUrl 必须以 "/" 结尾，否则抛 IllegalArgumentException
val api = HttpClientManager.getInstance().createClient(baseUrl, RawApi::class.java)
val disposable = api.get(path)
    .subscribeOn(Schedulers.io())
    .observeOn(AndroidSchedulers.mainThread())
    .subscribe({ resp -> /* resp.code(), resp.body()?.string() */ },
               { e -> /* error */ })
```

`createClient` 重载：
```java
<T> T createClient(String serverBaseUrl, Class<T> serverClass);
<T> T createClient(String serverBaseUrl, Class<T> serverClass, HttpSetting httpSetting); // 自定义超时/SSL/拦截器
```
未装配 Http 就调用 → `RuntimeException("没有调用init方法进行初始化")`。

## RxJava 全局错误
`HttpClientManager.init` 里装了 `RxJavaPlugins.setErrorHandler`，把 Schedulers 上的未捕获异常转给 `HttpConfig.rxJavaErrorCallback`（业务在 `SdkCore.init(http = HttpConfig.builder().rxJavaErrorCallback(cb).build())` 注入），避免 apk 崩溃。

## 缓存注解（需 `core-compiler` 注解处理器）
注解处理器把注解编译期生成绑定代码，**必须引入 `com.chances.sdk:core-compiler`（`kapt` / `annotationProcessor`）**，否则注解不生效。注解打在 Retrofit Service 方法上（`@Retention(CLASS)`，`@Target(METHOD)`）。

`chances.core.http.annotation.*`：

```java
public enum CacheMode {
    Disk_Cache_First,            // 磁盘缓存有效优先用，失效则请求网络
    Disk_Cache_First_And_Keep,   // 同上，但网络失败时再回退到缓存
    NONE                         // 不用任何缓存，只走网络
}

@HttpStaticalCache(mode = CacheMode.Disk_Cache_First, timeSec = 300)  // 静态缓存，timeSec 单位秒
@HttpDynamicCache(clazz = MyDynamicCache.class)                       // 动态缓存，实现 IDynamicCache
```
还有 `@HttpCacheDataChecker`（缓存数据校验）。混淆需保留：`-keep class * implements chances.core.http.interf.IResponseDataChecker { *; }`。

## 常见坑
- `baseUrl` 不以 `/` 结尾直接抛异常。
- 改了 `chances.core.http.annotation.*` / `chances.core.http.interf.*` 的签名，`core` 与 `core-compiler` 必须同版本重新发布，否则运行时 `NoSuchMethodError`。
- 全部用锁定的 OkHttp 3.12.1 / Retrofit 2.6.4，别引入更高版本（API 19 + 现有拦截器假设）。
