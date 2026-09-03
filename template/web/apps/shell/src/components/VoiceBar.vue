<template>
  <div v-if="visible" class="voice-bar">
    <EText :text="text || '聆听中'" :font-size="22" color="#fff" />
  </div>
</template>

<script setup lang="ts">
import { EText } from '@chancestv/tv-ui'

defineProps<{
  visible: boolean
  text: string
}>()
</script>

<style scoped>
.voice-bar {
  position: absolute;
  left: 50%;
  bottom: 48px;
  transform: translateX(-50%);
  min-width: 280px;
  padding: 16px 28px;
  background: rgba(15, 23, 42, 0.92);
  border-radius: 8px;
  z-index: 20;
  text-align: center;
}
</style>
