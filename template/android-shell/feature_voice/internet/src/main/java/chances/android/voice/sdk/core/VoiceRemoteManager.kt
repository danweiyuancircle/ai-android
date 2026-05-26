package chances.android.voice.sdk.core

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import chances.android.voice.sdk.util.SdkLog
import android.view.KeyEvent
import chances.android.voice.sdk.asr.AsrEngine
import chances.android.voice.sdk.asr.AsrEngineFactory
import chances.android.voice.sdk.asr.AsrResult
import chances.android.voice.sdk.input.BluetoothRemoteDetector
import chances.android.voice.sdk.input.HidAudioCapture
import chances.android.voice.sdk.input.NetworkInputSource
import chances.android.voice.sdk.input.RemoteEvent
import chances.android.voice.sdk.tts.TtsEngineFactory
import chances.android.voice.sdk.tts.TtsManager
import chances.android.voice.sdk.util.LlmCorrector
import chances.android.voice.sdk.util.PermissionHelper

class VoiceRemoteManager private constructor(
    private val context: Context,
    private val config: VoiceRemoteConfig
) {
    companion object {
        private const val TAG = "VoiceRemoteManager"

        @Volatile
        private var instance: VoiceRemoteManager? = null

        fun init(context: Context, config: VoiceRemoteConfig): VoiceRemoteManager {
            instance?.stop()
            return VoiceRemoteManager(context.applicationContext, config).also {
                instance = it
            }
        }

        fun get(): VoiceRemoteManager {
            return instance ?: throw IllegalStateException(
                "VoiceRemoteManager not initialized. Call init() first."
            )
        }
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var callback: VoiceRemoteCallback? = null
    private var detector: BluetoothRemoteDetector? = null
    private var networkInput: NetworkInputSource? = null
    private var isNetworkSource = false
    private var asrEngine: AsrEngine? = null
    val tts: TtsManager

    init {
        val ttsEngine = TtsEngineFactory.create(config, context) { from, to ->
            mainHandler.post {
                SdkLog.i(TAG, "TTS engine fallback: $from → $to")
                callback?.onEngineFallback("TTS", from, to)
            }
        }
        tts = TtsManager(ttsEngine)
    }

    fun setCallback(cb: VoiceRemoteCallback) {
        this.callback = cb
    }

    fun start() {
        try {
            asrEngine = AsrEngineFactory.create(config, context) { from, to ->
                mainHandler.post {
                    SdkLog.i(TAG, "ASR engine fallback: $from → $to")
                    callback?.onEngineFallback("ASR", from, to)
                }
            }
        } catch (e: Exception) {
            SdkLog.e(TAG, "Failed to create ASR engine", e)
            mainHandler.post {
                callback?.onError(VoiceError.AsrFailed(e.message ?: "ASR engine creation failed"))
            }
            return
        }

        val mode = config.inputMode
        if (mode == VoiceRemoteConfig.InputMode.BLE_ONLY || mode == VoiceRemoteConfig.InputMode.ALL) {
            detector = BluetoothRemoteDetector(context, config) { event ->
                mainHandler.post {
                    isNetworkSource = false
                    handleEvent(event)
                }
            }
            detector?.start()
        }

        if (mode == VoiceRemoteConfig.InputMode.NETWORK_ONLY || mode == VoiceRemoteConfig.InputMode.ALL) {
            networkInput = NetworkInputSource(
                port = config.networkPort,
                onTextResult = { text ->
                    mainHandler.post {
                        callback?.onFinalResult(text)
                        networkInput?.sendToClient("""{"type":"final","text":"$text"}""")
                    }
                },
                onKeyPress = { key ->
                    mainHandler.post {
                        callback?.onRemoteKeyEvent(key)
                        injectKeyEvent(key)
                    }
                }
            )
            networkInput?.start { event ->
                isNetworkSource = true
                when (event) {
                    is RemoteEvent.AudioChunk -> {
                        // feedAudio is thread-safe, don't post to main thread
                        asrEngine?.feedAudio(event.pcmData)
                    }
                    is RemoteEvent.VoiceKeyDown -> {
                        // Start ASR on background thread to avoid blocking
                        Thread {
                            asrEngine?.start { result ->
                                mainHandler.post { handleAsrResult(result) }
                            }
                        }.start()
                        mainHandler.post { callback?.onListeningStart() }
                    }
                    is RemoteEvent.VoiceKeyUp -> {
                        Thread { asrEngine?.stop() }.start()
                        mainHandler.post { callback?.onListeningStop() }
                    }
                    else -> {
                        mainHandler.post { handleEvent(event) }
                    }
                }
            }
        }
    }

    fun stop() {
        detector?.stop()
        detector = null
        networkInput?.release()
        networkInput = null
        asrEngine?.cancel()
        asrEngine = null
        tts.stop()
    }

    fun onKeyEvent(event: KeyEvent): Boolean {
        val capture = detector?.getActiveCapture()
        return if (capture is HidAudioCapture) {
            capture.onKeyEvent(event)
        } else {
            false
        }
    }

    // --- Manual mic recording (bypass BLE, use device mic directly) ---

    private var manualRecord: AudioRecord? = null
    private var manualThread: Thread? = null
    @Volatile
    private var isManualRecording = false
    private var scoStarted = false

    @SuppressLint("MissingPermission")
    fun startListening() {
        if (isManualRecording) return
        SdkLog.i(TAG, "startListening: manual mic recording")

        // Try to route audio to Bluetooth SCO (for BT headset/mic)
        startBluetoothSco()

        callback?.onListeningStart()
        asrEngine?.start { result ->
            mainHandler.post { handleAsrResult(result) }
        }

        val sampleRate = 16000
        val audioSource = if (scoStarted) {
            SdkLog.i(TAG, "Using Bluetooth SCO mic")
            MediaRecorder.AudioSource.VOICE_COMMUNICATION
        } else {
            MediaRecorder.AudioSource.VOICE_RECOGNITION
        }
        val bufSize = maxOf(
            AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT),
            2560
        )
        manualRecord = AudioRecord(
            audioSource,
            sampleRate, AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT, bufSize
        )
        if (manualRecord?.state != AudioRecord.STATE_INITIALIZED) {
            SdkLog.e(TAG, "AudioRecord init failed")
            callback?.onError(VoiceError.AsrFailed("AudioRecord init failed"))
            return
        }
        manualRecord?.startRecording()
        isManualRecording = true

        manualThread = Thread {
            val buffer = ByteArray(1280)
            while (isManualRecording) {
                val read = manualRecord?.read(buffer, 0, buffer.size) ?: -1
                if (read > 0) {
                    asrEngine?.feedAudio(buffer.copyOf(read))
                }
            }
        }.apply {
            name = "ManualMicRecord"
            start()
        }
    }

    fun stopListening() {
        if (!isManualRecording) return
        SdkLog.i(TAG, "stopListening: stopping manual mic recording")
        isManualRecording = false
        manualThread?.join(1000)
        manualThread = null
        try { manualRecord?.stop() } catch (_: Exception) {}
        manualRecord?.release()
        manualRecord = null

        stopBluetoothSco()

        asrEngine?.stop()
        callback?.onListeningStop()
    }

    @Suppress("DEPRECATION")
    private fun startBluetoothSco() {
        try {
            val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            // Only start SCO if a BT audio device is actually connected
            if (am.isBluetoothScoAvailableOffCall && am.isBluetoothScoOn) {
                // Already on, keep it
                scoStarted = true
                SdkLog.i(TAG, "Bluetooth SCO already active")
            } else if (am.isBluetoothScoAvailableOffCall && am.isBluetoothA2dpOn) {
                am.startBluetoothSco()
                am.isBluetoothScoOn = true
                scoStarted = true
                SdkLog.i(TAG, "Bluetooth SCO started")
            } else {
                scoStarted = false
                SdkLog.d(TAG, "No Bluetooth audio device, using default mic")
            }
        } catch (e: Exception) {
            scoStarted = false
            SdkLog.w(TAG, "Failed to start Bluetooth SCO: ${e.message}")
        }
    }

    @Suppress("DEPRECATION")
    private fun stopBluetoothSco() {
        if (!scoStarted) return
        try {
            val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            am.isBluetoothScoOn = false
            am.stopBluetoothSco()
            scoStarted = false
            SdkLog.i(TAG, "Bluetooth SCO stopped")
        } catch (e: Exception) {
            SdkLog.w(TAG, "Failed to stop Bluetooth SCO: ${e.message}")
        }
    }

    fun requestPermissions(activity: Activity, callback: (Boolean) -> Unit) {
        PermissionHelper.checkAndRequest(activity, callback)
    }

    fun getNetworkInfo(): Pair<String, Int>? {
        val ni = networkInput ?: return null
        return ni.getLocalIp() to config.networkPort
    }

    private fun injectKeyEvent(key: String) {
        val keyCode = when (key) {
            "up" -> android.view.KeyEvent.KEYCODE_DPAD_UP
            "down" -> android.view.KeyEvent.KEYCODE_DPAD_DOWN
            "left" -> android.view.KeyEvent.KEYCODE_DPAD_LEFT
            "right" -> android.view.KeyEvent.KEYCODE_DPAD_RIGHT
            "ok" -> android.view.KeyEvent.KEYCODE_DPAD_CENTER
            "back" -> android.view.KeyEvent.KEYCODE_BACK
            "vol_up" -> android.view.KeyEvent.KEYCODE_VOLUME_UP
            "vol_down" -> android.view.KeyEvent.KEYCODE_VOLUME_DOWN
            "mute" -> android.view.KeyEvent.KEYCODE_VOLUME_MUTE
            else -> return
        }
        Thread {
            try {
                val inst = android.app.Instrumentation()
                inst.sendKeyDownUpSync(keyCode)
            } catch (e: Exception) {
                SdkLog.w(TAG, "Key injection failed: ${e.message}")
            }
        }.start()
    }

    private fun handleEvent(event: RemoteEvent) {
        when (event) {
            is RemoteEvent.Connected -> callback?.onRemoteConnected(event.device)
            is RemoteEvent.Disconnected -> callback?.onRemoteDisconnected(event.device)
            is RemoteEvent.VoiceKeyDown -> {
                callback?.onListeningStart()
                asrEngine?.start { result ->
                    mainHandler.post { handleAsrResult(result) }
                }
            }
            is RemoteEvent.VoiceKeyUp -> {
                asrEngine?.stop()
                callback?.onListeningStop()
            }
            is RemoteEvent.AudioChunk -> {
                asrEngine?.feedAudio(event.pcmData)
            }
        }
    }

    private fun handleAsrResult(result: AsrResult) {
        when (result) {
            is AsrResult.Partial -> {
                callback?.onPartialResult(result.text)
                if (isNetworkSource && networkInput != null) {
                    networkInput?.sendToClient("""{"type":"partial","text":"${result.text}"}""")
                }
            }
            is AsrResult.Final -> {
                if (config.enableLlmCorrection && config.llmApiKey.isNotEmpty()) {
                    // Show raw result first, then correct
                    callback?.onFinalResult(result.text)
                    if (isNetworkSource && networkInput != null) {
                        networkInput?.sendToClient("""{"type":"final","text":"${result.text}"}""")
                    }
                    LlmCorrector.correct(
                        text = result.text,
                        apiKey = config.llmApiKey,
                        baseUrl = config.llmBaseUrl,
                        model = config.llmModel
                    ) { corrected ->
                        if (corrected != result.text) {
                            mainHandler.post {
                                callback?.onFinalResult(corrected)
                                if (isNetworkSource && networkInput != null) {
                                    networkInput?.sendToClient("""{"type":"final","text":"$corrected"}""")
                                }
                            }
                        }
                    }
                } else {
                    callback?.onFinalResult(result.text)
                    if (isNetworkSource && networkInput != null) {
                        networkInput?.sendToClient("""{"type":"final","text":"${result.text}"}""")
                    }
                }
            }
            is AsrResult.Error -> {
                callback?.onError(result.error)
                if (isNetworkSource && networkInput != null) {
                    networkInput?.sendToClient("""{"type":"error","message":"${result.error.message}"}""")
                }
            }
        }
    }
}
