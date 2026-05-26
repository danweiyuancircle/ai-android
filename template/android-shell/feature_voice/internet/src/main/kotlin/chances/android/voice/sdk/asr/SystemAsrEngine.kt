package chances.android.voice.sdk.asr

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import chances.android.voice.sdk.core.VoiceError

class SystemAsrEngine(
    private val context: Context,
    private val language: String = "zh-CN"
) : AsrEngine {

    private var recognizer: SpeechRecognizer? = null
    private var resultCallback: ((AsrResult) -> Unit)? = null

    override fun start(onResult: (AsrResult) -> Unit) {
        resultCallback = onResult

        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(context).also { sr ->
            sr.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {}
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {}

                override fun onResults(results: Bundle?) {
                    val matches = results
                        ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    val text = matches?.firstOrNull() ?: ""
                    onResult(AsrResult.Final(text))
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    val matches = partialResults
                        ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    val text = matches?.firstOrNull() ?: return
                    if (text.isNotEmpty()) {
                        onResult(AsrResult.Partial(text))
                    }
                }

                override fun onError(error: Int) {
                    val msg = "SpeechRecognizer error code: $error"
                    onResult(AsrResult.Error(VoiceError.AsrFailed(msg)))
                }

                override fun onEvent(eventType: Int, params: Bundle?) {}
            })

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                )
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            }
            sr.startListening(intent)
        }
    }

    override fun stop() {
        recognizer?.stopListening()
    }

    override fun cancel() {
        recognizer?.cancel()
        recognizer?.destroy()
        recognizer = null
        resultCallback = null
    }

    // System ASR manages its own audio pipeline; external PCM chunks are ignored.
    override fun feedAudio(pcmData: ByteArray) = Unit
}
