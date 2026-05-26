package chances.android.voice.sdk.util

import chances.android.voice.sdk.util.SdkLog

object AdpcmDecoder {
    private const val TAG = "AdpcmDecoder"

    fun decode(data: ByteArray): ByteArray {
        SdkLog.w(TAG, "ADPCM decoding not implemented, returning raw data")
        return data
    }
}
