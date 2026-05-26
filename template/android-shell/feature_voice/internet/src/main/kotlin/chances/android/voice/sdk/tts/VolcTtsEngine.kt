package chances.android.voice.sdk.tts

import android.util.Base64
import chances.android.voice.sdk.core.VolcConfig
import chances.android.voice.sdk.util.AudioTrackPlayer
import chances.android.voice.sdk.util.HttpClient
import chances.android.voice.sdk.util.SdkLog
import org.json.JSONObject
import java.util.UUID

class VolcTtsEngine(private val config: VolcConfig) : TtsEngine {

    companion object {
        private const val TAG = "VolcTtsEngine"
        private const val URL = "https://openspeech.bytedance.com/api/v1/tts"
    }

    private val player = AudioTrackPlayer()

    override fun speak(text: String, onDone: () -> Unit) {
        val body = JSONObject().apply {
            put("app", JSONObject().apply {
                put("appid", config.appId)
                put("token", config.token)
                put("cluster", config.ttsCluster)
            })
            put("user", JSONObject().apply {
                put("uid", "demo_user")
            })
            put("audio", JSONObject().apply {
                put("voice_type", config.voiceType)
                put("encoding", "pcm")
                put("rate", 16000)
                put("speed_ratio", config.speedRatio.toDouble())
                put("volume_ratio", config.volumeRatio.toDouble())
                put("pitch_ratio", config.pitchRatio.toDouble())
            })
            put("request", JSONObject().apply {
                put("reqid", UUID.randomUUID().toString())
                put("text", text)
                put("text_type", "plain")
                put("operation", "query")
            })
        }.toString()

        val headers = mapOf(
            "Authorization" to "Bearer;${config.token}",
            "Content-Type" to "application/json"
        )

        HttpClient.postJson(URL, headers, body) { result ->
            if (result.error != null) {
                SdkLog.e(TAG, "TTS request failed: ${result.error.message}")
                onDone()
                return@postJson
            }
            try {
                val json = JSONObject(result.body ?: "{}")
                val code = json.optInt("code", -1)
                if (code != 3000) {
                    val message = json.optString("message", "Unknown error")
                    SdkLog.e(TAG, "Volc TTS error: $code - $message")
                    onDone()
                    return@postJson
                }
                val audioBase64 = json.optString("data", "")
                if (audioBase64.isEmpty()) {
                    SdkLog.w(TAG, "Empty audio data in Volc TTS response")
                    onDone()
                    return@postJson
                }
                val pcm = Base64.decode(audioBase64, Base64.NO_WRAP)
                player.playOnce(pcm) { onDone() }
            } catch (e: Exception) {
                SdkLog.e(TAG, "Parse error: ${e.message}")
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
