package com.chances.shell.base.bridge

/**
 * 广播意图数据，对应 bridge-contract.md 的 IntentData。
 * H5 通过 ottService.sendBroadcast(JSON.stringify(intentData)) 传入。
 *
 * @author template
 */
data class IntentData(
    /** 广播 action */
    val action: String? = null,
    /** 目标包名 */
    val packageName: String = "",
    /** 目标类名（可选） */
    val className: String? = null,
    /** 额外数据，仅字符串值 */
    val extras: Map<String, String> = emptyMap()
)
