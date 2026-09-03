<template>
  <EPage id="home" default-focus="home-examples" class="page home">
    <p class="hint">方向键移动焦点，OK 确认。业务页往 apps/shell/src/pages 加即可。</p>
    <!-- 正式上线：删掉这一颗按钮即可，示例页代码仍留在 pages/ 与路由表里当参考 -->
    <EButton
      focus-key="home-examples"
      label="查看示例"
      size="lg"
      @enter="goExamples"
    />
  </EPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { EPage, EButton } from '@chancestv/tv-ui'

const router = useRouter()
const goExamples = () => router.push({ name: 'Examples' })
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.hint {
  font-size: 22px;
  color: #667085;
  margin-bottom: 48px;
  max-width: 900px;
  text-align: center;
}
</style>
