<template>
  <div class="rails">
    <h2 class="rails__title">多行横滑</h2>
    <!-- 纵向焦点跟随滚动区，内含多行；每行标题 + 横向 EVirtual -->
    <div ref="scrollEl" class="rails-scroll">
      <div class="rails-track" :style="{ transform: `translateY(${-scrollY}px)`, transition: 'transform 0.18s ease' }">
        <section v-for="rail in rails" :key="rail.id" class="rail">
          <div class="rail__name">{{ rail.name }}</div>
          <EVirtual
            :section-id="`rail-${rail.id}`"
            direction="horizontal"
            :items="rail.cards"
            :item-width="200"
            :item-height="180"
            :main-visible="4"
            :gap="16"
            :item-key="'id'"
            :focus-key-prefix="`rail-${rail.id}`"
            v-slot="{ item, focusKey }"
          >
            <ECard
              :focus-key="focusKey"
              :title="item.title"
              :image="item.image"
              :width="200"
            />
          </EVirtual>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { EVirtual, ECard } from '@chancestv/tv-ui'
import { useScrollFollow } from '../../../composables/useScrollFollow'

const RAIL_NAMES = ['热门推荐', '最近更新', '经典回顾', '动作', '纪录片', '少儿']
const rails = RAIL_NAMES.map((name, r) => ({
  id: r,
  name,
  cards: Array.from({ length: 15 }, (_, i) => ({
    id: `${r}-${i}`,
    title: `${name} ${i + 1}`,
    image: `https://picsum.photos/seed/rail${r}_${i}/200/120`,
  })),
}))

const scrollEl = ref<HTMLElement | null>(null)
const { scrollY } = useScrollFollow(scrollEl, 560)
</script>

<style scoped>
.rails { height: 100%; display: flex; flex-direction: column; }
.rails__title { font-size: 28px; color: #fff; margin-bottom: 16px; }
.rails-scroll { position: relative; flex: 1; overflow: hidden; }
.rails-track { position: absolute; top: 0; left: 0; width: 100%; }
.rail { margin-bottom: 28px; }
.rail__name { font-size: 22px; color: #cde; margin-bottom: 12px; }
</style>
