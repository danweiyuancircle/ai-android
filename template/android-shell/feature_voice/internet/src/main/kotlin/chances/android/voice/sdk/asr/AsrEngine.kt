package chances.android.voice.sdk.asr

interface AsrEngine {
    fun start(onResult: (AsrResult) -> Unit)
    fun stop()
    fun cancel()
    fun feedAudio(pcmData: ByteArray)
}
