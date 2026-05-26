package chances.android.voice.sdk.tts

import android.content.Context
import chances.android.voice.sdk.util.SdkLog
import chances.android.voice.sdk.core.VoiceRemoteConfig
import chances.android.voice.sdk.core.VoiceRemoteConfig.TtsMode

object TtsEngineFactory {

    fun create(
        config: VoiceRemoteConfig,
        context: Context,
        onFallback: ((from: String, to: String) -> Unit)? = null
    ): TtsEngine {
        return when (config.ttsMode) {
            TtsMode.SYSTEM -> FallbackTtsEngine(config, context, onFallback)
            TtsMode.IFLY -> {
                val ifly = config.iflyConfig
                    ?: throw IllegalArgumentException("IflyConfig required for IFLY TTS mode")
                IflyTtsEngine(ifly)
            }
            TtsMode.TENCENT -> {
                val tencent = config.tencentConfig
                    ?: throw IllegalArgumentException("TencentConfig required for TENCENT TTS mode")
                TencentTtsEngine(tencent)
            }
            TtsMode.VOLC -> {
                val volc = config.volcConfig
                    ?: throw IllegalArgumentException("VolcConfig required for VOLC TTS mode")
                VolcTtsEngine(volc)
            }
        }
    }
}

internal class FallbackTtsEngine(
    private val config: VoiceRemoteConfig,
    context: Context,
    private val onFallback: ((from: String, to: String) -> Unit)? = null
) : TtsEngine {

    @Volatile
    private var engine: TtsEngine? = null
    private var initDone = false

    init {
        val systemEngine = SystemTtsEngine(context, config.language) { success ->
            if (!success && !initDone) {
                SdkLog.w("FallbackTtsEngine", "System TTS init failed, switching to fallback")
                val fallbackPair: Pair<String, TtsEngine>? =
                    config.iflyConfig?.let { "IFLY" to IflyTtsEngine(it) }
                        ?: config.tencentConfig?.let { "TENCENT" to TencentTtsEngine(it) }
                        ?: config.volcConfig?.let { "VOLC" to VolcTtsEngine(it) }
                if (fallbackPair != null) {
                    engine?.release()
                    engine = fallbackPair.second
                    onFallback?.invoke("SYSTEM", fallbackPair.first)
                }
            }
            initDone = true
        }
        // Only assign after construction completes to avoid lateinit race
        if (engine == null) {
            engine = systemEngine
        }
    }

    override fun speak(text: String, onDone: () -> Unit) {
        val e = engine
        SdkLog.i("FallbackTtsEngine", "speak() using engine: ${e?.javaClass?.simpleName}, text=$text")
        e?.speak(text, onDone) ?: run {
            SdkLog.w("FallbackTtsEngine", "No engine available!")
            onDone()
        }
    }
    override fun stop() { engine?.stop() }
    override fun release() { engine?.release() }
}
