# player：播放器（系统 MediaPlayer + IJK + ExoPlayer 热切换）

分层：`PlayerFactory`（工厂）→ `PlayerKernel`（内核接口）→ `VideoPlayerView`（抽象 View）→ 具体实现（`NativePlayerView` / `IjkPlayerView` / `ExoPlayerView`）。对外统一用顶层 `chances.core.player.UniversalVideoView`，支持运行时切换引擎。

- 系统引擎工厂：`chances.core.player.natives.NativeFactory`（core 自带，无 so）。
- IJK 引擎工厂：`chances.core.player.ijk.IjkFactory`（来自 `player-ijk` 模块，+~38MB so）。
- ExoPlayer 引擎工厂：`chances.core.player.exo.ExoFactory`（来自 `player-exo` 模块，ExoPlayer `2.9.6`，so 在 aar 内）。

三引擎选型：本地 mp4 / 简单流 → `NativeFactory`；RTMP / FLV / 复杂点直播 → `IjkFactory`；HLS(.m3u8) / DASH(.mpd) / SmoothStreaming / Progressive 标准流 → `ExoFactory`（按 URL 后缀自动选 MediaSource）。

## 设默认引擎（Application）
```kotlin
SdkCore.init(this, player = PlayerConfig.builder()
    .defaultPlayerFactory(IjkFactory::class.java)   // 不设则回退系统 NativeFactory
    .build())
```
`player-ijk` 也有等价入口 `IjkConfig`（`enableAsDefault` 默认 true），语义同上。

## UniversalVideoView 用法（取自真实联调代码）
xml 里直接写 `<chances.core.player.UniversalVideoView .../>`，然后：

```kotlin
// 1. 监听器必须在 setPlayerType / setPlayData / start 之前注册
playerView.setOnPreparedListener(object : OnPreparedListener {
    override fun onPrepared() { /* playerView.duration */ }
})
playerView.setOnCompletionListener(object : OnCompletionListener { override fun onCompletion() {} })
playerView.setOnErrorListener(object : OnErrorListener {
    override fun onError(info: PlayerErrorInfo) { /* info.what / info.extra */ }
})
playerView.setOnInfoListener(object : OnInfoListener {
    override fun onInfo(info: PlayerInfo) { /* info.what / info.extra */ }
})
playerView.setOnStateChangeListener(object : OnStateChangeListener {
    override fun onPlayerStateChange(status: Int) { /* OnStateChangeListener.PLAYING / PAUSE */ }
})

// 2. 切换引擎（会重建内核、重置监听器，需重新 bind）
playerView.setPlayerType(IjkFactory::class.java)   // 或 NativeFactory::class.java
// 重新注册上面的监听器…

// 3. 播放控制
playerView.setPlayData(url)
playerView.start();  playerView.pause();  playerView.stop()
playerView.setMute(true)
playerView.setAspectRatio(PlayerKernel.ASPECT_RATIO_16_9)

// 4. 状态
playerView.isPlaying          // Boolean
playerView.duration           // ms
playerView.currentPlayerType  // Class<out PlayerFactory>?
```

监听器、实体类包路径：`chances.core.player.common.listener.*`（`OnPreparedListener` / `OnCompletionListener` / `OnErrorListener` / `OnInfoListener` / `OnStateChangeListener`）、`chances.core.player.common.entity.*`（`PlayerErrorInfo` / `PlayerInfo`，字段 `what` / `extra`）。

## 比例常量（`chances.core.player.common.PlayerKernel`）
`ASPECT_RATIO_FIT_PARENT`（铺满）/ `ASPECT_RATIO_WRAP_CONTENT`（流自身）/ `ASPECT_RATIO_16_9` / `ASPECT_RATIO_4_3`。

## IJK 全局开关（`chances.core.player.ijk.IjkSettings`，静态字段）
`usingMediaCodec`(默认 true) / `enableSurfaceView`(true) / `enableTextureView`(false) / `enableBackgroundPlay`(true) / `defaultPlayer`(默认 `PV_PLAYER__IjkMediaPlayer`)。常量 `PV_PLAYER__AndroidMediaPlayer=1` / `PV_PLAYER__IjkMediaPlayer=2` / `PV_PLAYER__IjkExoMediaPlayer=3`。`isH265HWDecoderSupport()` 仅 API 21+。

## 常见坑
- `setPlayerType` 后监听器被清掉，必须重新 bind。
- 监听器在 `setPlayData` / `start` 前注册，否则可能漏掉早期回调。
- 不引入 `player-ijk` 就别引用 `IjkFactory`，否则编译失败；只用系统播放器可省 ~38MB。
- 在 `onPause` 暂停、`onDestroy` stop，避免后台占用与泄漏。
