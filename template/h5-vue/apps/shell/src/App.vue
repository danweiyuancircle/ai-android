<template>
  <div id="app" class="tv-app">
    <router-view v-slot="{ Component, route }">
      <KeepAlive :include="include" :max="maxCache">
        <component :is="Component" :key="route.fullPath" />
      </KeepAlive>
    </router-view>

    <!-- 全局语音交互弹框 -->
    <VoiceDialog :visible="voiceDialogVisible" :text="voiceText" />

    <!-- 全局退出确认弹框（FocusLayer 自动隔离 + 复焦）-->
    <ExitDialog
      v-model="showExitDialog"
      @confirm="handleExitConfirm"
      @cancel="handleExitCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  createRouteCacheManager,
  useAutoBackButton,
  useVoiceInteraction,
} from '@shell/core'
import { navigateToAIChat, registerAIChatDeepLink } from '@shell/feature-aichat'
import { VoiceDialog, ExitDialog } from '@shell/feature-shared'

const router = useRouter()
const route = useRoute()

const maxCache = 10
const { include } = createRouteCacheManager(maxCache)
const { showExitDialog, confirmExit, cancelExit } = useAutoBackButton()
// 语音最终结果 → 跳转 AIChat（业务装配在壳侧，core 不绑定具体页面）
const { voiceDialogVisible, voiceText } = useVoiceInteraction({
  onFinalResult: (text) => navigateToAIChat(router, route, text),
})

const handleExitConfirm = () => confirmExit()
const handleExitCancel = () => cancelExit()

onMounted(() => {
  // 第三方应用通过 Intent 拉起 AIChat 时，基座调用 window.onNavigateToAIChat(query)
  const dispose = registerAIChatDeepLink((query) => navigateToAIChat(router, route, query))
  onUnmounted(dispose)
})
</script>
