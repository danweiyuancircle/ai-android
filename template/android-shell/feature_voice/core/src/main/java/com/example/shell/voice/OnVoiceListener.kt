package com.example.shell.voice

/**
 * 语音识别 / TTS 事件回调。
 * 由 VoiceController 在对应事件发生时触发，宿主转发到 H5（onBeginSpeech 等）。
 * 事件名与 template/bridge-contract.md 的「原生→H5」回调一一对应。
 *
 * **线程契约**：所有回调统一在**主线程**触发——VoiceBridge 据此直接经 WebViewJsHelper 调 WebView
 * （WebView JS 调用要求主线程）。SDK 在 worker 线程回调的实现（如视九）须自行切回主线程再调本接口。
 *
 * @author template
 */
interface OnVoiceListener {
    /** 开始语音识别 */
    fun onBeginSpeech()

    /** 结束语音识别 */
    fun onEndSpeech()

    /** 实时识别中间结果 */
    fun onDynamicResult(result: String)

    /** 最终识别结果 */
    fun onFinalResult(result: String)

    /** 识别错误 */
    fun onError(error: String)

    /** TTS 开始播放 */
    fun onTtsStart(id: String)

    /** TTS 播放完成 */
    fun onTtsDone(id: String)
}
