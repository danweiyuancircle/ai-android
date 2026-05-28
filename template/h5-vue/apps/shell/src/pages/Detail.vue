<template>
  <div class="page detail">
    <h1 class="title">详情页占位</h1>
    <div class="actions">
      <FocusableButton focus-key="detail-back" @click="goBack">返回首页</FocusableButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { FocusableButton } from '@shell/ui'

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
