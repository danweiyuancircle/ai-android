<template>
  <FocusSection id="home" :enter-to="'last-focused'" class="page home">
    <p class="hint">遥控器方向键移动焦点，OK 键确认，返回键退出。</p>
    <div class="actions">
      <EButton focus-key="home-detail" label="进入详情页" @enter="goDetail" />
      <EButton focus-key="home-soon" label="敬请期待页" @enter="goSoon" />
      <EButton focus-key="home-tts" label="播报 TTS" @enter="speak" />
    </div>
  </FocusSection>
</template>

<script setup lang="ts">
import { onActivated, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { FocusSection, SpatialNavigation, useKeepAliveFocus } from '@dwy/focus-vue3'
import { EButton } from '@dwy/tv-ui'
import { ottService } from '@shell/core'

// KeepAlive 契约：被切走时暂停 SN，被切回时恢复
useKeepAliveFocus()

const router = useRouter()

const goDetail = () => router.push({ name: 'Detail' })
const goSoon = () => router.push({ name: 'ComingSoon' })
const speak = () => ottService.playTts('这是一个壳模板首页')

// 进入页面时设焦点：优先按 section 的 enter-to=last-focused 恢复，
// 首次或无记忆时兜底到第一个按钮
async function ensureFocus() {
  await nextTick()
  const ok = SpatialNavigation.focus('home')
  if (!ok) SpatialNavigation.focus('[data-focus-key="home-detail"]')
}
onMounted(ensureFocus)
onActivated(ensureFocus)
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
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 60px;
}
.actions {
  display: flex;
}
.actions > *:not(:first-child) {
  margin-left: 40px;
}
</style>
