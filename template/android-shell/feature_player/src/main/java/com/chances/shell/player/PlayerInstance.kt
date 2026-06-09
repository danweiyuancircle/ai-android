package com.chances.shell.player

import android.view.ViewGroup
import android.widget.FrameLayout
import chances.core.log.Logger
import chances.core.player.UniversalVideoView
import chances.core.player.ijk.IjkSettings
import chances.core.player.common.listener.OnBufferingUpdateListener
import chances.core.player.common.listener.OnCompletionListener
import chances.core.player.common.listener.OnErrorListener
import chances.core.player.common.listener.OnInfoListener
import chances.core.player.common.listener.OnPreparedListener
import chances.core.player.common.listener.OnSeekCompleteListener
import chances.core.player.common.listener.OnStateChangeListener

/**
 * 单个播放器实例：持有自己的 [UniversalVideoView]，按 type 切换引擎，并把底层监听归并转发给
 * [OnPlayerListener]（带自身 [id]，供 H5 区分多实例）。
 *
 * 多实例下每个实例对应容器内一个独立的 [UniversalVideoView]（fullscreen，叠在容器内）。
 * 引擎创建 / 切换 / 监听透传 / 背景透明全部交给基座的 [UniversalVideoView]，本类不重复造轮子。
 *
 * **线程契约**：所有变更播放状态 / 视图的方法须在**主线程**调用（[PlayerBridge] 已统一 post 到主线程）。
 *
 * @author template
 */
class PlayerInstance(
    val id: String,
    private val container: ViewGroup,
    private val listener: OnPlayerListener,
) {

    companion object {
        private const val TAG = "PlayerInstance"
    }

    private var videoView: UniversalVideoView? = null
    private var currentType: String? = null

    /**
     * 按类型创建 / 切换播放器引擎。
     *
     * @param playerType 引擎类型；为空或未注册时回退 [PlayerType.DEFAULT]
     * @return 是否成功持有可用引擎
     */
    fun create(playerType: String?): Boolean {
        val type = if (PlayerEngineRegistry.has(playerType)) playerType!! else PlayerType.DEFAULT
        if (!PlayerEngineRegistry.has(playerType)) {
            Logger.w(TAG, "[%s] 未注册的播放器类型：%s，回退默认引擎：%s", id, playerType, type)
        }
        val factoryClass = PlayerEngineRegistry.get(type)
        if (factoryClass == null) {
            Logger.w(TAG, "[%s] 默认引擎未注册：%s", id, type)
            return false
        }
        // 背播：ijk 默认 SurfaceView 在 TV WebView 之下常「有声无画」，改用 TextureView
        if (type == PlayerType.IJK) {
            IjkSettings.enableTextureView = true
            IjkSettings.enableSurfaceView = false
        }
        // UniversalVideoView.setPlayerType 内部判断同类型不重建
        ensureView().setPlayerType(factoryClass)
        currentType = type
        Logger.i(TAG, "[%s] 切换播放器引擎：type=%s -> %s", id, type, factoryClass.name)
        return true
    }

    private fun ensureView(): UniversalVideoView {
        var view = videoView
        if (view == null) {
            view = UniversalVideoView(container.context)
            view.layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            // 监听须在 setPlayerType 之前绑定（切引擎时 UniversalVideoView 会重注入到新内核）
            bindListeners(view)
            container.addView(view)
            videoView = view
        }
        return view
    }

    private fun ensureReady(): UniversalVideoView {
        ensureView()
        if (currentType == null) {
            create(PlayerType.DEFAULT)
        }
        return videoView!!
    }

    /** 设置播放地址（url） */
    fun setDataSource(url: String) {
        ensureReady().setPlayData(url)
    }

    /** 开始 / 恢复播放 */
    fun start() {
        ensureReady().start()
    }

    /** 暂停 */
    fun pause() {
        videoView?.pause()
    }

    /** 停止 */
    fun stop() {
        videoView?.stop()
    }

    /** seek 到指定位置（毫秒） */
    fun seekTo(position: Int) {
        videoView?.seekTo(position)
    }

    /** 是否正在播放 */
    fun isPlaying(): Boolean = try {
        videoView?.isPlaying ?: false
    } catch (e: Exception) {
        Logger.w(TAG, "[$id] isPlaying 失败", e)
        false
    }

    /** 总时长（毫秒） */
    fun getDuration(): Int = try {
        videoView?.duration ?: 0
    } catch (e: Exception) {
        Logger.w(TAG, "[$id] getDuration 失败", e)
        0
    }

    /** 当前播放位置（毫秒） */
    fun getCurrentPosition(): Int = try {
        videoView?.currentPosition ?: 0
    } catch (e: Exception) {
        Logger.w(TAG, "[$id] getCurrentPosition 失败", e)
        0
    }

    /** 静音开关 */
    fun setMute(mute: Boolean) {
        videoView?.setMute(mute)
    }

    /** 是否静音 */
    fun isMute(): Boolean = videoView?.isMute ?: false

    /** 倍速播放 */
    fun setSpeed(speed: Float) {
        videoView?.setSpeed(speed)
    }

    /** 设置纵横比（见 `PlayerKernel.ASPECT_RATIO_*`：1 铺满 / 2 原比例 / 3 16:9 / 4 4:3） */
    fun setAspectRatio(ratio: Int) {
        videoView?.setAspectRatio(ratio)
    }

    /** SurfaceView 是否置顶（背播默认 false，让视频在 WebView 之下） */
    fun setZOrderOnTop(onTop: Boolean) {
        videoView?.setZOrderOnTop(onTop)
    }

    /** SurfaceView 是否作为媒体覆盖层 */
    fun setZOrderMediaOverlay(overlay: Boolean) {
        videoView?.setZOrderMediaOverlay(overlay)
    }

    /** 释放播放器并从容器移除 */
    fun release() {
        videoView?.let { v ->
            try {
                v.stop()
            } catch (e: Exception) {
                Logger.w(TAG, "[$id] release: stop 失败", e)
            }
            container.removeView(v)
        }
        videoView = null
    }

    private fun bindListeners(view: UniversalVideoView) {
        view.setOnPreparedListener(OnPreparedListener { listener.onPrepared(id) })
        view.setOnCompletionListener(OnCompletionListener { listener.onCompletion(id) })
        view.setOnErrorListener(OnErrorListener { info ->
            listener.onError(id, info.what, info.extra ?: "")
        })
        view.setOnInfoListener(OnInfoListener { info ->
            listener.onInfo(id, info.what, info.extra ?: "")
        })
        view.setOnBufferingUpdateListener(OnBufferingUpdateListener { percent ->
            listener.onBufferingUpdate(id, percent)
        })
        view.setOnSeekCompleteListener(OnSeekCompleteListener { listener.onSeekComplete(id) })
        view.setOnStateChangeListener(OnStateChangeListener { state -> listener.onStateChange(id, state) })
    }
}
