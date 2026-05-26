package chances.android.voice.sdk.util

import android.util.Base64
import java.io.DataOutputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.Socket
import java.net.URI
import java.security.MessageDigest
import java.security.SecureRandom
import javax.net.ssl.SSLSocketFactory

interface WsListener {
    fun onOpen()
    fun onMessage(text: String)
    fun onMessage(data: ByteArray) {}
    fun onError(e: Exception)
    fun onClose(code: Int)
}

interface WsClient {
    fun connect(url: String, headers: Map<String, String>, listener: WsListener)
    fun send(data: ByteArray)
    fun send(text: String)
    fun close()

    companion object {
        fun create(): WsClient = SocketWsClient()
    }
}

// ---------------------------------------------------------------------------
// RFC 6455 WebSocket client backed by raw TCP/TLS sockets.
//
// Supports:
//  - ws:// (plain) and wss:// (TLS via SSLSocketFactory)
//  - Full HTTP/1.1 Upgrade handshake with Sec-WebSocket-Accept validation
//  - Opcode 0x0 continuation / fragmented messages
//  - Opcode 0x1 text, 0x2 binary
//  - Opcode 0x8 close  (sends echo close frame back)
//  - Opcode 0x9 ping   (auto pong)
//  - Opcode 0xA pong   (ignored)
//  - Required client-to-server masking (random 4-byte key per frame)
//  - Thread-safe send (synchronized on outputStream)
// ---------------------------------------------------------------------------
private class SocketWsClient : WsClient {

    @Volatile private var socket: Socket? = null
    @Volatile private var outputStream: OutputStream? = null
    @Volatile private var listener: WsListener? = null
    @Volatile private var closed = false

    private val sendLock = Any()
    private val random = SecureRandom()

    // -----------------------------------------------------------------------
    // connect — performs handshake on a background thread then enters read loop
    // -----------------------------------------------------------------------
    override fun connect(url: String, headers: Map<String, String>, listener: WsListener) {
        this.listener = listener
        Thread {
            try {
                doConnect(url, headers)
            } catch (e: Exception) {
                if (!closed) listener.onError(e)
            }
        }.also { it.name = "WsClient-io"; it.isDaemon = true }.start()
    }

    private fun doConnect(rawUrl: String, extraHeaders: Map<String, String>) {
        // Convert ws:// to http:// for URI parsing (some Android versions don't parse ws:// correctly)
        val httpUrl = rawUrl.replace("wss://", "https://").replace("ws://", "http://")
        val uri = URI.create(httpUrl)
        val scheme = if (rawUrl.startsWith("wss://")) "wss" else "ws"
        val host = uri.host ?: throw IOException("Missing host in URL: $rawUrl")
        val port = when {
            uri.port > 0 -> uri.port
            scheme == "wss" -> 443
            else -> 80
        }
        val pathAndQuery = buildString {
            append(if (uri.rawPath.isNullOrEmpty()) "/" else uri.rawPath)
            if (!uri.rawQuery.isNullOrEmpty()) { append('?'); append(uri.rawQuery) }
        }

        // Open TCP (or TLS) connection
        val sock = if (scheme == "wss") {
            SSLSocketFactory.getDefault().createSocket(host, port)
        } else {
            Socket(host, port)
        }
        socket = sock
        outputStream = sock.getOutputStream()

        // Build and send HTTP/1.1 Upgrade request
        val keyBytes = ByteArray(16).also { random.nextBytes(it) }
        val wsKey = Base64.encodeToString(keyBytes, Base64.NO_WRAP)
        val expectedAccept = computeAccept(wsKey)

        val handshake = buildString {
            append("GET $pathAndQuery HTTP/1.1\r\n")
            append("Host: $host\r\n")
            append("Upgrade: websocket\r\n")
            append("Connection: Upgrade\r\n")
            append("Sec-WebSocket-Key: $wsKey\r\n")
            append("Sec-WebSocket-Version: 13\r\n")
            extraHeaders.forEach { (k, v) -> append("$k: $v\r\n") }
            append("\r\n")
        }
        outputStream!!.write(handshake.toByteArray(Charsets.US_ASCII))
        outputStream!!.flush()

        // Read and validate 101 Switching Protocols response
        val input = sock.getInputStream()
        val responseLines = readHttpResponseHeaders(input)
        val statusLine = responseLines.firstOrNull()
            ?: throw IOException("Empty HTTP response from $rawUrl")
        if (!statusLine.contains("101")) {
            throw IOException("WebSocket upgrade failed: $statusLine")
        }
        val acceptHeader = responseLines.firstOrNull {
            it.lowercase().startsWith("sec-websocket-accept:")
        } ?: throw IOException("Missing Sec-WebSocket-Accept in response")
        val serverAccept = acceptHeader.substringAfter(":").trim()
        if (serverAccept != expectedAccept) {
            throw IOException(
                "Sec-WebSocket-Accept mismatch (expected=$expectedAccept actual=$serverAccept)"
            )
        }

        listener?.onOpen()
        closed = false

        // Block here; returns when connection is closed
        readLoop(input)
    }

