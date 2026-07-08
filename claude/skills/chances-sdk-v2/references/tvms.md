# tvms：TVMS 长连接（socket.io + 鉴权）

> **不存在 `chances.core.tvms.Tvms.init(...)`**（旧文档/注释提到过，代码里没有）。真实接法是：主工程构造带 BaseUrl 的 Retrofit `TvmsServer` 注入 → `TvmsManager.connect`。

## 真实接入流程（取自联调代码）

```kotlin
// 1. 主工程用自己的 Retrofit 构造 TvmsServer（tvms 只暴露接口契约 chances.core.tvms.provider.interf.TvmsServer）
val retrofit = Retrofit.Builder()
    .baseUrl(baseUrl)                                  // 鉴权服务地址，须以 / 结尾
    .client(OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(15, TimeUnit.SECONDS).build())
    .addConverterFactory(GsonConverterFactory.create())
    .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
    .build()
val server = retrofit.create(TvmsServer::class.java)
TvmsServerApi.getInstance().setTvmsServer(server)      // 连接前必须先注入

// 2. 配置（POJO + setter）
val cfg = TvmsConfig().apply {
    stbNo = "用户ID或终端唯一标识"
    stbType = "盒子类型"
    token = "连接 token"
    // 重连等字段有默认值，见下
}

// 3. 连接（先鉴权再 Socket.IO 建联）
TvmsManager.getInstance().connect(cfg, listener)

// 4. 断开（页面销毁时）
TvmsManager.getInstance().disconnect()
```

## 回调 `TvmsListener`（`extends MessageChannelListener`）
四个方法，回调线程不保证主线程，UI 操作需自己 post 到主线程：
```kotlin
override fun onChannelConnect(stbNo: String) {}
override fun onChannelDisconnect(stbNo: String) {}
override fun onReceiverMessage(stbNo: String, message: String) {}
override fun onError(stbNo: String, e: SdkException) {}     // 错误统一走 SdkException
```

## `TvmsConfig`（`chances.core.tvms.provider.entity.TvmsConfig`）字段默认值
| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `stbNo` / `stbType` / `token` | 无 | 必填，鉴权用 |
| `socketUrl` | 无 | socket 服务地址（一般鉴权返回） |
| `reconnection` | `true` | 是否自动重连 |
| `reconnectionAttempts` | `Integer.MAX_VALUE` | 最大重连次数 |
| `reconnectionDelay` | `1000` ms | 重连最小间隔 |
| `reconnectionDelayMax` | `1000` ms | 重连最大间隔 |
| `transports` | `"websocket,polling"` | 连接方式 |

## 装配风格的 `TvmsBootConfig`（可选）
`chances.core.tvms.setting.TvmsBootConfig.builder().tvmsConfig(cfg).listener(listener).build()`（两者必填，缺则 `IllegalArgumentException`）。它包装 cfg + listener，注释说由 `Tvms.init` 消费——但该门面当前不存在，直接走上面的 `TvmsManager.connect` 即可。

## 常见坑
- 不先 `setTvmsServer` 就 `connect` 会鉴权失败。
- `baseUrl` 须以 `/` 结尾。
- 页面 `onDestroy` 记得 `disconnect()`。
- 底层 socket.io `1.0.1`，依赖 core 提供的 OkHttp/Retrofit/RxJava 栈。
