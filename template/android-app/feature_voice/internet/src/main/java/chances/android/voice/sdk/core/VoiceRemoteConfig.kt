package chances.android.voice.sdk.core

data class IflyConfig(
    val appId: String,
    val apiKey: String,
    val apiSecret: String,
    val language: String = "zh_cn",
    val accent: String = "mandarin",
    val vcn: String = "xiaoyan",
    val speed: Int = 50,
    val pitch: Int = 50,
    val volume: Int = 80
)

data class TencentConfig(
    val secretId: String,
    val secretKey: String,
    val appId: String,
    val region: String = "ap-guangzhou",
    val voiceType: Int = 1002,
    val language: Int = 1
)

data class VolcConfig(
    val appId: String,
    val token: String,
    val asrCluster: String = "volcengine_streaming_common",
    val ttsCluster: String = "volcano_tts",
    val voiceType: String = "BV001_streaming",
    val speedRatio: Float = 1.0f,
    val volumeRatio: Float = 1.0f,
    val pitchRatio: Float = 1.0f
)

enum class AudioCodec { PCM, ADPCM, OPUS }

data class GattAudioProfile(
    val serviceUuid: String,
    val audioCharUuid: String,
    val controlCharUuid: String? = null,
    val audioCodec: AudioCodec = AudioCodec.PCM,
    val sampleRate: Int = 16000
)

data class VoiceRemoteConfig(
    val asrMode: AsrMode = AsrMode.SYSTEM,
    val ttsMode: TtsMode = TtsMode.SYSTEM,
    val iflyConfig: IflyConfig? = null,
    val tencentConfig: TencentConfig? = null,
    val volcConfig: VolcConfig? = null,
    val gattProfile: GattAudioProfile? = null,
    val language: String = "zh-CN",
    val enableVad: Boolean = true,
    val vadSilenceMs: Long = 1500,
    val hotwords: List<String> = emptyList(),
    val enableLlmCorrection: Boolean = false,
    val llmApiKey: String = "",
    val llmBaseUrl: String = "https://ark.cn-beijing.volces.com/api/coding/v3",
    val llmModel: String = "doubao-seed-2.0-lite",
    val inputMode: InputMode = InputMode.ALL,
    val networkPort: Int = 9527
) {
    enum class AsrMode { SYSTEM, IFLY, TENCENT, OFFLINE, VOLC }
    enum class TtsMode { SYSTEM, IFLY, TENCENT, VOLC }
    enum class InputMode { BLE_ONLY, NETWORK_ONLY, ALL }
}
