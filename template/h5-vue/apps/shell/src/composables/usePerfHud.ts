import { onMounted, onUnmounted, reactive } from 'vue'

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

export interface PerfHudStats {
  /** 当前焦点元素的 data-focus-key */
  currentKey: string
  /** 上一次方向键按下到 sn:focused 触发的耗时（ms，含 SN 查找 + Vue 反应 + 浏览器重绘前的同步链路） */
  lastFindMs: number
  /** 即时 FPS（按 1s 滑窗统计 rAF 帧数） */
  fps: number
  /** 当前 DOM 中带 data-focus-key 的元素总数 */
  mounted: number
}

/**
 * 性能 HUD 数据采集。挂在页面任意位置即生效，全局监听 keydown / sn:focused。
 *
 * - lastFindMs：方向键按下记 t0，sn:focused 回调记 t1，dt = t1 - t0
 *   覆盖 SpatialNavigation 查找耗时 + 同步派发链路，不含异步 transform 动画
 * - fps：requestAnimationFrame 每秒滑窗一次，同时刷新 mounted 计数
 * - currentKey：sn:focused 回调取 e.target.dataset.focusKey
 */
export function usePerfHud(): PerfHudStats {
  const stats = reactive<PerfHudStats>({
    currentKey: '',
    lastFindMs: 0,
    fps: 0,
    mounted: 0,
  })

  let t0 = 0
  function onKeyDown(e: KeyboardEvent) {
    if (ARROW_KEYS.has(e.key)) {
      t0 = performance.now()
    }
  }
  function onSnFocused(e: Event) {
    const t1 = performance.now()
    if (t0) {
      stats.lastFindMs = Math.round((t1 - t0) * 10) / 10
      t0 = 0
    }
    const el = e.target as HTMLElement | null
    stats.currentKey = el?.getAttribute('data-focus-key') ?? ''
  }

  let rafId = 0
  let frames = 0
  let lastTick = 0
  function tick(ts: number) {
    frames++
    if (!lastTick) lastTick = ts
    if (ts - lastTick >= 1000) {
      stats.fps = Math.round((frames * 1000) / (ts - lastTick))
      stats.mounted = document.querySelectorAll('[data-focus-key]').length
      frames = 0
      lastTick = ts
    }
    rafId = requestAnimationFrame(tick)
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('sn:focused', onSnFocused, true)
    rafId = requestAnimationFrame(tick)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('sn:focused', onSnFocused, true)
    cancelAnimationFrame(rafId)
  })

  return stats
}
