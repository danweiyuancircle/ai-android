package com.chances.shell.player

import chances.core.log.Logger
import chances.core.player.common.PlayerFactory
import chances.core.player.ijk.IjkFactory
import chances.core.player.natives.NativeFactory
import java.util.concurrent.ConcurrentHashMap

/**
 * 播放器引擎注册表：维护「类型字符串 -> [PlayerFactory] 类」映射，支持多引擎共存、运行时按 type 切换。
 *
 * 存的是 `Class<out PlayerFactory>` 而非实例，因为底层 `UniversalVideoView.setPlayerType(Class)`
 * 接收工厂类、内部自行 `newInstance()` 创建并切换引擎（见 [PlayerInstance]）。
 *
 * 默认注册：
 * - [PlayerType.IJK] -> `chances.core.player.ijk.IjkFactory`（player-ijk aar）
 * - [PlayerType.NATIVE] -> `chances.core.player.natives.NativeFactory`（core 自带）
 *
 * 扩展：接入新引擎（如 ExoPlayer）只需新引擎模块提供 [PlayerFactory] 实现（公开无参构造），
 * 在 `Application` 启动时调用 [register] 注册一个新 type 即可，桥接层与 H5 接口零改动。
 *
 * @author template
 */
object PlayerEngineRegistry {

    private const val TAG = "PlayerEngineRegistry"

    private val factories = ConcurrentHashMap<String, Class<out PlayerFactory>>()

    init {
        register(PlayerType.IJK, IjkFactory::class.java)
        register(PlayerType.NATIVE, NativeFactory::class.java)
    }

    /**
     * 注册（或覆盖）一个播放器引擎。
     *
     * @param type         引擎类型字符串，H5 据此选择
     * @param factoryClass 引擎工厂类（须有公开无参构造，供底层反射创建）
     */
    fun register(type: String, factoryClass: Class<out PlayerFactory>) {
        factories[type] = factoryClass
        Logger.i(TAG, "注册播放器引擎：%s -> %s", type, factoryClass.name)
    }

    /**
     * 取出指定类型的工厂类；类型为空或未注册返回 null。
     */
    fun get(type: String?): Class<out PlayerFactory>? {
        if (type.isNullOrEmpty()) {
            return null
        }
        return factories[type]
    }

    /** 是否已注册该类型 */
    fun has(type: String?): Boolean = type != null && factories.containsKey(type)

    /** 当前已注册的全部类型 */
    fun types(): Set<String> = factories.keys
}
