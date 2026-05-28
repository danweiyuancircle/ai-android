<template>
  <FocusSection id="ai-chat" class="page ai-chat">
    <h1 class="title">AI 对话占位</h1>
    <!-- query 来自语音最终结果或第三方拉起（bridge: onNavigateToAIChat） -->
    <p class="query">收到 query：{{ query }}</p>
    <div class="actions">
      <EButton focus-key="ai-back" label="返回" @enter="goBack" />
    </div>
  </FocusSection>
</template>

<script setup lang="ts">
import { computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FocusSection, SpatialNavigation } from '@dwy/focus-vue3'
import { EButton } from '@dwy/tv-ui'

const route = useRoute()
const router = useRouter()
const query = computed(() => (route.query.text as string) || '（空）')
const goBack = () => router.back()

onMounted(async () => {
  await nextTick()
  SpatialNavigation.focus('[data-focus-key="ai-back"]')
})
</script>

<style scoped>
.ai-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.title {
  font-size: 40px;
  color: #fff;
  margin-bottom: 30px;
}
.query {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 40px;
}
</style>
