<template>
  <div class="cardwall">
    <h2 class="cardwall__title">图片卡片墙</h2>
    <!-- 随机尺寸卡片，flex-wrap 自适应；EFocusGroup 内方向键几何导航 -->
    <EFocusGroup id="scene-cardwall" tag="div" class="cardwall__grid">
      <ECard
        v-for="card in cards"
        :key="card.id"
        :focus-key="`cw-${card.id}`"
        :title="card.title"
        :image="card.image"
        :width="card.width"
        @enter="noop"
      />
    </EFocusGroup>
  </div>
</template>

<script setup lang="ts">
import { EFocusGroup, ECard } from '@shell/tv-ui'

// 随机宽度（确定性按 index 取，保证一致），picsum 随机图
const WIDTHS = [200, 240, 200, 280, 220, 200, 260, 240]
const cards = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  title: `精选 ${i + 1}`,
  width: WIDTHS[i % WIDTHS.length],
  image: `https://picsum.photos/seed/cw${i}/320/200`,
}))

const noop = () => {}
</script>

<style scoped>
.cardwall { height: 100%; }
.cardwall__title { font-size: 28px; color: #fff; margin-bottom: 24px; }
.cardwall__grid {
  display: flex;
  flex-wrap: wrap;
  /* Chromium 53 无 gap：用负 margin + 子项 margin 模拟间距 */
  margin: -12px;
}
.cardwall__grid > * { margin: 12px; }
</style>
