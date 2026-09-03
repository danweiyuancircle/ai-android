package chances.android.voice.sdk.util

import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack

class AudioTrackPlayer {
    private var audioTrack: AudioTrack? = null
    private val sampleRate = 16000
    private val bufferSize = AudioTrack.getMinBufferSize(
        sampleRate,
        AudioFormat.CHANNEL_OUT_MONO,
        AudioFormat.ENCODING_PCM_16BIT
    )

    @Volatile
    private var isPlaying = false

    private fun ensureTrack(): AudioTrack {
        return audioTrack ?: AudioTrack(
            AudioManager.STREAM_MUSIC,
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize,
            AudioTrack.MODE_STREAM
        ).also {
            audioTrack = it
            it.play()
            isPlaying = true
        }
    }

    fun playStream(chunk: ByteArray) {
        val track = ensureTrack()
        track.write(chunk, 0, chunk.size)
    }

    fun playOnce(data: ByteArray, onDone: () -> Unit) {
        Thread {
            val track = ensureTrack()
            track.write(data, 0, data.size)
            track.stop()
            track.flush()
            isPlaying = false
            onDone()
        }.also { it.isDaemon = true }.start()
    }

    fun stop() {
        isPlaying = false
        try {
            audioTrack?.stop()
            audioTrack?.flush()
        } catch (_: IllegalStateException) {}
        // 释放并置空，确保 ensureTrack() 下次重新创建并 play()
        audioTrack?.release()
        audioTrack = null
    }

    fun release() {
        stop()
        audioTrack?.release()
        audioTrack = null
    }
}
