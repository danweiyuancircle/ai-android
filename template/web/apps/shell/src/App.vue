<template>
  <div id="app" class="tv-app">
    <router-view v-slot="{ Component, route }">
      <KeepAlive :include="include" :max="maxCache">
        <component :is="Component" :key="route.fullPath" />
      </KeepAlive>
    </router-view>

    <VoiceBar :visible="voiceDialogVisible" :text="voiceText" />

    <ExitConfirm
      v-model="showExitDialog"
      @confirm="handleExitConfirm"
      @cancel="handleExitCancel"
    />
  </div>
</template>

<script setup lang="ts">
import {
  createRouteCacheManager,
  useAutoBackButton,
  useVoiceInteraction,
} from '@shell/core'
import ExitConfirm from './components/ExitConfirm.vue'
import VoiceBar from './components/VoiceBar.vue'

const maxCache = 10
const { include } = createRouteCacheManager(maxCache)
const { showExitDialog, confirmExit, cancelExit } = useAutoBackButton()
const { voiceDialogVisible, voiceText } = useVoiceInteraction()

const handleExitConfirm = () => confirmExit()
const handleExitCancel = () => cancelExit()
</script>
