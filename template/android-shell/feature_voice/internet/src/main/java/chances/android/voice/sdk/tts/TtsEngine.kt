package chances.android.voice.sdk.tts

interface TtsEngine {
    fun speak(text: String, onDone: () -> Unit)
    fun stop()
    fun release()
}
