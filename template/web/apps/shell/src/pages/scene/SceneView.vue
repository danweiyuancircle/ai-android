<template>
  <EPage id="scene" default-focus="scene-cat-0" class="page scene">
    <!-- 左侧分类菜单 -->
    <EColumn id="scene-menu" :gap="12" class="scene-menu">
      <div class="scene-menu__title">分类</div>
      <EButton
        v-for="(cat, i) in categories"
        :key="cat.key"
        :focus-key="`scene-cat-${i}`"
        :label="cat.label"
        :variant="active === cat.key ? 'primary' : 'secondary'"
        class="scene-menu__item"
        @enter="active = cat.key"
      />
    </EColumn>

    <!-- 右侧内容：按选中分类渲染对应样式组件 -->
    <div class="scene-content">
      <component :is="activeComp" :key="active" />
    </div>
  </EPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { EPage, EColumn, EButton } from '@chancestv/tv-ui'
import CardWall from './styles/CardWall.vue'
import GridList from './styles/GridList.vue'
import Rails from './styles/Rails.vue'

type CatKey = 'cards' | 'grid' | 'rails'

const categories: { key: CatKey; label: string }[] = [
  { key: 'cards', label: '图片卡片墙' },
  { key: 'grid', label: '多列网格' },
  { key: 'rails', label: '多行横滑' },
]

const active = ref<CatKey>('cards')

const COMPS = { cards: CardWall, grid: GridList, rails: Rails }
const activeComp = computed(() => COMPS[active.value])
</script>

<style scoped>
.scene { display: flex; flex-direction: row; height: 100%; }
.scene-menu {
  width: 240px; flex-shrink: 0; padding: 32px 20px;
  background: #f5f6f8; height: 100%; box-sizing: border-box;
}
.scene-menu__title { font-size: 22px; color: #1677ff; margin-bottom: 20px; }
.scene-menu__item { width: 100%; }
.scene-content { flex: 1; min-width: 0; padding: 32px 40px; box-sizing: border-box; overflow: hidden; }
</style>
