package chances.android.voice.sdk.asr

import chances.android.voice.sdk.core.VoiceError

sealed class AsrResult {
    data class Partial(val text: String) : AsrResult()
    data class Final(val text: String) : AsrResult()
    data class Error(val error: VoiceError) : AsrResult()
}
