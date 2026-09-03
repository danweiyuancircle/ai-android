# 视九 SDK 靠 AIDL 绑定系统服务 + 反射，整体保留防裁剪
-keep class com.qcode.tvvoicehelp.** { *; }

# ServiceLoader 发现的实现类及其无参构造必须保留（否则发现不到，回退 Noop）
-keep class com.chances.shell.voice.shijiu.ShijiuVoiceControllerProvider { <init>(); }
-keep class com.chances.shell.voice.shijiu.** { *; }
