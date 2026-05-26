package chances.android.voice.sdk.tts

import android.util.Base64
import chances.android.voice.sdk.util.SdkLog
import chances.android.voice.sdk.core.IflyConfig
import chances.android.voice.sdk.util.AudioTrackPlayer
import chances.android.voice.sdk.util.HmacSigner
import chances.android.voice.sdk.util.WsClient
import chances.android.voice.sdk.util.WsListener
import org.json.JSONObject

class IflyTtsEngine(private val config: IflyConfig) : TtsEngine {

    private val tag = "IflyTtsEngine"

    private val host = "tts-api.xfyun.cn"
    private val path = "/v2/tts"

    @Volatile private var ws: WsClient? = null
    private val player = AudioTrackPlayer()

    @Volatile private var currentOnDone: (() -> Unit)? = null

    override fun speak(text: String, onDone: () -> Unit) {
        // Close any in-flight session first.
        ws?.close()
        ws = null
        player.stop()
        currentOnDone = onDone

        val url = HmacSigner.signIfly(host, path, config.apiKey, config.apiSecret)
        val client = WsClient.create()
        ws = client

        client.connect(url, emptyMap(), object : WsListener {
            override fun onOpen() {
                sendSynthRequest(text)
            }

            override fun onMessage(text: String) {
                handleMessage(text)
            }

            override fun onError(e: Exception) {
                SdkLog.e(tag, "WebSocket error", e)
                // Still fire onDone so TtsManager queue can advance.
                fireOnDone()
            }

            override fun onClose(code: Int) {
                // Nothing extra needed — onDone fired when status==2 arrives.
            }
        })
    }

    override fun stop() {
        ws?.close()
        ws = null
        player.stop()
        currentOnDone = null
    }

    override fun release() {
        stop()
        player.release()
    }

    // -------------------------------------------------------------------------
    // Send synthesis request as a single JSON frame on WebSocket open
    // -------------------------------------------------------------------------
    private fun sendSynthRequest(text: String) {
        val encodedText = Base64.encodeToString(text.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
        val json = """
            {
              "common": { "app_id": "${config.appId}" },
              "business": {
                "aue": "raw",
                "auf": "audio/L16;rate=16000",
                "vcn": "${config.vcn}",
                "speed": ${config.speed},
                "pitch": ${config.pitch},
                "volume": ${config.volume},
                "tte": "UTF8"
              },
              "data": { "status": 2, "text": "$encodedText" }
            }
        """.trimIndent()
        try {
            ws?.send(json)
        } catch (e: Exception) {
            SdkLog.e(tag, "Failed to send TTS request", e)
            fireOnDone()
        }
    }

    // -------------------------------------------------------------------------
    // Handle streaming PCM chunks from iFlytek
    // -------------------------------------------------------------------------
    private fun handleMessage(text: String) {
        try {
            val root = JSONObject(text)
            val code = root.optInt("code", 0)
            if (code != 0) {
                SdkLog.e(tag, "iFlytek TTS error: ${root.optString("message")}")
                fireOnDone()
                return
            }

            val data = root.optJSONObject("data") ?: return
            val audioB64 = data.optString("audio", "")
            if (audioB64.isNotEmpty()) {
                val pcm = Base64.decode(audioB64, Base64.NO_WRAP)
                player.playStream(pcm)
            }

            val status = data.optInt("status", -1)
            if (status == 2) {
                ws?.close()
                ws = null
                // Brief delay to let AudioTrack drain before calling onDone.
                Thread {
                    Thread.sleep(300)
                    fireOnDone()
                }.also { it.isDaemon = true }.start()
            }
        } catch (e: Exception) {
            SdkLog.e(tag, "Failed to parse iFlytek TTS response", e)
            fireOnDone()
        }
    }

    private fun fireOnDone() {
        val cb = currentOnDone
        currentOnDone = null
        cb?.invoke()
    }
}
