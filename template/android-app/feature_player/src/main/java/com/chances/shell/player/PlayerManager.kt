package com.chances.shell.player

import android.view.ViewGroup
import chances.core.log.Logger
import java.util.concurrent.atomic.AtomicInteger

/**
 * 播放器多实例管理器：维护「playerId -> [PlayerInstance]」，支持同时存在多个播放器，按 id 操作。
 *
 * - [nextId] 在任意线程分配唯一 id（供 [PlayerBridge.create] 同步返回给 H5）；
 * - [create] 在主线程真正创建实例（建 View 必须主线程）；
 * - 所有播放器实例的 [UniversalVideoView] 都加到同一个容器（位于 WebView 之下，背播）。
 *
 * 回调统一经内部 [dispatcher] 转给宿主设置的 [listener]（带 playerId），由 [PlayerBridge] 转发到 H5。
 *
 * **线程契约**：[create] / [release] / [releaseAll] 须在主线程调用。
 *
 * @author template
 */
class PlayerManager(private val container: ViewGroup) {

    companion object {
        private const val TAG = "PlayerManager"
    }

    private val players = LinkedHashMap<String, PlayerInstance>()
    private val seq = AtomicInteger(0)
    private var listener: OnPlayerListener? = null

    /**
     * 单实例独占模式：为 true 时，每次 [create] 新播放器前先释放其他全部已存在实例，
     * 保证同一时刻只有一个活动播放器。多数 OTT 盒子硬件仅支持单路解码，故默认开启。
     * 置 false 可允许多实例并存。
     */
    var singleInstanceMode: Boolean = true

    /** 内部分发器：把各实例（带 id）的事件转给宿主 listener */
    private val dispatcher = object : OnPlayerListener {
        override fun onPrepared(playerId: String) {
            listener?.onPrepared(playerId)
        }

        override fun onCompletion(playerId: String) {
            listener?.onCompletion(playerId)
        }

        override fun onError(playerId: String, what: Int, extra: String) {
            listener?.onError(playerId, what, extra)
        }

        override fun onInfo(playerId: String, what: Int, extra: String) {
            listener?.onInfo(playerId, what, extra)
        }

        override fun onBufferingUpdate(playerId: String, percent: Int) {
            listener?.onBufferingUpdate(playerId, percent)
        }

        override fun onSeekComplete(playerId: String) {
            listener?.onSeekComplete(playerId)
        }

        override fun onStateChange(playerId: String, state: Int) {
            listener?.onStateChange(playerId, state)
        }
    }

    /** 设置事件监听器（宿主用它把事件转发到 H5） */
    fun setPlayerListener(listener: OnPlayerListener?) {
        this.listener = listener
    }

    /** 分配一个唯一 playerId（线程安全，可在 binder 线程调用以同步返回给 H5） */
    fun nextId(): String = "player_" + seq.incrementAndGet()

    /**
     * 用指定 id 创建一个播放器实例并选择引擎（主线程）。
     *
     * [singleInstanceMode] 为 true（默认）时，创建前先释放其他全部已存在实例，保证单实例独占。
     *
     * @param playerId   由 [nextId] 预分配的 id
     * @param playerType 引擎类型；为空或未注册时回退 [PlayerType.DEFAULT]
     * @return 该实例的 id
     */
    fun create(playerId: String, playerType: String?): String {
        if (singleInstanceMode && players.isNotEmpty()) {
            // 单实例独占：盒子多为单路解码，新建前先清掉其余实例，避免抢占解码器导致黑屏/无声
            players.values.forEach { it.release() }
            players.clear()
            Logger.i(TAG, "单实例独占：创建前已释放其他全部播放器")
        }
        val instance = PlayerInstance(playerId, container, dispatcher)
        players[playerId] = instance
        instance.create(playerType)
        Logger.i(TAG, "创建播放器实例：id=%s type=%s 当前实例数=%d", playerId, playerType, players.size)
        return playerId
    }

    /** 取出实例；不存在返回 null */
    fun get(playerId: String?): PlayerInstance? {
        if (playerId.isNullOrEmpty()) {
            return null
        }
        return players[playerId]
    }

    /** 释放并移除指定实例 */
    fun release(playerId: String?) {
        val instance = players.remove(playerId)
        if (instance != null) {
            instance.release()
            Logger.i(TAG, "释放播放器实例：id=%s 剩余实例数=%d", playerId, players.size)
        }
    }

    /** 释放并移除全部实例（页面销毁时调用） */
    fun releaseAll() {
        players.values.forEach { it.release() }
        players.clear()
        Logger.i(TAG, "释放全部播放器实例")
    }
}
