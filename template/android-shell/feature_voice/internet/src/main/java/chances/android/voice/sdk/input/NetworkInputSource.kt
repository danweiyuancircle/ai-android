package chances.android.voice.sdk.input

import android.util.Base64
import chances.android.voice.sdk.util.SdkLog
import chances.android.voice.sdk.util.WsServer
import chances.android.voice.sdk.util.WsServerListener
import org.json.JSONException
import org.json.JSONObject
import java.net.NetworkInterface

class NetworkInputSource(
    private val port: Int = 9527,
    private val onTextResult: ((String) -> Unit)? = null,
    private val onKeyPress: ((String) -> Unit)? = null
) : AudioCaptureBase() {

    private val TAG = "NetworkInput"

    private var wsServer: WsServer? = null

    // -----------------------------------------------------------------------
    // AudioCaptureBase overrides
    // -----------------------------------------------------------------------

    override fun onStart() {
        val server = WsServer(port, object : WsServerListener {
            override fun onClientConnected() {
                SdkLog.i(TAG, "Phone client connected")
                sendToClient("""{"type":"connected"}""")
            }

            override fun onClientDisconnected() {
                SdkLog.i(TAG, "Phone client disconnected")
            }

            override fun onMessage(text: String) {
                handleMessage(text)
            }

            override fun onMessage(data: ByteArray) {
                SdkLog.d(TAG, "Received raw binary frame: ${data.size} bytes (ignored)")
            }

            override fun onError(e: Exception) {
                SdkLog.e(TAG, "WsServer error", e)
            }
        })
        wsServer = server
        server.start()
        SdkLog.i(TAG, "NetworkInputSource started on port $port (LAN IP: ${getLocalIp()})")
    }

    override fun onStop() {
        wsServer?.stop()
        wsServer = null
        SdkLog.i(TAG, "NetworkInputSource stopped")
    }

    override fun onRelease() {
        onStop()
    }

    // -----------------------------------------------------------------------
    // Protocol handling
    // -----------------------------------------------------------------------

    private fun handleMessage(text: String) {
        // Don't log audio_data (too verbose, causes UI freeze via SdkLog listener)
        if (!text.contains("audio_data")) {
            SdkLog.d(TAG, "Message: $text")
        }
        val json = try {
            JSONObject(text)
        } catch (e: JSONException) {
            SdkLog.w(TAG, "Failed to parse JSON: $text")
            return
        }

        when (val type = json.optString("type")) {
            "audio_start" -> {
                SdkLog.d(TAG, "audio_start")
                listener?.invoke(RemoteEvent.VoiceKeyDown)
            }
            "audio_data" -> {
                val b64 = json.optString("data")
                if (b64.isNotEmpty()) {
                    try {
                        val pcm = Base64.decode(b64, Base64.DEFAULT)
                        listener?.invoke(RemoteEvent.AudioChunk(pcm))
                    } catch (e: Exception) {
                        SdkLog.e(TAG, "Failed to decode audio_data base64", e)
                    }
                }
            }
            "audio_stop" -> {
                SdkLog.d(TAG, "audio_stop")
                listener?.invoke(RemoteEvent.VoiceKeyUp)
            }
            "text" -> {
                val txt = json.optString("text")
                if (txt.isNotEmpty()) {
                    SdkLog.d(TAG, "text result: $txt")
                    onTextResult?.invoke(txt)
                }
            }
            "key" -> {
                val key = json.optString("key")
                if (key.isNotEmpty()) {
                    SdkLog.d(TAG, "key press: $key")
                    onKeyPress?.invoke(key)
                }
            }
            else -> SdkLog.w(TAG, "Unknown message type: $type")
        }
    }

    // -----------------------------------------------------------------------
    // Public helpers
    // -----------------------------------------------------------------------

    /** Forward a JSON message to the currently connected phone client. */
    fun sendToClient(json: String) {
        wsServer?.send(json) ?: SdkLog.w(TAG, "sendToClient() called with no server running")
    }

    /** Returns the device's LAN IP address (first non-loopback IPv4 address found). */
    fun getLocalIp(): String {
        return try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val iface = interfaces.nextElement()
                if (iface.isLoopback || !iface.isUp) continue
                val addresses = iface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val addr = addresses.nextElement()
                    if (addr.isLoopbackAddress) continue
                    val hostAddress = addr.hostAddress ?: continue
                    // Return first IPv4 address (no colon)
                    if (!hostAddress.contains(':')) {
                        return hostAddress
                    }
                }
            }
            "127.0.0.1"
        } catch (e: Exception) {
            SdkLog.e(TAG, "getLocalIp() failed", e)
            "127.0.0.1"
        }
    }
}
