package chances.android.voice.sdk.tts

import android.util.Base64
import chances.android.voice.sdk.util.SdkLog
import chances.android.voice.sdk.core.TencentConfig
import chances.android.voice.sdk.util.AudioTrackPlayer
import chances.android.voice.sdk.util.HmacSigner
import chances.android.voice.sdk.util.HttpClient
import org.json.JSONObject
import java.util.UUID

class TencentTtsEngine(private val config: TencentConfig) : TtsEngine {

    private val tag = "TencentTtsEngine"

    private val url = "https://tts.tencentcloudapi.com/"
    private val action = "TextToVoice"
    private val service = "tts"

    private val player = AudioTrackPlayer()

    override fun speak(text: String, onDone: () -> Unit) {
        val sessionId = UUID.randomUUID().toString()

        val body = """
            {
              "Text": ${JSONObject.quote(text)},
              "SessionId": "$sessionId",
              "VoiceType": ${config.voiceType},
              "Codec": "pcm",
              "SampleRate": 16000,
              "Volume": 0,
              "Speed": 0
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
                SdkLog.e(tag, "Network error: ${result.error.message}")
                onDone()
                return@postJson
            }

            val responseBody = result.body
            if (responseBody == null) {
                SdkLog.e(tag, "Empty TTS response")
                onDone()
                return@postJson
            }

            try {
                val root = JSONObject(responseBody)
                val response = root.optJSONObject("Response")
                    ?: run {
                        SdkLog.e(tag, "Missing Response field in TTS response")
                        onDone()
                        return@postJson
                    }

                val errorObj = response.optJSONObject("Error")
                if (errorObj != null && errorObj.optString("Code", "").isNotEmpty()) {
                    SdkLog.e(tag, "Tencent TTS error: ${errorObj.optString("Message")}")
                    onDone()
                    return@postJson
                }

                val audioB64 = response.optString("Audio", "")
                if (audioB64.isEmpty()) {
                    SdkLog.e(tag, "Empty Audio field in TTS response")
                    onDone()
                    return@postJson
                }

                val pcm = Base64.decode(audioB64, Base64.NO_WRAP)
                player.playOnce(pcm) { onDone() }
            } catch (e: Exception) {
                SdkLog.e(tag, "Failed to parse Tencent TTS response", e)
                onDone()
            }
        }
    }

    override fun stop() {
        player.stop()
    }

    override fun release() {
        player.release()
    }
}
