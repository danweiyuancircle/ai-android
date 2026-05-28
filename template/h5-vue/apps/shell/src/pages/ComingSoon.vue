<template>
  <FocusSection id="coming-soon" class="page coming-soon">
    <h1 class="title">敬请期待</h1>
    <div class="actions">
      <EButton focus-key="soon-back" label="返回" @enter="goBack" />
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
  SpatialNavigation.focus('[data-focus-key="soon-back"]')
})
</script>

<style scoped>
.coming-soon {
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
