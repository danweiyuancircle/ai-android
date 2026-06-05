<template>
  <EPage id="coming-soon" default-focus="soon-back" class="page coming-soon">
    <h1 class="title">敬请期待</h1>
    <div class="actions">
      <EButton focus-key="soon-back" label="返回" @enter="goBack" />
    </div>
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EButton } from '@chancestv/tv-ui'

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
