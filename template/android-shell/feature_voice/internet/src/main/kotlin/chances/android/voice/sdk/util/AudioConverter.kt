package chances.android.voice.sdk.util

import java.nio.ByteBuffer
import java.nio.ByteOrder

object AudioConverter {
    fun toLittleEndian(data: ByteArray): ByteArray {
        if (data.size % 2 != 0) return data
        val buffer = ByteBuffer.wrap(data).order(ByteOrder.BIG_ENDIAN)
        val out = ByteBuffer.allocate(data.size).order(ByteOrder.LITTLE_ENDIAN)
        while (buffer.hasRemaining()) {
            out.putShort(buffer.short)
        }
        return out.array()
    }
}
