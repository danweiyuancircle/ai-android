<template>
  <div ref="scrollContainerRef" class="multi-column-scroll-view" @scroll="handleScroll">
    <div class="scroll-content" :style="contentStyle">
      <!-- 占位空间 - 上方 -->
      <div :style="{ height: `${offsetY}px` }"></div>

      <!-- 可视区域内的行 -->
      <div v-for="rowIndex in visibleRows" :key="rowIndex" class="grid-row" :style="rowStyle">
        <div v-for="colIndex in columns" :key="`${rowIndex}-${colIndex}`" class="grid-cell" 
          :style="{ marginRight: colIndex < columns ? cellMarginRight : '0' }">
          <slot :item="getItem(rowIndex, colIndex)" :index="getItemIndex(rowIndex, colIndex)"
            :focus-key="getFocusKey(rowIndex, colIndex)" :group-id="groupId"></slot>
        </div>
      </div>

      <!-- 占位空间 - 下方 -->
      <div :style="{ height: `${bottomSpacerHeight}px` }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'

interface Props {
  /**
   * 数据源数组
   */
  items: any[]
  /**
   * 列数，默认3
   */
  columns?: number
  /**
   * 每项高度（px），默认280
   */
  itemHeight?: number
  /**
   * 行与行之间的间隔（px），默认24
   */
  gap?: number
  /**
   * 折叠渲染时的超出可视区行数(提前渲染)，默认2
   */
  overscan?: number
  /**
   * 焦点项是否居中，默认true
   */
  centerOnFocus?: boolean
  /**
   * 焦点分组ID，用于优先在组内查找焦点
   */
  groupId?: string
}

const props = withDefaults(defineProps<Props>(), {
  columns: 3,
  itemHeight: 280,
  gap: 24,
  overscan: 2,
  centerOnFocus: true,
  groupId: 'multi-column-scroll-view'
})

const scrollContainerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)

// 计算总行数
const totalRows = computed(() => Math.ceil(props.items.length / props.columns))

// 每行的高度（包含间隙）
const rowHeight = computed(() => props.itemHeight + props.gap)

// 容器高度
const containerHeight = ref(600)

// 计算可视区域内可以显示的行数
const visibleRowCount = computed(() =>
  Math.ceil(containerHeight.value / rowHeight.value) + props.overscan * 2
)

// 计算当前滚动位置对应的起始行
const startRow = computed(() => {
  const row = Math.floor(scrollTop.value / rowHeight.value) - props.overscan
  return Math.max(0, row)
})

// 计算可视区域内的行索引数组
const visibleRows = computed(() => {
  const rows: number[] = []
  const end = Math.min(startRow.value + visibleRowCount.value, totalRows.value)
  for (let i = startRow.value; i < end; i++) {
    rows.push(i)
  }
  return rows
})

// 上方占位高度
const offsetY = computed(() => startRow.value * rowHeight.value)

// 下方占位高度
const bottomSpacerHeight = computed(() => {
  const renderedRows = visibleRows.value.length
  const remainingRows = totalRows.value - startRow.value - renderedRows
  return Math.max(0, remainingRows * rowHeight.value)
})

// 内容总高度
const contentStyle = computed(() => ({
  minHeight: `${totalRows.value * rowHeight.value}px`
}))

// 行样式 - 使用 margin 替代 gap 以兼容低版本浏览器
const rowStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
  marginBottom: `${props.gap}px`,
  height: `${props.itemHeight}px`
}))

// 单元格样式 - 使用 margin-right 模拟 gap
const cellMarginRight = computed(() => `${props.gap}px`)

// 获取指定位置的数据项
const getItem = (rowIndex: number, colIndex: number) => {
  const index = getItemIndex(rowIndex, colIndex)
  return props.items[index] || null
}

// 获取数据项的索引
const getItemIndex = (rowIndex: number, colIndex: number) => {
  return rowIndex * props.columns + (colIndex - 1)
}

// 生成焦点键（使用特殊前缀标识，用于恢复焦点时不滑动）
const getFocusKey = (rowIndex: number, colIndex: number) => {
  const index = getItemIndex(rowIndex, colIndex)
  return `multi-column-item-${index}`
}

