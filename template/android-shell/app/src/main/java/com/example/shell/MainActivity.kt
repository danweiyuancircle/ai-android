package com.example.shell

import android.content.Intent
import android.view.KeyEvent
import android.view.View
import android.widget.ProgressBar
import chances.core.activitylife.ActivityLifeManager
import chances.core.arc.BaseActivity
import chances.core.log.Logger
import chances.core.web.TvWebView
import com.example.shell.base.bridge.ShellHost
import com.example.shell.bridge.OttServiceBridge
import com.example.shell.voice.NoopVoiceController
import com.example.shell.voice.VoiceBridge
import com.example.shell.voice.VoiceController

/**
 * 壳首页：继承 chances-sdk 的 BaseActivity，承载 WebView，加载 H5 入口，转发遥控器按键到 H5。
 *
 * @author template
 */
class MainActivity : BaseActivity(), ShellHost {

    companion object {
        private const val TAG = "MainActivity"
        private const val EXTRA_QUERY = "query"
    }

    private lateinit var webView: TvWebView
    private lateinit var loadingView: ProgressBar
    private lateinit var bridge: OttServiceBridge
    private lateinit var voiceController: VoiceController

    /** 网页是否就绪（hideLoading 已被调用） */
    private var isWebPageReady = false

    /** 网页未就绪时暂存的拉起 query */
    private var pendingQuery: String? = null

    override fun getLayoutId(): Int = R.layout.activity_main

    /**
     * 绑定视图并配置 WebView（BaseActivity.onCreate 在 setContentView 后调用）。
     */
    override fun initView() {
        webView = findViewById(R.id.web_view)
        loadingView = findViewById(R.id.loading_view)
        webView.enableWebViewDebug(BuildConfig.DEBUG)
    }

    /**
     * 装配 Bridge 并加载入口页。
     */
    override fun initData() {
        // TODO: 接入真实语音 SDK 时把 NoopVoiceController 换成真实实现
        voiceController = NoopVoiceController()
        voiceController.init(applicationContext)
        // VoiceBridge 内聚语音双向桥接：构造时即注册 OnVoiceListener，把识别/TTS 事件转发到 H5
        val voiceBridge = VoiceBridge(webView, voiceController)
        bridge = OttServiceBridge(webView, this, voiceBridge)
        webView.addJavascriptInterface(bridge, "ottService")
        // 记录入口页（reloadIndex 回到此地址）后加载
        webView.indexUrl = BuildConfig.H5_URL
        webView.loadUrl(BuildConfig.H5_URL)
        handleIntentQuery(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleIntentQuery(intent)
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
     * 遥控器按键全部透传给 H5（含 BACK，由 H5 决定是否退出）。
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            bridge.notifyKeyDown(event.keyCode, KeyEvent.keyCodeToString(event.keyCode))
        }
        return true
    }

    override fun onDestroy() {
        // 释放语音资源、避免 WebView 上下文泄漏
        voiceController.releaseVoice()
        webView.destroy()
        super.onDestroy()
    }
}
