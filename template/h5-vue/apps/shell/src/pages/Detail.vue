<template>
  <FocusSection id="detail" class="page detail">
    <h1 class="title">详情页占位</h1>
    <div class="actions">
      <EButton focus-key="detail-back" label="返回首页" @enter="goBack" />
    </div>
  </FocusSection>
</template>

<script setup lang="ts">
import { onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { FocusSection, SpatialNavigation } from '@dwy/focus-vue3'
import { EButton } from '@dwy/tv-ui'

const router = useRouter()
const goBack = () => router.back()

onMounted(async () => {
  await nextTick()
  SpatialNavigation.focus('[data-focus-key="detail-back"]')
})
</script>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.title {
  font-size: 40px;
  color: #fff;
  margin-bottom: 40px;
}
</style>
