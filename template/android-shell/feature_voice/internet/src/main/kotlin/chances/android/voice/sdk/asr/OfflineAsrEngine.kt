package chances.android.voice.sdk.asr

import chances.android.voice.sdk.util.SdkLog

class OfflineAsrEngine : AsrEngine {
    companion object {
        private const val TAG = "OfflineAsrEngine"
    }

    init {
        SdkLog.w(TAG, "Offline ASR (Vosk) is not implemented yet. This is a stub.")
    }

    override fun start(onResult: (AsrResult) -> Unit) {
        SdkLog.w(TAG, "start() called on stub engine")
    }
    override fun stop() {}
    override fun cancel() {}
    override fun feedAudio(pcmData: ByteArray) {}
}
