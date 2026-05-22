<template>
  <div id="app" class="tv-app">
    <!-- 使用 KeepAlive 保持路由页面状态 -->
    <router-view v-slot="{ Component, route }">
      <KeepAlive :include="include" :max="maxCache">
        <component :is="Component" :key="route.fullPath" />
      </KeepAlive>
    </router-view>
    
    <!-- 全局语音交互弹框 -->
    <VoiceDialog :visible="voiceDialogVisible" :text="voiceText" />
    
    <!-- 全局退出确认弹框 -->
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
import { useFocusManager } from './composables/useFocusManager'
import { createRouteCacheManager } from './composables/useRouteCache'
import { useAutoBackButton } from './composables/useBackButton'
import { useVoiceInteraction } from './composables/useVoiceInteraction'
import { setNavigateToAIChatCallback } from './bridge'
import { navigateToAIChat } from './utils/navigation'
import VoiceDialog from './components/VoiceDialog.vue'
import ExitDialog from './components/ExitDialog.vue'

const router = useRouter()
const route = useRoute()
const { initFocusManager, destroyFocusManager } = useFocusManager()

// 创建路由缓存管理器（最多缓存 10 个页面）
const maxCache = 10
const { include, cacheStats } = createRouteCacheManager(maxCache)

// 注册全局返回键监听（包含退出弹框逻辑）
const { showExitDialog, confirmExit, cancelExit } = useAutoBackButton()

// 初始化语音交互（自动注册和清理回调）
const { voiceDialogVisible, voiceText } = useVoiceInteraction()

// 处理退出确认
const handleExitConfirm = () => {
  confirmExit()
}

// 处理退出取消
const handleExitCancel = () => {
  cancelExit()
}

onMounted(() => {
  initFocusManager()
  // 第三方应用通过 Intent 拉起 AIChat 时，基座会调用 onNavigateToAIChat(query)，在此回调中跳转到 AIChat
  setNavigateToAIChatCallback((query) => {
    navigateToAIChat(router, route, query)
  })
  console.log('[App] Route cache enabled with max:', maxCache)
  console.log('[App] Global back button listener registered')
})

onUnmounted(() => {
  destroyFocusManager()
})
</script>

