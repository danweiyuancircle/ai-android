/**
 * 模态层计数器：FocusLayer 挂载 +1、卸载 -1。
 * 供 @shell/core 的 useBackButton 判断「当前有无打开的模态层」，
 * 有则把 Back 交给最上层弹层自己关，避免全局返回键误触发路由后退/退出。
 */
let openCount = 0

export function pushLayer(): void {
  openCount += 1
}

export function popLayer(): void {
  openCount = Math.max(0, openCount - 1)
}

export function hasOpenLayer(): boolean {
  return openCount > 0
}
