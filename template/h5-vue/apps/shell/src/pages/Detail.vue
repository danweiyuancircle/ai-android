<template>
  <EPage id="detail" default-focus="detail-back" class="page detail">
    <h1 class="title">详情页占位</h1>
    <div class="actions">
      <EButton focus-key="detail-back" label="返回首页" @enter="goBack" />
    </div>
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EButton } from '@dwy/tv-ui'

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
