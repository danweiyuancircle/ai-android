package com.chances.shell.voice.shijiu

import android.content.Context
import com.chances.shell.voice.VoiceController
import com.chances.shell.voice.VoiceControllerProvider

/**
 * 视九语音实现的 SPI 提供者，经 `META-INF/services/com.chances.shell.voice.VoiceControllerProvider`
 * 注册，由 [com.chances.shell.voice.VoiceControllerFactory] 经 ServiceLoader 发现。
 *
 * ServiceLoader 要求公开无参构造。
 *
 * @author template
 */
class ShijiuVoiceControllerProvider : VoiceControllerProvider {
    override fun create(context: Context): VoiceController = ShijiuVoiceController()
}
