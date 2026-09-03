package chances.android.voice.sdk.util

import android.util.Base64
import java.io.DataOutputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.security.MessageDigest
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

interface WsServerListener {
    fun onClientConnected()
    fun onClientDisconnected()
    fun onMessage(text: String)
    fun onMessage(data: ByteArray) {}
    fun onError(e: Exception)
}

// ---------------------------------------------------------------------------
// Lightweight RFC 6455 WebSocket server (single-client, no TLS, LAN only).
//
// Supports:
//  - HTTP/1.1 Upgrade handshake with Sec-WebSocket-Accept
//  - Opcode 0x1 text, 0x2 binary
//  - Opcode 0x8 close  (sends echo close frame back)
//  - Opcode 0x9 ping   (auto pong)
//  - Client frames are masked per RFC 6455; server frames are NOT masked
//  - Thread-safe send (synchronized on outputStream)
// ---------------------------------------------------------------------------
class WsServer(private val port: Int, private val listener: WsServerListener) {

    private val TAG = "WsServer"

    @Volatile private var serverSocket: ServerSocket? = null
    @Volatile private var clientSocket: Socket? = null
    @Volatile private var outputStream: OutputStream? = null
    @Volatile private var stopped = false

    private val sendLock = Any()
    private val sendExecutor: ExecutorService = Executors.newSingleThreadExecutor()

    fun start() {
        stopped = false
        Thread {
            try {
                acceptLoop()
            } catch (e: Exception) {
                if (!stopped) {
                    SdkLog.e(TAG, "Server error", e)
                    listener.onError(e)
                }
            }
        }.also { it.name = "WsServer-accept"; it.isDaemon = true }.start()
    }

    private fun acceptLoop() {
        // Use 3-arg constructor to force a pure IPv4 socket.
        // Some Android devices do not accept IPv4 connections on dual-stack IPv6 sockets.
        val bindAddr = InetAddress.getByAddress(byteArrayOf(0, 0, 0, 0))
        val ss = ServerSocket(port, 50, bindAddr)
        ss.reuseAddress = true
        serverSocket = ss
        SdkLog.i(TAG, "Listening on port $port")

        while (!stopped) {
            val client = try {
                ss.accept()
            } catch (e: IOException) {
                if (!stopped) {
                    SdkLog.e(TAG, "accept() failed", e)
                    listener.onError(e)
                }
                break
            }
            SdkLog.i(TAG, "Client connected: ${client.inetAddress}")
            clientSocket = client
            outputStream = client.getOutputStream()

            try {
                handleClient(client)
            } catch (e: Exception) {
                if (!stopped) {
                    SdkLog.e(TAG, "Client error", e)
                    listener.onError(e)
                }
            } finally {
                listener.onClientDisconnected()
                outputStream = null
                clientSocket = null
                try { client.close() } catch (_: Exception) {}
            }
        }
    }

    private fun handleClient(client: Socket) {
        val input = client.getInputStream()

        // Perform HTTP/1.1 Upgrade handshake
        val requestLines = readHttpRequestHeaders(input)
        SdkLog.d(TAG, "Handshake request: ${requestLines.firstOrNull()}")

        val wsKey = requestLines
            .firstOrNull { it.lowercase().startsWith("sec-websocket-key:") }
            ?.substringAfter(":")
            ?.trim()
            ?: throw IOException("Missing Sec-WebSocket-Key")

        val accept = computeAccept(wsKey)
        val response = buildString {
            append("HTTP/1.1 101 Switching Protocols\r\n")
            append("Upgrade: websocket\r\n")
            append("Connection: Upgrade\r\n")
            append("Sec-WebSocket-Accept: $accept\r\n")
            append("\r\n")
        }
        outputStream!!.write(response.toByteArray(Charsets.US_ASCII))
        outputStream!!.flush()

        SdkLog.i(TAG, "Handshake complete")
        listener.onClientConnected()

        readLoop(input)
    }

