# permission：运行时权限

入口：`chances.core.permission.PermissionHelper`（链式 API）。内部委托 `XXPermissions:26.8`（Support 兼容、覆盖特殊权限），**不要直接调 `ActivityCompat.requestPermissions` 或 `XXPermissions.with(...)`**——走 helper 保留切换底层的退路。

## 链式用法（取自真实联调代码）

```kotlin
PermissionHelper.with(this)                       // with(Activity) 或 with(Fragment)
    .request(Permission.CAMERA, Permission.RECORD_AUDIO)
    .onGranted(object : OnGrantedCallback {
        override fun onGranted(grantedPermissions: List<String>) { /* 权限名列表 */ }
    })
    .onDenied(object : OnDeniedCallback {
        override fun onDenied(denied: List<String>, neverAskAgain: Boolean) { /* neverAskAgain=永久拒绝 */ }
    })
    .onError(object : OnErrorCallback {
        override fun onError(e: SdkException) { /* code/message */ }
    })
    .start()                                       // 必须主线程调用
```

回调全部在 `chances.core.permission.callback`：
- `OnGrantedCallback.onGranted(List<String> grantedPermissions)` —— 注意是**权限名字符串**，不是 `Permission` 对象。
- `OnDeniedCallback.onDenied(List<String> denied, boolean neverAskAgain)`。
- `OnErrorCallback.onError(SdkException e)`。

## 静态方法
```java
boolean granted = PermissionHelper.isGranted(ctx, Permission.CAMERA);  // 同步，任意线程
PermissionHelper.openSettings(ctx);                                    // 跳应用详情页（永久拒绝时引导）
PermissionHelper.openSettings(ctx, Permission.CAMERA);                 // 跳指定权限设置
```

## Permission 枚举（`chances.core.permission.Permission`，常用值）
`CAMERA` / `RECORD_AUDIO` / `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` / `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` / `SYSTEM_ALERT_WINDOW` / `REQUEST_INSTALL_PACKAGES`。

## 错误码
`start()` 前置校验失败走 `onError(SdkException)`，code 来自 `chances.core.permission.PermissionErrorCode`：非主线程(`NOT_MAIN_THREAD`)、未传权限(`PERMISSION_NOT_DECLARED`)、宿主已销毁(`HOST_INVALID`)、底层桥接异常(`INTERNAL_BRIDGE_FAILED`)等。

## 常见坑
- `start()` 必须主线程，否则直接 `onError`。
- `neverAskAgain` 在 API < 23 恒为 false（无动态权限模型）；判断逻辑基于 `ActivityCompat.shouldShowRequestPermissionRationale`，已做 API 19 兼容。
