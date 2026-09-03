import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * 焦点跟随纵向滚动：监听容器内子项的 sn:focused，把聚焦元素滚进可视区。
 * 用于异构内容区（如组件总览、rails），EVirtual 内部已自带跟随无需用此。
 *
 * @param containerRef 滚动视口元素（其第一个子元素为 transform 轨道）
 * @param viewport 视口高度 px
 * @param pad 上下留白 px
 */
export function useScrollFollow(containerRef: Ref<HTMLElement | null>, viewport: number, pad = 20) {
  const scrollY = ref(0)

  function onFocus(e: Event) {
    const el = e.target as HTMLElement | null
    const track = containerRef.value?.firstElementChild as HTMLElement | undefined
    if (!el || typeof el.getBoundingClientRect !== 'function' || !track) return
    const top = el.getBoundingClientRect().top - track.getBoundingClientRect().top
    const h = el.offsetHeight
    if (top < scrollY.value) {
      scrollY.value = Math.max(0, top - pad)
    } else if (top + h > scrollY.value + viewport) {
      scrollY.value = top + h - viewport + pad
    }
  }

  onMounted(() => containerRef.value?.addEventListener('sn:focused', onFocus, true))
  onUnmounted(() => containerRef.value?.removeEventListener('sn:focused', onFocus, true))

  return { scrollY }
}
