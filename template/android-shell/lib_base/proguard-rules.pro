# JS Bridge 暴露给 WebView 的接口必须保留
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
