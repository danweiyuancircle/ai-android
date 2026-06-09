package com.chances.shell.player

/**
 * 播放器引擎类型常量。
 *
 * H5 通过 `playerService.create(type)` / `playerService.setup(json).playerType` 传入字符串，
 * 壳侧据此在 [PlayerEngineRegistry] 查找对应 `PlayerFactory`，实现多引擎按需切换
 * （与语音"一个项目只用一个实现"不同：播放器多引擎可共存，运行时按 type 区分）。
 *
 * @author template
 */
object PlayerType {
    /** ijkplayer 引擎（chances-sdk player-ijk 提供，含三套 ABI .so） */
    const val IJK = "ijk"

    /** 系统原生 MediaPlayer 引擎（chances-sdk core 自带 NativeFactory） */
    const val NATIVE = "native"

    /** 默认引擎：未指定或传入未注册类型时回退此引擎 */
    const val DEFAULT = IJK
}
