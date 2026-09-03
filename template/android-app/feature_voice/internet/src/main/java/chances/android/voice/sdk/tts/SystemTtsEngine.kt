package chances.android.voice.sdk.tts

import android.content.Context
import android.os.Build
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale
import java.util.UUID

class SystemTtsEngine(
    context: Context,
    private val language: String = "zh-CN",
    private val onInitResult: (Boolean) -> Unit = {}
) : TtsEngine {

    private var tts: TextToSpeech? = null
    private var initialized = false

    // Buffered request before init completes.
    private data class PendingRequest(val text: String, val onDone: () -> Unit)
    private var pendingRequest: PendingRequest? = null

    init {
        tts = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                val locale = parseLocale(language)
                val result = tts?.setLanguage(locale) ?: TextToSpeech.LANG_NOT_SUPPORTED
                val ok = result != TextToSpeech.LANG_MISSING_DATA &&
                        result != TextToSpeech.LANG_NOT_SUPPORTED
                initialized = ok
                onInitResult(ok)
                pendingRequest?.let { req ->
                    pendingRequest = null
                    speak(req.text, req.onDone)
                }
            } else {
                initialized = false
                onInitResult(false)
            }
        }

        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) {
                utteranceDoneCallbacks.remove(utteranceId)?.invoke()
            }
            @Suppress("OVERRIDE_DEPRECATION")
            override fun onError(utteranceId: String?) {
                utteranceDoneCallbacks.remove(utteranceId)?.invoke()
            }
        })
    }

    private val utteranceDoneCallbacks = mutableMapOf<String, () -> Unit>()

    override fun speak(text: String, onDone: () -> Unit) {
        if (!initialized) {
            // Buffer the last request; earlier ones are discarded.
            pendingRequest = PendingRequest(text, onDone)
            return
        }
        val utteranceId = UUID.randomUUID().toString()
        utteranceDoneCallbacks[utteranceId] = onDone

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
        } else {
            @Suppress("DEPRECATION")
            val params = java.util.HashMap<String, String>()
            @Suppress("DEPRECATION")
            params[TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID] = utteranceId
            @Suppress("DEPRECATION")
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, params)
        }
    }

    override fun stop() {
        tts?.stop()
        utteranceDoneCallbacks.clear()
    }

    override fun release() {
        stop()
        tts?.shutdown()
        tts = null
        initialized = false
    }

    private fun parseLocale(tag: String): Locale {
        // Support "zh-CN" style and "zh_CN" style tags.
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Locale.forLanguageTag(tag.replace('_', '-'))
        } else {
            val parts = tag.replace('-', '_').split("_")
            when (parts.size) {
                1 -> Locale(parts[0])
                2 -> Locale(parts[0], parts[1])
                else -> Locale(parts[0], parts[1], parts[2])
            }
        }
    }
}
