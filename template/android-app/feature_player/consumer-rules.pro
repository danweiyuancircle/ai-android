# 播放器抽象层（chances-sdk core 提供）与 ijk 实现需要的 keep 由各自 aar 的 consumer rules 带出。
# 本模块仅保留桥接与注册表入口类，避免 minify 误删 @JavascriptInterface 注入对象。
-keep class com.chances.shell.player.PlayerBridge { *; }
