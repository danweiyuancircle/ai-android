package com.chances.shell.bridge

import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.widget.Toast
import chances.core.log.Logger
import chances.core.web.TvWebView
import com.chances.shell.base.bridge.IntentData
import com.chances.shell.base.bridge.ShellHost
import com.chances.shell.base.bridge.WebViewJsHelper
import com.chances.shell.voice.VoiceBridge
import com.google.gson.Gson

/**
 * ottService JS Bridge 原生实现（壳 app 层门面，组合 base 基础设施 + voice 能力）。
 * 注入名固定为 "ottService"：webView.addJavascriptInterface(bridge, "ottService")。
 * 方法签名与 template/bridge-contract.md 一一对应。
 *
 * 语音 / TTS 相关方法只做薄委派到 [VoiceBridge]（逻辑内聚在 feature_voice）；
 * `@JavascriptInterface` 标注必须留在本门面，因 addJavascriptInterface 只注入单一对象。
 *
 * @author template
 */
class OttServiceBridge(
    private val webView: TvWebView,
    private val host: ShellHost,
    private val voice: VoiceBridge
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

    /** 释放语音资源（委派 [VoiceBridge]，主线程切换在其内部完成） */
    @JavascriptInterface
    fun releaseVoice() = voice.releaseVoice()

    /** 播放 TTS（委派 [VoiceBridge]） */
    @JavascriptInterface
    fun playTts(text: String) = voice.playTts(text)

    /** 停止 TTS（委派 [VoiceBridge]） */
    @JavascriptInterface
    fun stopTts() = voice.stopTts()

    /** 是否正在播放 TTS（委派 [VoiceBridge]） */
    @JavascriptInterface
    fun isTtsPlaying(): Boolean = voice.isTtsPlaying()

    // ===================== 原生 → H5 =====================
    // 语音 / TTS 的原生→H5 回调已内聚到 feature_voice 的 VoiceBridge（实现 OnVoiceListener）。

    /** 透传原生按键（原始 keyCode + keyCode 字符串，归一化由 H5 完成） */
    fun notifyKeyDown(keyCode: Int, keyCodeString: String) =
        WebViewJsHelper.notifyWebPage(webView, "onNativeKeyDown", keyCode, keyCodeString)

    /** 通知 H5 跳转 AIChat（第三方拉起场景） */
    fun notifyNavigateToAIChat(query: String) =
        WebViewJsHelper.notifyWebPage(webView, "onNavigateToAIChat", query)
}
