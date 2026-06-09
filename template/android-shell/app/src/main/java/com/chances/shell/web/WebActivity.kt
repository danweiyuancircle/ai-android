package com.chances.shell.web

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.text.TextUtils
import android.view.KeyEvent
import android.view.View
import android.webkit.WebResourceError
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast
import chances.core.activitylife.ActivityLifeManager
import chances.core.arc.BaseActivity
import chances.core.log.Logger
import chances.core.permission.Permission
import chances.core.permission.PermissionHelper
import chances.core.utils.tv.CombineKeyEventHelper
import chances.core.web.TvWebView
import com.chances.shell.BuildConfig
import com.chances.shell.R
import com.chances.shell.base.bridge.ShellHost
import com.chances.shell.bridge.OttServiceBridge
import com.chances.shell.player.PlayerBridge
import com.chances.shell.player.PlayerManager
import com.chances.shell.voice.VoiceBridge
import com.chances.shell.voice.VoiceController
import com.chances.shell.voice.VoiceControllerFactory

/**
 * 壳 WebView 宿主页：承载 H5 入口，转发遥控器按键到 H5，注入 ottService（壳通用能力）与 voiceService（语音双向桥接）。
 *
 * 在原壳首页基础上叠加"调试态修改地址"隐藏入口：用户连按 [TRIGGER_COUNT] 次菜单键
 * （`KEYCODE_MENU`）弹出 [WebUrlDialog]，可查看当前加载地址 + 重新输入，保存后立即落盘
 * sdcard（见 [WebUrlStorage]）并重新 [loadUrl]。
 *
 * url 来源优先级：**Intent [EXTRA_URL] > sdcard 文件 > `BuildConfig.H5_URL` 内置默认**。
 * sdcard 读写需要 `READ/WRITE_EXTERNAL_STORAGE`，由入口 [com.chances.shell.launcher.LauncherActivity]
 * 统一申请；本页通过 [PermissionHelper.isGranted] 判断是否走 sdcard 通道，不再二次弹窗。
 * 权限未授予时仅降级：不读 / 不写 sdcard，弹框输入的新 url 仍在当次会话内即时生效。
 *
 * 入口：外部通过 [newIntent] 启动，可选传入 [EXTRA_URL]（加载地址）与 [EXTRA_QUERY]（拉起 AIChat）。
 *
 * @author template
 */
class WebActivity : BaseActivity(), ShellHost {

    companion object {
        private const val TAG = "WebActivity"

        /** 可选加载地址 Intent extra key；不传则回退 sdcard，再回退 BuildConfig.H5_URL */
        const val EXTRA_URL: String = "extra_url"

        /** 可选 AIChat 拉起 query Intent extra key（第三方拉起场景） */
        const val EXTRA_QUERY: String = "query"

        /** 触发设置弹框需要的菜单键连按次数 */
        private const val TRIGGER_COUNT = 5

        /**
         * 相邻两次菜单键之间允许的最大间隔（毫秒）；超过此值组合键序列重置。
         * 取 1000ms 兼容遥控器物理菜单键按节奏稍慢的用户，又不至于让无意按键意外命中。
         */
        private const val KEY_STAY_INTERVAL_MS: Long = 1000L

        /**
         * 页面加载完成后兜底隐藏 loading 遮罩的延迟（毫秒）。
         *
         * 协作型 H5 会在自身就绪时主动调 `ottService.hideLoading()`（通常早于本延迟），无需等待；
         * 外部任意地址（地址弹框 / sdcard / Intent 传入）不调用 bridge，靠本延迟兜底揭开遮罩。
         * 留 1500ms 是给 SPA 在 onPageFinished 后完成挂载的缓冲，避免协作页提前露白。
         */
        private const val LOADING_FALLBACK_HIDE_MS: Long = 1500L

        /**
         * 构造启动本 Activity 的 Intent。
         *
         * @param context 启动上下文，Activity / Application 均可
         * @param url     待加载的 url；传 null 或空字符串 = 走 sdcard / 默认地址回退
         * @return 已封装的 Intent
         */
        @JvmStatic
        @JvmOverloads
        fun newIntent(context: Context, url: String? = null): Intent {
            val intent = Intent(context, WebActivity::class.java)
            if (!TextUtils.isEmpty(url)) {
                intent.putExtra(EXTRA_URL, url)
            }
            return intent
        }
    }