    // -----------------------------------------------------------------------
    // Frame read loop
    // -----------------------------------------------------------------------
    private fun readLoop(input: InputStream) {
        var fragmentOpcode = 0
        val fragmentBuffers = mutableListOf<ByteArray>()

        try {
            loop@ while (!closed) {
                val b0 = input.readByteOrNull() ?: break
                val fin = (b0.toInt() and 0x80) != 0
                val opcode = b0.toInt() and 0x0F

                val b1 = input.readByteOrNull() ?: break
                val serverMasked = (b1.toInt() and 0x80) != 0
                val rawLen = b1.toInt() and 0x7F

                // Decode extended payload length
                val payloadLen: Int = when (rawLen) {
                    126 -> {
                        val hi = input.readByteOrNull() ?: break@loop
                        val lo = input.readByteOrNull() ?: break@loop
                        ((hi.toInt() and 0xFF) shl 8) or (lo.toInt() and 0xFF)
                    }
                    127 -> {
                        // 8-byte extended length; read into long
                        var len = 0L
                        for (i in 0 until 8) {
                            val b = input.readByteOrNull() ?: break@loop
                            len = (len shl 8) or (b.toLong() and 0xFF)
                        }
                        // Cap at Int.MAX_VALUE for in-memory safety
                        if (len > Int.MAX_VALUE) throw IOException("Frame too large: $len")
                        len.toInt()
                    }
                    else -> rawLen
                }

                // Read optional masking key (server->client is usually unmasked)
                val maskKey: ByteArray? = if (serverMasked) {
                    val mk = ByteArray(4)
                    for (i in 0 until 4) {
                        mk[i] = input.readByteOrNull() ?: break@loop
                    }
                    mk
                } else null

                val payload = readExact(input, payloadLen) ?: break

                // Apply mask if present
                if (maskKey != null) {
                    for (i in payload.indices) {
                        payload[i] = (payload[i].toInt() xor maskKey[i % 4].toInt()).toByte()
                    }
                }

                when (opcode) {
                    0x0 -> { // continuation frame
                        fragmentBuffers.add(payload)
                        if (fin) {
                            val full = mergeBuffers(fragmentBuffers)
                            fragmentBuffers.clear()
                            dispatchDataFrame(fragmentOpcode, full)
                            fragmentOpcode = 0
                        }
                    }
                    0x1, 0x2 -> { // text or binary
                        if (fin) {
                            dispatchDataFrame(opcode, payload)
                        } else {
                            fragmentOpcode = opcode
                            fragmentBuffers.clear()
                            fragmentBuffers.add(payload)
                        }
                    }
                    0x8 -> { // close
                        val code = if (payload.size >= 2) {
                            ((payload[0].toInt() and 0xFF) shl 8) or (payload[1].toInt() and 0xFF)
                        } else 1000
                        closed = true
                        try { sendCloseFrame(code) } catch (_: Exception) {}
                        listener?.onClose(code)
                        try { socket?.close() } catch (_: Exception) {}
                        return
                    }
                    0x9 -> { // ping — auto pong
                        try { sendRawPong(payload) } catch (_: Exception) {}
                    }
                    0xA -> { // pong — ignore
                    }
                    // unknown opcodes silently ignored per RFC 6455 §5.2
                }
            }
        } catch (e: IOException) {
            if (!closed) listener?.onError(e)
        } catch (e: Exception) {
            if (!closed) listener?.onError(e)
        } finally {
            if (!closed) {
                closed = true
                listener?.onClose(1006) // abnormal closure
            }
            try { socket?.close() } catch (_: Exception) {}
        }
    }

    private fun dispatchDataFrame(opcode: Int, data: ByteArray) {
        if (opcode == 0x1) {
            listener?.onMessage(String(data, Charsets.UTF_8))
        } else {
            listener?.onMessage(data)
        }
    }

    // -----------------------------------------------------------------------
    // Public send API
    // -----------------------------------------------------------------------
    override fun send(text: String) = sendFrame(0x1, text.toByteArray(Charsets.UTF_8))

    override fun send(data: ByteArray) = sendFrame(0x2, data)

