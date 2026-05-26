package chances.android.voice.sdk.input

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import chances.android.voice.sdk.util.SdkLog
import android.view.KeyEvent

class HidAudioCapture(
    private val device: BluetoothDevice,
    private val skipAudioRecord: Boolean = false
) : AudioCaptureBase() {

    companion object {
        private const val TAG = "HidAudioCapture"
        private const val SAMPLE_RATE = 16000
        private const val BUFFER_SIZE = 1280
        @SuppressLint("InlinedApi")
        private val VOICE_KEY_CODES = setOf(
            KeyEvent.KEYCODE_VOICE_ASSIST,  // API 21+, value is safe when inlined
            KeyEvent.KEYCODE_SEARCH
        )
    }

    private var audioRecord: AudioRecord? = null
    private var recordThread: Thread? = null
    @Volatile
    private var isRecording = false

    fun onKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode !in VOICE_KEY_CODES) return false

        when (event.action) {
            KeyEvent.ACTION_DOWN -> {
                if (!isRecording) {
                    listener?.invoke(RemoteEvent.VoiceKeyDown)
                    if (!skipAudioRecord) startRecording()
                }
                return true
            }
            KeyEvent.ACTION_UP -> {
                if (isRecording || skipAudioRecord) {
                    stopRecording()
                    listener?.invoke(RemoteEvent.VoiceKeyUp)
                }
                return true
            }
        }
        return false
    }

    @SuppressLint("MissingPermission")
    private fun startRecording() {
        val minBufSize = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val bufSize = maxOf(minBufSize, BUFFER_SIZE * 2)

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufSize
        )

        audioRecord?.startRecording()
        isRecording = true

        recordThread = Thread {
            val buffer = ByteArray(BUFFER_SIZE)
            while (isRecording) {
                val read = audioRecord?.read(buffer, 0, BUFFER_SIZE) ?: -1
                if (read > 0) {
                    listener?.invoke(RemoteEvent.AudioChunk(buffer.copyOf(read)))
                }
            }
        }.apply {
            name = "HidAudioCapture-Record"
            start()
        }
    }

    private fun stopRecording() {
        isRecording = false
        recordThread?.join(1000)
        recordThread = null
        try {
            audioRecord?.stop()
        } catch (_: IllegalStateException) {}
        audioRecord?.release()
        audioRecord = null
    }

    @SuppressLint("MissingPermission")
    override fun onStart() {
        SdkLog.d(TAG, "HidAudioCapture started for device: ${device.name}")
    }

    override fun onStop() {
        stopRecording()
    }

    override fun onRelease() {
        stopRecording()
    }
}
