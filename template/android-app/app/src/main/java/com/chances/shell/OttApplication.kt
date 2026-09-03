package com.chances.shell

import android.app.Application
import android.content.Context
import android.support.multidex.MultiDex
import chances.core.SdkCore
import chances.core.http.HttpConfig
import chances.core.imageloader.ImageLoaderConfig
import chances.core.log.LogLevel
import chances.core.log.LoggerConfig

/**
 * 应用入口。装配 chances-sdk core（Logger / Http / ImageLoader）。
 * 装配遵 SKILL.md：SdkCore.init 全局只执行一次。
 *
 * @author template
 */
class OttApplication : Application() {

    override fun attachBaseContext(base: Context?) {
        super.attachBaseContext(base)
        // 用 multidex 时必须最先调用
        MultiDex.install(base)
    }

    override fun onCreate() {
        super.onCreate()
        SdkCore.init(
            this,
            logger = LoggerConfig.builder()
                .debug(BuildConfig.DEBUG)
                .logLevel(if (BuildConfig.DEBUG) LogLevel.ALL else LogLevel.INFO)
                .build(),
            http = HttpConfig.builder().build(),
            imageLoader = ImageLoaderConfig.builder().build()
            // player / tinker / upgrade 不传 = 不装
        )
    }
}
