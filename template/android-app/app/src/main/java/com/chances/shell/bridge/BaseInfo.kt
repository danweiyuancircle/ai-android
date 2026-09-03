package com.chances.shell.bridge

/**
 * 设备 / 应用基础信息，对应 bridge-contract.md 的 BaseInfo。
 *
 * 由 [OttServiceBridge.getBaseInfo] 用 Gson 序列化为 JSON 字符串返回给 H5；
 * 字段值取自 chances-sdk 的 [chances.core.utils.device.DeviceUtils] / [chances.core.utils.device.AppUtils]
 * 与 [android.os.Build]。
 *
 * @author template
 */
data class BaseInfo(
    /** 设备 MAC 地址（取自机顶盒主网口，取不到为空串） */
    val mac: String,
    /** 设备 IP 地址（取自机顶盒主网口，取不到为空串） */
    val ip: String,
    /** 应用版本名（如 1.0.0） */
    val versionName: String,
    /** 应用版本号（versionCode 整数） */
    val versionCode: Int,
    /** 应用包名 */
    val packageName: String,
    /** 设备型号（SDK getDeviceType，空则回退 Build.MODEL） */
    val deviceModel: String,
    /** 设备厂商（SDK getVendor，空则回退 Build.MANUFACTURER） */
    val vendor: String,
    /** Android 系统版本号（如 9，取自 SDK getDeviceVersion，空则回退 Build.VERSION.RELEASE） */
    val androidVersion: String,
    /** Android API 级别（如 28，取自 Build.VERSION.SDK_INT） */
    val androidSdkInt: Int
)
