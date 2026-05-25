package com.example.shell.voice

import android.content.Context
import chances.core.log.Logger
import java.util.ServiceLoader

/**
 * 语音控制器工厂：用 `ServiceLoader` 发现已打包的 [VoiceControllerProvider]，创建 [VoiceController]。
 *
 * 热插拔入口——宿主只调 [create]，不直接引用任何具体实现类：
 * - 打包了某语音实现模块（其 `META-INF/services` 注册了 Provider）→ 用该实现
 * - 未打包任何实现 → 回退 [NoopVoiceController]
 *
 * @author template
 */
object VoiceControllerFactory {

    private const val TAG = "VoiceControllerFactory"

    /**
     * 创建语音控制器。
     *
     * @param context 应用上下文（传 applicationContext）
     * @return 首个被发现的实现创建的控制器；无实现时返回 [NoopVoiceController]
     */
    fun create(context: Context): VoiceController {
        val loader = ServiceLoader.load(
            VoiceControllerProvider::class.java,
            VoiceControllerProvider::class.java.classLoader
        )
        val provider = loader.firstOrNull()
        if (provider == null) {
            Logger.i(TAG, "未发现语音实现，回退 NoopVoiceController")
            return NoopVoiceController()
        }
        Logger.i(TAG, "使用语音实现：%s", provider.javaClass.name)
        return provider.create(context)
    }
}
