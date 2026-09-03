<template>
  <div class="gridlist">
    <h2 class="gridlist__title">多列网格（虚拟滑动 · {{ items.length }} 项）</h2>
    <!-- EVirtual 网格模式：纵向滚动 + cross 列，窗口化只渲染可视行 -->
    <EVirtual
      section-id="scene-grid"
      direction="vertical"
      :cross="4"
      :items="items"
      :item-width="210"
      :item-height="210"
      :main-visible="3"
      :gap="16"
      :item-key="'id'"
      focus-key-prefix="grid"
      v-slot="{ item, focusKey }"
    >
      <ECard
        :focus-key="focusKey"
        :title="item.title"
        :image="item.image"
        :width="210"
      />
    </EVirtual>
  </div>
</template>

<script setup lang="ts">
import { EVirtual, ECard } from '@chancestv/tv-ui'

// 大数据量演示虚拟滑动；picsum 随机图
const items = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  title: `项目 ${i + 1}`,
  image: `https://picsum.photos/seed/grid${i}/240/150`,
}))
</script>

<style scoped>
.gridlist { height: 100%; }
.gridlist__title { font-size: 28px; color: #222; margin-bottom: 24px; }
</style>
