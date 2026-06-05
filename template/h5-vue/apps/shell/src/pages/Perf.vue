<template>
  <EPage id="perf" default-focus="cat-0" class="page perf-page">
    <!-- 左侧分类菜单：纯 DOM 列表 + sn:focused 触发 scrollIntoView -->
    <EFocusGroup id="perf-menu" tag="div" class="perf-menu">
      <EButton
        v-for="cat in categories"
        :key="cat.id"
        :focus-key="`cat-${cat.id}`"
        :label="cat.name"
        size="sm"
        :variant="cat.id === selectedCatId ? 'primary' : 'secondary'"
        class="perf-menu__btn"
        @focus="selectedCatId = cat.id"
      />
    </EFocusGroup>

    <!-- 右侧：纵向 EVirtual（行），每行 slot 内嵌横向 EVirtual（卡片墙）。两层都窗口化 -->
    <EVirtual
      ref="rowsListRef"
      class="perf-rows"
      section-id="perf-rows"
      direction="vertical"
      :items="currentRows"
      :item-width="ROW_W"
      :item-height="ROW_HEIGHT"
      :main-visible="3"
      :gap="0"
      :item-key="'id'"
      focus-key-prefix="perfrow"
    >
      <template #default="{ item: row, index: rowIdx }">
        <div class="perf-row">
          <div class="perf-row__title">{{ row.title }}</div>
          <EVirtual
            :section-id="`perf-row-${selectedCatId}-${rowIdx}`"
            direction="horizontal"
            :items="row.cards"
            :item-width="CARD_W"
            :item-height="CARD_H"
            :main-visible="4"
            :gap="CARD_GAP"
            :item-key="'id'"
            :focus-key-prefix="`card-${selectedCatId}-${rowIdx}`"
          >
            <template #default="{ item: card, focusKey }">
              <ECard
                :focus-key="focusKey"
                :title="card.title"
                :image="card.poster"
                :width="CARD_W"
              />
            </template>
          </EVirtual>
        </div>
      </template>
    </EVirtual>

    <PerfHud v-if="hudEnabled" />
  </EPage>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { EPage, EFocusGroup, EButton, ECard, EVirtual } from '@chancestv/tv-ui'
import PerfHud from '../components/PerfHud.vue'

// ── 视觉常量 ──────────────────────────────────────────────
const ROW_HEIGHT = 240   // 单行总高 = 标题 + 卡片
const ROW_W = 1040       // 行内容宽（右侧区）
const CARD_W = 200       // 卡片宽
const CARD_H = 200       // 卡片高
const CARD_GAP = 16      // 卡片间距

// ── 数据 ──────────────────────────────────────────────
interface Card { id: string; title: string; poster: string }
interface Row { id: string; title: string; cards: Card[] }
interface Category { id: number; name: string }

// SVG 渐变 dataURL：纯本地、零网络、零解码开销，作为卡片占位海报
function gradImg(seed: number): string {
  const h1 = (seed * 37) % 360
  const h2 = (h1 + 60) % 360
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 71'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${h1},65%,55%)'/>` +
    `<stop offset='1' stop-color='hsl(${h2},65%,30%)'/>` +
    `</linearGradient></defs>` +
    `<rect width='100' height='71' fill='url(#g)'/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function generateData(catsN: number, rowsN: number, cardsN: number) {
  const categories: Category[] = Array.from({ length: catsN }, (_, c) => ({
    id: c,
    name: `分类 ${c + 1}`,
  }))
  const dataMap: Record<number, Row[]> = {}
  for (const cat of categories) {
    dataMap[cat.id] = Array.from({ length: rowsN }, (_, r) => ({
      id: `r-${cat.id}-${r}`,
      title: `${cat.name} · 行 ${r + 1}`,
      cards: Array.from({ length: cardsN }, (_, k) => ({
        id: `c-${cat.id}-${r}-${k}`,
        title: `${r + 1}-${k + 1}`,
        poster: gradImg(cat.id * 1000 + r * 100 + k),
      })),
    }))
  }
  return { categories, dataMap }
}

// ── URL 参数 ──────────────────────────────────────────────
const route = useRoute()
const catsN  = Number(route.query.cats)  || 20
const rowsN  = Number(route.query.rows)  || 15
const cardsN = Number(route.query.cards) || 10
const hudEnabled = route.query.hud !== '0'

const { categories, dataMap } = generateData(catsN, rowsN, cardsN)
const selectedCatId = ref(categories[0].id)
const currentRows = computed(() => dataMap[selectedCatId.value])

// ── 嵌套结构的滚动跟随 ──────────────────────────────────────
// 外层纵向 EVirtual 的内置跟随只认自己的 focusKey 前缀（"perfrow-"），
// 但实际焦点落在卡片（key 形如 "card-{cat}-{row}-{idx}"），所以行级 EVirtual
// 不会自动纵向滚。这里在 document 级监听 sn:focused，解析 rowIdx 主动调 ensureLineVisible。
// EVirtual 是泛型 setup 组件，InstanceType 拿不到；按 defineExpose 的形状结构化声明
const rowsListRef = ref<{ ensureLineVisible: (index: number) => void } | null>(null)

function onGlobalFocused(e: Event) {
  const el = e.target as HTMLElement | null
  const key = el?.getAttribute('data-focus-key')
  if (!key) return

  // 1. 卡片聚焦 → 行容器跟随滚动
  const m = key.match(/^card-\d+-(\d+)-\d+$/)
  if (m) {
    const rowIdx = parseInt(m[1], 10)
    rowsListRef.value?.ensureLineVisible(rowIdx)
    return
  }

  // 2. 菜单聚焦 → 浏览器原生滚动到可视
  if (key.startsWith('cat-') && el) {
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
}

onMounted(() => {
  document.addEventListener('sn:focused', onGlobalFocused, true)
})
onUnmounted(() => {
  document.removeEventListener('sn:focused', onGlobalFocused, true)
})
</script>

<style scoped>
.perf-page {
  display: flex;
  width: 1280px;
  height: 720px;
  background: var(--tv-color-bg);
  color: var(--tv-color-text);
  overflow: hidden;
}

/* 左侧菜单 */
.perf-menu {
  width: 180px;
  flex-shrink: 0;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  background: var(--tv-color-surface);
  scrollbar-width: none;
}
.perf-menu::-webkit-scrollbar { display: none; }
.perf-menu__btn {
  width: 100%;
}

/* 右侧行容器 */
.perf-rows {
  flex: 1;
  padding: 16px 20px;
}
.perf-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 20px;
}
.perf-row__title {
  font-size: 14px;
  color: var(--tv-color-text-muted);
  margin-left: 4px;
}
.perf-card-wrap {
  padding-right: 16px;
}
</style>
