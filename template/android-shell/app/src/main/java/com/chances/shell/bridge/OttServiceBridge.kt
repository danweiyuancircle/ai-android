package com.chances.shell.bridge

import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.widget.Toast
import chances.core.log.Logger
import chances.core.utils.device.AppUtils
import chances.core.utils.device.DeviceUtils
import chances.core.web.TvWebView
import com.chances.shell.base.bridge.IntentData
import com.chances.shell.base.bridge.ShellHost
import com.chances.shell.base.bridge.WebViewJsHelper
import com.google.gson.Gson

/**
 * ottService JS Bridge 原生实现（壳 app 层门面，承载壳通用能力）。
 * 注入名固定为 "ottService"：webView.addJavascriptInterface(bridge, "ottService")。
 * 方法签名与 template/bridge-contract.md 一一对应。
 *
 * 语音 / TTS 已独立为 `window.voiceService`（[com.chances.shell.voice.VoiceBridge] 自带
 * `@JavascriptInterface` 单独注入），不再经本门面委派——本门面只剩壳通用方法。
 *
 * @author template
 */
class OttServiceBridge(
    private val webView: TvWebView,
    private val host: ShellHost
) {

    companion object {
        private const val TAG = "OttServiceBridge"
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private val gson = Gson()

    // ===================== H5 → 原生 =====================

    /** 网页是否可返回 */
    @JavascriptInterface
    fun canGoBack(): Boolean = webView.canGoBack()

    /** 重新加载入口页 */
    @JavascriptInterface
    fun reloadIndex() {
        mainHandler.post { webView.loadUrl(webView.indexUrl) }
    }

    /** 重新加载当前页 */
    @JavascriptInterface
    fun reload() {
        mainHandler.post { webView.reload() }
    }

    /** 显示 Toast */
    @JavascriptInterface
    fun showToast(message: String) {
        mainHandler.post {
            Toast.makeText(webView.context, message, Toast.LENGTH_SHORT).show()
        }
    }

    /** 退出应用 */
    @JavascriptInterface
    fun exitApp() {
        Logger.i(TAG, "exitApp")
        mainHandler.post { host.exitApp() }
    }

    /** 发送系统广播；json 为 IntentData 的 JSON 字符串 */
    @JavascriptInterface
    fun sendBroadcast(json: String) {
        mainHandler.post {
            try {
                val data = gson.fromJson(json, IntentData::class.java) ?: return@post
                Logger.i(TAG, "sendBroadcast action=%s pkg=%s", data.action, data.packageName)
                val intent = Intent(data.action)
                if (data.packageName.isNotEmpty()) {
                    intent.setPackage(data.packageName)
                }
                for (entry in data.extras) {
                    intent.putExtra(entry.key, entry.value)
                }
                webView.context.sendBroadcast(intent)
            } catch (e: Exception) {
                Logger.e(TAG, "sendBroadcast failed: $json", e)
            }
        }
    }

    /** 隐藏加载动画 */
    @JavascriptInterface
    fun hideLoading() {
        Logger.i(TAG, "hideLoading")
        mainHandler.post { host.hideLoading() }
    }

    /**
     * 获取设备 / 应用基础信息，返回 [BaseInfo] 的 JSON 字符串。
     *
     * 含 mac / ip / 版本名 / 版本号 / 包名 / 设备型号 / 厂商 / Android 版本 / API 级别。
     * mac、ip 取机顶盒主网口（[DeviceUtils.getStbIpAddress]）；型号 / 厂商 / 系统版本优先取 SDK，
     * 取空时回退 [Build]。供 H5 通过 `ottService.getBaseInfo()` 调用。
     *
     * @return BaseInfo 的 JSON 字符串；底层取值失败的字段为空串，不抛异常
     */
    @JavascriptInterface
    fun getBaseInfo(): String {
        val context = webView.context
        val ipAndMac = DeviceUtils.getStbIpAddress()
        val deviceType = DeviceUtils.getDeviceType()
        val vendor = DeviceUtils.getVendor()
        val deviceVersion = DeviceUtils.getDeviceVersion()
        val info = BaseInfo(
            mac = ipAndMac?.mac.orEmpty(),
            ip = ipAndMac?.ip.orEmpty(),
            versionName = AppUtils.getVersionName(context).orEmpty(),
            versionCode = AppUtils.getVersionCode(context),
            packageName = AppUtils.getPackageName(context).orEmpty(),
            deviceModel = if (deviceType.isNullOrEmpty()) Build.MODEL.orEmpty() else deviceType,
            vendor = if (vendor.isNullOrEmpty()) Build.MANUFACTURER.orEmpty() else vendor,
            androidVersion = if (deviceVersion.isNullOrEmpty()) Build.VERSION.RELEASE.orEmpty() else deviceVersion,
            androidSdkInt = Build.VERSION.SDK_INT
        )
        return gson.toJson(info)
    }

    /** 透传原生按键（原始 keyCode + keyCode 字符串，归一化由 H5 完成） */
    fun notifyKeyDown(keyCode: Int, keyCodeString: String) =
        WebViewJsHelper.notifyWebPage(webView, "onNativeKeyDown", keyCode, keyCodeString)

    /** 通知 H5 跳转 AIChat（第三方拉起场景） */
    fun notifyNavigateToAIChat(query: String) =
        WebViewJsHelper.notifyWebPage(webView, "onNavigateToAIChat", query)
}