    private lateinit var webView: TvWebView
    private lateinit var loadingView: ProgressBar
    private lateinit var bridge: OttServiceBridge
    private lateinit var voiceController: VoiceController
    private lateinit var playerManager: PlayerManager

    /** 网页是否就绪（hideLoading 已被调用） */
    private var isWebPageReady = false

    /** 网页未就绪时暂存的拉起 query */
    private var pendingQuery: String? = null

    /** 当前正在加载（或已请求加载）的 url，作为弹框展示"当前加载地址"的真值来源 */
    private var currentUrl: String = ""

    /** [currentUrl] 的来源标识，与 [loadUrl] 同步更新，供弹框渲染"当前来源" */
    private var currentUrlSource: WebUrlSource = WebUrlSource.DEFAULT

    /** 存储权限是否已授权。授权前不读 / 不写 sdcard，弹框保存的 url 仅当次会话生效 */
    private var storageGranted: Boolean = false

    /** 当前展示中的设置弹框，onDestroy 兜底关闭 */
    private var urlDialog: WebUrlDialog? = null

    /**
     * 连按 [TRIGGER_COUNT] 次菜单键的组合键触发器，委托给 core [CombineKeyEventHelper]。
     *
     * 序列由 [TRIGGER_COUNT] 个相同的 `KEYCODE_MENU` 组成，相邻两次按键超过 [KEY_STAY_INTERVAL_MS]
     * 毫秒会重置序列。命中后回调 [showUrlDialog]。
     */
    private val menuKeyTrigger: CombineKeyEventHelper by lazy {
        val seq = IntArray(TRIGGER_COUNT) { KeyEvent.KEYCODE_MENU }
        CombineKeyEventHelper(*seq).apply {
            keyStayInterval = KEY_STAY_INTERVAL_MS
            setOnKeyTriggerListener {
                Logger.d(TAG, "menuKeyTrigger: 命中 $TRIGGER_COUNT 次菜单键，弹出地址设置")
                showUrlDialog()
            }
        }
    }

    override fun getLayoutId(): Int = R.layout.activity_web

