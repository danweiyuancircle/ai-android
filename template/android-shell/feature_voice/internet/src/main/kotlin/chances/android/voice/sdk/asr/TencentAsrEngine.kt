package chances.android.voice.sdk.asr

import android.util.Base64
import chances.android.voice.sdk.util.SdkLog
import chances.android.voice.sdk.core.TencentConfig
import chances.android.voice.sdk.core.VoiceError
import chances.android.voice.sdk.util.HmacSigner
import chances.android.voice.sdk.util.HttpClient
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.UUID

class TencentAsrEngine(private val config: TencentConfig) : AsrEngine {

    private val tag = "TencentAsrEngine"

    private val url = "https://asr.tencentcloudapi.com/"
    private val action = "SentenceRecognition"
    private val service = "asr"

    @Volatile private var resultCallback: ((AsrResult) -> Unit)? = null
    private val pcmBuffer = ByteArrayOutputStream()
    private val bufferLock = Any()

    override fun start(onResult: (AsrResult) -> Unit) {
        resultCallback = onResult
        synchronized(bufferLock) {
            pcmBuffer.reset()
        }
    }

    override fun feedAudio(pcmData: ByteArray) {
        synchronized(bufferLock) {
            pcmBuffer.write(pcmData)
        }
    }

    override fun stop() {
        val pcmData: ByteArray
        synchronized(bufferLock) {
            pcmData = pcmBuffer.toByteArray()
            pcmBuffer.reset()
        }

        if (pcmData.isEmpty()) {
            resultCallback?.invoke(AsrResult.Error(VoiceError.AsrFailed("No audio data recorded")))
            return
        }

        uploadAndRecognize(pcmData)
    }

    override fun cancel() {
        synchronized(bufferLock) { pcmBuffer.reset() }
        resultCallback = null
    }

    // -------------------------------------------------------------------------
    // REST call to Tencent SentenceRecognition
    // -------------------------------------------------------------------------
    private fun uploadAndRecognize(pcm: ByteArray) {
        val audioBase64 = Base64.encodeToString(pcm, Base64.NO_WRAP)
        val usrAudioKey = UUID.randomUUID().toString()

        // EngSerViceType: language=1 → 16k_zh, language=2 → 16k_en
        val engSerViceType = if (config.language == 2) "16k_en" else "16k_zh"

        val body = """
            {
              "EngSerViceType": "$engSerViceType",
              "SourceType": 1,
              "VoiceFormat": "pcm",
              "UsrAudioKey": "$usrAudioKey",
              "Data": "$audioBase64",
              "DataLen": ${pcm.size}
            }
        """.trimIndent()

        val headers = HmacSigner.signTencent(
            secretId = config.secretId,
            secretKey = config.secretKey,
            service = service,
            action = action,
            body = body
        )

        HttpClient.postJson(url, headers, body) { result ->
            if (result.error != null) {
                resultCallback?.invoke(
                    AsrResult.Error(VoiceError.NetworkError(result.error.message ?: "Network error"))
                )
                return@postJson
            }

            val responseBody = result.body
            if (responseBody == null) {
                resultCallback?.invoke(AsrResult.Error(VoiceError.AsrFailed("Empty response")))
                return@postJson
            }

            try {
                val root = JSONObject(responseBody)
                val response = root.optJSONObject("Response")
                    ?: run {
                        resultCallback?.invoke(
                            AsrResult.Error(VoiceError.AsrFailed("Missing Response field"))
                        )
                        return@postJson
                    }

                val errorObj = response.optJSONObject("Error")
                if (errorObj != null && errorObj.optString("Code", "").isNotEmpty()) {
                    val msg = errorObj.optString("Message", "Tencent ASR error")
                    resultCallback?.invoke(AsrResult.Error(VoiceError.AsrFailed(msg)))
                    return@postJson
                }

                val text = response.optString("Result", "")
                resultCallback?.invoke(AsrResult.Final(text))
            } catch (e: Exception) {
                SdkLog.e(tag, "Failed to parse Tencent ASR response", e)
                resultCallback?.invoke(
                    AsrResult.Error(VoiceError.AsrFailed("Parse error: ${e.message}"))
                )
            }
        }
    }
}
