<template>
  <div class="tab-bar">
    <TabItem
      v-for="(item, index) in items"
      :key="index"
      :focus-key="`${focusKeyPrefix}-${index}`"
      :label="item.label"
      :is-active="currentIndex === index"
      :is-first="index === 0"
      :is-last="index === items.length - 1"
      :group-id="groupId"
      @click="handleTabClick(index)"
      @focus="handleTabFocus(index)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TabItem from './TabItem.vue'

interface TabItemData {
  label: string
  [key: string]: any
}

interface Props {
  items: TabItemData[]
  modelValue?: number
  focusKeyPrefix?: string
  groupId?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  focusKeyPrefix: 'tab-item',
  groupId: 'tab-group'
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'change': [index: number, item: TabItemData]
  'focus': [index: number, item: TabItemData]
}>()

const currentIndex = ref(props.modelValue)

// 更新当前索引并触发事件
const updateIndex = (index: number) => {
  if (currentIndex.value === index) return
  
  currentIndex.value = index
  emit('update:modelValue', index)
  emit('change', index, props.items[index])
}

// 点击Tab项
const handleTabClick = (index: number) => {
  updateIndex(index)
}

// Tab项获得焦点（TV端聚焦时自动切换并请求数据）
const handleTabFocus = (index: number) => {
  console.log('[TabBar] Tab focused:', index)
  // TV端聚焦时自动切换Tab并触发数据加载
  updateIndex(index)
  emit('focus', index, props.items[index])
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  /* gap: 8px; */
  padding: 0 10px 0 10px;
  /* margin-bottom: 24px; */
  /* border-bottom: 2px solid rgba(0, 0, 0, 0.05); */
  /* background: rgba(255, 255, 255, 0.5); */
}
</style>
