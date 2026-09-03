package com.chances.shell.base.bridge

import android.os.Build
import android.webkit.WebView
import chances.core.log.Logger

/**
 * 原生 → H5 调用辅助：在主线程拼出 `window.<func>(args...)` 并执行。
 * 字符串参数自动加引号并转义，数字/布尔原样拼接。
 *
 * @author template
 */
object WebViewJsHelper {

    private const val TAG = "WebViewJsHelper"

    /**
     * 通知 H5：调用 window 上的全局回调函数。
     *
     * @param webView 目标 WebView
     * @param func    H5 全局函数名（如 onNativeKeyDown）
     * @param args    参数列表，String 会被转义加引号，其余 toString 原样拼接
     */
    fun notifyWebPage(webView: WebView, func: String, vararg args: Any?) {
        val sb = StringBuilder("window.").append(func).append('(')
        for (i in args.indices) {
            if (i > 0) {
                sb.append(',')
            }
            sb.append(toJsArg(args[i]))
        }
        sb.append(')')
        val js = sb.toString()
        webView.post {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    webView.evaluateJavascript(js, null)
                } else {
                    webView.loadUrl("javascript:$js")
                }
            } catch (e: Exception) {
                Logger.e(TAG, "notifyWebPage failed: $js", e)
            }
        }
    }

    /**
     * 把单个参数转成 JS 字面量。
     */
    private fun toJsArg(arg: Any?): String {
        return when (arg) {
            null -> "null"
            is Number, is Boolean -> arg.toString()
            else -> "\"" + escape(arg.toString()) + "\""
        }
    }

    /**
     * 转义字符串中的引号、反斜杠与换行，避免拼接出非法 JS。
     */
    private fun escape(raw: String): String {
        val sb = StringBuilder(raw.length + 16)
        for (c in raw) {
            when (c) {
                '\\' -> sb.append("\\\\")
                '"' -> sb.append("\\\"")
                '\n' -> sb.append("\\n")
                '\r' -> sb.append("\\r")
                else -> sb.append(c)
            }
        }
        return sb.toString()
    }
}
