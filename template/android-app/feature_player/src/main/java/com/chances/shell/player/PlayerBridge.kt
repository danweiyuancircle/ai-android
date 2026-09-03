package com.chances.shell.player

import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import chances.core.log.Logger
import com.chances.shell.base.bridge.WebViewJsHelper
import org.json.JSONObject

/**
 * 播放器 JS Bridge：内聚「播放器」相关的壳 ↔ H5 双向桥接，作为独立 JS 接口注入网页（句柄 `window.playerService`）。
 *
 * 多实例：[create] / [setup] 同步返回一个 `playerId`，H5 后续所有操作 / 查询都带上该 id；
 * 回调首参也是 `playerId`，H5 据此区分是哪个播放器实例。
 *
 * 线程：建 View 须主线程，故 [create] 在 binder 线程先用 [PlayerManager.nextId] 分配 id 并**同步返回**，
 * 再 post 到主线程真正建实例；后续 mutating 方法也都 post 到主线程，靠主线程 Handler 的 FIFO 顺序
 * 保证排在 create 之后。查询类方法（[isPlaying] 等）需同步返回，直接读取（同 voiceService.isTtsPlaying）。
 *
 * 原生 → H5：构造时把自身注册为 [PlayerManager] 的 [OnPlayerListener]，把事件经 [WebViewJsHelper]
 * 转成 `window.<回调>(playerId, ...)` 通知 H5（回调名见 bridge-contract.md）。
 *
 * 注入：壳通过 `addJavascriptInterface(playerBridge, "playerService")` 注入为 `window.playerService`，
 * 与 ottService / voiceService 解耦。
 *
 * @author template
 */
