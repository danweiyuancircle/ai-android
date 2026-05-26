package com.chances.shell.voice.internet

import android.content.Context
import android.os.Handler
import android.os.Looper
import chances.android.voice.sdk.core.VoiceError
import chances.android.voice.sdk.core.VoiceRemoteCallback
import chances.android.voice.sdk.core.VoiceRemoteManager
import chances.android.voice.sdk.tts.TtsManager
import chances.core.log.Logger
import com.chances.shell.voice.OnVoiceListener
import com.chances.shell.voice.VoiceController

/**
 * 互联网语音控制器：把 voice-remote-sdk（[VoiceRemoteManager]）适配成 [VoiceController] 抽象。
 *
 * 工作模式为网络输入（盒子作 WebSocket Server，手机客户端录音发 PCM）：手机连上后发
 * audio_start / audio_data / audio_stop，SDK 做云端 ASR，识别与播报事件经 [VoiceRemoteCallback] 回调；
 * 本类转成 [OnVoiceListener] 事件，由 VoiceBridge 转发到 H5。引擎与密钥见 [VoiceConfigFactory]。
 *
 * [VoiceRemoteCallback] 已在主线程回调，但 TTS 完成回调在引擎线程触发，故本类统一经 [mainHandler]
 * 切主线程再回调 [OnVoiceListener]（满足其主线程契约）。
 *
 * 由 [InternetVoiceControllerProvider] 经 ServiceLoader 创建。
 *
 * @author template
 */
class InternetVoiceController : VoiceController {

    companion object {
        private const val TAG = "InternetVoiceController"
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var manager: VoiceRemoteManager? = null
    private var listener: OnVoiceListener? = null

    /** TTS 是否播放中，由 playTts 调用与 speak 完成回调维护（SDK 无状态查询 API） */
    @Volatile
    private var ttsPlaying: Boolean = false

    /**
     * voice-remote-sdk 事件回调；onListeningStart 等均已在 SDK 主线程触发。
     */
    private val callback = object : VoiceRemoteCallback {
        override fun onListeningStart() {
            postToListener { it.onBeginSpeech() }
        }

        override fun onPartialResult(text: String) {
            postToListener { it.onDynamicResult(text) }
        }

        override fun onFinalResult(text: String) {
            postToListener { it.onFinalResult(text) }
        }

        override fun onListeningStop() {
            postToListener { it.onEndSpeech() }
        }

        override fun onError(error: VoiceError) {
            postToListener { it.onError(error.message) }
        }
    }

    override fun init(context: Context) {
        val mgr = VoiceRemoteManager.init(context.applicationContext, VoiceConfigFactory.build())
        mgr.setCallback(callback)
        mgr.start()
        manager = mgr
        Logger.i(TAG, "InternetVoiceController init，启动网络语音监听")
    }

    override fun setVoiceListener(listener: OnVoiceListener?) {
        this.listener = listener
    }

    override fun playTts(text: String) {
        val mgr = manager ?: return
        // SDK 无 TTS 开始事件，调用即视为开始；完成回调里复位标志并通知结束
        ttsPlaying = true
        postToListener { it.onTtsStart("") }
        mgr.tts.speak(text, TtsManager.InterruptMode.INTERRUPT) {
            ttsPlaying = false
            postToListener { it.onTtsDone("") }
        }
    }

    override fun stopTts() {
        manager?.tts?.stop()
        ttsPlaying = false
    }

    override fun isTtsPlaying(): Boolean = ttsPlaying

    override fun releaseVoice() {
        manager?.stop()
        manager = null
        ttsPlaying = false
        Logger.i(TAG, "InternetVoiceController releaseVoice，停止网络语音监听")
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
