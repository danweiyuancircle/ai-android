package com.chances.shell.voice.shijiu

import android.content.Context
import android.os.Handler
import android.os.Looper
import chances.core.log.Logger
import com.chances.shell.voice.OnVoiceListener
import com.chances.shell.voice.VoiceController
import com.qcode.tvvoicehelp.VoiceConnect
import com.qcode.tvvoicehelp.VoiceConnectClient
import org.json.JSONObject

/**
 * 视九语音控制器：把视九 SDK（[VoiceConnectClient]）的事件适配成 [VoiceController] 抽象。
 *
 * 视九经绑定 TV 系统语音服务工作，遥控器语音键触发录音；SDK 回调在 worker 线程，
 * 本类统一切回主线程再回调 [OnVoiceListener]（满足其主线程契约）。
 *
 * 事件映射：
 * - `VOICE_EVENT_ASR` status 0/1/2 → [OnVoiceListener.onBeginSpeech] / [onDynamicResult] / [onFinalResult]+[onEndSpeech]
 * - `VOICE_EVENT_TTS_START` / `VOICE_EVENT_TTS_END` → [OnVoiceListener.onTtsStart] / [onTtsDone]（视九无 id，传空串）
 *
 * 仅做事件转发（H5 负责 AI/NLP 与 UI），不含 NLP 后端查询与识别弹框。
 *
 * 由 [ShijiuVoiceControllerProvider] 经 ServiceLoader 创建。
 *
 * @author template
 */
class ShijiuVoiceController : VoiceController {

    companion object {
        private const val TAG = "ShijiuVoiceController"

        /** 视九 ASR 注册参数：开启搭配词识别（取自联调约定） */
        private const val ASR_REGISTER_PARAMS = "{\"collocation\":true}"

        /** ASR 录音状态：开始 */
        private const val ASR_STATUS_START = 0

        /** ASR 录音状态：录音中（流式中间结果） */
        private const val ASR_STATUS_STREAMING = 1
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private val client = VoiceConnectClient.Companion.INSTANCE

    private var appContext: Context? = null
    private var listener: OnVoiceListener? = null

    /** TTS 是否播放中，由 TTS_START/END 事件维护（视九无状态查询 API） */
    @Volatile
    private var ttsPlaying: Boolean = false

    /**
     * 视九 SDK 事件回调；onEvent / onConnected / onDisconnect 在 SDK worker 线程触发。
     */
    private val callback = object : VoiceConnectClient.VoiceConnectCallback {
        override fun onEvent(event: Int, eventData: String?, appletName: String?, key: String?): String {
            when (event) {
                VoiceConnect.VOICE_EVENT_ASR -> handleAsr(eventData)
                VoiceConnect.VOICE_EVENT_TTS_START -> {
                    ttsPlaying = true
                    postToListener { it.onTtsStart("") }
                }
                VoiceConnect.VOICE_EVENT_TTS_END -> {
                    ttsPlaying = false
                    postToListener { it.onTtsDone("") }
                }
            }
            return ""
        }

        override fun onPcmData(appletName: String?, pcmData: ByteArray?, offset: Int, length: Int) {
            // 不消费原始 PCM；识别结果走 ASR 事件
        }

        override fun onConnected() {
            Logger.i(TAG, "视九语音连接成功，注册 ASR / TTS 事件")
            client.registerEvent(VoiceConnect.VOICE_EVENT_ASR, ASR_REGISTER_PARAMS, null, null, null)
            client.registerEvent(VoiceConnect.VOICE_EVENT_TTS, null, null, null, null)
        }

        override fun onDisconnect() {
            Logger.i(TAG, "视九语音连接断开")
            ttsPlaying = false
        }
    }

    override fun init(context: Context) {
        val ctx = context.applicationContext
        appContext = ctx
        client.setVoiceConnectCallback(callback)
        client.connect(ctx)
        Logger.i(TAG, "ShijiuVoiceController init，发起连接")
    }

    override fun setVoiceListener(listener: OnVoiceListener?) {
        this.listener = listener
    }

    override fun playTts(text: String) {
        // 第二、三参为视九音色 / 选项参数，本场景用默认
        client.playTts(text, null, "")
    }

    override fun stopTts() {
        // 视九无独立停播 API，播放空串即停（取自联调约定）
        client.playTts("", null, "")
    }

    override fun isTtsPlaying(): Boolean = ttsPlaying

    override fun releaseVoice() {
        appContext?.let { client.disconnect(it) }
        ttsPlaying = false
        Logger.i(TAG, "ShijiuVoiceController releaseVoice，断开连接")
    }

    /**
     * 解析 ASR 事件数据并按 status 回调。eventData 形如 `{"status":0,"streamText":"你好"}`。
     */
    private fun handleAsr(eventData: String?) {
        if (eventData.isNullOrEmpty()) {
            return
        }
        val data = try {
            JSONObject(eventData)
        } catch (e: org.json.JSONException) {
            Logger.w(TAG, "handleAsr 解析失败：%s", eventData)
            return
        }
        val status = data.optInt("status")
        val streamText = data.optString("streamText")
        when (status) {
            ASR_STATUS_START -> postToListener { it.onBeginSpeech() }
            ASR_STATUS_STREAMING -> postToListener { it.onDynamicResult(streamText) }
            else -> postToListener {
                it.onFinalResult(streamText)
                it.onEndSpeech()
            }
        }
    }

    /**
     * 切回主线程后回调当前 [listener]（满足 [OnVoiceListener] 主线程契约）；listener 为空时丢弃。
     */
    private fun postToListener(action: (OnVoiceListener) -> Unit) {
        mainHandler.post {
            listener?.let(action)
        }
    }
}
