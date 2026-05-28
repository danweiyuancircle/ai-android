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
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  createRouteCacheManager,
  useAutoBackButton,
  useVoiceInteraction,
  setNavigateToAIChatCallback,
  navigateToAIChat,
} from '@shell/core'
import { VoiceDialog, ExitDialog } from '@shell/ui'

const router = useRouter()
const route = useRoute()

const maxCache = 10
const { include } = createRouteCacheManager(maxCache)
const { showExitDialog, confirmExit, cancelExit } = useAutoBackButton()
const { voiceDialogVisible, voiceText } = useVoiceInteraction()

const handleExitConfirm = () => confirmExit()
const handleExitCancel = () => cancelExit()

onMounted(() => {
  // 第三方应用通过 Intent 拉起 AIChat 时，基座调用 onNavigateToAIChat(query)
  setNavigateToAIChatCallback((query) => {
    navigateToAIChat(router, route, query)
  })
})
</script>
