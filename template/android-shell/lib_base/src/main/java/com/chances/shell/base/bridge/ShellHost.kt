package com.chances.shell.base.bridge

/**
 * 壳宿主（通常由承载 WebView 的 Activity 实现），供 Bridge 回调宿主行为。
 *
 * @author template
 */
interface ShellHost {
    /** 隐藏加载动画，标记网页就绪 */
    fun hideLoading()

    /** 退出应用 */
    fun exitApp()
}
