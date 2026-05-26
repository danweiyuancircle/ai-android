package chances.android.voice.sdk.asr

import android.content.Context
import android.speech.SpeechRecognizer
import chances.android.voice.sdk.util.SdkLog
import chances.android.voice.sdk.core.VoiceRemoteConfig
import chances.android.voice.sdk.core.VoiceRemoteConfig.AsrMode

object AsrEngineFactory {
    private const val TAG = "AsrEngineFactory"

    fun create(
        config: VoiceRemoteConfig,
        context: Context,
        onFallback: ((from: String, to: String) -> Unit)? = null
    ): AsrEngine {
        return when (config.asrMode) {
            AsrMode.SYSTEM -> createSystemOrFallback(config, context, onFallback)
            AsrMode.IFLY -> {
                val ifly = config.iflyConfig
                    ?: throw IllegalArgumentException("IflyConfig required for IFLY mode")
                IflyAsrEngine(ifly, config.hotwords)
            }
            AsrMode.TENCENT -> {
                val tencent = config.tencentConfig
                    ?: throw IllegalArgumentException("TencentConfig required for TENCENT mode")
                TencentAsrEngine(tencent)
            }
            AsrMode.OFFLINE -> OfflineAsrEngine()
            AsrMode.VOLC -> {
                val volc = config.volcConfig
                    ?: throw IllegalArgumentException("VolcConfig required for VOLC mode")
                VolcAsrEngine(volc)
            }
        }
    }

    private fun createSystemOrFallback(
        config: VoiceRemoteConfig,
        context: Context,
        onFallback: ((from: String, to: String) -> Unit)? = null
    ): AsrEngine {
        if (SpeechRecognizer.isRecognitionAvailable(context)) {
            return SystemAsrEngine(context, config.language)
        }
        SdkLog.w(TAG, "System ASR unavailable, trying fallback")
        config.iflyConfig?.let {
            SdkLog.w(TAG, "Falling back to iFlytek ASR")
            onFallback?.invoke("SYSTEM", "IFLY")
            return IflyAsrEngine(it, config.hotwords)
        }
        config.tencentConfig?.let {
            SdkLog.w(TAG, "Falling back to Tencent ASR")
            onFallback?.invoke("SYSTEM", "TENCENT")
            return TencentAsrEngine(it)
        }
        config.volcConfig?.let {
            SdkLog.w(TAG, "Falling back to Volcengine ASR")
            onFallback?.invoke("SYSTEM", "VOLC")
            return VolcAsrEngine(it)
        }
        throw IllegalStateException(
            "No ASR engine available: system unavailable and no cloud config provided"
        )
    }
}
