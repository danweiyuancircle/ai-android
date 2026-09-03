package com.chances.shell.voice

import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.chances.shell.base.bridge.WebViewJsHelper

/**
 * 语音 JS Bridge：内聚「语音 / TTS」相关的壳 ↔ H5 双向桥接，作为独立 JS 接口直接注入网页。
 *
 * - H5 → 原生：[playTts] / [stopTts] / [isTtsPlaying] / [releaseVoice]，切主线程后转交 [VoiceController]。
 * - 原生 → H5：构造时把自身注册为 [VoiceController] 的 [OnVoiceListener]，
 *   把识别 / TTS 事件经 [WebViewJsHelper] 转成 `window.<回调>` 通知 H5（回调名见 bridge-contract.md）。
 *
 * 注入：壳通过 `addJavascriptInterface(voiceBridge, "voiceService")` 把本类单独注入为 `window.voiceService`，
 * 故语音方法的 `@JavascriptInterface` 标注直接落在本类——语音逻辑与 JS 接口都内聚于此，与 ottService 门面解耦。
 *
 * @author template
 */
class VoiceBridge(
    private val webView: WebView,
    private val controller: VoiceController,
) : OnVoiceListener {

    private val mainHandler = Handler(Looper.getMainLooper())

    init {
        controller.setVoiceListener(this)
    }

    // ===================== H5 → 原生 =====================

    /** 播放 TTS */
    @JavascriptInterface
    fun playTts(text: String) {
        mainHandler.post { controller.playTts(text) }
    }

    /** 停止 TTS */
    @JavascriptInterface
    fun stopTts() {
        mainHandler.post { controller.stopTts() }
    }

    /** 是否正在播放 TTS */
    @JavascriptInterface
    fun isTtsPlaying(): Boolean = controller.isTtsPlaying()

    /** 释放语音资源 */
    @JavascriptInterface
    fun releaseVoice() {
        mainHandler.post { controller.releaseVoice() }
    }

    // ===================== 原生 → H5（OnVoiceListener 转发） =====================

    override fun onBeginSpeech() = WebViewJsHelper.notifyWebPage(webView, "onBeginSpeech")

    override fun onEndSpeech() = WebViewJsHelper.notifyWebPage(webView, "onEndSpeech")

    override fun onDynamicResult(result: String) =
        WebViewJsHelper.notifyWebPage(webView, "onDynamicResult", result)

    override fun onFinalResult(result: String) =
        WebViewJsHelper.notifyWebPage(webView, "onFinalResult", result)

    override fun onError(error: String) =
        WebViewJsHelper.notifyWebPage(webView, "onVoiceError", error)

    override fun onTtsStart(id: String) =
        WebViewJsHelper.notifyWebPage(webView, "onTtsStart", id)

    override fun onTtsDone(id: String) =
        WebViewJsHelper.notifyWebPage(webView, "onTtsDone", id)
}