    private fun readLoop(input: InputStream) {
        var fragmentOpcode = 0
        val fragmentBuffers = mutableListOf<ByteArray>()

        try {
            loop@ while (!stopped) {
                val b0 = input.readByteOrNull() ?: break
                val fin = (b0.toInt() and 0x80) != 0
                val opcode = b0.toInt() and 0x0F

                val b1 = input.readByteOrNull() ?: break
                val clientMasked = (b1.toInt() and 0x80) != 0
                val rawLen = b1.toInt() and 0x7F

                val payloadLen: Int = when (rawLen) {
                    126 -> {
                        val hi = input.readByteOrNull() ?: break@loop
                        val lo = input.readByteOrNull() ?: break@loop
                        ((hi.toInt() and 0xFF) shl 8) or (lo.toInt() and 0xFF)
                    }
                    127 -> {
                        var len = 0L
                        for (i in 0 until 8) {
                            val b = input.readByteOrNull() ?: break@loop
                            len = (len shl 8) or (b.toLong() and 0xFF)
                        }
                        if (len > Int.MAX_VALUE) throw IOException("Frame too large: $len")
                        len.toInt()
                    }
                    else -> rawLen
                }

                // Client frames MUST be masked per RFC 6455 §5.3
                val maskKey: ByteArray? = if (clientMasked) {
                    val mk = ByteArray(4)
                    for (i in 0 until 4) {
                        mk[i] = input.readByteOrNull() ?: break@loop
                    }
                    mk
                } else null

                val payload = readExact(input, payloadLen) ?: break

                // Unmask payload
                if (maskKey != null) {
                    for (i in payload.indices) {
                        payload[i] = (payload[i].toInt() xor maskKey[i % 4].toInt()).toByte()
                    }
                }

                when (opcode) {
                    0x0 -> { // continuation
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
                        SdkLog.i(TAG, "Received close frame, code=$code")
                        try { sendCloseFrame(code) } catch (_: Exception) {}
                        return
                    }
                    0x9 -> { // ping -> pong
                        SdkLog.d(TAG, "Received ping, sending pong")
                        try { sendPongFrame(payload) } catch (_: Exception) {}
                    }
                    0xA -> { /* pong — ignore */ }
                    else -> SdkLog.w(TAG, "Unknown opcode: 0x${opcode.toString(16)}")
                }
            }
        } catch (e: IOException) {
            if (!stopped) {
                SdkLog.e(TAG, "Read loop IO error", e)
                listener.onError(e)
            }
        }
    }

    private fun dispatchDataFrame(opcode: Int, data: ByteArray) {
        if (opcode == 0x1) {
            val text = String(data, Charsets.UTF_8)
            if (!text.contains("audio_data")) SdkLog.d(TAG, "Received text: $text")
            listener.onMessage(text)
        } else {
            SdkLog.d(TAG, "Received binary: ${data.size} bytes")
            listener.onMessage(data)
        }
    }

    // -----------------------------------------------------------------------
    // Public send API — server frames are NOT masked (RFC 6455 §5.1)
    // -----------------------------------------------------------------------
    fun send(text: String) {
        sendExecutor.execute { sendFrame(0x1, text.toByteArray(Charsets.UTF_8)) }
    }

    fun send(data: ByteArray) {
        sendExecutor.execute { sendFrame(0x2, data) }
    }

    private fun sendFrame(opcode: Int, payload: ByteArray) {
        synchronized(sendLock) {
            val out = outputStream ?: run {
                SdkLog.w(TAG, "send() called with no client connected")
                return
            }
            try {
                val dos = DataOutputStream(out)
                dos.write(0x80 or opcode) // FIN=1
                writePayloadLength(dos, payload.size, mask = false)
                dos.write(payload)
                dos.flush()
            } catch (e: IOException) {
                SdkLog.e(TAG, "send() failed", e)
            }
        }
    }

    private fun sendPongFrame(payload: ByteArray) {
        synchronized(sendLock) {
            val out = outputStream ?: return
            val dos = DataOutputStream(out)
            dos.write(0x80 or 0xA) // FIN=1, pong
            writePayloadLength(dos, payload.size, mask = false)
            dos.write(payload)
            dos.flush()
        }
    }

    private fun sendCloseFrame(code: Int) {
        synchronized(sendLock) {
            val out = outputStream ?: return
            val payload = byteArrayOf(
                (code ushr 8 and 0xFF).toByte(),
                (code and 0xFF).toByte()
            )
            val dos = DataOutputStream(out)
            dos.write(0x80 or 0x8) // FIN=1, close
            writePayloadLength(dos, payload.size, mask = false)
            dos.write(payload)
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

    fun stop() {
        stopped = true
        try { clientSocket?.close() } catch (_: Exception) {}
        try { serverSocket?.close() } catch (_: Exception) {}
        outputStream = null
        clientSocket = null
        serverSocket = null
        SdkLog.i(TAG, "Server stopped")
    }

    // -----------------------------------------------------------------------
    // I/O helpers
    // -----------------------------------------------------------------------

    private fun readHttpRequestHeaders(input: InputStream): List<String> {
        val lines = mutableListOf<String>()
        val sb = StringBuilder()
        while (true) {
            val b = input.read()
            if (b == -1) break
            if (b == '\n'.code) {
                val line = sb.toString().trimEnd('\r')
                sb.clear()
                if (line.isEmpty()) break
                lines.add(line)
            } else {
                sb.append(b.toChar())
            }
        }
        return lines
    }

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

    private fun InputStream.readByteOrNull(): Byte? {
        val b = read()
        return if (b == -1) null else b.toByte()
    }

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

    private fun computeAccept(key: String): String {
        val magic = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        val sha1 = MessageDigest.getInstance("SHA-1")
            .digest((key + magic).toByteArray(Charsets.US_ASCII))
        return Base64.encodeToString(sha1, Base64.NO_WRAP)
    }
}
