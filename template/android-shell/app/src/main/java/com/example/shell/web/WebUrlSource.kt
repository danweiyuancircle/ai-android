package com.example.shell.web

/**
 * [WebActivity] 当前加载 url 的来源标识。
 *
 * 由 [WebActivity] 在解析 / 保存 url 时维护，作为 [WebUrlDialog] 渲染"是否使用 sdcard 配置地址"
 * 的依据。[WebUrlDialog] 不依赖此处判定逻辑，只按枚举值映射展示文案。
 *
 * 取值优先级与触发场景：
 * - [INTENT]：Activity 通过 `Intent EXTRA_URL` 启动并取到非空 url，优先于 sdcard
 * - [SDCARD]：Intent 未带 url（或为空），回退到 [WebUrlStorage.readUrl] 读取的 sdcard 配置；
 *   或用户在弹框里保存了新 url 且写入 sdcard 成功
 * - [SESSION]：用户在弹框输入了新 url 但因无存储权限 / IO 失败未能落盘，仅当次会话内有效
 * - [DEFAULT]：Intent 与 sdcard 均无配置，回退到 `BuildConfig.H5_URL` 内置默认地址
 */
enum class WebUrlSource {
    /** Intent EXTRA_URL 启动参数 */
    INTENT,

    /** sdcard 配置文件（见 [WebUrlStorage]） */
    SDCARD,

    /** 本次会话弹框临时输入，未持久化 */
    SESSION,

    /** 内置默认地址 `BuildConfig.H5_URL` */
    DEFAULT,
}