    // -----------------------------------------------------------------------
    // Frame building — all client frames MUST be masked (RFC 6455 §5.3)
    // -----------------------------------------------------------------------
    private fun maskPayload(payload: ByteArray, maskKey: ByteArray): ByteArray {
        val masked = ByteArray(payload.size)
        for (i in payload.indices) {
            masked[i] = (payload[i].toInt() xor maskKey[i % 4].toInt()).toByte()
        }
        return masked
    }

    private fun sendFrame(opcode: Int, payload: ByteArray) {
        synchronized(sendLock) {
            val out = outputStream ?: return
            val maskKey = ByteArray(4).also { random.nextBytes(it) }
            val masked = maskPayload(payload, maskKey)
            val dos = DataOutputStream(out)
            dos.write(0x80 or opcode) // FIN=1, opcode
            writePayloadLength(dos, payload.size, mask = true)
            dos.write(maskKey)
            dos.write(masked)
            dos.flush()
        }
    }

    private fun sendRawPong(payload: ByteArray) {
        synchronized(sendLock) {
            val out = outputStream ?: return
            val maskKey = ByteArray(4).also { random.nextBytes(it) }
            val masked = maskPayload(payload, maskKey)
            val dos = DataOutputStream(out)
            dos.write(0x80 or 0xA) // FIN=1, pong
            writePayloadLength(dos, payload.size, mask = true)
            dos.write(maskKey)
            dos.write(masked)
            dos.flush()
        }
    }

    private fun sendCloseFrame(code: Int) {
        val payload = byteArrayOf(
            (code ushr 8 and 0xFF).toByte(),
            (code and 0xFF).toByte()
        )
        synchronized(sendLock) {
            val out = outputStream ?: return
            val maskKey = ByteArray(4).also { random.nextBytes(it) }
            val masked = maskPayload(payload, maskKey)
            val dos = DataOutputStream(out)
            dos.write(0x80 or 0x8) // FIN=1, close
            writePayloadLength(dos, payload.size, mask = true)
            dos.write(maskKey)
            dos.write(masked)
            dos.flush()
        }
    }

    private fun writePayloadLength(dos: DataOutputStream, len: Int, mask: Boolean) {
        val maskBit = if (mask) 0x80 else 0x00
        when {
            len <= 125 -> dos.write(maskBit or len)
            len <= 65535 -> {
                dos.write(maskBit or 126)
                dos.writeShort(len)
            }
            else -> {
                dos.write(maskBit or 127)
                dos.writeLong(len.toLong())
            }
        }
    }

    // -----------------------------------------------------------------------
    // close — public API
    // -----------------------------------------------------------------------
    override fun close() {
        if (closed) return
        closed = true
        try { sendCloseFrame(1000) } catch (_: Exception) {}
        try { socket?.close() } catch (_: Exception) {}
        listener?.onClose(1000)
    }

    // -----------------------------------------------------------------------
    // I/O helpers
    // -----------------------------------------------------------------------

    /** Read HTTP response headers line-by-line until blank line delimiter. */
    private fun readHttpResponseHeaders(input: InputStream): List<String> {
        val lines = mutableListOf<String>()
        val sb = StringBuilder()
        while (true) {
            val b = input.read()
            if (b == -1) break
            if (b == '\n'.code) {
                val line = sb.toString().trimEnd('\r')
                sb.clear()
                if (line.isEmpty()) break // blank line = end of HTTP headers
                lines.add(line)
            } else {
                sb.append(b.toChar())
            }
        }
        return lines
    }

    /** Read exactly [n] bytes. Returns null on EOF before [n] bytes read. */
    private fun readExact(input: InputStream, n: Int): ByteArray? {
        if (n == 0) return ByteArray(0)
        val buf = ByteArray(n)
        var offset = 0
        while (offset < n) {
            val read = input.read(buf, offset, n - offset)
            if (read == -1) return null
            offset += read
        }
        return buf
    }

    /** Read one byte; returns null on EOF. */
    private fun InputStream.readByteOrNull(): Byte? {
        val b = read()
        return if (b == -1) null else b.toByte()
    }

    /** Concatenate a list of byte arrays into one contiguous array. */
    private fun mergeBuffers(buffers: List<ByteArray>): ByteArray {
        val total = buffers.sumOf { it.size }
        val result = ByteArray(total)
        var offset = 0
        for (buf in buffers) {
            buf.copyInto(result, offset)
            offset += buf.size
        }
        return result
    }

    /** Compute Sec-WebSocket-Accept per RFC 6455 §4.2.2. */
    private fun computeAccept(key: String): String {
        val magic = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        val sha1 = MessageDigest.getInstance("SHA-1")
            .digest((key + magic).toByteArray(Charsets.US_ASCII))
        return Base64.encodeToString(sha1, Base64.NO_WRAP)
    }
}
