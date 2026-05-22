package com.example.shell.voice

import android.content.Context

/**
 * 语音 / TTS 控制器抽象。
 * 模板只定义接口；接入真实语音 SDK（科大讯飞 / 酷开 / 原厂等）时实现本接口。
 * TTS 控制方法对应 bridge-contract.md 的 ottService.playTts/stopTts/isTtsPlaying/releaseVoice，
 * 识别 / 播报事件通过 OnVoiceListener 回传。
 *
 * @author template
 */
interface VoiceController {
    /** 初始化语音 SDK（在 Application/Activity 启动时调用一次） */
    fun init(context: Context)

    /** 设置事件监听器（宿主用它把事件转发到 H5） */
    fun setVoiceListener(listener: OnVoiceListener?)

    /** 播放 TTS */
    fun playTts(text: String)

    /** 停止 TTS */
    fun stopTts()

    /** 是否正在播放 TTS */
    fun isTtsPlaying(): Boolean

    /** 释放语音资源 */
    fun releaseVoice()
}
