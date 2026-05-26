package chances.android.voice.sdk.asr

import android.util.Base64
import chances.android.voice.sdk.util.SdkLog
import chances.android.voice.sdk.core.IflyConfig
import chances.android.voice.sdk.core.VoiceError
import chances.android.voice.sdk.util.HmacSigner
import chances.android.voice.sdk.util.WsClient
import chances.android.voice.sdk.util.WsListener
import org.json.JSONObject
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

class IflyAsrEngine(
    private val config: IflyConfig,
    private val hotwords: List<String> = emptyList()
) : AsrEngine {

    private val tag = "IflyAsrEngine"

    private val host = "iat-api.xfyun.cn"
    private val path = "/v2/iat"

    @Volatile private var ws: WsClient? = null
    @Volatile private var resultCallback: ((AsrResult) -> Unit)? = null

    private val audioQueue = ConcurrentLinkedQueue<ByteArray>()
    private val sending = AtomicBoolean(false)
    private val stopped = AtomicBoolean(false)
    private val connected = AtomicBoolean(false)

    // Map of sn -> text for wpgs dynamic correction
    private val sentenceMap = sortedMapOf<Int, String>()

    override fun start(onResult: (AsrResult) -> Unit) {
        // Clean up previous session
        cancel()

        resultCallback = onResult
        stopped.set(false)
        connected.set(false)
        audioQueue.clear()
        sentenceMap.clear()

        SdkLog.i(tag, "Connecting to iFlytek ASR...")
        val url = HmacSigner.signIfly(host, path, config.apiKey, config.apiSecret)
        val client = WsClient.create()
        ws = client

        client.connect(url, emptyMap(), object : WsListener {
            override fun onOpen() {
                SdkLog.i(tag, "iFlytek WebSocket connected")
                connected.set(true)
                startSenderThread()
            }

            override fun onMessage(text: String) {
                handleMessage(text)
            }

            override fun onError(e: Exception) {
                SdkLog.e(tag, "WebSocket error", e)
                resultCallback?.invoke(
                    AsrResult.Error(VoiceError.NetworkError(e.message ?: "WebSocket error"))
                )
            }

            override fun onClose(code: Int) {
                connected.set(false)
                sending.set(false)
            }
        })
    }

    override fun feedAudio(pcmData: ByteArray) {
        if (!stopped.get()) {
            audioQueue.offer(pcmData.copyOf())
        }
    }

    override fun stop() {
        stopped.set(true)
        // Sender thread will drain the queue and send status=2 for the last frame.
    }

    override fun cancel() {
        stopped.set(true)
        sending.set(false)
        connected.set(false)
        audioQueue.clear()
        try { ws?.close() } catch (_: Exception) {}
        ws = null
        resultCallback = null
    }

    // -------------------------------------------------------------------------
    // Sender thread — polls queue at ~40 ms intervals
    // -------------------------------------------------------------------------
    private fun startSenderThread() {
        sending.set(true)
        Thread {
            var frameIndex = 0
            var lastFrameSent = false

            while (!lastFrameSent && sending.get()) {
                val chunk = audioQueue.poll()

                if (chunk != null) {
                    val status = when {
                        frameIndex == 0 -> 0          // first
                        stopped.get() && audioQueue.isEmpty() -> 2  // last
                        else -> 1                      // middle
                    }
                    sendAudioFrame(chunk, status)
                    if (status == 2) lastFrameSent = true
                    frameIndex++
                } else if (stopped.get()) {
                    // Queue drained and stop was requested — send empty end frame.
                    val status = if (frameIndex == 0) 0 else 2
                    sendAudioFrame(ByteArray(0), status)
                    lastFrameSent = true
                } else {
                    Thread.sleep(10)
                }

                if (!lastFrameSent) Thread.sleep(40)
            }
            sending.set(false)
        }.also { it.name = "IflyAsr-sender"; it.isDaemon = true }.start()
    }

    private fun sendAudioFrame(pcm: ByteArray, status: Int) {
        val audio = Base64.encodeToString(pcm, Base64.NO_WRAP)

        val json = if (status == 0) {
            // First frame includes common + business sections.
            // TODO: hotword support disabled pending format verification
            // val hotwordParam = if (hotwords.isNotEmpty()) ""","hotword":"${hotwords.joinToString("|")}"""" else ""
            """{"common":{"app_id":"${config.appId}"},"business":{"language":"${config.language}","domain":"iat","accent":"${config.accent}","vad_eos":2000,"dwa":"wpgs"},"data":{"status":0,"format":"audio/L16;rate=16000","encoding":"raw","audio":"$audio"}}"""
        } else {
            """{"data":{"status":$status,"format":"audio/L16;rate=16000","encoding":"raw","audio":"$audio"}}"""
        }

        try {
            ws?.send(json)
        } catch (e: Exception) {
            SdkLog.w(tag, "Failed to send audio frame: ${e.message}")
        }
    }

    // -------------------------------------------------------------------------
    // Response parsing
    // -------------------------------------------------------------------------
    private fun handleMessage(text: String) {
        try {
            val root = JSONObject(text)
            val code = root.optInt("code", 0)
            if (code != 0) {
                val msg = root.optString("message", "ASR error code: $code")
                SdkLog.e(tag, "iFlytek ASR error: code=$code, message=$msg")
                resultCallback?.invoke(AsrResult.Error(VoiceError.AsrFailed(msg)))
                return
            }

            val data = root.optJSONObject("data") ?: return
            val status = data.optInt("status", -1)
            val result = data.optJSONObject("result") ?: return

            // Collect text from ws[].cw[].w
            val wsArray = result.optJSONArray("ws")
            val sb = StringBuilder()
            if (wsArray != null) {
                for (i in 0 until wsArray.length()) {
                    val wsItem = wsArray.getJSONObject(i)
                    val cwArray = wsItem.optJSONArray("cw")
                    if (cwArray != null) {
                        for (j in 0 until cwArray.length()) {
                            sb.append(cwArray.getJSONObject(j).optString("w", ""))
                        }
                    }
                }
            }

            val fragment = sb.toString()
            val sn = result.optInt("sn", sentenceMap.size + 1)

            // Handle wpgs (dynamic correction) mode:
            // pgs="rpl" → replace sentences in range rg, pgs="apd" → append
            val pgs = result.optString("pgs", "")
            if (pgs == "rpl") {
                val rgArray = result.optJSONArray("rg")
                if (rgArray != null && rgArray.length() >= 2) {
                    val start = rgArray.getInt(0)
                    val end = rgArray.getInt(1)
                    // Remove old entries in range [start, end]
                    for (k in start..end) {
                        sentenceMap.remove(k)
                    }
                }
                // Put current fragment at sn
                sentenceMap[sn] = fragment
            } else {
                // apd or no pgs
                if (fragment.isNotEmpty()) {
                    sentenceMap[sn] = fragment
                }
            }

            val accumulated = sentenceMap.values.joinToString("")
            if (status == 2) {
                resultCallback?.invoke(AsrResult.Final(accumulated))
                sentenceMap.clear()
            } else if (accumulated.isNotEmpty()) {
                resultCallback?.invoke(AsrResult.Partial(accumulated))
            }
        } catch (e: Exception) {
            SdkLog.e(tag, "Failed to parse iFlytek ASR response", e)
            resultCallback?.invoke(
                AsrResult.Error(VoiceError.AsrFailed("Parse error: ${e.message}"))
            )
        }
    }
}
