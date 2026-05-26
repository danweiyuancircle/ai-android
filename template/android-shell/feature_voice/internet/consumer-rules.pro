# 移植的 voice-remote-sdk：含 WebSocket / 反射回调 / org.json 解析，整体保留防裁剪
-keep class chances.android.voice.sdk.** { *; }

# ServiceLoader 发现的实现类及其无参构造必须保留（否则发现不到，回退 Noop）
-keep class com.chances.shell.voice.internet.InternetVoiceControllerProvider { <init>(); }
-keep class com.chances.shell.voice.internet.** { *; }
