package chances.android.voice.sdk.asr

import chances.android.voice.sdk.core.VolcConfig
import chances.android.voice.sdk.core.VoiceError
import chances.android.voice.sdk.util.SdkLog
import chances.android.voice.sdk.util.WsClient
import chances.android.voice.sdk.util.WsListener
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

class VolcAsrEngine(private val config: VolcConfig) : AsrEngine {

    companion object {
        private const val TAG = "VolcAsrEngine"
        private const val INTERVAL_MS = 40L
    }

    private var ws: WsClient? = null
    private var onResult: ((AsrResult) -> Unit)? = null
    private val audioQueue = ConcurrentLinkedQueue<ByteArray>()
    private val isSending = AtomicBoolean(false)
    private var senderThread: Thread? = null

    override fun start(onResult: (AsrResult) -> Unit) {
        this.onResult = onResult
        audioQueue.clear()

        val url = "wss://openspeech.bytedance.com/api/v2/asr"
        val headers = mapOf(
            "Authorization" to "Bearer;${config.token}"
        )

        ws = WsClient.create()
        ws?.connect(url, headers, object : WsListener {
            override fun onOpen() {
                SdkLog.d(TAG, "WebSocket connected")
                sendFullClientRequest()
                startSender()
            }

            override fun onMessage(text: String) {
                parseResponse(text)
            }

            override fun onError(e: Exception) {
                SdkLog.e(TAG, "WebSocket error: ${e.message}")
                isSending.set(false)
                onResult(AsrResult.Error(VoiceError.NetworkError(e.message ?: "WS error")))
            }

            override fun onClose(code: Int) {
                SdkLog.d(TAG, "WebSocket closed: $code")
                isSending.set(false)
            }
        })
    }

    override fun feedAudio(pcmData: ByteArray) {
        audioQueue.offer(pcmData)
    }

    override fun stop() {
        isSending.set(false)
        senderThread?.join(2000)
        senderThread = null
        // Signal end-of-stream
        try {
            val endJson = JSONObject().apply {
                put("signal", "end")
            }
            ws?.send(endJson.toString())
        } catch (e: Exception) {
            SdkLog.e(TAG, "Error sending end signal: ${e.message}")
        }
    }

    override fun cancel() {
        isSending.set(false)
        senderThread = null
        audioQueue.clear()
        ws?.close()
        ws = null
        onResult = null
    }

    private fun sendFullClientRequest() {
        val json = JSONObject().apply {
            put("app", JSONObject().apply {
                put("appid", config.appId)
                put("token", config.token)
                put("cluster", config.asrCluster)
            })
            put("user", JSONObject().apply {
                put("uid", UUID.randomUUID().toString())
            })
            put("request", JSONObject().apply {
                put("reqid", UUID.randomUUID().toString())
                put("nbest", 1)
                put("workflow", "audio_in,resample,partition,vad,fe,decode,itn,nlu_punctuate")
                put("sequence", 1)
                put("show_language", true)
                put("result_type", "full")
            })
            put("audio", JSONObject().apply {
                put("format", "pcm")
                put("rate", 16000)
                put("language", "zh-CN")
                put("bits", 16)
                put("channel", 1)
                put("codec", "raw")
            })
        }
        ws?.send(json.toString())
        SdkLog.d(TAG, "Sent full_client_request")
    }

    private fun startSender() {
        isSending.set(true)
        senderThread = Thread {
            while (isSending.get()) {
                val chunk = audioQueue.poll()
                if (chunk != null) {
                    ws?.send(chunk)
                } else {
                    Thread.sleep(INTERVAL_MS)
                }
            }
        }.apply {
            name = "VolcAsrSender"
            isDaemon = true
            start()
        }
    }

    private fun parseResponse(text: String) {
        try {
            val json = JSONObject(text)

            // Check for error code
            val code = json.optInt("code", -1)
            if (code != 0 && json.has("code")) {
                val message = json.optString("message", "Unknown error")
                SdkLog.e(TAG, "Volc ASR error: $code - $message")
                onResult?.invoke(AsrResult.Error(VoiceError.AsrFailed("Volcengine error: $code - $message")))
                return
            }

            // Parse top-level result object
            val result = json.optJSONObject("result")
            if (result != null) {
                val textResult = result.optString("text", "")
                val isFinal = json.optBoolean("is_final", false) ||
                        result.optInt("type", 0) == 1
                if (textResult.isNotEmpty()) {
                    if (isFinal) {
                        onResult?.invoke(AsrResult.Final(textResult))
                        ws?.close()
                    } else {
                        onResult?.invoke(AsrResult.Partial(textResult))
                    }
                }
                return
            }

            // Fallback: payload.result pattern
            val payload = json.optJSONObject("payload")
            if (payload != null) {
                val payloadResult = payload.optString("result", "")
                if (payloadResult.isNotEmpty()) {
                    val definite = payload.optInt("definite", 0)
                    if (definite == 1) {
                        onResult?.invoke(AsrResult.Final(payloadResult))
                    } else {
                        onResult?.invoke(AsrResult.Partial(payloadResult))
                    }
                }
            }
        } catch (e: Exception) {
            SdkLog.e(TAG, "Parse error: ${e.message}")
        }
    }
}
