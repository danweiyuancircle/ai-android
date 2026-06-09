package com.chances.shell.player

/**
 * 播放器事件回调，由 [PlayerInstance] 把底层 `PlayerKernel` 的各监听器归并转发，
 * 经 [PlayerManager] 分发给宿主（[PlayerBridge]）转成 `window.<回调>` 通知 H5。
 * 事件名与 template/bridge-contract.md 的「原生→H5 播放器回调」一一对应。
 *
 * 多实例：每个回调首参均为 `playerId`，H5 据此区分是哪个播放器实例触发。
 *
 * **线程契约**：底层引擎可能在 worker 线程回调，转发到 H5 由 `WebViewJsHelper` 内部 `webView.post`
 * 切回主线程执行，故本接口实现无需自行切线程。
 *
 * @author template
 */
interface OnPlayerListener {
    /** 已准备完成（可播放） */
    fun onPrepared(playerId: String)

    /** 播放完成（播放到结尾） */
    fun onCompletion(playerId: String)

    /** 播放错误：what/extra 为底层引擎原始错误码 */
    fun onError(playerId: String, what: Int, extra: String)

    /**
     * 播放流信息，what 已归一化为
     * `OnInfoListener.MEDIA_INFO_BUFFERING_START/END`、`MEDIA_INFO_VIDEO_RENDERING_START`。
     */
    fun onInfo(playerId: String, what: Int, extra: String)

    /** 缓冲进度（0-100） */
    fun onBufferingUpdate(playerId: String, percent: Int)

    /** seek 完成 */
    fun onSeekComplete(playerId: String)

    /** 播放状态变化：`OnStateChangeListener.PLAYING`(1) / `PAUSE`(2) */
    fun onStateChange(playerId: String, state: Int)
}
