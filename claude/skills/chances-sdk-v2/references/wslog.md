# wslog：无 ADB 远程日志 / 重启 / 装 APK

DEBUG 阶段用：在盒子上起一个 WebSocket 服务（默认端口 9527），PC 端 wsclient 连上后可实时拉 logcat、远程重启、远程装 APK。基于 `org.java-websocket:1.5.3`。一般只在 DEBUG 构建引入与启动。

## 装配 + 运行时启停

```kotlin
// 1. Application.onCreate 装配（独立入口，不在 SdkCore 管辖）
WsLog.init(applicationContext, WsLogConfig.builder()
    .port(9527)                                    // 默认 9527
    .deviceInfoProvider(object : DeviceInfoProvider {  // 可选，注入 DEVICE_INFO 业务字段
        override fun provide(): Map<String, String> {
            val m = LinkedHashMap<String, String>()
            m["app"] = "MyApp"
            m["user"] = userId
            return m
        }
    })
    .build())

// 2. 运行时启停（WsLog.init 只完成装配，start 需单独调）
WsLogManager.getInstance().start()
WsLogManager.getInstance().stop()

// 3. 状态
WsLogManager.getInstance().isStarted   // Boolean
WsLogManager.getInstance().port        // Int
// ws url = ws://<盒子IP>:<port>
```

`WsLog.init` 全局只装一次（`firstInstalled` 标志）。启动失败通过 `SdkException` 抛出（catch `SdkException` 读 `code`/`message`），错误码见 `chances.core.wslog.WsLogErrorCode`。

## `WsLogConfig`（`chances.core.wslog.setting.WsLogConfig`）
| 方法 | 默认 |
| --- | --- |
| `port(int)` | `9527` |
| `deviceInfoProvider(DeviceInfoProvider)` | `null`（不注入业务字段） |
`DeviceInfoProvider` 在 `chances.core.wslog.provider.interf`，`Map<String,String> provide()`。

## 协议
`CMD:DEVICE_INFO` / `CMD:RESTART` / `CMD:CLEAR_RESTART` / APK 二进制上传安装；远程 logcat 实时推送。

## 权限
`INTERNET` / `ACCESS_NETWORK_STATE` / `READ_LOGS`(signature 级) / 可选 `REQUEST_INSTALL_PACKAGES`。浮窗已改为应用内 decorView 附挂（仅前台可见），不再需要 `SYSTEM_ALERT_WINDOW`。

## 常见坑
- `WsLog.init` 不会自动 start，需显式 `WsLogManager.getInstance().start()`（旧文档提的 `autoStart` 字段当前 `WsLogConfig` 没有）。
- 生产包不要引入/启动 wslog。
