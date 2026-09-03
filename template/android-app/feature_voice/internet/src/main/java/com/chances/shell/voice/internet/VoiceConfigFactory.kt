package com.chances.shell.voice.internet

import chances.android.voice.sdk.core.IflyConfig
import chances.android.voice.sdk.core.TencentConfig
import chances.android.voice.sdk.core.VoiceRemoteConfig
import chances.android.voice.sdk.core.VolcConfig

/**
 * 从编译期注入的 [BuildConfig] 构造 voice-remote-sdk 的 [VoiceRemoteConfig]。
 *
 * 引擎选择（asrMode / ttsMode）与各家密钥走模块 `voice.properties`（不入库）→ `build.gradle`
 * 注入 BuildConfig，见 `internet/README.md`。三家密钥配置全部保留，仅当对应 appId 非空时才构造，
 * 配了哪家就只生效哪家。固定网络输入模式（NETWORK_ONLY）：盒子作 WebSocket Server，手机客户端发 PCM。
 *
 * @author template
 */
object VoiceConfigFactory {

    /**
     * 构造语音配置。引擎类型字符串非法时回退 SYSTEM；网络端口取 [BuildConfig.VOICE_NETWORK_PORT]。
     *
     * @return 供 [chances.android.voice.sdk.core.VoiceRemoteManager.init] 使用的配置
     */
    fun build(): VoiceRemoteConfig {
        return VoiceRemoteConfig(
            asrMode = parseAsrMode(BuildConfig.VOICE_ASR_MODE),
            ttsMode = parseTtsMode(BuildConfig.VOICE_TTS_MODE),
            iflyConfig = buildIflyConfig(),
            tencentConfig = buildTencentConfig(),
            volcConfig = buildVolcConfig(),
            inputMode = VoiceRemoteConfig.InputMode.NETWORK_ONLY,
            networkPort = BuildConfig.VOICE_NETWORK_PORT
        )
    }

    /**
     * 解析 ASR 引擎类型，非法值回退 [VoiceRemoteConfig.AsrMode.SYSTEM]。
     *
     * @param mode 引擎名（SYSTEM / IFLY / TENCENT / OFFLINE / VOLC，大小写敏感）
     * @return 对应枚举
     */
    private fun parseAsrMode(mode: String): VoiceRemoteConfig.AsrMode {
        return try {
            VoiceRemoteConfig.AsrMode.valueOf(mode)
        } catch (e: IllegalArgumentException) {
            VoiceRemoteConfig.AsrMode.SYSTEM
        }
    }

    /**
     * 解析 TTS 引擎类型，非法值回退 [VoiceRemoteConfig.TtsMode.SYSTEM]。
     *
     * @param mode 引擎名（SYSTEM / IFLY / TENCENT / VOLC，大小写敏感）
     * @return 对应枚举
     */
    private fun parseTtsMode(mode: String): VoiceRemoteConfig.TtsMode {
        return try {
            VoiceRemoteConfig.TtsMode.valueOf(mode)
        } catch (e: IllegalArgumentException) {
            VoiceRemoteConfig.TtsMode.SYSTEM
        }
    }

    /**
     * 构造讯飞配置；appId 为空（未配置）时返回 null。
     *
     * @return 讯飞配置或 null
     */
    private fun buildIflyConfig(): IflyConfig? {
        if (BuildConfig.IFLY_APP_ID.isEmpty()) {
            return null
        }
        return IflyConfig(
            appId = BuildConfig.IFLY_APP_ID,
            apiKey = BuildConfig.IFLY_API_KEY,
            apiSecret = BuildConfig.IFLY_API_SECRET
        )
    }

    /**
     * 构造腾讯配置；appId 为空（未配置）时返回 null。
     *
     * @return 腾讯配置或 null
     */
    private fun buildTencentConfig(): TencentConfig? {
        if (BuildConfig.TENCENT_APP_ID.isEmpty()) {
            return null
        }
        return TencentConfig(
            secretId = BuildConfig.TENCENT_SECRET_ID,
            secretKey = BuildConfig.TENCENT_SECRET_KEY,
            appId = BuildConfig.TENCENT_APP_ID
        )
    }

    /**
     * 构造火山配置；appId 为空（未配置）时返回 null。
     *
     * @return 火山配置或 null
     */
    private fun buildVolcConfig(): VolcConfig? {
        if (BuildConfig.VOLC_APP_ID.isEmpty()) {
            return null
        }
        return VolcConfig(
            appId = BuildConfig.VOLC_APP_ID,
            token = BuildConfig.VOLC_TOKEN
        )
    }
}