class PlayerBridge(
    private val webView: WebView,
    private val manager: PlayerManager,
) : OnPlayerListener {

    companion object {
        private const val TAG = "PlayerBridge"
    }

    private val mainHandler = Handler(Looper.getMainLooper())

    init {
        manager.setPlayerListener(this)
    }

    // ===================== H5 → 原生 =====================

    /**
     * 创建一个播放器实例并选择引擎，**同步返回 playerId**。
     * 实际建 View 在主线程异步完成；后续对该 id 的操作会排在其后执行。
     *
     * @param playerType 引擎类型，见 [PlayerType]（"ijk" / "native" / 自定义）
     * @return 新实例的 playerId
     */
    @JavascriptInterface
    fun create(playerType: String): String {
        val id = manager.nextId()
        mainHandler.post { manager.create(id, playerType) }
        return id
    }

    /**
     * 便捷起播：创建实例 + 选引擎 + 起播一次完成，**同步返回 playerId**。
     *
     * JSON 字段（均可选，缺省走引擎默认）：
     * - `playerType`: String  引擎类型（默认 [PlayerType.DEFAULT]）
     * - `url`: String         播放地址
     * - `mute`: Boolean       是否静音
     * - `aspectRatio`: Int    纵横比（见 [PlayerInstance.setAspectRatio]）
     * - `speed`: Number       倍速
     * - `autoPlay`: Boolean   设置数据源后是否自动起播（默认 true）
     *
     * @return 新实例的 playerId
     */
    @JavascriptInterface
    fun setup(json: String): String {
        val id = manager.nextId()
        mainHandler.post {
            try {
                val obj = JSONObject(json)
                val playerType = obj.optString("playerType", PlayerType.DEFAULT)
                manager.create(id, playerType)
                val instance = manager.get(id) ?: return@post
                if (obj.has("mute")) {
                    instance.setMute(obj.optBoolean("mute", false))
                }
                if (obj.has("aspectRatio")) {
                    instance.setAspectRatio(obj.optInt("aspectRatio"))
                }
                if (obj.has("speed")) {
                    instance.setSpeed(obj.optDouble("speed", 1.0).toFloat())
                }
                val url = obj.optString("url", "")
                if (url.isNotEmpty()) {
                    instance.setDataSource(url)
                }
                if (obj.optBoolean("autoPlay", true) && url.isNotEmpty()) {
                    instance.start()
                }
            } catch (e: Exception) {
                Logger.e(TAG, "setup 解析失败: $json", e)
            }
        }
        return id
    }

    /** 设置播放地址（url） */
    @JavascriptInterface
    fun setDataSource(playerId: String, url: String) {
        mainHandler.post { manager.get(playerId)?.setDataSource(url) }
    }

    /** 开始 / 恢复播放 */
    @JavascriptInterface
    fun start(playerId: String) {
        mainHandler.post { manager.get(playerId)?.start() }
    }

    /** 暂停 */
    @JavascriptInterface
    fun pause(playerId: String) {
        mainHandler.post { manager.get(playerId)?.pause() }
    }

    /** 停止 */
    @JavascriptInterface
    fun stop(playerId: String) {
        mainHandler.post { manager.get(playerId)?.stop() }
    }

    /** 释放指定播放器实例 */
    @JavascriptInterface
    fun release(playerId: String) {
        mainHandler.post { manager.release(playerId) }
    }

    /** 释放全部播放器实例 */
    @JavascriptInterface
    fun releaseAll() {
        mainHandler.post { manager.releaseAll() }
    }

    /** seek 到指定位置（毫秒） */
    @JavascriptInterface
    fun seekTo(playerId: String, position: Int) {
        mainHandler.post { manager.get(playerId)?.seekTo(position) }
    }

    /** 静音开关 */
    @JavascriptInterface
    fun setMute(playerId: String, mute: Boolean) {
        mainHandler.post { manager.get(playerId)?.setMute(mute) }
    }

    /** 倍速播放 */
    @JavascriptInterface
    fun setSpeed(playerId: String, speed: Float) {
        mainHandler.post { manager.get(playerId)?.setSpeed(speed) }
    }

    /** 设置纵横比（1 铺满 / 2 原比例 / 3 16:9 / 4 4:3） */
    @JavascriptInterface
    fun setAspectRatio(playerId: String, ratio: Int) {
        mainHandler.post { manager.get(playerId)?.setAspectRatio(ratio) }
    }

    /** SurfaceView 是否置顶（背播默认 false） */
    @JavascriptInterface
    fun setZOrderOnTop(playerId: String, onTop: Boolean) {
        mainHandler.post { manager.get(playerId)?.setZOrderOnTop(onTop) }
    }

    /** SurfaceView 是否作为媒体覆盖层 */
    @JavascriptInterface
    fun setZOrderMediaOverlay(playerId: String, overlay: Boolean) {
        mainHandler.post { manager.get(playerId)?.setZOrderMediaOverlay(overlay) }
    }

    /** 是否正在播放 */
    @JavascriptInterface
    fun isPlaying(playerId: String): Boolean = manager.get(playerId)?.isPlaying() ?: false

    /** 是否静音 */
    @JavascriptInterface
    fun isMute(playerId: String): Boolean = manager.get(playerId)?.isMute() ?: false

    /** 总时长（毫秒） */
    @JavascriptInterface
    fun getDuration(playerId: String): Int = manager.get(playerId)?.getDuration() ?: 0

    /** 当前播放位置（毫秒） */
    @JavascriptInterface
    fun getCurrentPosition(playerId: String): Int = manager.get(playerId)?.getCurrentPosition() ?: 0

    // ===================== 原生 → H5（OnPlayerListener 转发，首参 playerId） =====================

    override fun onPrepared(playerId: String) =
        WebViewJsHelper.notifyWebPage(webView, "onPlayerPrepared", playerId)

    override fun onCompletion(playerId: String) =
        WebViewJsHelper.notifyWebPage(webView, "onPlayerCompletion", playerId)

    override fun onError(playerId: String, what: Int, extra: String) =
        WebViewJsHelper.notifyWebPage(webView, "onPlayerError", playerId, what, extra)

    override fun onInfo(playerId: String, what: Int, extra: String) =
        WebViewJsHelper.notifyWebPage(webView, "onPlayerInfo", playerId, what, extra)

    override fun onBufferingUpdate(playerId: String, percent: Int) =
        WebViewJsHelper.notifyWebPage(webView, "onPlayerBufferingUpdate", playerId, percent)

    override fun onSeekComplete(playerId: String) =
        WebViewJsHelper.notifyWebPage(webView, "onPlayerSeekComplete", playerId)

    override fun onStateChange(playerId: String, state: Int) =
        WebViewJsHelper.notifyWebPage(webView, "onPlayerStateChange", playerId, state)
}