// 滚动事件处理
const handleScroll = () => {
  if (scrollContainerRef.value) {
    scrollTop.value = scrollContainerRef.value.scrollTop
  }
}

// 滚动到指定索引的项，使其居中
const scrollToIndex = (index: number, smooth = true) => {
  if (!scrollContainerRef.value) return

  const rowIndex = Math.floor(index / props.columns)
  const targetScrollTop = rowIndex * rowHeight.value - containerHeight.value / 2 + props.itemHeight / 2

  scrollContainerRef.value.scrollTo({
    top: Math.max(0, targetScrollTop),
    behavior: smooth ? 'smooth' : 'auto'
  })
}

// 滚动到指定的焦点元素
const scrollToFocusKey = (focusKey: string, smooth = true) => {
  // 支持两种格式：multi-column-item-${index} 和 item-${index}（向后兼容）
  const match = focusKey.match(/(?:multi-column-)?item-(\d+)/)
  if (match) {
    const index = parseInt(match[1])
    scrollToIndex(index, smooth)
  }
}

// 确保指定索引的项在可视区域内（用于恢复焦点时不滚动）
const ensureItemVisible = (index: number) => {
  if (!scrollContainerRef.value) return

  const rowIndex = Math.floor(index / props.columns)
  const currentScrollTop = scrollContainerRef.value.scrollTop
  const itemTop = rowIndex * rowHeight.value
  const itemBottom = itemTop + props.itemHeight
  const viewportTop = currentScrollTop
  const viewportBottom = currentScrollTop + containerHeight.value

  // 如果项不在可视区域内，直接设置滚动位置（不使用平滑滚动）
  if (itemTop < viewportTop || itemBottom > viewportBottom) {
    // 计算使项在可视区域内的滚动位置（尽量居中，但不强制）
    const targetScrollTop = itemTop - containerHeight.value / 2 + props.itemHeight / 2
    scrollContainerRef.value.scrollTop = Math.max(0, targetScrollTop)
    // 同步更新 scrollTop ref，确保虚拟滚动正确计算
    scrollTop.value = scrollContainerRef.value.scrollTop
    console.log('[MultiColumnScrollView] ensureItemVisible:', index, 'scrollTop:', scrollContainerRef.value.scrollTop)
  }
}

// 确保指定的焦点元素在可视区域内（用于恢复焦点时不滚动）
const ensureFocusKeyVisible = (focusKey: string) => {
  // 支持两种格式：multi-column-item-${index} 和 item-${index}（向后兼容）
  const match = focusKey.match(/(?:multi-column-)?item-(\d+)/)
  if (match) {
    const index = parseInt(match[1])
    ensureItemVisible(index)
  }
}

// 检查是否滚动到顶部
const isAtTop = (): boolean => {
  if (!scrollContainerRef.value) return false
  // 允许一定的误差（比如1px），因为可能有padding等影响
  return scrollContainerRef.value.scrollTop <= 1
}

// 检查指定索引的项是否在第一行
const isFirstRowItem = (index: number): boolean => {
  return index < props.columns
}

// 获取容器高度
const updateContainerHeight = () => {
  if (scrollContainerRef.value) {
    containerHeight.value = scrollContainerRef.value.clientHeight
  }
}

// 提供滚动方法给子组件
provide('multiColumnScroll', {
  scrollToIndex,
  scrollToFocusKey,
  ensureItemVisible,
  ensureFocusKeyVisible,
  isAtTop,
  isFirstRowItem,
  containerRef: scrollContainerRef
})

onMounted(() => {
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
})

// 暴露方法给父组件
defineExpose({
  scrollToIndex,
  scrollToFocusKey,
  ensureItemVisible,
  ensureFocusKeyVisible,
  isAtTop,
  isFirstRowItem,
  scrollContainer: scrollContainerRef
})
</script>

<style scoped>
.multi-column-scroll-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

/* 自定义滚动条 */
.multi-column-scroll-view::-webkit-scrollbar {
  width: 8px;
}

.multi-column-scroll-view::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.multi-column-scroll-view::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  transition: background 0.3s ease;
}

.multi-column-scroll-view::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.scroll-content {
  padding: 20px;
}

.grid-row {
  width: 100%;
}

.grid-cell {
  min-width: 0;
  position: relative;
}
</style>
