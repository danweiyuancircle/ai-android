package com.chances.shell.voice

import android.content.Context

/**
 * 空实现：未接入真实语音 SDK 时使用。
 * 所有方法不做事；持有 listener 但不触发回调（接入真实 SDK 后由实现类触发）。
 *
 * @author template
 */
class NoopVoiceController : VoiceController {

    private var listener: OnVoiceListener? = null

    override fun init(context: Context) {}

    override fun setVoiceListener(listener: OnVoiceListener?) {
        this.listener = listener
    }

    override fun playTts(text: String) {}

    override fun stopTts() {}

    override fun isTtsPlaying(): Boolean = false

    override fun releaseVoice() {}
}
