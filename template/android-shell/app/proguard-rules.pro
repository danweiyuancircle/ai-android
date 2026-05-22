# JS Bridge 接口保留
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# chances-sdk http 缓存校验器（用到时保留，见 SKILL.md 第135行）
-keep class * implements chances.core.http.interf.IResponseDataChecker { *; }