    /**
     * 绑定视图并配置 WebView（BaseActivity.onCreate 在 setContentView 后调用）。
     */
    override fun initView() {
        webView = findViewById(R.id.web_view)
        loadingView = findViewById(R.id.loading_view)
        // 背播：WebView 叠在 player_container 之上，透明区域才能看到下层播放器画面。
        // 1) 背景色透明；2) SOFTWARE 合成层（TV 上 HARDWARE 层常整块不透明，挡住下层 SurfaceView/TextureView）；
        // 3) H5 侧 html/body 也需透明（见 PlayerControl.vue 的 player-backplay 类）。
        webView.setBackgroundColor(Color.TRANSPARENT)
        webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null)
        webView.background?.setAlpha(0)
        webView.enableWebViewDebug(BuildConfig.DEBUG)
        webView.onWebViewListener = object : TvWebView.OnWebViewListener {
            override fun onPageStarted(view: TvWebView?, url: String?) {
                // 不主动显示遮罩：遮罩初始可见，由 hideLoading 单向隐藏即可
            }

            override fun onPageFinished(view: TvWebView?, url: String?) {
                // 兜底：外部地址不会调 ottService.hideLoading()，延迟后强制揭开遮罩
                loadingView.postDelayed({ hideLoading() }, LOADING_FALLBACK_HIDE_MS)
            }

            override fun onReceivedError(view: TvWebView?, error: WebResourceError?) {
                // 加载失败立即揭开遮罩，避免一直转圈
                Logger.w(TAG, "onReceivedError: currentUrl=%s", currentUrl)
                hideLoading()
            }
        }
    }

    /**
     * 装配 Bridge 并按优先级解析加载入口页。
     */
    override fun initData() {
        // 语音实现由 ServiceLoader 热插拔发现：打包了实现模块（如 feature_voice_shijiu）则用之，否则回退 Noop
        voiceController = VoiceControllerFactory.create(applicationContext)
        voiceController.init(applicationContext)
        // VoiceBridge 自带 @JavascriptInterface，单独注入为 window.voiceService：
        // 构造时即注册 OnVoiceListener，把识别/TTS 事件转发到 H5，语音双向桥接与 ottService 解耦
        val voiceBridge = VoiceBridge(webView, voiceController)
        webView.addJavascriptInterface(voiceBridge, "voiceService")
        // 播放器：容器位于 WebView 之下，PlayerBridge 单独注入为 window.playerService。
        // 多实例：create 返回 playerId，H5 按 id 操作；引擎按 type 由 PlayerEngineRegistry 创建（ijk/native，可扩展）
        val playerContainer = findViewById<FrameLayout>(R.id.player_container)
        playerManager = PlayerManager(playerContainer)
        val playerBridge = PlayerBridge(webView, playerManager)
        webView.addJavascriptInterface(playerBridge, "playerService")
        bridge = OttServiceBridge(webView, this)
        webView.addJavascriptInterface(bridge, "ottService")
        resolveAndLoadUrl()
        handleIntentQuery(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleIntentQuery(intent)
    }

    /**
     * 按 **Intent EXTRA_URL > sdcard > BuildConfig.H5_URL** 的优先级解析 url 并加载。
     *
     * 存储权限由入口统一申请，本方法据 [PermissionHelper.isGranted] 判断是否允许读写 sdcard。
     * Intent 传入的 url 在权限授予时**写回 sdcard 持久化**，下次无 Intent 启动可直接复用。
     */
    private fun resolveAndLoadUrl() {
        storageGranted = PermissionHelper.isGranted(
            this,
            Permission.READ_EXTERNAL_STORAGE,
            Permission.WRITE_EXTERNAL_STORAGE
        )
        val intentUrl = intent.getStringExtra(EXTRA_URL).orEmpty().trim()
        val sdcardUrl = if (storageGranted) {
            WebUrlStorage.readUrl().orEmpty().trim()
        } else {
            ""
        }
        val targetUrl: String
        val targetSource: WebUrlSource
        if (intentUrl.isNotEmpty()) {
            targetUrl = intentUrl
            targetSource = WebUrlSource.INTENT
            // 外部传入地址落盘持久化（权限授予时），下次无 Intent 启动可复用
            if (storageGranted) {
                WebUrlStorage.writeUrl(intentUrl)
            }
        } else if (sdcardUrl.isNotEmpty()) {
            targetUrl = sdcardUrl
            targetSource = WebUrlSource.SDCARD
        } else {
            targetUrl = BuildConfig.H5_URL
            targetSource = WebUrlSource.DEFAULT
        }
        Logger.d(
            TAG,
            "resolveAndLoadUrl: intentUrl=$intentUrl, sdcardUrl=$sdcardUrl, target=$targetUrl, source=$targetSource, storageGranted=$storageGranted"
        )
        loadUrl(targetUrl, targetSource)
    }

    /**
     * 处理 Intent 中的 query：网页就绪则直接通知 H5，否则暂存。
     */
    private fun handleIntentQuery(intent: Intent?) {
        val query = intent?.getStringExtra(EXTRA_QUERY)
        if (query.isNullOrBlank()) {
            return
        }
        Logger.i(TAG, "handleIntentQuery: %s ready=%s", query, isWebPageReady.toString())
        if (isWebPageReady) {
            bridge.notifyNavigateToAIChat(query)
        } else {
            pendingQuery = query
        }
    }

    /**
     * 弹出 [WebUrlDialog]。已存在弹框时不重复弹。
     *
     * 把当前 url + 来源 + sdcard 配置文件绝对路径透传给弹框，便于调试人员定位。
     */
    private fun showUrlDialog() {
        val existing = urlDialog
        if (existing != null && existing.isShowing) {
            return
        }
        val sdcardPath = WebUrlStorage.getDefaultFile().absolutePath
        val dialog = WebUrlDialog(
            this,
            currentUrl,
            currentUrlSource,
            sdcardPath,
            object : WebUrlDialog.OnSaveListener {
                override fun onSave(newUrl: String) {
                    onUrlChanged(newUrl)
                }
            }
        )
        urlDialog = dialog
        dialog.show()
    }

    /**
     * 用户在弹框里保存了新 url 的处理：落盘 + 立即重新加载。
     *
     * 落盘失败（无权限 / IO 异常）时 toast 提示，但仍执行 loadUrl，**让"实时生效"优先于"持久化"**：
     * 极端场景下用户至少能在当前 Activity 生命周期内看到新页面。来源标识按落盘结果区分：
     * 成功 → [WebUrlSource.SDCARD]，失败 → [WebUrlSource.SESSION]，下次打开弹框即见准确来源。
     *
     * @param newUrl 弹框已校验非空且 trim 过的新 url
     */
    private fun onUrlChanged(newUrl: String) {
        val persisted: Boolean = if (storageGranted) {
            val saved = WebUrlStorage.writeUrl(newUrl)
            if (!saved) {
                Toast.makeText(this, R.string.web_dialog_save_failed, Toast.LENGTH_SHORT).show()
                Logger.e(TAG, "onUrlChanged: sdcard 落盘失败 newUrl=$newUrl")
            }
            saved
        } else {
            // 没有存储权限，跳过落盘，只做当次会话生效
            Toast.makeText(this, R.string.web_storage_denied_toast, Toast.LENGTH_SHORT).show()
            Logger.w(TAG, "onUrlChanged: 无存储权限，跳过 sdcard 落盘 newUrl=$newUrl")
            false
        }
        val nextSource = if (persisted) {
            WebUrlSource.SDCARD
        } else {
            WebUrlSource.SESSION
        }
        loadUrl(newUrl, nextSource)
    }

    /**
     * 加载 url：刷新 [currentUrl] / [currentUrlSource] 真值，并同步 [TvWebView.indexUrl]
     * （reloadIndex 回到此地址）。
     *
     * @param url    已 trim 且非空的 url
     * @param source url 来源标识，弹框据此展示"当前是否使用 sdcard 配置地址"
     */
    private fun loadUrl(url: String, source: WebUrlSource) {
        currentUrl = url
        currentUrlSource = source
        Logger.d(TAG, "loadUrl: url=$url, source=$source")
        webView.indexUrl = url
        webView.loadUrl(url)
    }

    // ===================== ShellHost =====================

    override fun hideLoading() {
        if (loadingView.visibility == View.GONE) {
            return
        }
        loadingView.visibility = View.GONE
        isWebPageReady = true
        pendingQuery?.let {
            pendingQuery = null
            bridge.notifyNavigateToAIChat(it)
        }
    }

    override fun exitApp() {
        Logger.i(TAG, "exitApp")
        ActivityLifeManager.getInstance().quitApp()
    }

    /**
     * 遥控器按键处理：先喂给 [menuKeyTrigger]（连按 5 次菜单键弹设置弹框），
     * 再把按键全部透传给 H5（含 BACK，由 H5 决定是否退出）。
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        menuKeyTrigger.handleKeyEvent(event)
        if (event.action == KeyEvent.ACTION_DOWN) {
            bridge.notifyKeyDown(event.keyCode, KeyEvent.keyCodeToString(event.keyCode))
        }
        return true
    }

    override fun onDestroy() {
        // 释放语音资源、关闭弹框、避免 WebView 上下文泄漏
        urlDialog?.dismiss()
        urlDialog = null
        voiceController.releaseVoice()
        playerManager.releaseAll()
        webView.destroy()
        super.onDestroy()
    }
}
