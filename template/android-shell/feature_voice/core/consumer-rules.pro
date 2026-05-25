# ServiceLoader 需要 SPI 接口存活，否则发现不到语音实现（回退 Noop）
-keep interface com.example.shell.voice.VoiceControllerProvider
