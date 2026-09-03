package com.chances.shell.web

import android.os.Environment
import chances.core.log.Logger
import chances.core.utils.io.FileUtils
import java.io.File

/**
 * [WebActivity] 的 webUrl 持久化工具。
 *
 * 默认落盘到外部存储根目录 `/sdcard/web_url.txt`，纯文本一行，UTF-8。
 * 读 / 写均委托 [FileUtils]（core 提供），失败时仅记日志、不抛异常，业务侧拿到 null/false 自行兜底。
 *
 * 调用方场景：
 * - Activity 启动时 [readUrl] 取上次保存的 url
 * - 用户在 [WebUrlDialog] 修改后 [writeUrl] 落盘
 *
 * 线程模型：磁盘 IO 阻塞调用线程，**禁止主线程长时间循环调用**；一次性短读写在 TV 主线程影响可忽略。
 */
object WebUrlStorage {

    private const val TAG = "WebUrlStorage"

    /** sdcard 落盘文件名；直接放外部存储根目录，路径直观便于他人定位 */
    private const val FILE_NAME = "web_url.txt"

    /**
     * 默认落盘文件路径 `/sdcard/web_url.txt`。
     *
     * @return 默认落盘 [File] 句柄
     */
    @JvmStatic
    fun getDefaultFile(): File {
        return File(Environment.getExternalStorageDirectory(), FILE_NAME)
    }

    /**
     * 从 sdcard 文件读 webUrl。
     *
     * @param file 自定义路径，默认 [getDefaultFile]；参数化便于单元测试
     * @return 文件内容（已 trim）；文件不存在 / 内容为空 / 读失败时返回 null
     */
    @JvmStatic
    @JvmOverloads
    fun readUrl(file: File = getDefaultFile()): String? {
        if (!file.exists() || !file.isFile) {
            return null
        }
        val raw = FileUtils.readCharsToString(file) ?: return null
        val trimmed = raw.trim()
        return if (trimmed.isEmpty()) {
            null
        } else {
            trimmed
        }
    }

    /**
     * 写 webUrl 到 sdcard 文件。
     *
     * 父目录缺失时自动 mkdirs；若 url 为空字符串，直接返回 false 不落盘。
     *
     * @param url  待保存的 url 文本，会被 trim
     * @param file 自定义路径，默认 [getDefaultFile]；参数化便于单元测试
     * @return true=写成功；false=入参为空 / 父目录创建失败 / 写失败
     */
    @JvmStatic
    @JvmOverloads
    fun writeUrl(url: String, file: File = getDefaultFile()): Boolean {
        val trimmed = url.trim()
        if (trimmed.isEmpty()) {
            Logger.w(TAG, "writeUrl: url 为空，放弃写入 file=$file")
            return false
        }
        val parent = file.parentFile
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            Logger.e(TAG, "writeUrl: 创建父目录失败 parent=$parent")
            return false
        }
        return FileUtils.writeString(file, trimmed)
    }
}
