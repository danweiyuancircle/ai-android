<template>
  <div class="page coming-soon">
    <h1 class="title">敬请期待</h1>
    <div class="actions">
      <FocusableButton focus-key="soon-back" @click="goBack">返回</FocusableButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import FocusableButton from '@/components/FocusableButton.vue'

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
