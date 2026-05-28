<template>
  <FocusSection id="coming-soon" :enter-to="'last-focused'" class="page coming-soon">
    <h1 class="title">敬请期待</h1>
    <div class="actions">
      <EButton focus-key="soon-back" label="返回" @enter="goBack" />
    </div>
  </FocusSection>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { FocusSection } from '@dwy/focus-vue3'
import { EButton } from '@dwy/tv-ui'
import { useFocusPage } from '@shell/core'

useFocusPage('coming-soon', 'soon-back')

const router = useRouter()
const goBack = () => router.back()
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
