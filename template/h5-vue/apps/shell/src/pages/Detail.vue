<template>
  <FocusSection id="detail" :enter-to="'last-focused'" class="page detail">
    <h1 class="title">详情页占位</h1>
    <div class="actions">
      <EButton focus-key="detail-back" label="返回首页" @enter="goBack" />
    </div>
  </FocusSection>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { FocusSection } from '@dwy/focus-vue3'
import { EButton } from '@dwy/tv-ui'
import { useFocusPage } from '@shell/core'

useFocusPage('detail', 'detail-back')

const router = useRouter()
const goBack = () => router.back()
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
