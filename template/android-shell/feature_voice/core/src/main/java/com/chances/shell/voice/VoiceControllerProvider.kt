package com.chances.shell.voice

import android.content.Context

/**
 * 语音实现的 SPI（服务提供者接口）。
 *
 * 各语音 SDK 实现模块（视九 / 腾讯 / …）各提供一个本接口实现，并通过
 * `META-INF/services/com.chances.shell.voice.VoiceControllerProvider` 注册，
 * 由 [VoiceControllerFactory] 经 `ServiceLoader` 自动发现。这样宿主只依赖本抽象层，
 * 增删实现模块即可热插拔：未打包任何实现时回退 [NoopVoiceController]，上层代码零改动。
 *
 * 实现类必须有**公开无参构造**（ServiceLoader 要求）。
 *
 * @author template
 */
interface VoiceControllerProvider {
    /**
     * 创建一个尚未初始化的 [VoiceController]，宿主随后调用其 [VoiceController.init]。
     *
     * @param context 应用上下文（实现方应只持有 applicationContext，避免泄漏 Activity）
     * @return 新建的控制器实例
     */
    fun create(context: Context): VoiceController
}
